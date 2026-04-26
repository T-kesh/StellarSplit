import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { FriendshipService } from './provider/service';
import { FriendRequestDto } from './dto/friendrequest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class FriendshipController {
  constructor(private readonly service: FriendshipService) {}

  @Post('request')
  send(@Req() req: any, @Body() dto: FriendRequestDto) {
    return this.service.sendRequest(req.user.id, dto.friendId);
  }

  @Post('accept')
  accept(@Req() req: any, @Body() dto: FriendRequestDto) {
    return this.service.acceptRequest(req.user.id, dto.friendId);
  }

  @Post('block')
  block(@Req() req: any, @Body() dto: FriendRequestDto) {
    return this.service.block(req.user.id, dto.friendId);
  }

  @Get()
  getFriends(@Req() req: any) {
    return this.service.getFriends(req.user.id);
  }
}
