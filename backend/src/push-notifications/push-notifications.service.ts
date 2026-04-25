import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DeviceRegistration } from './entities/device-registration.entity';
import { NotificationPreference, NotificationEventType } from './entities/notification-preference.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    @InjectRepository(DeviceRegistration)
    private deviceRepo: Repository<DeviceRegistration>,
    @InjectRepository(NotificationPreference)
    private prefRepo: Repository<NotificationPreference>,
    @InjectQueue('push_queue') private pushQueue: Queue,
  ) {}

  async registerDevice(dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    let device = await this.deviceRepo.findOne({
      where: { deviceToken: dto.deviceToken },
    });

    if (device) {
      device.userId = dto.userId;
      device.lastSeenAt = new Date();
      device.isActive = true;
      if (dto.deviceName) device.deviceName = dto.deviceName;
    } else {
      device = this.deviceRepo.create({
        userId: dto.userId,
        deviceToken: dto.deviceToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
      });
    }

    return this.deviceRepo.save(device);
  }

  async unregisterDevice(deviceId: string, userId: string): Promise<void> {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new Error('Device not found');
    }
    if (device.userId !== userId) {
      throw new Error('Device does not belong to user');
    }
    await this.deviceRepo.delete(deviceId);
  }

  async getDevices(userId: string): Promise<DeviceRegistration[]> {
    return this.deviceRepo.find({ where: { userId, isActive: true } });
  }

  async updatePreferences(dto: UpdatePreferencesDto): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    for (const prefDto of dto.preferences) {
      let pref = await this.prefRepo.findOne({
        where: { userId: dto.userId, eventType: prefDto.eventType },
      });

      if (!pref) {
        pref = this.prefRepo.create({
          userId: dto.userId,
          eventType: prefDto.eventType,
        });
      }

      if (prefDto.pushEnabled !== undefined) pref.pushEnabled = prefDto.pushEnabled;
      if (prefDto.emailEnabled !== undefined) pref.emailEnabled = prefDto.emailEnabled;
      if (prefDto.quietHoursStart !== undefined) pref.quietHoursStart = prefDto.quietHoursStart;
      if (prefDto.quietHoursEnd !== undefined) pref.quietHoursEnd = prefDto.quietHoursEnd;
      if (prefDto.timezone !== undefined) pref.timezone = prefDto.timezone;

      results.push(await this.prefRepo.save(pref));
    }

    return results;
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.prefRepo.find({ where: { userId } });
  }

  async sendNotification(
    userId: string,
    eventType: NotificationEventType,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    // Check preferences before queuing
    const pref = await this.prefRepo.findOne({
      where: { userId, eventType },
    });

    if (pref && !pref.pushEnabled) {
      this.logger.log(`Push disabled for user ${userId} event ${eventType}`);
      return;
    }

    // Check quiet hours before queuing
    if (pref && this.isQuietHours(pref)) {
      this.logger.log(`Quiet hours active for user ${userId}`);
      return;
    }

    await this.pushQueue.add('sendPush', {
      userId,
      eventType,
      title,
      body,
      data,
    });
    this.logger.log(`Queued push notification for user ${userId} event ${eventType}`);
  }

  async sendTestNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    // Test notifications bypass preference and quiet hours checks
    await this.pushQueue.add('sendPush', {
      userId,
      eventType: NotificationEventType.SPLIT_CREATED, // Use a default event type
      title,
      body,
      data,
    });
    this.logger.log(`Queued test push notification for user ${userId}`);
  }

  private isQuietHours(pref: NotificationPreference): boolean {
    if (!pref.quietHoursStart || !pref.quietHoursEnd) return false;

    const now = new Date();
    const userTime = pref.timezone
        ? new Date(now.toLocaleString('en-US', { timeZone: pref.timezone }))
        : now;

    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeVal = currentHour * 60 + currentMinute;

    const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
    const startVal = startH * 60 + startM;

    const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);
    const endVal = endH * 60 + endM;

    if (startVal < endVal) {
      return currentTimeVal >= startVal && currentTimeVal < endVal;
    } else {
      return currentTimeVal >= startVal || currentTimeVal < endVal;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupStaleTokens() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await this.deviceRepo.delete({
        lastSeenAt: LessThan(sixMonthsAgo),
    });
    
    this.logger.log(`Cleaned up ${result.affected} stale device tokens`);
  }
}
