import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Dispute } from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { Split } from '../entities/split.entity';
import { DisputeNotificationListener } from './listeners/dispute-notification.listener';
import { DisputeAuditListener } from './listeners/dispute-audit.listener';
import { BlockchainClient } from './blockchain.client';
import {
  DisputeOutboxEvent,
  DisputeOutboxPublisher,
} from './dispute-outbox.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dispute,
      DisputeEvidence,
      Split,
      DisputeOutboxEvent,
    ]),
    EventEmitterModule,
  ],
  controllers: [DisputesController],
  providers: [
    DisputesService,
    DisputeNotificationListener,
    DisputeAuditListener,
    BlockchainClient,
    DisputeOutboxPublisher,
  ],
  exports: [DisputesService],
})
export class DisputesModule {}
