import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { BadRequestException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;
  const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                AWS_REGION: 'us-east-1',
                AWS_ACCESS_KEY_ID: 'test-key',
                AWS_SECRET_ACCESS_KEY: 'test-secret',
                S3_BUCKET_NAME: 'test-bucket',
                S3_ENDPOINT: 'http://localhost:4566',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);
    mockGetSignedUrl.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPresignedUploadUrl', () => {
    it('should validate allowed mime types', async () => {
      await expect(
        service.getPresignedUploadUrl('test.jpg', 'image/invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate file size', async () => {
      const largeSize = 15 * 1024 * 1024; // 15MB
      await expect(
        service.getPresignedUploadUrl('test.jpg', 'image/jpeg', largeSize),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize filename', async () => {
      mockGetSignedUrl.mockResolvedValue('http://presigned-url');

      const result = await service.getPresignedUploadUrl('test<script>.jpg', 'image/jpeg');
      expect(result.url).toBe('http://presigned-url');
      expect(result.key).not.toContain('<script>');
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate download URL', async () => {
      const key = 'receipts/test-key';
      mockGetSignedUrl.mockResolvedValue('http://download-url');

      const result = await service.getPresignedDownloadUrl(key);
      expect(result).toBe('http://download-url');
    });
  });
});
