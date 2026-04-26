import { Test, TestingModule } from '@nestjs/testing';
import { ArchivingService } from './archiving.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Split } from '../../entities/split.entity';
import { SplitArchive, ArchiveReason } from './entities/split-archive.entity';
import { ReminderLog } from './entities/reminder-log.entity';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import { EmailService } from '../../email/email.service';
import { Participant } from '../../entities/participant.entity';
import { Payment } from '../../entities/payment.entity';
import { User } from '../../entities/user.entity';
import { DataSource, LessThan, Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ReputationService } from '../../reputation/reputation.service';

describe('ArchivingService', () => {
  let service: ArchivingService;
  let splitRepo: Repository<Split>;
  let archiveRepo: Repository<SplitArchive>;
  let reminderRepo: Repository<ReminderLog>;
  let pushService: PushNotificationsService;
  let emailService: EmailService;

  const mockSplitRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockArchiveRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockReminderRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockParticipantRepo = {
    find: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  };

  const mockPaymentRepo = {
    find: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockPushService = {
    sendNotification: jest.fn(),
  };

  const mockEmailService = {
    sendPaymentReminder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockReputationService = {
    recordEvent: jest.fn(),
  };

  beforeEach(async () => {
    // recreate transaction mock per test to avoid cross-test call counts
    mockDataSource.transaction = jest.fn((cb) => cb({
      getRepository: (entity: any) => {
        if (entity === SplitArchive) return mockArchiveRepo;
        if (entity === Split) return mockSplitRepo;
        if (entity === Participant) return mockParticipantRepo;
        if (entity === Payment) return mockPaymentRepo;
        return null;
      }
    }));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchivingService,
        { provide: getRepositoryToken(Split), useValue: mockSplitRepo },
        { provide: getRepositoryToken(SplitArchive), useValue: mockArchiveRepo },
        { provide: getRepositoryToken(ReminderLog), useValue: mockReminderRepo },
        { provide: getRepositoryToken(Participant), useValue: mockParticipantRepo },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: PushNotificationsService, useValue: mockPushService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ReputationService, useValue: mockReputationService },
      ],
    }).compile();

    service = module.get<ArchivingService>(ArchivingService);
    splitRepo = module.get<Repository<Split>>(getRepositoryToken(Split));
    archiveRepo = module.get<Repository<SplitArchive>>(getRepositoryToken(SplitArchive));
    reminderRepo = module.get<Repository<ReminderLog>>(getRepositoryToken(ReminderLog));
    pushService = module.get<PushNotificationsService>(PushNotificationsService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('archiveSplit', () => {
    it('should throw ForbiddenException if manual archive by non-creator', async () => {
      const splitId = 'split-1';
      const userId = 'user-2';
      const split = { id: splitId, creatorWalletAddress: 'user-1' } as any;
      
      mockSplitRepo.findOne.mockResolvedValue(split);

      await expect(service.archiveSplit(splitId, ArchiveReason.MANUALLY_ARCHIVED, userId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow manual archive by creator', async () => {
      const splitId = 'split-1';
      const userId = 'user-1';
      const split = { id: splitId, creatorWalletAddress: 'user-1' } as any;
      
      mockSplitRepo.findOne.mockResolvedValue(split);
      mockParticipantRepo.find.mockResolvedValue([]);
      mockPaymentRepo.find.mockResolvedValue([]);
      mockArchiveRepo.create.mockReturnValue({});
      mockArchiveRepo.save.mockResolvedValue({});

      await service.archiveSplit(splitId, ArchiveReason.MANUALLY_ARCHIVED, userId);
      expect(mockArchiveRepo.save).toHaveBeenCalled();
    });
  });

  describe('checkExpiry', () => {
    it('should archive expired unpaid splits', async () => {
      const expiredSplit = { 
        id: 'split-1', 
        amountPaid: 0, 
        totalAmount: 100,
        status: 'active' 
      } as Split;

      mockSplitRepo.find.mockResolvedValue([expiredSplit]);
      mockParticipantRepo.find.mockResolvedValue([]);
      mockPaymentRepo.find.mockResolvedValue([]);
      mockArchiveRepo.create.mockReturnValue({ id: 'archive-1' });
      mockArchiveRepo.save.mockResolvedValue({ id: 'archive-1' });
      mockSplitRepo.findOne.mockResolvedValue(expiredSplit);
      
      await service.checkExpiry();

      expect(mockSplitRepo.find).toHaveBeenCalledWith({ 
        where: { status: 'active', expiryDate: expect.anything() } 
      });
      
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should NOT archive paid splits', async () => {
      const paidSplit = { 
        id: 'split-2', 
        amountPaid: 100, 
        totalAmount: 100,
        status: 'active' 
      } as Split;

      mockSplitRepo.find.mockResolvedValue([paidSplit]);

      await service.checkExpiry();

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders', () => {
    it('should send reminders for expiring splits', async () => {
      const split = { 
        id: 'split-1', 
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Created 3 days ago (Gentle reminder)
        description: 'Test Split',
        totalAmount: 100,
        participants: []
      } as any;
      
      const participant = {
        id: 'p-1',
        userId: 'u-1',
        amountOwed: 50,
        amountPaid: 0,
        status: 'pending'
      } as Participant;
      
      split.participants = [participant];

      mockSplitRepo.find.mockResolvedValue([split]);
      mockParticipantRepo.find.mockResolvedValue([participant]);
      mockReminderRepo.findOne.mockResolvedValue(null); // No reminder sent yet
      mockUserRepo.findOne.mockResolvedValue({ id: 'u-1', email: 'test@example.com', emailPreferences: { reminders: true } });
      mockReminderRepo.create.mockReturnValue({ id: 'log-1' });

      await service.sendReminders();

      expect(mockPushService.sendNotification).toHaveBeenCalled();
      expect(mockEmailService.sendPaymentReminder).toHaveBeenCalled();
      expect(mockReminderRepo.save).toHaveBeenCalled();
    });
  });
});
