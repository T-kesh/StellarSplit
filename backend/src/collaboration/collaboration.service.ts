import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, Not, IsNull } from "typeorm";
import {
    Collaboration,
    CollaborationStatus,
} from "./entities/collaboration.entity";
import { Artist } from "../artists/entities/artist.entity";
import { CreateCollaborationDto } from "./dto/create-collaboration.dto";
import { RespondToCollaborationDto } from "./dto/update-collaboration.dto";
import { CollaborationNotificationService } from "./services/notification.service";

@Injectable()
export class CollaborationService {
    constructor(
        @InjectRepository(Collaboration)
        private readonly collaborationRepository: Repository<Collaboration>,
        @InjectRepository(Artist)
        private readonly artistRepository: Repository<Artist>,
        private readonly dataSource: DataSource,
        private readonly notificationService: CollaborationNotificationService,
    ) {}

    async createCollaboration(
        inviterWallet: string,
        createDto: CreateCollaborationDto,
    ): Promise<Collaboration> {
        return await this.dataSource.transaction(async (manager) => {
            // Check if artist exists
            const artist = await manager.findOne(Artist, {
                where: { walletAddress: createDto.artistWalletAddress },
            });

            if (!artist) {
                throw new NotFoundException("Artist not found");
            }

            // Check for duplicate invitation
            const existingCollaboration = await manager.findOne(Collaboration, {
                where: {
                    trackId: createDto.trackId,
                    artistId: artist.id,
                    status: CollaborationStatus.INVITED,
                },
            });

            if (existingCollaboration) {
                throw new ConflictException(
                    "Collaboration invitation already exists",
                );
            }

            // Validate split percentage if provided
            if (createDto.splitPercentage !== undefined) {
                await this.validateSplitPercentage(
                    manager,
                    createDto.trackId,
                    createDto.splitPercentage,
                );
            }

            // Create collaboration
            const collaboration = manager.create(Collaboration, {
                ...createDto,
                artistId: artist.id,
                invitedBy: inviterWallet,
                status: CollaborationStatus.INVITED,
                auditLog: [
                    {
                        action: "invited",
                        performedBy: inviterWallet,
                        performedAt: new Date(),
                        details: {
                            role: createDto.role,
                            type: createDto.type,
                            splitPercentage: createDto.splitPercentage,
                        },
                    },
                ],
            });

            const savedCollaboration = await manager.save(collaboration);

            // Send notification to artist
            await this.notificationService.sendCollaborationInvitation(
                artist.walletAddress,
                {
                    collaborationId: savedCollaboration.id,
                    trackTitle: createDto.trackTitle,
                    inviterWallet,
                    role: createDto.role,
                    message: createDto.message,
                },
            );

            return savedCollaboration;
        });
    }

    async respondToCollaboration(
        collaborationId: string,
        artistWallet: string,
        responseDto: RespondToCollaborationDto,
    ): Promise<Collaboration> {
        return await this.dataSource.transaction(async (manager) => {
            const collaboration = await manager.findOne(Collaboration, {
                where: { id: collaborationId },
                relations: ["artist"],
            });

            if (!collaboration) {
                throw new NotFoundException("Collaboration not found");
            }

            // Verify the responding artist
            if (collaboration.artist.walletAddress !== artistWallet) {
                throw new ForbiddenException(
                    "You can only respond to your own invitations",
                );
            }

            // Check if invitation is still pending
            if (collaboration.status !== CollaborationStatus.INVITED) {
                throw new BadRequestException(
                    "This invitation is no longer pending",
                );
            }

            // Update collaboration
            const updatedCollaboration = await manager.save(Collaboration, {
                ...collaboration,
                status: responseDto.status,
                respondedAt: new Date(),
                respondedBy: artistWallet,
                responseMessage: responseDto.responseMessage,
                auditLog: [
                    ...(collaboration.auditLog || []),
                    {
                        action:
                            responseDto.status === CollaborationStatus.ACTIVE
                                ? "accepted"
                                : "rejected",
                        performedBy: artistWallet,
                        performedAt: new Date(),
                        details: {
                            responseMessage: responseDto.responseMessage,
                        },
                    },
                ],
            });

            // Send notification to inviter
            await this.notificationService.sendCollaborationResponse(
                collaboration.invitedBy,
                {
                    collaborationId: collaboration.id,
                    artistName: collaboration.artist.displayName,
                    artistWallet: artistWallet,
                    status: responseDto.status,
                    responseMessage: responseDto.responseMessage,
                },
            );

            return updatedCollaboration;
        });
    }

