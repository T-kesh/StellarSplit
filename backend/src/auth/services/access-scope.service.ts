import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Dispute } from '../../entities/dispute.entity';
import { Participant } from '../../entities/participant.entity';
import { Receipt } from '../../receipts/entities/receipt.entity';
import { Split } from '../../entities/split.entity';
import { Group } from '../../group/entities/group.entity';

/**
 * Resource-scoped access helpers extracted from AuthorizationService (issue #370).
 * Each method encapsulates exactly one resource policy with deterministic queries.
 */
@Injectable()
export class AccessScopeService {
  constructor(
    @InjectRepository(Split) private readonly splitRepo: Repository<Split>,
    @InjectRepository(Participant) private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Receipt) private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(Dispute) private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
  ) {}

  // ── Split scope ────────────────────────────────────────────────────────────

  async isSplitCreator(userId: string, splitId: string): Promise<boolean> {
    const split = await this.splitRepo.findOne({
      where: { id: splitId },
      select: ['creatorWalletAddress'],
    });
    return split?.creatorWalletAddress === userId;
  }

  async isSplitParticipant(userId: string, splitId: string): Promise<boolean> {
    const count = await this.participantRepo.count({ where: { userId, splitId } });
    return count > 0;
  }

  async canAccessSplit(userId: string, splitId: string): Promise<boolean> {
    const [isCreator, isParticipant] = await Promise.all([
      this.isSplitCreator(userId, splitId),
      this.isSplitParticipant(userId, splitId),
    ]);
    return isCreator || isParticipant;
  }

  async filterAccessibleSplits(userId: string, splitIds: string[]): Promise<string[]> {
    if (splitIds.length === 0) return [];
    const splits = await this.splitRepo.find({ where: { id: In(splitIds) } });
    const participantRows = await this.participantRepo.find({
      where: { userId, splitId: In(splitIds) },
      select: ['splitId'],
    });
    const participantSplitIds = new Set(participantRows.map((p) => p.splitId));
    return splits
      .filter((s) => s.creatorWalletAddress === userId || participantSplitIds.has(s.id))
      .map((s) => s.id);
  }

  // ── Participant scope ──────────────────────────────────────────────────────

  async canAccessParticipantPayments(userId: string, participantId: string): Promise<boolean> {
    const participant = await this.participantRepo.findOne({
      where: { id: participantId },
      select: ['userId', 'splitId'],
    });
    if (!participant) return false;
    return participant.userId === userId || this.canAccessSplit(userId, participant.splitId);
  }

  async isParticipantInSplit(participantId: string, splitId: string): Promise<boolean> {
    const count = await this.participantRepo.count({ where: { id: participantId, splitId } });
    return count > 0;
  }

  // ── Receipt scope ──────────────────────────────────────────────────────────

  async canAccessReceipt(userId: string, receiptId: string): Promise<boolean> {
    const receipt = await this.receiptRepo.findOne({
      where: { id: receiptId },
      select: ['splitId'],
    });
    if (!receipt) return false;
    return this.canAccessSplit(userId, receipt.splitId);
  }

  async filterAccessibleReceipts(userId: string, receiptIds: string[]): Promise<string[]> {
    if (receiptIds.length === 0) return [];
    const receipts = await this.receiptRepo.find({
      where: { id: In(receiptIds) },
      select: ['id', 'splitId'],
    });
    const accessibleSplitIds = new Set(
      await this.filterAccessibleSplits(userId, receipts.map((r) => r.splitId)),
    );
    return receipts.filter((r) => accessibleSplitIds.has(r.splitId)).map((r) => r.id);
  }

  // ── Dispute scope ──────────────────────────────────────────────────────────

  async canAccessDispute(userId: string, disputeId: string): Promise<boolean> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
      select: ['splitId'],
    });
    if (!dispute) return false;
    return this.canAccessSplit(userId, dispute.splitId);
  }

  async filterAccessibleDisputes(userId: string, disputeIds: string[]): Promise<string[]> {
    if (disputeIds.length === 0) return [];
    const disputes = await this.disputeRepo.find({
      where: { id: In(disputeIds) },
      select: ['id', 'splitId'],
    });
    const accessibleSplitIds = new Set(
      await this.filterAccessibleSplits(userId, disputes.map((d) => d.splitId)),
    );
    return disputes.filter((d) => accessibleSplitIds.has(d.splitId)).map((d) => d.id);
  }

  // ── Group scope ────────────────────────────────────────────────────────────

  async isGroupMember(userId: string, groupId: string): Promise<boolean> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members'],
    });
    if (!group) return false;
    return (
      group.creatorId === userId ||
      group.members.some((m) => m.wallet === userId)
    );
  }

  async isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members'],
    });
    if (!group) return false;
    return (
      group.creatorId === userId ||
      group.members.some((m) => m.wallet === userId && m.role === 'admin')
    );
  }
}
