import { Injectable } from '@nestjs/common';
import { AccessScopeService } from './access-scope.service';

/**
 * AuthorizationService delegates all resource-scope checks to AccessScopeService
 * so authorization logic is co-located per resource and easy to extend (issue #370).
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly scope: AccessScopeService) {}

  // ── Split ──────────────────────────────────────────────────────────────────

  async canAccessSplit(userId: string, splitId: string): Promise<boolean> {
    return this.scope.canAccessSplit(userId, splitId);
  }

  async canCreatePayment(userId: string, splitId: string): Promise<boolean> {
    return this.scope.canAccessSplit(userId, splitId);
  }

  async canAddParticipant(userId: string, splitId: string): Promise<boolean> {
    return this.scope.canAccessSplit(userId, splitId);
  }

  async canRemoveParticipant(userId: string, splitId: string): Promise<boolean> {
    return this.scope.isSplitCreator(userId, splitId);
  }

  async canCreatePaymentForParticipant(
    userId: string,
    splitId: string,
    participantId: string,
  ): Promise<boolean> {
    const [canAccess, inSplit] = await Promise.all([
      this.scope.canAccessSplit(userId, splitId),
      this.scope.isParticipantInSplit(participantId, splitId),
    ]);
    return canAccess && inSplit;
  }

  async canAccessParticipantPayments(userId: string, participantId: string): Promise<boolean> {
    return this.scope.canAccessParticipantPayments(userId, participantId);
  }

  async canAccessReceipt(userId: string, receiptId: string): Promise<boolean> {
    return this.scope.canAccessReceipt(userId, receiptId);
  }

  async canAccessDispute(userId: string, disputeId: string): Promise<boolean> {
    return this.scope.canAccessDispute(userId, disputeId);
  }

  async isAdmin(_userId: string): Promise<boolean> {
    return false;
  }

  // ── Group ──────────────────────────────────────────────────────────────────

  async canAccessGroup(userId: string, groupId: string): Promise<boolean> {
    return this.scope.isGroupMember(userId, groupId);
  }

  async canManageGroupMembers(userId: string, groupId: string): Promise<boolean> {
    return this.scope.isGroupAdmin(userId, groupId);
  }

  async canCreateGroupSplit(userId: string, groupId: string): Promise<boolean> {
    return this.scope.isGroupMember(userId, groupId);
  }

  // ── Short links ────────────────────────────────────────────────────────────

  async canGenerateShortLink(userId: string, splitId: string): Promise<boolean> {
    return this.scope.canAccessSplit(userId, splitId);
  }

  async canDeleteShortLink(userId: string, splitId: string): Promise<boolean> {
    return this.scope.isSplitCreator(userId, splitId);
  }

  async canViewShortLinkAnalytics(userId: string, splitId: string): Promise<boolean> {
    return this.scope.isSplitCreator(userId, splitId);
  }

  // ── Batch filters ──────────────────────────────────────────────────────────

  async filterAccessibleSplits(userId: string, splitIds: string[]): Promise<string[]> {
    return this.scope.filterAccessibleSplits(userId, splitIds);
  }

  async filterAccessibleReceipts(userId: string, receiptIds: string[]): Promise<string[]> {
    return this.scope.filterAccessibleReceipts(userId, receiptIds);
  }

  async filterAccessibleDisputes(userId: string, disputeIds: string[]): Promise<string[]> {
    return this.scope.filterAccessibleDisputes(userId, disputeIds);
  }

  async isParticipantInSplit(participantId: string, splitId: string): Promise<boolean> {
    return this.scope.isParticipantInSplit(participantId, splitId);
  }
}
