import { Test, TestingModule } from "@nestjs/testing";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RecurringSplitsController } from "./recurring-splits.controller";
import {
  RecurringSplitsService,
  CreateRecurringSplitDto,
  UpdateRecurringSplitDto,
} from "./recurring-splits.service";
import { RecurringSplitsScheduler } from "./recurring-splits.scheduler";
import { RecurringSplit, RecurrenceFrequency } from "./recurring-split.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthorizationService } from "../auth/services/authorization.service";

describe("RecurringSplitsController", () => {
  let controller: RecurringSplitsController;
  let service: RecurringSplitsService;
  let scheduler: RecurringSplitsScheduler;

  const mockService = {
    createRecurringSplit: jest.fn(),
    getRecurringSplitsByCreator: jest.fn(),
    getRecurringSplitById: jest.fn(),
    updateRecurringSplit: jest.fn(),
    pauseRecurringSplit: jest.fn(),
    resumeRecurringSplit: jest.fn(),
    deleteRecurringSplit: jest.fn(),
    updateTemplate: jest.fn(),
    getRecurringSplitStats: jest.fn(),
  };

  const mockScheduler = {
    manuallyProcessRecurringSplit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringSplitsController],
      providers: [
        {
          provide: RecurringSplitsService,
          useValue: mockService,
        },
        {
          provide: RecurringSplitsScheduler,
          useValue: mockScheduler,
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
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RecurringSplitsController>(
      RecurringSplitsController,
    );
    service = module.get<RecurringSplitsService>(RecurringSplitsService);
    scheduler = module.get<RecurringSplitsScheduler>(RecurringSplitsScheduler);

    jest.clearAllMocks();
  });

  describe("createRecurringSplit", () => {
    it("should create a recurring split", async () => {
      const dto: CreateRecurringSplitDto = {
        creatorId: "creator123",
        templateSplitId: "split123",
        frequency: RecurrenceFrequency.MONTHLY,
      };

      const mockRecurringSplit = {
        id: "recurring123",
        ...dto,
      } as RecurringSplit;

      mockService.createRecurringSplit.mockResolvedValue(mockRecurringSplit);

      const result = await controller.createRecurringSplit(dto);

      expect(result.id).toBe("recurring123");
      expect(mockService.createRecurringSplit).toHaveBeenCalledWith(dto);
    });
  });

  describe("getRecurringSplitsByCreator", () => {
    it("should return all recurring splits for a creator", async () => {
      const creatorId = "creator123";
      const mockSplits = [
        {
          id: "recurring1",
          creatorId,
        } as RecurringSplit,
        {
          id: "recurring2",
          creatorId,
        } as RecurringSplit,
      ];

      mockService.getRecurringSplitsByCreator.mockResolvedValue(mockSplits);

      const result = await controller.getRecurringSplitsByCreator(creatorId);

      expect(result).toHaveLength(2);
      expect(mockService.getRecurringSplitsByCreator).toHaveBeenCalledWith(
        creatorId,
      );
    });
  });

  describe("getStats", () => {
    it("should return statistics for a creator", async () => {
      const creatorId = "creator123";
      const mockStats = {
        total: 5,
        active: 3,
        paused: 2,
        nextOccurrences: [],
      };

      mockService.getRecurringSplitStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(creatorId);

      expect(result.total).toBe(5);
      expect(result.active).toBe(3);
      expect(result.paused).toBe(2);
      expect(mockService.getRecurringSplitStats).toHaveBeenCalledWith(
        creatorId,
      );
    });
  });

  describe("getRecurringSplitById", () => {
    it("should return a recurring split by ID", async () => {
      const mockSplit = {
        id: "recurring123",
        creatorId: "creator123",
      } as RecurringSplit;

      mockService.getRecurringSplitById.mockResolvedValue(mockSplit);

      const result = await controller.getRecurringSplitById("recurring123");

      expect(result.id).toBe("recurring123");
      expect(mockService.getRecurringSplitById).toHaveBeenCalledWith(
        "recurring123",
      );
    });

    it("should throw NotFoundException if not found", async () => {
      mockService.getRecurringSplitById.mockRejectedValue(
        new NotFoundException("Recurring split not found"),
      );

      await expect(
        controller.getRecurringSplitById("nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateRecurringSplit", () => {
    it("should update a recurring split", async () => {
      const id = "recurring123";
      const dto: UpdateRecurringSplitDto = {
        frequency: RecurrenceFrequency.WEEKLY,
      };

      const mockUpdated = {
        id,
        ...dto,
      } as RecurringSplit;

      mockService.updateRecurringSplit.mockResolvedValue(mockUpdated);

      const result = await controller.updateRecurringSplit(id, dto);

      expect(result.frequency).toBe(RecurrenceFrequency.WEEKLY);
      expect(mockService.updateRecurringSplit).toHaveBeenCalledWith(id, dto);
    });
  });

  describe("pauseRecurringSplit", () => {
    it("should pause a recurring split", async () => {
      const mockPaused = {
        id: "recurring123",
        isActive: false,
      } as RecurringSplit;

      mockService.pauseRecurringSplit.mockResolvedValue(mockPaused);

      const result = await controller.pauseRecurringSplit("recurring123");

      expect(result.isActive).toBe(false);
      expect(mockService.pauseRecurringSplit).toHaveBeenCalledWith(
        "recurring123",
      );
    });
  });

  describe("resumeRecurringSplit", () => {
    it("should resume a recurring split", async () => {
      const mockResumed = {
        id: "recurring123",
        isActive: true,
      } as RecurringSplit;

      mockService.resumeRecurringSplit.mockResolvedValue(mockResumed);

      const result = await controller.resumeRecurringSplit("recurring123");

      expect(result.isActive).toBe(true);
      expect(mockService.resumeRecurringSplit).toHaveBeenCalledWith(
        "recurring123",
      );
    });
  });

  describe("deleteRecurringSplit", () => {
    it("should delete a recurring split", async () => {
      mockService.deleteRecurringSplit.mockResolvedValue(undefined);

      await expect(
        controller.deleteRecurringSplit("recurring123"),
      ).resolves.toBeUndefined();
      expect(mockService.deleteRecurringSplit).toHaveBeenCalledWith(
        "recurring123",
      );
    });
  });

  describe("updateTemplate", () => {
    it("should update the template split", async () => {
      const id = "recurring123";
      const dto = { totalAmount: 1500 };

      const mockUpdated = {
        id: "split123",
        totalAmount: 1500,
      };

      mockService.updateTemplate.mockResolvedValue(mockUpdated);

      const result = await controller.updateTemplate(id, dto);

      expect(result.totalAmount).toBe(1500);
      expect(mockService.updateTemplate).toHaveBeenCalledWith(id, dto);
    });
  });

  describe("processNow", () => {
    it("should manually process a recurring split", async () => {
      mockScheduler.manuallyProcessRecurringSplit.mockResolvedValue(undefined);

      const result = await controller.processNow("recurring123");

      expect(result.message).toBe("Recurring split processed successfully");
      expect(mockScheduler.manuallyProcessRecurringSplit).toHaveBeenCalledWith(
        "recurring123",
      );
    });

    it("should throw BadRequestException if processing fails", async () => {
      const error = new Error("Processing failed");
      mockScheduler.manuallyProcessRecurringSplit.mockRejectedValue(error);

      await expect(controller.processNow("recurring123")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
