import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { CollaborationService } from './collaboration.service';
import { CreateCollaborationDto } from './dto/create-collaboration.dto';
import { RespondToCollaborationDto, RemoveCollaborationDto } from './dto/update-collaboration.dto';
import { CollaborationStatus } from './entities/collaboration.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.interface';

@Controller('collaborations')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post()
  async createCollaboration(
    @CurrentUser() user: AuthUser,
    @Body() createDto: CreateCollaborationDto,
  ) {
    return this.collaborationService.createCollaboration(user.walletAddress, createDto);
  }

  @Get()
  async getCollaborations(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CollaborationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Invalid page number');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid limit number (must be between 1 and 100)');
    }

    return this.collaborationService.getCollaborationsForUser(
      user.walletAddress,
      status,
      pageNum,
      limitNum,
    );
  }

  @Get('stats')
  async getCollaborationStats(@CurrentUser() user: AuthUser) {
    return this.collaborationService.getCollaborationStats(user.walletAddress);
  }

  @Get(':id')
  async getCollaborationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.collaborationService.getCollaborationById(id, user.walletAddress);
  }

  @Put(':id/respond')
  async respondToCollaboration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() responseDto: RespondToCollaborationDto,
  ) {
    return this.collaborationService.respondToCollaboration(id, user.walletAddress, responseDto);
  }

  @Delete(':id')
  async removeCollaboration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() removeDto: RemoveCollaborationDto,
  ) {
    return this.collaborationService.removeCollaboration(
      id,
      user.walletAddress,
      removeDto.removalReason,
    );
  }

  @Get('track/:trackId')
  async getTrackCollaborations(
    @Param('trackId') trackId: string,
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CollaborationStatus,
  ) {
    // This endpoint would be useful for showing collaborations on a specific track
    // For now, we'll delegate to the main service method
    const result = await this.collaborationService.getCollaborationsForUser(user.walletAddress, status);
    
    // Filter by track ID
    const trackCollaborations = result.collaborations.filter(
      collab => collab.trackId === trackId,
    );

    return {
      collaborations: trackCollaborations,
      total: trackCollaborations.length,
    };
  }
}
