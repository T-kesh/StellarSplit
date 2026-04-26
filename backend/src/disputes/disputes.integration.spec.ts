import { randomUUID } from "crypto";
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExpenseCategory } from "../compliance/entities/expense-category.entity";
import { Dispute } from "../entities/dispute.entity";
import { DisputeEvidence } from "../entities/dispute-evidence.entity";
import { Item } from "../entities/item.entity";
import { Participant } from "../entities/participant.entity";
import { Split } from "../entities/split.entity";
import {
  AddEvidenceDto,
  AppealDisputeDto,
  FileDisputeDto,
  ResolveDisputeDto,
  RequestMoreEvidenceDto,
  SubmitForReviewDto,
} from "./dto/dispute.dto";
import { DisputesController } from "./disputes.controller";
import { DisputesModule } from "./disputes.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { DisputeStatus, DisputeType } from "../entities/dispute.entity";
import { AuthorizationService } from "../auth/services/authorization.service";

jest.setTimeout(15000);



describe("Dispute Resolution System - Integration Tests", () => {
  let app: INestApplication;
  let module: TestingModule;
  let controller: DisputesController;
  let splitRepository: Repository<Split>;
  let eventEmitter: EventEmitter2;

  let sharedSplitId: string;
  let sharedDisputeId: string;

  const mockUser = { id: "test-user", walletAddress: "test-wallet", email: "test@example.com", raw: {} };

  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validateBody<T>(
    value: unknown,
    metatype: new () => T,
  ): Promise<T> {
    return (await validationPipe.transform(value, {
      type: "body",
      metatype,
      data: "",
    })) as T;
  }

  async function createSplit(overrides: Partial<Split> = {}): Promise<Split> {
    const split = splitRepository.create({
      totalAmount: 100,
      amountPaid: 0,
      status: "active",
      isFrozen: false,
      description: "Integration test split",
      preferredCurrency: "XLM",
      creatorWalletAddress: "GTESTWALLET",
      ...overrides,
    });

    return splitRepository.save(split);
  }

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [
            Dispute,
            DisputeEvidence,
            Split,
            Item,
            Participant,
            ExpenseCategory,
          ],
          synchronize: true,
          logging: false,
        }),
        EventEmitterModule.forRoot(),
        DisputesModule,
      ],
      providers: [
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
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get(DisputesController);
    splitRepository = module.get<Repository<Split>>(getRepositoryToken(Split));
    eventEmitter = module.get(EventEmitter2);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);

  describe("Dispute Lifecycle", () => {
    it("should create a split for testing", async () => {
      const split = await createSplit();
      sharedSplitId = split.id;
    });

    it("should file a dispute and freeze split", async () => {
      const response = await controller.fileDispute(
        await validateBody(
          {
            splitId: sharedSplitId,
            disputeType: DisputeType.INCORRECT_AMOUNT,
            description: "The amount charged does not match the itemized list",
          },
          FileDisputeDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(response).toHaveProperty("id");
      expect(response.status).toBe(DisputeStatus.OPEN);
      expect(response.splitFrozen).toBe(true);

      sharedDisputeId = response.id;
    });

    it("should retrieve dispute details", async () => {
      const response = await controller.getDisputeById(sharedDisputeId);

      expect(response.id).toBe(sharedDisputeId);
      expect(response.status).toBe(DisputeStatus.OPEN);
      expect(response.auditTrail.length).toBeGreaterThanOrEqual(1);
      expect(response.auditTrail[0].action).toBe("dispute_created");
    });

    it("should add evidence", async () => {
      const response = await controller.addEvidence(
        sharedDisputeId,
        await validateBody(
          {
            fileKey: "s3://bucket/receipt-1.jpg",
            fileName: "receipt.jpg",
            mimeType: "image/jpeg",
            size: 2048,
            description: "Original receipt from payment",
          },
          AddEvidenceDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(response).toHaveProperty("id");
      expect(response.fileName).toBe("receipt.jpg");
    });

    it("should list evidence", async () => {
      const response = await controller.getDisputeEvidence(sharedDisputeId);

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
      expect(response[0]).toHaveProperty("fileKey");
    });

    it("should submit for review", async () => {
      const response = await controller.submitForReview(
        sharedDisputeId,
        await validateBody({}, SubmitForReviewDto),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(response.status).toBe(DisputeStatus.UNDER_REVIEW);
    });

    it("should resolve dispute", async () => {
      const response = await controller.resolveDispute(
        sharedDisputeId,
        await validateBody(
          {
            outcome: "adjust_balances",
            resolution:
              "Dispute verified. Participant will receive credit of $25.",
            details: { adjustment: 25, currency: "USD" },
          },
          ResolveDisputeDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(response.status).toBe(DisputeStatus.RESOLVED);
      expect(response.splitFrozen).toBe(false);
      expect(response.resolutionOutcome?.outcome).toBe("adjust_balances");
    });

    it("should show the audit trail", async () => {
      const response = await controller.getDisputeAuditTrail(sharedDisputeId);

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThanOrEqual(3);
      expect(response[0].action).toBe("dispute_created");
    });
  });

  describe("Appeal Mechanism", () => {
    it("should appeal a resolved dispute", async () => {
      const response = await controller.appealDispute(
        sharedDisputeId,
        await validateBody(
          {
            appealReason:
              "The resolution was biased and did not consider all evidence",
          },
          AppealDisputeDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(response.status).toBe(DisputeStatus.APPEALED);
      expect(response.splitFrozen).toBe(true);
    });
  });

  describe("State Machine Validation", () => {
    it("should reject invalid state transitions", async () => {
      const split = await createSplit({
        description: "State machine test split",
      });

      const dispute = await controller.fileDispute(
        await validateBody(
          {
            splitId: split.id,
            disputeType: DisputeType.MISSING_PAYMENT,
            description: "Payment not received",
          },
          FileDisputeDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      await expect(
        controller.resolveDispute(
          dispute.id,
          await validateBody(
            {
              outcome: "no_change",
              resolution: "No action needed",
            },
            ResolveDisputeDto,
          ),
          mockUser as any, // Mock CurrentUser
          mockUser, // Test user
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent dispute", async () => {
      await expect(controller.getDisputeById(randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should reject invalid dispute type", async () => {
      const split = await createSplit({ description: "Validation test split" });

      await expect(
        validateBody(
          {
            splitId: split.id,
            disputeType: "invalid_type",
            description: "Test",
          },
          FileDisputeDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject missing required fields", async () => {
      const split = await createSplit({
        description: "Missing fields test split",
      });

      await expect(
        validateBody(
          {
            splitId: split.id,
          },
          FileDisputeDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("Admin Operations", () => {
    let adminTestDisputeId: string;

    it("should request more evidence", async () => {
      const split = await createSplit({
        description: "Admin operations split",
      });

      const dispute = await controller.fileDispute(
        await validateBody(
          {
            splitId: split.id,
            disputeType: DisputeType.WRONG_ITEMS,
            description: "Wrong items received",
          },
          FileDisputeDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      adminTestDisputeId = dispute.id;

      await controller.addEvidence(
        adminTestDisputeId,
        await validateBody(
          {
            fileKey: "s3://bucket/admin-evidence.jpg",
            fileName: "admin-evidence.jpg",
            mimeType: "image/jpeg",
            size: 1024,
            description: "Initial evidence for admin workflow",
          },
          AddEvidenceDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      const response = await controller.requestMoreEvidence(
        adminTestDisputeId,
        await validateBody(
          {
            evidenceRequest:
              "Please provide photos of the items received and the packing slip",
          },
          RequestMoreEvidenceDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(response.id).toBe(adminTestDisputeId);
    });

    it("should reject dispute", async () => {
      await controller.submitForReview(
        adminTestDisputeId,
        await validateBody({}, SubmitForReviewDto),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      const response = await controller.rejectDispute(adminTestDisputeId, {
        reason: "Insufficient evidence provided. Claim dismissed.",
      },
      mockUser as any, // Mock CurrentUser
      mockUser, // Test user
      );

      expect(response.status).toBe(DisputeStatus.REJECTED);
      expect(response.splitFrozen).toBe(false);
    });
  });

  describe("Query and Filtering", () => {
    it("should list disputes for admin", async () => {
      const response = await controller.adminListDisputes({
        page: 1,
        limit: 10,
      });

      expect(response).toHaveProperty("disputes");
      expect(response).toHaveProperty("total");
      expect(Array.isArray(response.disputes)).toBe(true);
    });

    it("should filter by status", async () => {
      const response = await controller.adminListDisputes({
        status: DisputeStatus.RESOLVED,
      });

      expect(
        response.disputes.every(
          (dispute) => dispute.status === DisputeStatus.RESOLVED,
        ),
      ).toBe(true);
    });

    it("should get disputes for a specific split", async () => {
      const response = await controller.getDisputesBySplit(sharedSplitId);

      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe("Notification Events", () => {
    it("should emit events when a dispute is created", async () => {
      const split = await createSplit({ description: "Event emission split" });
      const eventSpy = jest.spyOn(eventEmitter, "emit");

      await controller.fileDispute(
        await validateBody(
          {
            splitId: split.id,
            disputeType: DisputeType.INCORRECT_AMOUNT,
            description: "Amount mismatch",
          },
          FileDisputeDto,
        ),
        mockUser as any, // Mock CurrentUser
        mockUser, // Test user
      );

      expect(eventSpy).toHaveBeenCalledWith(
        "dispute.created",
        expect.any(Object),
      );
      expect(eventSpy).toHaveBeenCalledWith("split.frozen", expect.any(Object));
    });
  });
});
