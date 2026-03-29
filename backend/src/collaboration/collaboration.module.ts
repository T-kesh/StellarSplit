import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Collaboration } from "./entities/collaboration.entity";
import { Artist } from "../artists/entities/artist.entity";
import { CollaborationService } from "./collaboration.service";
import { CollaborationController } from "./collaboration.controller";
import { CollaborationNotificationService } from "./services/notification.service";

@Module({
    imports: [TypeOrmModule.forFeature([Collaboration, Artist])],
    controllers: [CollaborationController],
    providers: [CollaborationService, CollaborationNotificationService],
    exports: [CollaborationService],
})
export class CollaborationModule {}
