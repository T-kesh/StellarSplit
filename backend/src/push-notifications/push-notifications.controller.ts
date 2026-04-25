import { Controller, Post, Body, Delete, Param, Get, Put, Req, Logger, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PushNotificationsService } from './push-notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationEventType } from './entities/notification-preference.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushNotificationsController {
  private readonly logger = new Logger(PushNotificationsController.name);

  constructor(private readonly pushService: PushNotificationsService) {}

  @Post('register-device')
  async registerDevice(@Body() dto: RegisterDeviceDto, @Req() req: any) {
    const userId = req.user?.walletAddress;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }
    dto.userId = userId;
    return this.pushService.registerDevice(dto);
  }

  @Delete('unregister-device/:deviceId')
  async unregisterDevice(@Param('deviceId') deviceId: string, @Req() req: any) {
    const userId = req.user?.walletAddress;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }
    return this.pushService.unregisterDevice(deviceId, userId);
  }

  @Get('devices')
  async getDevices(@Req() req: any) {
    const userId = req.user?.walletAddress;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }
    return this.pushService.getDevices(userId);
  }

  @Put('preferences')
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @Req() req: any) {
    const userId = req.user?.walletAddress;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }
    dto.userId = userId;
    return this.pushService.updatePreferences(dto);
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user?.walletAddress;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }
    return this.pushService.getPreferences(userId);
  }

  @Post('test-internal')
  async sendTestNotification(@Body() body: { title?: string, message?: string }, @Req() req: any) {
    const userId = req.user?.walletAddress;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }
    const { title, message } = body;
    await this.pushService.sendTestNotification(
        userId,
        title || 'Test Notification',
        message || 'This is a test notification from StellarSplit'
    );
    return { success: true };
  }
}
