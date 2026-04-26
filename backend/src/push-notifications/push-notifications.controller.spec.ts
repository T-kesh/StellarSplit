import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationsController } from './push-notifications.controller';
import { PushNotificationsService } from './push-notifications.service';
import { DeviceRegistration } from './entities/device-registration.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationEventType } from './entities/notification-preference.entity';

describe('PushNotificationsController', () => {
  let controller: PushNotificationsController;
  let service: PushNotificationsService;

  const mockService = {
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    getDevices: jest.fn(),
    updatePreferences: jest.fn(),
    getPreferences: jest.fn(),
    sendNotification: jest.fn(),
    sendTestNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushNotificationsController],
      providers: [
        {
          provide: PushNotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PushNotificationsController>(PushNotificationsController);
    service = module.get<PushNotificationsService>(PushNotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should register a device', async () => {
      const dto = {
        userId: 'user1',
        deviceToken: 'token123',
        platform: 'android',
        deviceName: 'Pixel 6',
      } as any;

      const req = { user: { walletAddress: 'user1' } };
      
      await controller.registerDevice(dto, req);
      
      expect(mockService.registerDevice).toHaveBeenCalledWith(dto);
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister a device', async () => {
      const deviceId = 'uuid';
      const req = { user: { walletAddress: 'user1' } };
      
      await controller.unregisterDevice(deviceId, req);
      
      expect(mockService.unregisterDevice).toHaveBeenCalledWith(deviceId, 'user1');
    });
  });

  describe('getDevices', () => {
    it('should get devices for user', async () => {
      const req = { user: { walletAddress: 'user1' } };
      
      await controller.getDevices(req);
      
      expect(mockService.getDevices).toHaveBeenCalledWith('user1');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const dto = {
        userId: 'user1',
        preferences: [],
      } as any;
      const req = { user: { walletAddress: 'user1' } };
      
      await controller.updatePreferences(dto, req);
      
      expect(mockService.updatePreferences).toHaveBeenCalledWith(dto);
    });
  });

  describe('getPreferences', () => {
    it('should get preferences for user', async () => {
      const req = { user: { walletAddress: 'user1' } };
      
      await controller.getPreferences(req);
      
      expect(mockService.getPreferences).toHaveBeenCalledWith('user1');
    });
  });

  describe('sendTestNotification', () => {
      it('should send a test notification', async () => {
          const body = {
              title: 'Test',
              message: 'Message'
          };
          const req = { user: { walletAddress: 'user1' } };
          
          await controller.sendTestNotification(body, req);
          
          expect(mockService.sendTestNotification).toHaveBeenCalledWith(
              'user1',
              'Test',
              'Message'
          );
      });
  });
});
