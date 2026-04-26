import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FriendshipService } from '../provider/service';
import { Friendship } from '../friendship.entity';


describe('FriendshipService', () => {
  let service: FriendshipService;
  let repo: Repository<Friendship>;

  const userA = 'user-a';
  const userB = 'user-b';

  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<FriendshipService>(FriendshipService);
    repo = module.get<Repository<Friendship>>(
      getRepositoryToken(Friendship),
    );

    jest.clearAllMocks();
  });

  it('should send a friend request', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue({
      id: 'friendship-id',
      userId: userA,
      friendId: userB,
      status: 'pending',
      requestedByUserId: userA,
      blockedByUserId: null,
      createdAt: new Date(),
    });

    await service.sendRequest(userA, userB);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userA,
        friendId: userB,
        status: 'pending',
        requestedByUserId: userA,
        blockedByUserId: null,
      }),
    );
  });

  it('should auto-accept reverse pending request', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'friendship-id',
      userId: userA,
      friendId: userB,
      status: 'pending',
      requestedByUserId: userB,
      blockedByUserId: null,
      createdAt: new Date(),
    });
    mockRepo.save.mockResolvedValue({
      id: 'friendship-id',
      userId: userA,
      friendId: userB,
      status: 'accepted',
      requestedByUserId: null,
      blockedByUserId: null,
      createdAt: new Date(),
    });

    await service.sendRequest(userA, userB);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'accepted',
        requestedByUserId: null,
        blockedByUserId: null,
      }),
    );
  });

  it('should block friendship deterministically', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'friendship-id',
      userId: userA,
      friendId: userB,
      status: 'accepted',
      requestedByUserId: null,
      blockedByUserId: null,
      createdAt: new Date(),
    });

    await service.block(userA, userB);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        requestedByUserId: null,
        blockedByUserId: userA,
      }),
    );
  });
});
