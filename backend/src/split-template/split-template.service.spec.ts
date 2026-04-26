import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { SplitTemplateService } from "./split-template.service";
import { SplitTemplate } from "./entities/split-template.entity";
import { CreateSplitTemplateDto } from "./dto/create-split-template.dto";
import { CreateSplitFromTemplateDto } from "./dto/create-split-from-template.dto";
import { SplitType } from "./entities/split-template.entity";
import { NotFoundException } from "@nestjs/common";
import { SplitsService } from "../modules/splits/splits.service";

describe("SplitTemplateService", () => {
    let service: SplitTemplateService;
    let repository: Repository<SplitTemplate>;
    let splitsService: jest.Mocked<SplitsService>;
    let mockDataSource: jest.Mocked<DataSource>;

    const mockTemplate: SplitTemplate = {
        id: "test-id",
        userId: "test-wallet-address",
        name: "Test Template",
        description: "Test Description",
        splitType: SplitType.EQUAL,
        defaultParticipants: [{ name: "John", walletAddress: "wallet-1", share: 50 }],
        defaultItems: [{ name: "Item 1", price: 10 }],
        taxPercentage: 10,
        tipPercentage: 15,
        usageCount: 0,
        createdAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOneBy: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        increment: jest.fn(),
    };

    const mockSplit = { id: "split-1" } as any;

    beforeEach(async () => {
        const mockManager = {
            getRepository: jest.fn().mockReturnValue(mockRepository),
        };

        mockDataSource = {
            transaction: jest.fn(async (cb) => cb(mockManager)),
        } as any;

        splitsService = {
            createSplit: jest.fn(),
        } as any;

        (splitsService.createSplit as jest.Mock).mockResolvedValue(mockSplit);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SplitTemplateService,
                {
                    provide: getRepositoryToken(SplitTemplate),
                    useValue: mockRepository,
                },
                {
                    provide: SplitsService,
                    useValue: splitsService,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        service = module.get<SplitTemplateService>(SplitTemplateService);
        repository = module.get<Repository<SplitTemplate>>(
            getRepositoryToken(SplitTemplate),
        );
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("create", () => {
        it("should create a new split template", async () => {
            const userId = "test-wallet-address";
            const createDto: CreateSplitTemplateDto = {
                name: "Test Template",
                description: "Test Description",
                splitType: SplitType.EQUAL,
                defaultParticipants: [{ name: "John", share: 50 }],
                defaultItems: [{ name: "Item 1", price: 10 }],
                taxPercentage: 10,
                tipPercentage: 15,
            };

            mockRepository.create.mockReturnValue(mockTemplate);
            mockRepository.save.mockResolvedValue(mockTemplate);

            const result = await service.create(userId, createDto);

            expect(repository.create).toHaveBeenCalledWith({
                ...createDto,
                userId,
            });
            expect(repository.save).toHaveBeenCalledWith(mockTemplate);
            expect(result).toEqual(mockTemplate);
        });
    });

    describe("findAllForUser", () => {
        it("should return all templates for a user", async () => {
            const userId = "test-wallet-address";
            const templates = [mockTemplate];

            mockRepository.find.mockResolvedValue(templates);

            const result = await service.findAllForUser(userId);

            expect(repository.find).toHaveBeenCalledWith({ where: { userId } });
            expect(result).toEqual(templates);
        });
    });

    describe("findOne", () => {
        it("should return a template by id", async () => {
            const templateId = "test-id";

            mockRepository.findOneBy.mockResolvedValue(mockTemplate);

            const result = await service.findOne(templateId);

            expect(repository.findOneBy).toHaveBeenCalledWith({
                id: templateId,
            });
            expect(result).toEqual(mockTemplate);
        });
    });

    describe("update", () => {
        it("should update a template", async () => {
            const templateId = "test-id";
            const updateDto = { name: "Updated Template" };

            mockRepository.update.mockResolvedValue(undefined);

            const result = await service.update(templateId, updateDto as any);

            expect(repository.update).toHaveBeenCalledWith(
                templateId,
                updateDto,
            );
            expect(result).toEqual(undefined);
        });
    });

    describe("delete", () => {
        it("should delete a template", async () => {
            const templateId = "test-id";

            mockRepository.delete.mockResolvedValue(undefined);

            const result = await service.delete(templateId);

            expect(repository.delete).toHaveBeenCalledWith(templateId);
            expect(result).toEqual(undefined);
        });
    });

    describe("createSplitFromTemplate", () => {
        it("should create a split from template", async () => {
            const templateId = "test-id";

            mockRepository.findOneBy.mockResolvedValue(mockTemplate);
            mockRepository.increment.mockResolvedValue(undefined);

            const result = await service.createSplitFromTemplate(templateId);

            expect(repository.findOneBy).toHaveBeenCalledWith({
                id: templateId,
            });
            expect(repository.increment).toHaveBeenCalledWith(
                { id: templateId },
                "usageCount",
                1,
            );

            const expectedTotalAmount = 10 + 10 * (10 / 100) + 10 * (15 / 100); // 12.5
            expect(splitsService.createSplit).toHaveBeenCalledWith(
                {
                    totalAmount: expectedTotalAmount,
                    description: mockTemplate.description,
                    creatorWalletAddress: mockTemplate.userId,
                    participants: [
                        {
                            userId: "wallet-1",
                            walletAddress: "wallet-1",
                            amountOwed: expectedTotalAmount,
                        },
                    ],
                    items: [
                        {
                            name: "Item 1",
                            quantity: 1,
                            unitPrice: 10,
                            totalPrice: 10,
                            category: undefined,
                            assignedToIds: [],
                        },
                    ],
                },
                expect.anything(),
            );
            expect(result).toEqual(mockSplit);
        });

        it("should apply overrides when provided", async () => {
            const templateId = "test-id";
            const overrideDto: CreateSplitFromTemplateDto = {
                participantOverrides: [
                    { name: "Jane", walletAddress: "wallet-2", share: 75 },
                ],
                itemOverrides: [{ name: "Item 2", price: 20 }],
            };

            mockRepository.findOneBy.mockResolvedValue(mockTemplate);
            mockRepository.increment.mockResolvedValue(undefined);

            const result = await service.createSplitFromTemplate(
                templateId,
                overrideDto,
            );

            const expectedSubtotal = 20;
            const expectedTotalAmount = expectedSubtotal +
                expectedSubtotal * (10 / 100) +
                expectedSubtotal * (15 / 100); // 25

            expect(splitsService.createSplit).toHaveBeenCalledWith(
                {
                    totalAmount: expectedTotalAmount,
                    description: mockTemplate.description,
                    creatorWalletAddress: mockTemplate.userId,
                    participants: [
                        {
                            userId: "wallet-2",
                            walletAddress: "wallet-2",
                            amountOwed: expectedTotalAmount,
                        },
                    ],
                    items: [
                        {
                            name: "Item 2",
                            quantity: 1,
                            unitPrice: 20,
                            totalPrice: 20,
                            category: undefined,
                            assignedToIds: [],
                        },
                    ],
                },
                expect.anything(),
            );
            expect(result).toEqual(mockSplit);
        });

        it("should throw NotFoundException when template not found", async () => {
            const templateId = "non-existent-id";

            mockRepository.findOneBy.mockResolvedValue(null);

            await expect(
                service.createSplitFromTemplate(templateId),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
