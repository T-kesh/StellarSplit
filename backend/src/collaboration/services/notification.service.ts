import { Injectable, Logger } from '@nestjs/common';
import { CollaborationNotificationDispatcher } from './collaboration-notification-dispatcher';

export interface CollaborationInvitationNotification {
  collaborationId: string;
  trackTitle: string;
  inviterWallet: string;
  role: string;
  message?: string;
}

export interface CollaborationResponseNotification {
  collaborationId: string;
  artistName: string;
  artistWallet: string;
  status: string;
  responseMessage?: string;
}

export interface CollaborationRemovalNotification {
  collaborationId: string;
  removerWallet: string;
  removalReason: string;
}

@Injectable()
export class CollaborationNotificationService {
  private readonly logger = new Logger(CollaborationNotificationService.name);

  constructor(private readonly dispatcher: CollaborationNotificationDispatcher) {}

  async sendCollaborationInvitation(
    artistWallet: string,
    notification: CollaborationInvitationNotification,
  ): Promise<void> {
    this.logger.log(
      `Dispatching collaboration invitation to ${artistWallet} for track "${notification.trackTitle}"`,
    );
    const result = await this.dispatcher.dispatchInvitation(artistWallet, notification);
    if (result.failures.length > 0) {
      this.logger.warn(`Invitation delivery had failures: ${result.failures.join('; ')}`);
    }
  }

  async sendCollaborationResponse(
    inviterWallet: string,
    notification: CollaborationResponseNotification,
  ): Promise<void> {
    this.logger.log(
      `Dispatching collaboration response to ${inviterWallet} — status: ${notification.status}`,
    );
    const result = await this.dispatcher.dispatchResponse(inviterWallet, notification);
    if (result.failures.length > 0) {
      this.logger.warn(`Response delivery had failures: ${result.failures.join('; ')}`);
    }
  }

  async sendCollaborationRemoval(
    recipientWallet: string,
    notification: CollaborationRemovalNotification,
  ): Promise<void> {
    this.logger.log(`Dispatching collaboration removal to ${recipientWallet}`);
    const result = await this.dispatcher.dispatchRemoval(recipientWallet, notification);
    if (result.failures.length > 0) {
      this.logger.warn(`Removal delivery had failures: ${result.failures.join('; ')}`);
    }
  }
}
