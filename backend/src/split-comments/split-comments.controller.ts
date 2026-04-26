import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { SplitCommentService } from './provider/provider.service';
import { CreateSplitCommentDto } from './dto/split-comment.dto';

@Controller('split-comments')
export class SplitCommentsController {
  constructor(private readonly splitCommentService: SplitCommentService) {}

  @Post()
  async create(@Body() dto: CreateSplitCommentDto, @Req() req: any) {
    const userId = req.user?.id ?? 'test-user';
    return this.splitCommentService.createComment(userId, dto);
  }

  @Get(':splitId')
  async list(
    @Param('splitId') splitId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.splitCommentService.listComments(splitId, Number(page), Number(limit));
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'test-user';
    return this.splitCommentService.deleteComment(id, userId);
  }
}
