import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly allowedMimeTypes: string[];
    private readonly maxFileSize: number;

    constructor(private readonly configService: ConfigService) {
        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_REGION')!,
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
            },
            endpoint: this.configService.get<string>('S3_ENDPOINT'),
            forcePathStyle: true,
        });
        this.bucketName = this.configService.get<string>('S3_BUCKET_NAME')!;
        this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    async getPresignedUploadUrl(fileName: string, contentType: string, fileSize?: number): Promise<{ url: string; key: string }> {
        // Validate file type
        if (!this.allowedMimeTypes.includes(contentType)) {
            throw new BadRequestException(`File type ${contentType} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
        }

        // Validate file size if provided
        if (fileSize && fileSize > this.maxFileSize) {
            throw new BadRequestException(`File size ${fileSize} exceeds maximum allowed size of ${this.maxFileSize} bytes`);
        }

        // Sanitize filename to prevent path traversal
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `receipts/${uuidv4()}-${sanitizedFileName}`;
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
            ContentLength: fileSize,
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        return { url, key };
    }

    async getPresignedDownloadUrl(key: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }

    async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        await this.s3Client.send(command).catch(err => {
            this.logger.error(`Failed to delete file ${key} from S3:`, err);
        });
    }
}
