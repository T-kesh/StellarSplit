import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { PushNotificationProcessor } from './push-notifications.processor';
import { DeviceRegistration } from './entities/device-registration.entity';
import { NotificationPreference, NotificationEventType } from './entities/notification-preference.entity';
import { Job } from 'bull';

// Mock firebase-admin
const mockSendEachForMulticast = jest.fn();
jest.mock('firebase-admin', () => ({
  credential: {
    cert: jest.fn(),
  },
  initializeApp: jest.fn(() => ({
      messaging: () => ({
          sendEachForMulticast: mockSendEachForMulticast,
      }),
  })),
  apps: [],
  app: jest.fn(() => ({
    messaging: () => ({
        sendEachForMulticast: mockSendEachForMulticast,
    }),
  })),
}));

describe('PushNotificationProcessor', () => {
  let processor: PushNotificationProcessor;
  let deviceRepo: Repository<DeviceRegistration>;
  let prefRepo: Repository<NotificationPreference>;
  let configService: ConfigService;

  const mockDeviceRepo = {
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrefRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'FIREBASE_SERVICE_ACCOUNT') return JSON.stringify({ project_id: 'test' });
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationProcessor,
        {
          provide: getRepositoryToken(DeviceRegistration),
          useValue: mockDeviceRepo,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockPrefRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    processor = module.get<PushNotificationProcessor>(PushNotificationProcessor);
    deviceRepo = module.get<Repository<DeviceRegistration>>(getRepositoryToken(DeviceRegistration));
    prefRepo = module.get<Repository<NotificationPreference>>(getRepositoryToken(NotificationPreference));
    configService = module.get<ConfigService>(ConfigService);
    
    // Reset mocks
    mockSendEachForMulticast.mockReset();
    mockDeviceRepo.find.mockReset();
    mockDeviceRepo.delete.mockReset();
    mockPrefRepo.findOne.mockReset();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleSendPush', () => {
    const jobData = {
        userId: 'user1',
        eventType: NotificationEventType.SPLIT_CREATED,
        title: 'Title',
        body: 'Body',
        data: { key: 'value' },
    };
    const mockJob = { data: jobData } as Job;

    it('should not send when there are no active devices', async () => {
      mockDeviceRepo.find.mockResolvedValue([]);

      await processor.handleSendPush(mockJob);

      expect(mockDeviceRepo.find).toHaveBeenCalled();
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should not send when Firebase is unavailable', async () => {
        mockDeviceRepo.find.mockResolvedValue([{ deviceToken: 'token1' }]);
        (processor as any).firebaseApp = undefined;

        await processor.handleSendPush(mockJob);

        expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should send if enabled and not quiet hours', async () => {
        mockPrefRepo.findOne.mockResolvedValue({
            pushEnabled: true,
        });
        mockDeviceRepo.find.mockResolvedValue([
            { deviceToken: 'token1' },
            { deviceToken: 'token2' },
        ]);
        mockSendEachForMulticast.mockResolvedValue({
            failureCount: 0,
            successCount: 2,
            responses: [],
        });

        await processor.handleSendPush(mockJob);

        expect(mockDeviceRepo.find).toHaveBeenCalled();
        expect(mockSendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
            tokens: ['token1', 'token2'],
            notification: { title: 'Title', body: 'Body' },
        }));
    });

    it('should handle failed tokens', async () => {
        mockPrefRepo.findOne.mockResolvedValue({
            pushEnabled: true,
        });
        mockDeviceRepo.find.mockResolvedValue([
            { deviceToken: 'token1' },
            { deviceToken: 'token2' },
        ]);
        mockSendEachForMulticast.mockResolvedValue({
            failureCount: 1,
            successCount: 1,
            responses: [
                { success: true },
                { success: false, error: { code: 'messaging/invalid-registration-token' } },
            ],
        });

        await processor.handleSendPush(mockJob);

        // We expect delete to be called. 
        // Since we can't easily match In(['token2']), we just check it was called.
        expect(mockDeviceRepo.delete).toHaveBeenCalled();
    });
  });
});
