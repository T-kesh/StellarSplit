import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DisputeCreatedEvent,
  DisputeResolvedEvent,
  DisputeRejectedEvent,
  DisputeAppealedEvent,
  SplitFrozenEvent,
  SplitUnfrozenEvent,
} from '../dispute.events';
import { DisputeOutboxPublisher } from '../dispute-outbox.publisher';

/**
 * Event listener for dispute audit trail
 * Logs all dispute events for compliance and debugging
 * TODO: Integrate with audit logging service
 */
@Injectable()
export class DisputeAuditListener {
  private readonly logger = new Logger(DisputeAuditListener.name);

  constructor(private readonly outboxPublisher: DisputeOutboxPublisher) {}

  @OnEvent('dispute.created')
  async handleDisputeCreatedAudit(payload: DisputeCreatedEvent) {
    this.logger.debug(
      `AUDIT: Dispute created ${payload.dispute.id} | ` +
      `Split: ${payload.dispute.splitId} | ` +
      `Type: ${payload.dispute.disputeType} | ` +
      `Raised by: ${payload.raisedBy}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.audit.created',
      {
        disputeId: payload.dispute.id,
        splitId: payload.dispute.splitId,
        disputeType: payload.dispute.disputeType,
        description: payload.dispute.description,
        raisedBy: payload.raisedBy,
        timestamp: payload.timestamp,
      },
    );
  }

  @OnEvent('dispute.resolved')
  async handleDisputeResolvedAudit(payload: DisputeResolvedEvent) {
    this.logger.debug(
      `AUDIT: Dispute resolved ${payload.dispute.id} | ` +
      `Outcome: ${payload.outcome} | ` +
      `Resolved by: ${payload.resolvedBy}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.audit.resolved',
      {
        disputeId: payload.dispute.id,
        outcome: payload.outcome,
        resolution: payload.resolution,
        resolvedBy: payload.resolvedBy,
        timestamp: payload.timestamp,
      },
    );
  }

  @OnEvent('dispute.rejected')
  async handleDisputeRejectedAudit(payload: DisputeRejectedEvent) {
    this.logger.debug(
      `AUDIT: Dispute rejected ${payload.dispute.id} | ` +
      `Reason: ${payload.reason} | ` +
      `Rejected by: ${payload.resolvedBy}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.audit.rejected',
      {
        disputeId: payload.dispute.id,
        reason: payload.reason,
        resolvedBy: payload.resolvedBy,
        timestamp: payload.timestamp,
      },
    );
  }

  @OnEvent('dispute.appealed')
  async handleDisputeAppealedAudit(payload: DisputeAppealedEvent) {
    this.logger.debug(
      `AUDIT: Dispute appealed ${payload.dispute.id} | ` +
      `Original: ${payload.originalDisputeId} | ` +
      `Appealed by: ${payload.appealedBy}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.audit.appealed',
      {
        disputeId: payload.dispute.id,
        originalDisputeId: payload.originalDisputeId,
        appealedBy: payload.appealedBy,
        appealReason: payload.appealReason,
        timestamp: payload.timestamp,
      },
    );
  }

  @OnEvent('split.frozen')
  async handleSplitFrozenAudit(payload: SplitFrozenEvent) {
    this.logger.debug(
      `AUDIT: Split frozen ${payload.splitId} | ` +
      `By dispute: ${payload.disputeId} | ` +
      `Reason: ${payload.freezeReason}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.disputeId,
      'dispute.audit.split_frozen',
      {
        splitId: payload.splitId,
        disputeId: payload.disputeId,
        freezeReason: payload.freezeReason,
        timestamp: payload.timestamp,
      },
    );
  }

  @OnEvent('split.unfrozen')
  async handleSplitUnfrozenAudit(payload: SplitUnfrozenEvent) {
    this.logger.debug(
      `AUDIT: Split unfrozen ${payload.splitId} | ` +
      `By dispute: ${payload.disputeId} | ` +
      `Reason: ${payload.unfreezeReason}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.disputeId,
      'dispute.audit.split_unfrozen',
      {
        splitId: payload.splitId,
        disputeId: payload.disputeId,
        unfreezeReason: payload.unfreezeReason,
        timestamp: payload.timestamp,
      },
    );
  }
}
