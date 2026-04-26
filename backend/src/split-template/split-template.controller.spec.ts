import { Test, TestingModule } from "@nestjs/testing";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SplitTemplateController } from "./split-template.controller";
import { SplitTemplateService } from "./split-template.service";
import { CreateSplitTemplateDto } from "./dto/create-split-template.dto";
import { CreateSplitFromTemplateDto } from "./dto/create-split-from-template.dto";
import { SplitType } from "./entities/split-template.entity";
import { AuthUser } from "../auth/types/auth-user.interface";

describe("SplitTemplateController", () => {
    let controller: SplitTemplateController;
    let service: SplitTemplateService;

    const mockUser: AuthUser = {
        id: "test-wallet-address",
        walletAddress: "test-wallet-address",
        raw: { sub: "test-wallet-address" },
    };

    const mockTemplate = {
        id: "test-id",
        userId: "test-wallet-address",
        name: "Test Template",
        description: "Test Description",
        splitType: SplitType.EQUAL,
        defaultParticipants: [{ name: "John", share: 50 }],
        defaultItems: [{ name: "Item 1", price: 10 }],
        taxPercentage: 10,
        tipPercentage: 15,
        usageCount: 0,
        createdAt: new Date(),
    };

    const mockSplitTemplateService = {
        create: jest.fn(),
        findAllForUser: jest.fn(),
        createSplitFromTemplate: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SplitTemplateController],
            providers: [
                {
                    provide: SplitTemplateService,
                    useValue: mockSplitTemplateService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
            .overrideGuard(AuthorizationGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<SplitTemplateController>(
            SplitTemplateController,
        );
        service = module.get<SplitTemplateService>(SplitTemplateService);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("create", () => {
        it("should create a new split template", async () => {
            const createDto: CreateSplitTemplateDto = {
                name: "Test Template",
                description: "Test Description",
                splitType: SplitType.EQUAL,
                defaultParticipants: [{ name: "John", share: 50 }],
                defaultItems: [{ name: "Item 1", price: 10 }],
                taxPercentage: 10,
                tipPercentage: 15,
            };

            mockSplitTemplateService.create.mockResolvedValue(mockTemplate);

            const result = await controller.create(mockUser, createDto);

            expect(service.create).toHaveBeenCalledWith(
                mockUser.walletAddress,
                createDto,
            );
            expect(result).toEqual(mockTemplate);
        });
    });

    describe("findAll", () => {
        it("should return all templates for a user", async () => {
            const templates = [mockTemplate];
            mockSplitTemplateService.findAllForUser.mockResolvedValue(
                templates,
            );

            const result = await controller.findAll(mockUser);

            expect(service.findAllForUser).toHaveBeenCalledWith(
                mockUser.walletAddress,
            );
            expect(result).toEqual(templates);
        });
    });

    describe("createSplit", () => {
        it("should create a split from template", async () => {
            const templateId = "test-id";
            const expectedSplit = {
                splitType: SplitType.EQUAL,
                participants: [{ name: "John", share: 50 }],
                items: [{ name: "Item 1", price: 10 }],
                taxPercentage: 10,
                tipPercentage: 15,
            };

            mockSplitTemplateService.createSplitFromTemplate.mockResolvedValue(
                expectedSplit,
            );

            const result = await controller.createSplit(templateId);

            expect(service.createSplitFromTemplate).toHaveBeenCalledWith(
                templateId,
                undefined,
            );
            expect(result).toEqual(expectedSplit);
        });

        it("should create a split from template with overrides", async () => {
            const templateId = "test-id";
            const overrideDto: CreateSplitFromTemplateDto = {
                participantOverrides: [{ name: "Jane", share: 75 }],
                itemOverrides: [{ name: "Item 2", price: 20 }],
                customName: "Custom Split",
            };

            const expectedSplit = {
                splitType: SplitType.EQUAL,
                participants: [{ name: "Jane", share: 75 }],
                items: [{ name: "Item 2", price: 20 }],
                taxPercentage: 10,
                tipPercentage: 15,
            };

            mockSplitTemplateService.createSplitFromTemplate.mockResolvedValue(
                expectedSplit,
            );

            const result = await controller.createSplit(
                templateId,
                overrideDto,
            );

            expect(service.createSplitFromTemplate).toHaveBeenCalledWith(
                templateId,
                overrideDto,
            );
            expect(result).toEqual(expectedSplit);
        });
    });
});
