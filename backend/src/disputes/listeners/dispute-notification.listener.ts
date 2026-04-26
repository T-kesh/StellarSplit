import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DisputeCreatedEvent,
  DisputeEvidenceAddedEvent,
  DisputeUnderReviewEvent,
  DisputeResolvedEvent,
  DisputeRejectedEvent,
  DisputeAppealedEvent,
  MoreEvidenceRequestedEvent,
} from '../dispute.events';
import { DisputeOutboxPublisher } from '../dispute-outbox.publisher';

/**
 * Event listener for dispute notifications
 * Emits events to queue system for async notification delivery
 * TODO: Integrate with email/notification queue
 */
@Injectable()
export class DisputeNotificationListener {
  private readonly logger = new Logger(DisputeNotificationListener.name);

  constructor(private readonly outboxPublisher: DisputeOutboxPublisher) {}

  /**
   * When dispute is created:
   * - Notify all split participants
   * - Notify admins
   */
  @OnEvent('dispute.created')
  async handleDisputeCreated(payload: DisputeCreatedEvent) {
    this.logger.log(
      `Dispute created: ${payload.dispute.id} - Queuing notifications...`,
    );

    await this.outboxPublisher.enqueueEvent(payload.dispute.id, 'dispute.notification.created', {
      disputeId: payload.dispute.id,
      splitId: payload.dispute.splitId,
      raisedBy: payload.raisedBy,
      timestamp: payload.timestamp,
    });
  }

  /**
   * When evidence is added:
   * - Notify admins/reviewers
   */
  @OnEvent('dispute.evidence_added')
  async handleEvidenceAdded(payload: DisputeEvidenceAddedEvent) {
    this.logger.log(
      `Evidence added to dispute ${payload.dispute.id}: ${payload.evidence.fileName}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.notification.evidence_added',
      {
        disputeId: payload.dispute.id,
        evidenceId: payload.evidence.id,
        uploadedBy: payload.uploadedBy,
        fileName: payload.evidence.fileName,
        timestamp: payload.timestamp,
      },
    );
  }

  /**
   * When dispute is under review:
   * - Notify relevant admins
   */
  @OnEvent('dispute.under_review')
  async handleDisputeUnderReview(payload: DisputeUnderReviewEvent) {
    this.logger.log(`Dispute ${payload.dispute.id} is now under review`);

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.notification.under_review',
      {
        disputeId: payload.dispute.id,
        submittedAt: payload.submittedAt,
      },
    );
  }

  /**
   * When dispute is resolved:
   * - Notify all participants
   * - Include resolution details
   */
  @OnEvent('dispute.resolved')
  async handleDisputeResolved(payload: DisputeResolvedEvent) {
    this.logger.log(
      `Dispute ${payload.dispute.id} resolved with outcome: ${payload.outcome}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.notification.resolved',
      {
        disputeId: payload.dispute.id,
        outcome: payload.outcome,
        resolution: payload.resolution,
        resolvedBy: payload.resolvedBy,
        timestamp: payload.timestamp,
      },
    );
  }

  /**
   * When dispute is rejected:
   * - Notify dispute creator
   * - Include reason
   */
  @OnEvent('dispute.rejected')
  async handleDisputeRejected(payload: DisputeRejectedEvent) {
    this.logger.log(`Dispute ${payload.dispute.id} rejected. Reason: ${payload.reason}`);

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.notification.rejected',
      {
        disputeId: payload.dispute.id,
        reason: payload.reason,
        resolvedBy: payload.resolvedBy,
        timestamp: payload.timestamp,
      },
    );
  }

  /**
   * When dispute is appealed:
   * - Notify admins for new review
   * - Re-freeze split if unfrozen
   */
  @OnEvent('dispute.appealed')
  async handleDisputeAppealed(payload: DisputeAppealedEvent) {
    this.logger.log(
      `Dispute ${payload.dispute.id} appealed by ${payload.appealedBy}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.notification.appealed',
      {
        disputeId: payload.dispute.id,
        appealedBy: payload.appealedBy,
        originalDisputeId: payload.originalDisputeId,
        appealReason: payload.appealReason,
        timestamp: payload.timestamp,
      },
    );
  }

  /**
   * When more evidence is requested:
   * - Notify involved parties
   * - Include evidence request details
   */
  @OnEvent('dispute.more_evidence_requested')
  async handleMoreEvidenceRequested(payload: MoreEvidenceRequestedEvent) {
    this.logger.log(
      `More evidence requested for dispute ${payload.dispute.id}`,
    );

    await this.outboxPublisher.enqueueEvent(
      payload.dispute.id,
      'dispute.notification.more_evidence_requested',
      {
        disputeId: payload.dispute.id,
        requestedBy: payload.requestedBy,
        evidenceRequest: payload.evidenceRequest,
        deadline: payload.deadline,
        timestamp: payload.timestamp,
      },
    );
  }
}
