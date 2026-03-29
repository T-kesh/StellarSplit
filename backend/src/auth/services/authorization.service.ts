import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../entities/dispute.entity';
import { Participant } from '../../entities/participant.entity';
import { Split } from '../../entities/split.entity';
import { Group } from '../../group/entities/group.entity';
import { Receipt } from '../../receipts/entities/receipt.entity';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(Split)
    private splitRepository: Repository<Split>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  async canAccessSplit(userId: string, splitId: string): Promise<boolean> {
    const split = await this.splitRepository.findOne({
      where: { id: splitId },
      relations: ['participants'],
    });
    if (!split) return false;
    return (
      split.participants.some((p: Participant) => p.userId === userId) ||
      split.creatorWalletAddress === userId
    );
  }

  async canCreatePayment(userId: string, splitId: string): Promise<boolean> {
    return this.canAccessSplit(userId, splitId);
  }

  async canAddParticipant(userId: string, splitId: string): Promise<boolean> {
    const split = await this.splitRepository.findOne({ where: { id: splitId } });
    return (
      split?.creatorWalletAddress === userId ||
      (await this.canAccessSplit(userId, splitId))
    );
  }

  async canRemoveParticipant(userId: string, splitId: string): Promise<boolean> {
    const split = await this.splitRepository.findOne({ where: { id: splitId } });
    return split?.creatorWalletAddress === userId;
  }

  async canCreatePaymentForParticipant(
    userId: string,
    splitId: string,
    participantId: string,
  ): Promise<boolean> {
    if (!(await this.canAccessSplit(userId, splitId))) return false;
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, splitId },
    });
    if (!participant) return false;
    return (
      participant.userId === userId ||
      (await this.isSplitCreator(userId, splitId))
    );
  }

  async canAccessParticipantPayments(userId: string, participantId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ['split'],
    });
    if (!participant) return false;
    return (
      participant.userId === userId ||
      (await this.canAccessSplit(userId, participant.splitId))
    );
  }

  async canAccessReceipt(userId: string, receiptId: string): Promise<boolean> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
      relations: ['split'],
    });
    if (!receipt) return false;
    return this.canAccessSplit(userId, receipt.splitId);
  }

  async canAccessDispute(userId: string, disputeId: string): Promise<boolean> {
    const dispute = await this.disputeRepository.findOne({ where: { id: disputeId } });
    if (!dispute) return false;
    return this.canAccessSplit(userId, dispute.splitId);
  }

  async isAdmin(userId: string): Promise<boolean> {
    return false;
  }

  async canAccessGroup(userId: string, groupId: string): Promise<boolean> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) return false;
    return (
      group.creatorId === userId ||
      group.members.some((member: any) => member.wallet === userId)
    );
  }

  async canManageGroupMembers(userId: string, groupId: string): Promise<boolean> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) return false;
    return (
      group.creatorId === userId ||
      group.members.some((member: any) => member.wallet === userId && member.role === 'admin')
    );
  }

  async canCreateGroupSplit(userId: string, groupId: string): Promise<boolean> {
    return this.canAccessGroup(userId, groupId);
  }

  // ? NEW - Can user generate a short link for this split?
  async canGenerateShortLink(userId: string, splitId: string): Promise<boolean> {
    return this.canAccessSplit(userId, splitId);
  }

  // ? NEW - Can user delete a short link?
  async canDeleteShortLink(userId: string, splitId: string): Promise<boolean> {
    return this.isSplitCreator(userId, splitId);
  }

  // ? NEW - Can user view analytics for a short link?
  async canViewShortLinkAnalytics(userId: string, splitId: string): Promise<boolean> {
    return this.isSplitCreator(userId, splitId);
  }

  // ? NEW - Is participant actually part of this split?
  async isParticipantInSplit(participantId: string, splitId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, splitId },
    });
    return !!participant;
  }

  private async isSplitCreator(userId: string, splitId: string): Promise<boolean> {
    const split = await this.splitRepository.findOne({ where: { id: splitId } });
    return split?.creatorWalletAddress === userId;
  }

  async filterAccessibleSplits(userId: string, splitIds: string[]): Promise<string[]> {
    const splits = await this.splitRepository.findByIds(splitIds);
    return splits
      .filter(
        (split: Split) =>
          split.participants.some((p: Participant) => p.userId === userId) ||
          split.creatorWalletAddress === userId,
      )
      .map((split: Split) => split.id);
  }

  async filterAccessibleReceipts(userId: string, receiptIds: string[]): Promise<string[]> {
    const receipts = await this.receiptRepository.findByIds(receiptIds);
    const accessibleSplitIds = await this.filterAccessibleSplits(
      userId,
      receipts.map((r) => r.splitId),
    );
    return receipts
      .filter((receipt: Receipt) => accessibleSplitIds.includes(receipt.splitId))
      .map((receipt: Receipt) => receipt.id);
  }

  async filterAccessibleDisputes(userId: string, disputeIds: string[]): Promise<string[]> {
    const disputes = await this.disputeRepository.findByIds(disputeIds);
    const accessibleSplitIds = await this.filterAccessibleSplits(
      userId,
      disputes.map((d) => d.splitId),
    );
    return disputes
      .filter((dispute: Dispute) => accessibleSplitIds.includes(dispute.splitId))
      .map((dispute: Dispute) => dispute.id);
  }
}
