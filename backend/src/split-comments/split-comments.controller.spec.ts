import { Test, TestingModule } from '@nestjs/testing';
import { SplitCommentsController } from './split-comments.controller';
import { SplitCommentService } from './provider/provider.service';

describe('SplitCommentsController', () => {
  let controller: SplitCommentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SplitCommentsController],
      providers: [
        {
          provide: SplitCommentService,
          useValue: {
            createComment: jest.fn(),
            listComments: jest.fn(),
            deleteComment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SplitCommentsController>(SplitCommentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
