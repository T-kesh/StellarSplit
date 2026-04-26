import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { PushNotificationsService } from './push-notifications.service';
import { DeviceRegistration, DevicePlatform } from './entities/device-registration.entity';
import { NotificationPreference, NotificationEventType } from './entities/notification-preference.entity';

describe('PushNotificationsService', () => {
  let service: PushNotificationsService;
  let deviceRepo: Repository<DeviceRegistration>;
  let prefRepo: Repository<NotificationPreference>;
  let pushQueue: any;

  const mockDeviceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrefRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPushQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationsService,
        {
          provide: getRepositoryToken(DeviceRegistration),
          useValue: mockDeviceRepo,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockPrefRepo,
        },
        {
          provide: getQueueToken('push_queue'),
          useValue: mockPushQueue,
        },
      ],
    }).compile();

    service = module.get<PushNotificationsService>(PushNotificationsService);
    deviceRepo = module.get<Repository<DeviceRegistration>>(getRepositoryToken(DeviceRegistration));
    prefRepo = module.get<Repository<NotificationPreference>>(getRepositoryToken(NotificationPreference));
    pushQueue = module.get(getQueueToken('push_queue'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should create a new device if not exists', async () => {
      const dto = {
        userId: 'user1',
        deviceToken: 'token123',
        platform: DevicePlatform.ANDROID,
        deviceName: 'Pixel 6',
      };

      mockDeviceRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.create.mockReturnValue(dto);
      mockDeviceRepo.save.mockResolvedValue({ ...dto, id: 'uuid' });

      const result = await service.registerDevice(dto);

      expect(mockDeviceRepo.findOne).toHaveBeenCalledWith({ where: { deviceToken: dto.deviceToken } });
      expect(mockDeviceRepo.create).toHaveBeenCalledWith(dto);
      expect(mockDeviceRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ ...dto, id: 'uuid' });
    });

    it('should update existing device', async () => {
      const dto = {
        userId: 'user1',
        deviceToken: 'token123',
        platform: DevicePlatform.IOS,
      };

      const existingDevice = {
        id: 'uuid',
        userId: 'oldUser',
        deviceToken: 'token123',
        platform: DevicePlatform.ANDROID,
        isActive: false,
      };

      mockDeviceRepo.findOne.mockResolvedValue(existingDevice);
      mockDeviceRepo.save.mockResolvedValue({ ...existingDevice, userId: dto.userId, platform: dto.platform, isActive: true });

      await service.registerDevice(dto);

      expect(mockDeviceRepo.create).not.toHaveBeenCalled();
      expect(existingDevice.userId).toBe(dto.userId);
      expect(existingDevice.isActive).toBe(true);
      expect(mockDeviceRepo.save).toHaveBeenCalledWith(existingDevice);
    });
  });

  describe('unregisterDevice', () => {
    it('should delete device if it belongs to user', async () => {
      const device = { id: 'uuid', userId: 'user1' };
      mockDeviceRepo.findOne.mockResolvedValue(device);

      await service.unregisterDevice('uuid', 'user1');

      expect(mockDeviceRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid' } });
      expect(mockDeviceRepo.delete).toHaveBeenCalledWith('uuid');
    });

    it('should throw error if device not found', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.unregisterDevice('uuid', 'user1')).rejects.toThrow('Device not found');
    });

    it('should throw error if device does not belong to user', async () => {
      const device = { id: 'uuid', userId: 'user2' };
      mockDeviceRepo.findOne.mockResolvedValue(device);

      await expect(service.unregisterDevice('uuid', 'user1')).rejects.toThrow('Device does not belong to user');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const dto = {
        userId: 'user1',
        preferences: [
          {
            eventType: NotificationEventType.SPLIT_CREATED,
            pushEnabled: false,
          },
        ],
      };

      const existingPref = {
        id: 'uuid',
        userId: 'user1',
        eventType: NotificationEventType.SPLIT_CREATED,
        pushEnabled: true,
      };

      mockPrefRepo.findOne.mockResolvedValue(existingPref);
      mockPrefRepo.save.mockResolvedValue({ ...existingPref, pushEnabled: false });

      await service.updatePreferences(dto);

      expect(existingPref.pushEnabled).toBe(false);
      expect(mockPrefRepo.save).toHaveBeenCalledWith(existingPref);
    });

    it('should create preference if not exists', async () => {
        const dto = {
          userId: 'user1',
          preferences: [
            {
              eventType: NotificationEventType.SPLIT_CREATED,
              pushEnabled: false,
            },
          ],
        };
  
        mockPrefRepo.findOne.mockResolvedValue(null);
        mockPrefRepo.create.mockReturnValue({ 
            userId: 'user1', 
            eventType: NotificationEventType.SPLIT_CREATED 
        });
        mockPrefRepo.save.mockResolvedValue({ 
            userId: 'user1', 
            eventType: NotificationEventType.SPLIT_CREATED,
            pushEnabled: false 
        });
  
        await service.updatePreferences(dto);
  
        expect(mockPrefRepo.create).toHaveBeenCalled();
        expect(mockPrefRepo.save).toHaveBeenCalled();
      });
  });

  describe('sendNotification', () => {
    it('should queue a notification job when push is enabled', async () => {
        const pref = { pushEnabled: true };
        mockPrefRepo.findOne.mockResolvedValue(pref);

        await service.sendNotification('user1', NotificationEventType.SPLIT_CREATED, 'Title', 'Body', { key: 'value' });
        
        expect(mockPrefRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user1', eventType: NotificationEventType.SPLIT_CREATED } });
        expect(mockPushQueue.add).toHaveBeenCalledWith('sendPush', {
            userId: 'user1',
            eventType: NotificationEventType.SPLIT_CREATED,
            title: 'Title',
            body: 'Body',
            data: { key: 'value' },
        });
    });

    it('should not queue when push is disabled', async () => {
        const pref = { pushEnabled: false };
        mockPrefRepo.findOne.mockResolvedValue(pref);

        await service.sendNotification('user1', NotificationEventType.SPLIT_CREATED, 'Title', 'Body');

        expect(mockPushQueue.add).not.toHaveBeenCalled();
    });

    it('should not queue during quiet hours', async () => {
        const now = new Date();
        const quietStart = new Date(now);
        quietStart.setHours(now.getHours() - 1); // 1 hour ago
        const quietEnd = new Date(now);
        quietEnd.setHours(now.getHours() + 1); // 1 hour from now

        const pref = { 
            pushEnabled: true, 
            quietHoursStart: quietStart.toTimeString().split(' ')[0],
            quietHoursEnd: quietEnd.toTimeString().split(' ')[0]
        };
        mockPrefRepo.findOne.mockResolvedValue(pref);

        await service.sendNotification('user1', NotificationEventType.SPLIT_CREATED, 'Title', 'Body');

        expect(mockPushQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('sendTestNotification', () => {
    it('should queue a test notification job bypassing checks', async () => {
        await service.sendTestNotification('user1', 'Title', 'Body', { key: 'value' });
        
        expect(mockPrefRepo.findOne).not.toHaveBeenCalled();
        expect(mockPushQueue.add).toHaveBeenCalledWith('sendPush', {
            userId: 'user1',
            eventType: NotificationEventType.SPLIT_CREATED,
            title: 'Title',
            body: 'Body',
            data: { key: 'value' },
        });
    });
  });
});
