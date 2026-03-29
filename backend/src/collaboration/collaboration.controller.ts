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

interface RequestWithUser extends Request {
  user: { wallet: string };
}

@Controller('collaborations')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post()
  async createCollaboration(
    @Req() req: RequestWithUser,
    @Body() createDto: CreateCollaborationDto,
  ) {
    return this.collaborationService.createCollaboration(req.user.wallet, createDto);
  }

  @Get()
  async getCollaborations(
    @Req() req: RequestWithUser,
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
      req.user.wallet,
      status,
      pageNum,
      limitNum,
    );
  }

  @Get('stats')
  async getCollaborationStats(@Req() req: RequestWithUser) {
    return this.collaborationService.getCollaborationStats(req.user.wallet);
  }

  @Get(':id')
  async getCollaborationById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.collaborationService.getCollaborationById(id, req.user.wallet);
  }

  @Put(':id/respond')
  async respondToCollaboration(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() responseDto: RespondToCollaborationDto,
  ) {
    return this.collaborationService.respondToCollaboration(id, req.user.wallet, responseDto);
  }

  @Delete(':id')
  async removeCollaboration(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() removeDto: RemoveCollaborationDto,
  ) {
    return this.collaborationService.removeCollaboration(
      id,
      req.user.wallet,
      removeDto.removalReason,
    );
  }

  @Get('track/:trackId')
  async getTrackCollaborations(
    @Param('trackId') trackId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: CollaborationStatus,
  ) {
    // This endpoint would be useful for showing collaborations on a specific track
    // For now, we'll delegate to the main service method
    const result = await this.collaborationService.getCollaborationsForUser(req.user.wallet, status);
    
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
