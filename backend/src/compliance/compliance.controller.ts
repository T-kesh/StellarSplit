import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ExpenseCategory } from './entities/expense-category.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

interface AuthRequest {
  user: { walletAddress: string };
}

@Controller('api/compliance')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) { }

    @Post('export/request')
    @RequirePermissions(Permissions.CAN_CREATE_EXPORT)
    async requestExport(@Body() data: any, @Req() req: AuthRequest) {
        return this.complianceService.requestExport(req.user.walletAddress, data);
    }

    @Get('export/:requestId/status')
    async getExportStatus(@Param('requestId') requestId: string) {
        return this.complianceService.getExportStatus(requestId);
    }

    @Get('categories')
    @RequirePermissions(Permissions.CAN_READ_EXPORT)
    async getCategories(@Req() req: AuthRequest) {
        return this.complianceService.getCategories(req.user.walletAddress);
    }

    @Post('categories')
    @RequirePermissions(Permissions.CAN_CREATE_EXPORT)
    async createCategory(@Body() data: any, @Req() req: AuthRequest) {
        return this.complianceService.createCategory(req.user.walletAddress, data);
    }

    @Put('splits/:splitId/category')
    @RequirePermissions(Permissions.CAN_UPDATE_SPLIT)
    async assignCategory(@Param('splitId') splitId: string, @Body('categoryId') categoryId: string) {
        return this.complianceService.assignCategoryToSplit(splitId, categoryId);
    }

    @Get('summary')
    @RequirePermissions(Permissions.CAN_READ_EXPORT)
    async getSummary(@Query('year') year: string, @Req() req: AuthRequest) {
        return this.complianceService.getSummary(req.user.walletAddress, parseInt(year));
    }

    @Get('export/:requestId/download')
    @RequirePermissions(Permissions.CAN_READ_EXPORT)
    async downloadExport(@Param('requestId') requestId: string, @Req() req: AuthRequest) {
        return this.complianceService.downloadExport(requestId, req.user.walletAddress);
    }
}
