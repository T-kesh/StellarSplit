import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ReputationService } from "../reputation.service";
import { ReputationEventType } from "../enums/reputation-event-type.enum";
import { DisputeCreatedEvent, DisputeResolvedEvent } from "../../disputes/dispute.events";

@Injectable()
export class DisputeReputationListener {
  private readonly logger = new Logger(DisputeReputationListener.name);

  constructor(private readonly reputationService: ReputationService) {}

  @OnEvent("dispute.created")
  async onDisputeCreated(payload: DisputeCreatedEvent) {
    try {
      // Count participation as soon as a dispute is filed.
      await this.reputationService.recordEvent(
        payload.dispute.raisedBy,
        payload.dispute.splitId,
        ReputationEventType.DISPUTE_RAISED,
      );
    } catch (err) {
      this.logger.warn(`Failed to record dispute.created reputation: ${err}`);
    }
  }

  @OnEvent("dispute.resolved")
  async onDisputeResolved(payload: DisputeResolvedEvent) {
    try {
      // Map dispute outcome to winner/loser for reputation impact.
      const outcome = payload.outcome;
      const raisedBy = payload.dispute.raisedBy;
      const splitId = payload.dispute.splitId;

      const eventType =
        outcome === "adjust_balances" || outcome === "refund"
          ? ReputationEventType.DISPUTE_WON
          : ReputationEventType.DISPUTE_LOST;

      await this.reputationService.recordEvent(raisedBy, splitId, eventType);
    } catch (err) {
      this.logger.warn(`Failed to record dispute.resolved reputation: ${err}`);
    }
  }
}

