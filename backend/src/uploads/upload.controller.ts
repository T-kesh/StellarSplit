import { Controller, Post, Body, Get, Param, Logger, UseFilters, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

interface AuthRequest {
  user: { walletAddress: string };
}

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly uploadService: UploadService) { }

    @Post('presigned-url')
    @RequirePermissions(Permissions.CAN_CREATE_RECEIPT)
    @ApiOperation({ summary: 'Get a presigned URL for file upload' })
    @ApiResponse({ status: 201, description: 'Presigned URL generated successfully' })
    async getPresignedUrl(
        @Body() body: { fileName: string; contentType: string; fileSize?: number },
        @Req() req: AuthRequest,
    ) {
        if (!body.fileName || !body.contentType) {
            throw new BadRequestException('fileName and contentType are required');
        }
        this.logger.log(`Requesting presigned upload URL for ${body.fileName} by user ${req.user.walletAddress}`);
        return await this.uploadService.getPresignedUploadUrl(body.fileName, body.contentType, body.fileSize);
    }

    @Get('download-url/:encodedKey')
    @RequirePermissions(Permissions.CAN_READ_RECEIPT)
    @ApiOperation({ summary: 'Get a presigned URL for file download' })
    @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
    async getDownloadUrl(@Param('encodedKey') encodedKey: string, @Req() req: AuthRequest) {
        try {
            const key = Buffer.from(encodedKey, 'base64').toString('utf-8');
            // Basic validation to ensure it's a receipts key
            if (!key.startsWith('receipts/')) {
                throw new BadRequestException('Invalid key');
            }
            this.logger.log(`Requesting presigned download URL for key ${key} by user ${req.user.walletAddress}`);
            const url = await this.uploadService.getPresignedDownloadUrl(key);
            return { url };
        } catch (error) {
            throw new BadRequestException('Invalid encoded key');
        }
    }
}
