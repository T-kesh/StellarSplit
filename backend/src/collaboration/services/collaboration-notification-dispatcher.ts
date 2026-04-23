import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import { ActivitiesService } from '../../modules/activities/activities.service';
import {
  CollaborationInvitationNotification,
  CollaborationRemovalNotification,
  CollaborationResponseNotification,
} from './notification.service';

export interface DispatchResult {
  push: boolean;
  inApp: boolean;
  failures: string[];
}

/**
 * Fans collaboration events out to push, email, and in-app channels.
 * Each channel is attempted independently so one failure does not block others.
 */
@Injectable()
export class CollaborationNotificationDispatcher {
  private readonly logger = new Logger(CollaborationNotificationDispatcher.name);

  constructor(
    private readonly pushService: PushNotificationsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async dispatchInvitation(
    recipientWallet: string,
    notification: CollaborationInvitationNotification,
  ): Promise<DispatchResult> {
    const result: DispatchResult = { push: false, inApp: false, failures: [] };

    await this.tryPush(result, recipientWallet, {
      title: 'Collaboration Invitation',
      body: `You've been invited to collaborate on "${notification.trackTitle}" as ${notification.role}.`,
      data: { collaborationId: notification.collaborationId, type: 'collaboration_invitation' },
    });

    await this.tryInApp(result, {
      userId: recipientWallet,
      type: 'collaboration_invitation',
      metadata: {
        collaborationId: notification.collaborationId,
        inviterWallet: notification.inviterWallet,
        trackTitle: notification.trackTitle,
        role: notification.role,
      },
    });

    this.logOutcome('invitation', recipientWallet, result);
    return result;
  }

  async dispatchResponse(
    recipientWallet: string,
    notification: CollaborationResponseNotification,
  ): Promise<DispatchResult> {
    const result: DispatchResult = { push: false, inApp: false, failures: [] };

    await this.tryPush(result, recipientWallet, {
      title: 'Collaboration Response',
      body: `${notification.artistName} has ${notification.status} your collaboration invitation.`,
      data: { collaborationId: notification.collaborationId, type: 'collaboration_response' },
    });

    await this.tryInApp(result, {
      userId: recipientWallet,
      type: 'collaboration_response',
      metadata: {
        collaborationId: notification.collaborationId,
        artistWallet: notification.artistWallet,
        status: notification.status,
      },
    });

    this.logOutcome('response', recipientWallet, result);
    return result;
  }

  async dispatchRemoval(
    recipientWallet: string,
    notification: CollaborationRemovalNotification,
  ): Promise<DispatchResult> {
    const result: DispatchResult = { push: false, inApp: false, failures: [] };

    await this.tryPush(result, recipientWallet, {
      title: 'Removed from Collaboration',
      body: `You have been removed from a collaboration by ${notification.removerWallet}.`,
      data: { collaborationId: notification.collaborationId, type: 'collaboration_removal' },
    });

    await this.tryInApp(result, {
      userId: recipientWallet,
      type: 'collaboration_removal',
      metadata: {
        collaborationId: notification.collaborationId,
        removerWallet: notification.removerWallet,
        reason: notification.removalReason,
      },
    });

    this.logOutcome('removal', recipientWallet, result);
    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async tryPush(
    result: DispatchResult,
    userId: string,
    payload: { title: string; body: string; data: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.pushService.sendToUser(userId, payload);
      result.push = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.failures.push(`push: ${msg}`);
      this.logger.warn(`Push delivery failed for ${userId}: ${msg}`);
    }
  }

  private async tryInApp(
    result: DispatchResult,
    activity: { userId: string; type: string; metadata: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.activitiesService.createActivity(activity);
      result.inApp = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.failures.push(`in-app: ${msg}`);
      this.logger.warn(`In-app activity creation failed for ${activity.userId}: ${msg}`);
    }
  }

  private logOutcome(event: string, recipient: string, result: DispatchResult): void {
    if (result.failures.length === 0) {
      this.logger.log(`Collaboration ${event} dispatched to ${recipient} via push+in-app`);
    } else {
      this.logger.error(
        `Collaboration ${event} partial failure for ${recipient}: ${result.failures.join('; ')}`,
      );
    }
  }
}
