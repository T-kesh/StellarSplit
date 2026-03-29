import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SplitComment } from '../split-comment.entity';
import { CreateSplitCommentDto } from '../dto/split-comment.dto';
import { MentionService } from '@/mentions/provider/service';

@Injectable()
export class SplitCommentService {
  constructor(
    @InjectRepository(SplitComment)
    private readonly repo: Repository<SplitComment>,
    private readonly mentionService: MentionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createComment(userId: string, dto: CreateSplitCommentDto) {
    const comment = await this.repo.save({
      userId,
      splitId: dto.splitId,
      comment: dto.comment,
    });

    const mentions = this.mentionService.extractMentions(dto.comment);
    if (mentions.length) {
      this.eventEmitter.emit('comment.mentioned', {
        splitId: dto.splitId,
        mentionedUsernames: mentions,
        actorId: userId,
        commentId: comment.id,
      });
    }

    return comment;
  }

  async listComments(splitId: string, page: number, limit: number) {
    const [data, total] = await this.repo.findAndCount({
      where: { splitId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.repo.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.repo.remove(comment);
    return { message: 'Comment deleted successfully' };
  }
}
