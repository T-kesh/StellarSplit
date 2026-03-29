import { Test, TestingModule } from '@nestjs/testing';
import { SplitCommentService } from './provider/provider.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SplitComment } from './split-comment.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MentionService } from '@/mentions/provider/service';

const mockRepo = {
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockMentionService = {
  extractMentions: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('SplitCommentService', () => {
  let service: SplitCommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitCommentService,
        { provide: getRepositoryToken(SplitComment), useValue: mockRepo },
        { provide: MentionService, useValue: mockMentionService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SplitCommentService>(SplitCommentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a comment', async () => {
    const dto = { splitId: 'split-1', comment: 'hello world' };
    mockRepo.save.mockResolvedValue({ id: 'c1', ...dto, userId: 'u1' });
    mockMentionService.extractMentions.mockReturnValue([]);

    const result = await service.createComment('u1', dto);

    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.splitId).toBe('split-1');
  });

  it('should emit mention event when comment has mentions', async () => {
    const dto = { splitId: 'split-1', comment: 'hello @john' };
    mockRepo.save.mockResolvedValue({ id: 'c1', ...dto, userId: 'u1' });
    mockMentionService.extractMentions.mockReturnValue(['john']);

    await service.createComment('u1', dto);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith('comment.mentioned', {
      splitId: 'split-1',
      mentionedUsernames: ['john'],
      actorId: 'u1',
      commentId: 'c1',
    });
  });

  it('should list comments with pagination', async () => {
    mockRepo.findAndCount.mockResolvedValue([[{ id: 'c1' }], 1]);

    const result = await service.listComments('split-1', 1, 10);

    expect(result.total).toBe(1);
    expect(result.data.length).toBe(1);
  });

  it('should delete a comment if user is the owner', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'c1', userId: 'u1' });
    mockRepo.remove.mockResolvedValue({});

    const result = await service.deleteComment('c1', 'u1');

    expect(result.message).toBe('Comment deleted successfully');
  });

  it('should throw error if user tries to delete someone elses comment', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'c1', userId: 'u1' });

    await expect(service.deleteComment('c1', 'u2')).rejects.toThrow('You can only delete your own comments');
  });
}
