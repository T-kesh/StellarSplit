import { BadRequestException, NotFoundException } from "@nestjs/common";
import { SettlementService } from "../settlement.service";
import { StepStatus } from "../entities/settlement-step.entity";

describe("SettlementService", () => {
  const stepRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const participantRepo = {
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const userRepo = {
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const stellarService = {
    verifyTransaction: jest.fn(),
  };

  let service: SettlementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettlementService(
      stepRepo as any,
      participantRepo as any,
      userRepo as any,
      stellarService as any,
    );
  });

  it("completes a verified settlement step", async () => {
    const step = {
      id: "step-1",
      fromAddress: "GABC",
      toAddress: "GXYZ",
      amount: 25,
      relatedSplitIds: ["split-1"],
      status: StepStatus.PENDING,
    };

    stepRepo.findOne.mockResolvedValue(step);
    stellarService.verifyTransaction.mockResolvedValue({
      valid: true,
      sender: "GABC",
      receiver: "GXYZ",
      amount: 25,
    });
    stepRepo.save.mockResolvedValue({
      ...step,
      status: StepStatus.COMPLETED,
    });

    const result = await service.verifyAndCompleteStep(
      "step-1",
      "tx-hash",
      "GABC",
    );

    expect(participantRepo.update).toHaveBeenCalledWith(
      { splitId: "split-1", walletAddress: "GABC" },
      {
        status: "paid",
        amountPaid: expect.any(Function),
      },
    );
    expect(stepRepo.save).toHaveBeenCalledWith({
      ...step,
      status: StepStatus.COMPLETED,
    });
    expect(result.status).toBe(StepStatus.COMPLETED);
  });

  it("throws when the settlement step is missing", async () => {
    stepRepo.findOne.mockResolvedValue(null);

    await expect(
      service.verifyAndCompleteStep("missing", "tx-hash", "GABC"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws when verification does not match the step", async () => {
    stepRepo.findOne.mockResolvedValue({
      id: "step-1",
      fromAddress: "GABC",
      toAddress: "GXYZ",
      amount: 25,
      relatedSplitIds: ["split-1"],
      status: StepStatus.PENDING,
    });
    stellarService.verifyTransaction.mockResolvedValue({
      valid: true,
      sender: "GOTHER",
      receiver: "GXYZ",
      amount: 25,
    });

    await expect(
      service.verifyAndCompleteStep("step-1", "tx-hash", "GABC"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("calculates a net position from the participant query", async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        owes: "12.50",
        owed: "20.00",
      }),
    };
    participantRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.calculateNetPosition("GABC");

    expect(result).toEqual({
      owes: 12.5,
      owed: 20,
      net: 7.5,
    });
  });

  it("snoozes suggestions for seven days", async () => {
    userRepo.update.mockResolvedValue(undefined);

    const result = await service.snoozeSuggestions("user-1");

    expect(userRepo.update).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        snoozedUntil: expect.any(Date),
      }),
    );
    expect(result.snoozedUntil).toBeInstanceOf(Date);
  });

  it("reports when a user is snoozed", async () => {
    userRepo.findOne.mockResolvedValue({ id: "user-1" });

    await expect(service.isSnoozed("user-1")).resolves.toBe(true);
  });
});
