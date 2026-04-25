import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, IsNull, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SplitArchive, ArchiveReason } from './entities/split-archive.entity';
import { ReminderLog, ReminderType, ReminderChannel, DeliveryStatus } from './entities/reminder-log.entity';
import { Split } from '../../entities/split.entity';
import { Participant } from '../../entities/participant.entity';
import { Payment } from '../../entities/payment.entity';
import { User } from '../../entities/user.entity'; // Fixed path to user entity
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import { EmailService } from '../../email/email.service'; // Fixed path
import { NotificationEventType } from '../../push-notifications/entities/notification-preference.entity';
import { ReputationService } from '../../reputation/reputation.service';
import { ReputationEventType } from '../../reputation/enums/reputation-event-type.enum';

@Injectable()
export class ArchivingService {
  private readonly logger = new Logger(ArchivingService.name);

  constructor(
    @InjectRepository(SplitArchive)
    private splitArchiveRepo: Repository<SplitArchive>,
    @InjectRepository(ReminderLog)
    private reminderLogRepo: Repository<ReminderLog>,
    @InjectRepository(Split)
    private splitRepo: Repository<Split>,
    @InjectRepository(Participant)
    private participantRepo: Repository<Participant>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private pushService: PushNotificationsService,
    private emailService: EmailService,
    private dataSource: DataSource,
    private readonly reputationService: ReputationService,
  ) {}

  async archiveSplit(splitId: string, reason: ArchiveReason, archivedBy: string): Promise<SplitArchive> {
    return this.dataSource.transaction(async (manager) => {
        const splitRepo = manager.getRepository(Split);
        const participantRepo = manager.getRepository(Participant);
        const paymentRepo = manager.getRepository(Payment);
        const archiveRepo = manager.getRepository(SplitArchive);

        const split = await splitRepo.findOne({
          where: { id: splitId },
          relations: ['participants', 'items'], // Items relation might be needed too if items exist
        });
    
        if (!split) {
          throw new NotFoundException(`Split with ID ${splitId} not found`);
        }

        // Authorization check
        if (reason === ArchiveReason.MANUALLY_ARCHIVED && split.creatorWalletAddress && split.creatorWalletAddress !== archivedBy) {
          throw new ForbiddenException('Only the creator can archive this split');
        }

        const participants = await participantRepo.find({ where: { splitId } });
        const payments = await paymentRepo.find({ where: { splitId } });

        // Reputation: if the split is expiring/unpaid, penalize still-unpaid participants.
        if (reason === ArchiveReason.EXPIRED) {
          const unpaidParticipants = participants.filter(
            (p) =>
              Number(p.amountPaid) < Number(p.amountOwed) &&
              p.status !== "paid",
          );

          await Promise.all(
            unpaidParticipants.map((p) =>
              this.reputationService.recordEvent(
                p.userId,
                split.id,
                ReputationEventType.UNPAID_EXPIRED,
                manager,
              ),
            ),
          );
        }
    
        // Create archive record
        const archive = archiveRepo.create({
          originalSplitId: split.id,
          splitData: split,
          participantData: participants,
          paymentData: payments,
          archiveReason: reason,
          archivedBy,
        });
    
        await archiveRepo.save(archive);
    
        // Delete related data
        await paymentRepo.delete({ splitId });
        await participantRepo.delete({ splitId });
        // Also delete items if any?
        // Usually cascade takes care of items if configured, but explicit delete is safer
        // Let's assume cascade or explicit delete.
        // If Split has items, and items have FK to Split with CASCADE, deleting Split is enough.
        // But here we are deleting Split last.
        
        await splitRepo.delete(splitId);
    
        this.logger.log(`Split ${splitId} archived successfully. Reason: ${reason}`);
        return archive;
    });
  }

  async restoreSplit(archiveId: string): Promise<Split> {
    return this.dataSource.transaction(async (manager) => {
        const splitRepo = manager.getRepository(Split);
        const participantRepo = manager.getRepository(Participant);
        const paymentRepo = manager.getRepository(Payment);
        const archiveRepo = manager.getRepository(SplitArchive);

        const archive = await archiveRepo.findOne({ where: { id: archiveId } });
        if (!archive) {
          throw new NotFoundException(`Archive with ID ${archiveId} not found`);
        }
    
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
        if (archive.archivedAt < ninetyDaysAgo) {
          throw new BadRequestException('Cannot restore archives older than 90 days');
        }
    
        const splitData = archive.splitData as Split;
        const participantsData = archive.participantData as Participant[];
        const paymentsData = archive.paymentData as Payment[];
    
        // Restore Split
        const existing = await splitRepo.findOne({ where: { id: splitData.id } });
        if (existing) {
            throw new BadRequestException(`Split with ID ${splitData.id} already exists`);
        }
    
        const restoredSplit = await splitRepo.save(splitData);
        
        for (const p of participantsData) {
          await participantRepo.save(p);
        }
        
        for (const pay of paymentsData) {
            await paymentRepo.save(pay);
        }
    
        await archiveRepo.delete(archiveId);
    
        this.logger.log(`Split ${splitData.id} restored successfully.`);
        return restoredSplit;
    });
  }

  async restoreSplitByOriginalId(originalSplitId: string): Promise<Split> {
      const archive = await this.splitArchiveRepo.findOne({
          where: { originalSplitId },
          order: { archivedAt: 'DESC' }
      });
      
      if (!archive) {
          throw new NotFoundException(`No archive found for split ID ${originalSplitId}`);
      }
      
      return this.restoreSplit(archive.id);
  }

