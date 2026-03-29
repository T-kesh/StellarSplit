import { Test, TestingModule } from "@nestjs/testing";
import { CollaborationController } from "./collaboration.controller";
import { CollaborationService } from "./collaboration.service";
import {
    CollaborationStatus,
    CollaborationRole,
    CollaborationType,
} from "./entities/collaboration.entity";
import { Artist } from "../artists/entities/artist.entity";

describe("CollaborationController", () => {
    let controller: CollaborationController;
    let service: CollaborationService;

    const mockArtist: Artist = {
        id: "artist-id",
        walletAddress: "artist-wallet",
        displayName: "Test Artist",
        status: "active" as any,
        type: "individual" as any,
        reputationScore: 4.5,
        totalCollaborations: 10,
        successfulCollaborations: 8,
        isVerified: true,
        collaborations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockCollaboration = {
        id: "collab-id",
        trackId: "track-123",
        trackTitle: "Test Track",
        artist: mockArtist,
        artistId: "artist-id",
        invitedBy: "inviter-wallet",
        status: CollaborationStatus.INVITED,
        role: CollaborationRole.COLLABORATOR,
        type: CollaborationType.TRACK_COLLABORATION,
        splitPercentage: 25,
        message: "Test collaboration invite",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockService = {
        createCollaboration: jest.fn(),
        getCollaborationsForUser: jest.fn(),
        getCollaborationById: jest.fn(),
        respondToCollaboration: jest.fn(),
        removeCollaboration: jest.fn(),
        getCollaborationStats: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CollaborationController],
            providers: [
                {
                    provide: CollaborationService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<CollaborationController>(
            CollaborationController,
        );
        service = module.get<CollaborationService>(CollaborationService);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("createCollaboration", () => {
        it("should create a collaboration", async () => {
            const createDto = {
                trackId: "track-123",
                trackTitle: "Test Track",
                artistWalletAddress: "artist-wallet",
                role: CollaborationRole.COLLABORATOR,
                type: CollaborationType.TRACK_COLLABORATION,
                splitPercentage: 25,
                message: "Test collaboration invite",
            };

            mockService.createCollaboration.mockResolvedValue(
                mockCollaboration,
            );

            const result = await controller.createCollaboration(
                { user: { wallet: "inviter-wallet" } } as any,
                createDto,
            );

            expect(service.createCollaboration).toHaveBeenCalledWith(
                "inviter-wallet",
                createDto,
            );
            expect(result).toEqual(mockCollaboration);
        });
    });

    describe("getCollaborations", () => {
        it("should return user collaborations", async () => {
            const mockResponse = {
                collaborations: [mockCollaboration],
                total: 1,
            };

            mockService.getCollaborationsForUser.mockResolvedValue(
                mockResponse,
            );

            const result = await controller.getCollaborations(
                { user: { wallet: "user-wallet" } } as any,
                CollaborationStatus.INVITED,
                "1",
                "10",
            );

            expect(service.getCollaborationsForUser).toHaveBeenCalledWith(
                "user-wallet",
                CollaborationStatus.INVITED,
                1,
                10,
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe("getCollaborationById", () => {
        it("should return a specific collaboration", async () => {
            mockService.getCollaborationById.mockResolvedValue(
                mockCollaboration,
            );

            const result = await controller.getCollaborationById("collab-id", {
                user: { wallet: "user-wallet" },
            } as any);

            expect(service.getCollaborationById).toHaveBeenCalledWith(
                "collab-id",
                "user-wallet",
            );
            expect(result).toEqual(mockCollaboration);
        });
    });

    describe("respondToCollaboration", () => {
        it("should respond to a collaboration invitation", async () => {
            const responseDto = {
                status: CollaborationStatus.ACTIVE as CollaborationStatus.ACTIVE,
                responseMessage: "I accept!",
            };

            const updatedCollaboration = {
                ...mockCollaboration,
                status: CollaborationStatus.ACTIVE,
                respondedAt: new Date(),
                respondedBy: "artist-wallet",
                responseMessage: "I accept!",
            };

            mockService.respondToCollaboration.mockResolvedValue(
                updatedCollaboration,
            );

            const result = await controller.respondToCollaboration(
                "collab-id",
                { user: { wallet: "artist-wallet" } } as any,
                responseDto,
            );

            expect(service.respondToCollaboration).toHaveBeenCalledWith(
                "collab-id",
                "artist-wallet",
                responseDto,
            );
            expect(result).toEqual(updatedCollaboration);
        });
    });

    describe("removeCollaboration", () => {
        it("should remove a collaboration", async () => {
            const removeDto = {
                removalReason: "No longer needed",
            };

            const removedCollaboration = {
                ...mockCollaboration,
                status: CollaborationStatus.REMOVED,
                removedAt: new Date(),
                removedBy: "inviter-wallet",
                removalReason: "No longer needed",
            };

            mockService.removeCollaboration.mockResolvedValue(
                removedCollaboration,
            );

            const result = await controller.removeCollaboration(
                "collab-id",
                { user: { wallet: "inviter-wallet" } } as any,
                removeDto,
            );

            expect(service.removeCollaboration).toHaveBeenCalledWith(
                "collab-id",
                "inviter-wallet",
                "No longer needed",
            );
            expect(result).toEqual(removedCollaboration);
        });
    });

    describe("getCollaborationStats", () => {
        it("should return collaboration statistics", async () => {
            const mockStats = {
                totalInvites: 5,
                activeCollaborations: 3,
                pendingResponses: 2,
                rejectedInvites: 1,
                completedCollaborations: 2,
                averageResponseTime: 24.5,
            };

            mockService.getCollaborationStats.mockResolvedValue(mockStats);

            const result = await controller.getCollaborationStats({
                user: { wallet: "user-wallet" },
            } as any);

            expect(service.getCollaborationStats).toHaveBeenCalledWith(
                "user-wallet",
            );
            expect(result).toEqual(mockStats);
        });
    });
});
