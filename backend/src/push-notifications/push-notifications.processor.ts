import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as firebaseAdmin from 'firebase-admin';
import { DeviceRegistration } from './entities/device-registration.entity';
import { NotificationEventType } from './entities/notification-preference.entity';
import { logJobFailure } from '../common/queue-job-policy';

@Processor('push_queue')
export class PushNotificationProcessor {
  private readonly logger = new Logger(PushNotificationProcessor.name);
  private firebaseApp: firebaseAdmin.app.App | undefined;

  constructor(
    @InjectRepository(DeviceRegistration)
    private deviceRepo: Repository<DeviceRegistration>,
    private configService: ConfigService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
    
    if (serviceAccount) {
        try {
            // Check if already initialized to avoid error
            if (!firebaseAdmin.apps.length) {
                this.firebaseApp = firebaseAdmin.initializeApp({
                    credential: firebaseAdmin.credential.cert(JSON.parse(serviceAccount)),
                });
            } else {
                this.firebaseApp = firebaseAdmin.app();
            }
        } catch (error) {
            this.logger.error('Failed to initialize Firebase Admin', error);
        }
    } else {
        this.logger.warn('Firebase service account not provided. Push notifications will not work.');
    }
  }

  @Process('sendPush')
  async handleSendPush(job: Job<{ userId: string; eventType: NotificationEventType; title: string; body: string; data?: Record<string, string> }>) {
    const { userId, eventType, title, body, data } = job.data;
    this.logger.debug(`Processing push notification for user ${userId} event ${eventType}`);

    // Get devices
    const devices = await this.deviceRepo.find({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.debug(`No active devices for user ${userId}`);
      return;
    }

    const tokens = devices.map((d) => d.deviceToken);

    // Send via FCM
    if (!this.firebaseApp) {
        this.logger.warn('Firebase not initialized. Skipping notification send.');
        return;
    }

    const message: firebaseAdmin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await this.firebaseApp.messaging().sendEachForMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
             const error = resp.error;
             if (error && (error.code === 'messaging/invalid-registration-token' ||
                           error.code === 'messaging/registration-token-not-registered')) {
                failedTokens.push(tokens[idx]);
             }
             // If error is internal or retryable, we could throw to let Bull retry the job.
             // But since sendEachForMulticast is partial success, retrying the whole job might resend to successful tokens.
             // Ideally we should create new job for failed tokens, but that's complex.
             // For now, we accept partial success.
          }
        });

        if (failedTokens.length > 0) {
            await this.handleFailedTokens(failedTokens);
        }
      }
      
      this.logger.log(`Sent push notification to ${response.successCount}/${tokens.length} devices for user ${userId}`);
    } catch (error) {
        logJobFailure(this.logger, job, error, { context: 'push-notification' });
        throw error; // Let Bull retry
    }
  }

  /**
   * Dead-letter handler: fires when the push notification job has exhausted all retries.
   */
  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    logJobFailure(this.logger, job, err, { context: 'push-notification-dead-letter' });
  }

  private async handleFailedTokens(tokens: string[]) {
      this.logger.log(`Removing ${tokens.length} invalid tokens`);
      await this.deviceRepo.delete({ deviceToken: In(tokens) });
  }
}
