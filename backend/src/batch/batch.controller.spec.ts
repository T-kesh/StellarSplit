import { Test, TestingModule } from "@nestjs/testing";
import { BatchController } from "./batch.controller";
import { BatchService } from "./batch.service";
import { AuthorizationService } from "../auth/services/authorization.service";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CreateBatchSplitsDto,
  CreateBatchPaymentsDto,
} from "./dto/create-batch.dto";
import { BatchStatusDto } from "./dto/batch-status.dto";
import { BatchJobStatus, BatchJobType } from "./entities/batch-job.entity";
import { ReceiptPolicyService } from "../receipts/receipt-policy.service";

describe("BatchController", () => {
  let controller: BatchController;
  let service: BatchService;

  const mockBatchService = {
    createBatchSplits: jest.fn(),
    createBatchPayments: jest.fn(),
    getBatchStatus: jest.fn(),
    retryFailedOperations: jest.fn(),
    cancelBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        {
          provide: BatchService,
          useValue: mockBatchService,
        },
        {
          provide: AuthorizationService,
          useValue: {
            canAccessSplit: jest.fn().mockResolvedValue(true),
            canCreatePayment: jest.fn().mockResolvedValue(true),
            canAddParticipant: jest.fn().mockResolvedValue(true),
            canRemoveParticipant: jest.fn().mockResolvedValue(true),
            canCreatePaymentForParticipant: jest.fn().mockResolvedValue(true),
            canAccessParticipantPayments: jest.fn().mockResolvedValue(true),
            canAccessReceipt: jest.fn().mockResolvedValue(true),
            canAccessDispute: jest.fn().mockResolvedValue(true),
            isAdmin: jest.fn().mockResolvedValue(false),
            canAccessGroup: jest.fn().mockResolvedValue(true),
            canManageGroupMembers: jest.fn().mockResolvedValue(true),
            canCreateGroupSplit: jest.fn().mockResolvedValue(true),
            filterAccessibleSplits: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ReceiptPolicyService,
          useValue: {
            canCreateReceipt: jest.fn().mockResolvedValue(true),
            canAccessReceipt: jest.fn().mockResolvedValue(true),
            canDeleteReceipt: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BatchController>(BatchController);
    service = module.get<BatchService>(BatchService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createBatchSplits", () => {
    it("should create batch splits", async () => {
      const dto: CreateBatchSplitsDto = {
        splits: [
          {
            totalAmount: 100,
            participants: [{ userId: "user1", amount: 50 }],
          },
        ],
      };

      const expectedResult: BatchStatusDto = {
        id: "batch-1",
        status: BatchJobStatus.PENDING,
        type: BatchJobType.SPLIT_CREATION,
        totalOperations: 1,
        completedOperations: 0,
        failedOperations: 0,
        progress: 0,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
      };

      mockBatchService.createBatchSplits.mockResolvedValue(expectedResult);

      const result = await controller.createBatchSplits(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createBatchSplits).toHaveBeenCalledWith(dto);
    });
  });

  describe("createBatchPayments", () => {
    it("should create batch payments", async () => {
      const dto: CreateBatchPaymentsDto = {
        payments: [
          {
            splitId: "split-1",
            participantId: "user1",
            stellarTxHash: "tx-hash",
          },
        ],
      };

      const expectedResult: BatchStatusDto = {
        id: "batch-1",
        status: BatchJobStatus.PENDING,
        type: BatchJobType.PAYMENT_PROCESSING,
        totalOperations: 1,
        completedOperations: 0,
        failedOperations: 0,
        progress: 0,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
      };

      mockBatchService.createBatchPayments.mockResolvedValue(expectedResult);

      const result = await controller.createBatchPayments(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createBatchPayments).toHaveBeenCalledWith(dto);
    });
  });

  describe("getBatchStatus", () => {
    it("should return batch status", async () => {
      const expectedResult: BatchStatusDto = {
        id: "batch-1",
        status: BatchJobStatus.PROCESSING,
        type: BatchJobType.SPLIT_CREATION,
        totalOperations: 10,
        completedOperations: 5,
        failedOperations: 0,
        progress: 50,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
      };

      mockBatchService.getBatchStatus.mockResolvedValue(expectedResult);

      const result = await controller.getBatchStatus("batch-1");

      expect(result).toEqual(expectedResult);
      expect(service.getBatchStatus).toHaveBeenCalledWith("batch-1");
    });
  });

  describe("retryBatch", () => {
    it("should retry failed operations", async () => {
      const body = { operationIds: ["op-1", "op-2"] };
      const expectedResult: BatchStatusDto = {
        id: "batch-1",
        status: BatchJobStatus.PENDING,
        type: BatchJobType.SPLIT_CREATION,
        totalOperations: 2,
        completedOperations: 0,
        failedOperations: 0,
        progress: 0,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
      };

      mockBatchService.retryFailedOperations.mockResolvedValue(expectedResult);

      const result = await controller.retryBatch("batch-1", body);

      expect(result).toEqual(expectedResult);
      expect(service.retryFailedOperations).toHaveBeenCalledWith(
        "batch-1",
        body.operationIds,
      );
    });

    it("should retry all failed operations if no ids provided", async () => {
      const body = {};
      const expectedResult: BatchStatusDto = {
        id: "batch-1",
        status: BatchJobStatus.PENDING,
        type: BatchJobType.SPLIT_CREATION,
        totalOperations: 5,
        completedOperations: 0,
        failedOperations: 0,
        progress: 0,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
      };

      mockBatchService.retryFailedOperations.mockResolvedValue(expectedResult);

      const result = await controller.retryBatch("batch-1", body);

      expect(result).toEqual(expectedResult);
      expect(service.retryFailedOperations).toHaveBeenCalledWith(
        "batch-1",
        undefined,
      );
    });
  });

  describe("cancelBatch", () => {
    it("should cancel batch", async () => {
      const expectedResult: BatchStatusDto = {
        id: "batch-1",
        status: BatchJobStatus.CANCELLED,
        type: BatchJobType.SPLIT_CREATION,
        totalOperations: 10,
        completedOperations: 5,
        failedOperations: 0,
        progress: 50,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        operations: [],
      };

      mockBatchService.cancelBatch.mockResolvedValue(expectedResult);

      const result = await controller.cancelBatch("batch-1");

      expect(result).toEqual(expectedResult);
      expect(service.cancelBatch).toHaveBeenCalledWith("batch-1");
    });
  });
});