    async removeCollaboration(
        collaborationId: string,
        removerWallet: string,
        removalReason: string,
    ): Promise<Collaboration> {
        return await this.dataSource.transaction(async (manager) => {
            const collaboration = await manager.findOne(Collaboration, {
                where: { id: collaborationId },
                relations: ["artist"],
            });

            if (!collaboration) {
                throw new NotFoundException("Collaboration not found");
            }

            // Verify remover is either the inviter or the artist
            if (
                collaboration.invitedBy !== removerWallet &&
                collaboration.artist.walletAddress !== removerWallet
            ) {
                throw new ForbiddenException(
                    "You can only remove collaborations you are involved in",
                );
            }

            // Update collaboration
            const updatedCollaboration = await manager.save(Collaboration, {
                ...collaboration,
                status: CollaborationStatus.REMOVED,
                removedAt: new Date(),
                removedBy: removerWallet,
                removalReason,
                auditLog: [
                    ...(collaboration.auditLog || []),
                    {
                        action: "removed",
                        performedBy: removerWallet,
                        performedAt: new Date(),
                        details: { removalReason },
                    },
                ],
            });

            // Send notification to the other party
            const notifiedParty =
                collaboration.invitedBy === removerWallet
                    ? collaboration.artist.walletAddress
                    : collaboration.invitedBy;

            await this.notificationService.sendCollaborationRemoval(
                notifiedParty,
                {
                    collaborationId: collaboration.id,
                    removerWallet,
                    removalReason,
                },
            );

            return updatedCollaboration;
        });
    }

    async getCollaborationsForUser(
        userWallet: string,
        status?: CollaborationStatus,
        page = 1,
        limit = 10,
    ): Promise<{ collaborations: Collaboration[]; total: number }> {
        const queryBuilder = this.collaborationRepository
            .createQueryBuilder("collaboration")
            .leftJoinAndSelect("collaboration.artist", "artist")
            .where(
                "(collaboration.invitedBy = :userWallet OR collaboration.artist.walletAddress = :userWallet)",
                { userWallet },
            );

        if (status) {
            queryBuilder.andWhere("collaboration.status = :status", { status });
        }

        const [collaborations, total] = await queryBuilder
            .orderBy("collaboration.createdAt", "DESC")
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return { collaborations, total };
    }

    async getCollaborationById(
        collaborationId: string,
        userWallet: string,
    ): Promise<Collaboration> {
        const collaboration = await this.collaborationRepository.findOne({
            where: { id: collaborationId },
            relations: ["artist"],
        });

        if (!collaboration) {
            throw new NotFoundException("Collaboration not found");
        }

        // Verify user is involved in this collaboration
        if (
            collaboration.invitedBy !== userWallet &&
            collaboration.artist.walletAddress !== userWallet
        ) {
            throw new ForbiddenException(
                "You can only view collaborations you are involved in",
            );
        }

        return collaboration;
    }

    private async validateSplitPercentage(
        manager: any,
        trackId: string,
        newSplitPercentage: number,
    ): Promise<void> {
        // Get all active collaborations for this track
        const activeCollaborations = await manager.find(Collaboration, {
            where: {
                trackId,
                status: CollaborationStatus.ACTIVE,
                splitPercentage: Not(IsNull()),
            },
        });

        const totalCurrentPercentage = activeCollaborations.reduce(
            (sum, collab) => sum + (collab.splitPercentage || 0),
            0,
        );

        if (totalCurrentPercentage + newSplitPercentage > 100) {
            throw new BadRequestException(
                `Total split percentage cannot exceed 100%. Current: ${totalCurrentPercentage}%, Adding: ${newSplitPercentage}%`,
            );
        }
    }

    async getCollaborationStats(userWallet: string): Promise<any> {
        const stats = await this.collaborationRepository
            .createQueryBuilder("collaboration")
            .select(
                "COUNT(CASE WHEN collaboration.status = :invited THEN 1 END)",
                "totalInvites",
            )
            .addSelect(
                "COUNT(CASE WHEN collaboration.status = :active THEN 1 END)",
                "activeCollaborations",
            )
            .addSelect(
                "COUNT(CASE WHEN collaboration.status = :invited THEN 1 END)",
                "pendingResponses",
            )
            .addSelect(
                "COUNT(CASE WHEN collaboration.status = :rejected THEN 1 END)",
                "rejectedInvites",
            )
            .addSelect(
                "COUNT(CASE WHEN collaboration.status = :completed THEN 1 END)",
                "completedCollaborations",
            )
            .addSelect(
                "AVG(EXTRACT(EPOCH FROM (collaboration.respondedAt - collaboration.createdAt)) / 3600)",
                "averageResponseTime",
            )
            .where(
                "(collaboration.invitedBy = :userWallet OR collaboration.artist.walletAddress = :userWallet)",
                { userWallet },
            )
            .setParameter("invited", CollaborationStatus.INVITED)
            .setParameter("active", CollaborationStatus.ACTIVE)
            .setParameter("rejected", CollaborationStatus.REJECTED)
            .setParameter("completed", CollaborationStatus.COMPLETED)
            .getRawOne();

        return {
            totalInvites: parseInt(stats.totalInvites) || 0,
            activeCollaborations: parseInt(stats.activeCollaborations) || 0,
            pendingResponses: parseInt(stats.pendingResponses) || 0,
            rejectedInvites: parseInt(stats.rejectedInvites) || 0,
            completedCollaborations:
                parseInt(stats.completedCollaborations) || 0,
            averageResponseTime: stats.averageResponseTime
                ? parseFloat(stats.averageResponseTime)
                : undefined,
        };
    }
}