  async updateExpiryDate(splitId: string, expiryDate: Date): Promise<Split> {
    const split = await this.splitRepo.findOne({ where: { id: splitId } });
    if (!split) throw new NotFoundException('Split not found');
    
    split.expiryDate = expiryDate;
    return this.splitRepo.save(split);
  }

  async getArchivedSplits(): Promise<SplitArchive[]> {
    return this.splitArchiveRepo.find({ order: { archivedAt: 'DESC' } });
  }

  async getArchivedSplit(id: string): Promise<SplitArchive> {
    return this.splitArchiveRepo.findOneOrFail({ where: { id } });
  }

  async getExpiringSoon(): Promise<Split[]> {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    return this.splitRepo.find({
      where: {
        expiryDate: LessThan(threeDaysFromNow),
        status: 'active',
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiry() {
    this.logger.log('Checking for expired splits...');
    const now = new Date();
    
    const expiredSplits = await this.splitRepo.find({
        where: {
            status: 'active',
            expiryDate: LessThan(now),
        }
    });

    for (const split of expiredSplits) {
        // Only expire if unpaid? Requirement: "Auto-expire splits 30 days after creation if unpaid"
        // Check payments? Or check status?
        // If status is 'active', it's not 'completed'.
        // "Unpaid" usually means totalAmount != amountPaid.
        if (split.amountPaid < split.totalAmount) {
             await this.archiveSplit(split.id, ArchiveReason.EXPIRED, 'system');
        }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const defaultExpiredSplits = await this.splitRepo.find({
        where: {
            status: 'active',
            expiryDate: IsNull(),
            createdAt: LessThan(thirtyDaysAgo),
        }
    });

    for (const split of defaultExpiredSplits) {
        if (split.amountPaid < split.totalAmount) {
            await this.archiveSplit(split.id, ArchiveReason.EXPIRED, 'system');
        }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendReminders() {
    this.logger.log('Sending scheduled reminders...');
    const now = new Date();
    
    const activeSplits = await this.splitRepo.find({
        where: { status: 'active' },
        relations: ['participants'],
    });

    for (const split of activeSplits) {
        const expiryDate = split.expiryDate || new Date(split.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24));
        const daysSinceCreation = Math.floor((now.getTime() - split.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        let reminderType: ReminderType | null = null;

        if (daysSinceCreation === 3) reminderType = ReminderType.GENTLE;
        else if (daysSinceCreation === 7) reminderType = ReminderType.FIRM;
        else if (daysUntilExpiry === 14) reminderType = ReminderType.FINAL;

        if (reminderType) {
            for (const p of split.participants) {
                if (p.status === 'pending') {
                    const existingLog = await this.reminderLogRepo.findOne({
                        where: {
                            splitId: split.id,
                            participantId: p.id,
                            reminderType,
                        }
                    });

                    if (!existingLog) {
                        await this.sendReminder(split, p, reminderType);
                    }
                }
            }
        }
    }
  }

  private async sendReminder(split: Split, participant: Participant, type: ReminderType) {
      const titleMap = {
          [ReminderType.GENTLE]: 'Friendly Reminder: You have a split to settle',
          [ReminderType.FIRM]: 'Reminder: Outstanding Split Payment',
          [ReminderType.FINAL]: 'Final Notice: Split Expiring Soon',
      };

      const bodyMap = {
          [ReminderType.GENTLE]: `Hey! Just a reminder to settle your share for "${split.description || 'Split'}".`,
          [ReminderType.FIRM]: `Please settle your share of ${participant.amountOwed} for "${split.description || 'Split'}".`,
          [ReminderType.FINAL]: `Urgent! The split "${split.description || 'Split'}" will expire in 14 days. Please pay now.`,
      };

      try {
          // Send Push
          await this.pushService.sendNotification(
              participant.userId,
              NotificationEventType.PAYMENT_REMINDER,
              titleMap[type],
              bodyMap[type]
          );

          // Send Email
          // Need to fetch user to get email
          // Participant userId is uuid of User entity? Or wallet address?
          // Looking at Participant entity: userId: string.
          // Looking at User entity: id: uuid.
          // Assuming participant.userId matches User.id (UUID).
          
          const user = await this.userRepo.findOne({ where: { id: participant.userId } });
          
          if (user && user.email && user.emailPreferences.reminders) {
              await this.emailService.sendPaymentReminder(user.email, {
                  participantName: 'User', // We don't have name
                  splitDescription: split.description || 'Split',
                  amountDue: Number(participant.amountOwed),
                  paymentLink: `https://stellarsplit.com/splits/${split.id}` // Example link
              });
              
              // Log Email
               const logEmail = this.reminderLogRepo.create({
                  splitId: split.id,
                  participantId: participant.id,
                  reminderType: type,
                  channel: ReminderChannel.EMAIL,
                  deliveryStatus: DeliveryStatus.SENT,
              });
              await this.reminderLogRepo.save(logEmail);
          }

          // Log Push
          const logPush = this.reminderLogRepo.create({
              splitId: split.id,
              participantId: participant.id,
              reminderType: type,
              channel: ReminderChannel.PUSH,
              deliveryStatus: DeliveryStatus.SENT,
          });
          await this.reminderLogRepo.save(logPush);
          
      } catch (error) {
          this.logger.error(`Failed to send reminder to ${participant.userId}`, error);
      }
  }
}
