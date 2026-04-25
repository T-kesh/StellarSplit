import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from './authorization.service';
import { AccessScopeService } from './access-scope.service';

const mockAccessScope = {
  canAccessSplit: jest.fn(),
  isSplitCreator: jest.fn(),
  isSplitParticipant: jest.fn(),
  isParticipantInSplit: jest.fn(),
  canAccessParticipantPayments: jest.fn(),
  canAccessReceipt: jest.fn(),
  canAccessDispute: jest.fn(),
  isGroupMember: jest.fn(),
  isGroupAdmin: jest.fn(),
  filterAccessibleSplits: jest.fn(),
  filterAccessibleReceipts: jest.fn(),
  filterAccessibleDisputes: jest.fn(),
};

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  const mockUserId     = 'user-123';
  const mockSplitId    = 'split-123';
  const mockReceiptId  = 'receipt-123';
  const mockDisputeId  = 'dispute-123';
  const mockGroupId    = 'group-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: AccessScopeService, useValue: mockAccessScope },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canAccessSplit', () => {
    it('should allow access for split creator', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      expect(await service.canAccessSplit(mockUserId, mockSplitId)).toBe(true);
    });

    it('should allow access for participant', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      expect(await service.canAccessSplit(mockUserId, mockSplitId)).toBe(true);
    });

    it('should deny access for non-participant', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(false);
      expect(await service.canAccessSplit(mockUserId, mockSplitId)).toBe(false);
    });

    it('should deny access for non-existent split', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(false);
      expect(await service.canAccessSplit(mockUserId, mockSplitId)).toBe(false);
    });
  });

  describe('canCreatePayment', () => {
    it('should allow payment creation for split participant', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      expect(await service.canCreatePayment(mockUserId, mockSplitId)).toBe(true);
    });
  });

  describe('canAddParticipant', () => {
    it('should allow creator to add participants', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      expect(await service.canAddParticipant(mockUserId, mockSplitId)).toBe(true);
    });

    it('should allow participant to add participants', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      expect(await service.canAddParticipant(mockUserId, mockSplitId)).toBe(true);
    });
  });

  describe('canRemoveParticipant', () => {
    it('should allow creator to remove participants', async () => {
      mockAccessScope.isSplitCreator.mockResolvedValue(true);
      expect(await service.canRemoveParticipant(mockUserId, mockSplitId)).toBe(true);
    });

    it('should deny non-creator from removing participants', async () => {
      mockAccessScope.isSplitCreator.mockResolvedValue(false);
      expect(await service.canRemoveParticipant(mockUserId, mockSplitId)).toBe(false);
    });
  });

  describe('canCreatePaymentForParticipant', () => {
    const mockParticipantId = 'participant-123';

    it('should allow user to create payment for themselves', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      mockAccessScope.isParticipantInSplit.mockResolvedValue(true);
      expect(
        await service.canCreatePaymentForParticipant(mockUserId, mockSplitId, mockParticipantId),
      ).toBe(true);
    });

    it('should allow creator to create payment for any participant', async () => {
      mockAccessScope.canAccessSplit.mockResolvedValue(true);
      mockAccessScope.isParticipantInSplit.mockResolvedValue(true);
      expect(
        await service.canCreatePaymentForParticipant(mockUserId, mockSplitId, mockParticipantId),
      ).toBe(true);
    });
  });

  describe('canAccessReceipt', () => {
    it('should allow access to receipt for accessible split', async () => {
      mockAccessScope.canAccessReceipt.mockResolvedValue(true);
      expect(await service.canAccessReceipt(mockUserId, mockReceiptId)).toBe(true);
    });

    it('should deny access to receipt for inaccessible split', async () => {
      mockAccessScope.canAccessReceipt.mockResolvedValue(false);
      expect(await service.canAccessReceipt(mockUserId, mockReceiptId)).toBe(false);
    });
  });

  describe('canAccessDispute', () => {
    it('should allow access to dispute for accessible split', async () => {
      mockAccessScope.canAccessDispute.mockResolvedValue(true);
      expect(await service.canAccessDispute(mockUserId, mockDisputeId)).toBe(true);
    });

    it('should deny access to dispute for inaccessible split', async () => {
      mockAccessScope.canAccessDispute.mockResolvedValue(false);
      expect(await service.canAccessDispute(mockUserId, mockDisputeId)).toBe(false);
    });
  });

  describe('canAccessGroup', () => {
    it('should allow access for group creator', async () => {
      mockAccessScope.isGroupMember.mockResolvedValue(true);
      expect(await service.canAccessGroup(mockUserId, mockGroupId)).toBe(true);
    });

    it('should allow access for group member', async () => {
      mockAccessScope.isGroupMember.mockResolvedValue(true);
      expect(await service.canAccessGroup(mockUserId, mockGroupId)).toBe(true);
    });

    it('should deny access for non-member', async () => {
      mockAccessScope.isGroupMember.mockResolvedValue(false);
      expect(await service.canAccessGroup(mockUserId, mockGroupId)).toBe(false);
    });
  });

  describe('canManageGroupMembers', () => {
    it('should allow creator to manage members', async () => {
      mockAccessScope.isGroupAdmin.mockResolvedValue(true);
      expect(await service.canManageGroupMembers(mockUserId, mockGroupId)).toBe(true);
    });

    it('should allow admin to manage members', async () => {
      mockAccessScope.isGroupAdmin.mockResolvedValue(true);
      expect(await service.canManageGroupMembers(mockUserId, mockGroupId)).toBe(true);
    });

    it('should deny non-admin from managing members', async () => {
      mockAccessScope.isGroupAdmin.mockResolvedValue(false);
      expect(await service.canManageGroupMembers(mockUserId, mockGroupId)).toBe(false);
    });
  });

  describe('filterAccessibleSplits', () => {
    it('should filter splits accessible to user', async () => {
      mockAccessScope.filterAccessibleSplits.mockResolvedValue(['split-1', 'split-2']);
      const result = await service.filterAccessibleSplits(mockUserId, ['split-1', 'split-2', 'split-3']);
      expect(result).toEqual(['split-1', 'split-2']);
    });
  });

  describe('filterAccessibleReceipts', () => {
    it('should filter receipts accessible to user', async () => {
      mockAccessScope.filterAccessibleReceipts.mockResolvedValue(['receipt-1', 'receipt-2']);
      const result = await service.filterAccessibleReceipts(mockUserId, ['receipt-1', 'receipt-2', 'receipt-3']);
      expect(result).toEqual(['receipt-1', 'receipt-2']);
    });
  });

  describe('filterAccessibleDisputes', () => {
    it('should filter disputes accessible to user', async () => {
      mockAccessScope.filterAccessibleDisputes.mockResolvedValue(['dispute-1', 'dispute-2']);
      const result = await service.filterAccessibleDisputes(mockUserId, ['dispute-1', 'dispute-2', 'dispute-3']);
      expect(result).toEqual(['dispute-1', 'dispute-2']);
    });
  });
});
