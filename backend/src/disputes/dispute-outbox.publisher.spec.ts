import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DisputeOutboxEvent,
  DisputeOutboxEventStatus,
  DisputeOutboxPublisher,
} from './dispute-outbox.publisher';
import { DisputeNotificationListener } from './listeners/dispute-notification.listener';
import { DisputeCreatedEvent } from './dispute.events';

describe('DisputeOutboxPublisher', () => {
  let publisher: DisputeOutboxPublisher;
  let repo: Partial<Repository<DisputeOutboxEvent>>;

  beforeEach(async () => {
    repo = {
      create: jest.fn((...args: any[]) => (Array.isArray(args[0]) ? args[0].map((v: any) => v) : args[0])),
      save: jest.fn(async (entity: any) => entity),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeOutboxPublisher,
        {
          provide: getRepositoryToken(DisputeOutboxEvent),
          useValue: repo,
        },
      ],
    }).compile();

    publisher = module.get<DisputeOutboxPublisher>(DisputeOutboxPublisher);
  });

  it('should enqueue dispute outbox events to durable storage', async () => {
    const event = await publisher.enqueueEvent('dispute-123', 'dispute.notification.created', {
      disputeId: 'dispute-123',
      raisedBy: 'user-1',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        disputeId: 'dispute-123',
        eventType: 'dispute.notification.created',
        payload: expect.objectContaining({ raisedBy: 'user-1' }),
        status: DisputeOutboxEventStatus.PENDING,
      }),
    );
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      disputeId: 'dispute-123',
      eventType: 'dispute.notification.created',
    }));
    expect(event.status).toBe(DisputeOutboxEventStatus.PENDING);
  });

  it('should deliver pending events and mark them as delivered', async () => {
    const stored: DisputeOutboxEvent = {
      id: 'outbox-1',
      disputeId: 'dispute-123',
      eventType: 'dispute.notification.created',
      payload: { disputeId: 'dispute-123' },
      status: DisputeOutboxEventStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };

    (repo.find as jest.Mock).mockResolvedValue([stored]);

    const handler = jest.fn(async () => undefined);
    await publisher.publishPendingEvents(handler);

    expect(handler).toHaveBeenCalledWith(stored);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'outbox-1',
        status: DisputeOutboxEventStatus.DELIVERED,
      }),
    );
  });

  it('should schedule a retry when delivery fails', async () => {
    const stored: DisputeOutboxEvent = {
      id: 'outbox-2',
      disputeId: 'dispute-123',
      eventType: 'dispute.notification.created',
      payload: { disputeId: 'dispute-123' },
      status: DisputeOutboxEventStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };

    (repo.find as jest.Mock).mockResolvedValue([stored]);

    const handler = jest.fn(async () => {
      throw new Error('delivery failure');
    });

    await publisher.publishPendingEvents(handler);

    expect(handler).toHaveBeenCalledWith(stored);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'outbox-2',
        status: DisputeOutboxEventStatus.PENDING,
        attemptCount: 1,
      }),
    );
    expect(stored.nextAttemptAt?.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('DisputeNotificationListener', () => {
  let listener: DisputeNotificationListener;
  const mockOutbox: Partial<DisputeOutboxPublisher> = {
    enqueueEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeNotificationListener,
        {
          provide: DisputeOutboxPublisher,
          useValue: mockOutbox,
        },
      ],
    }).compile();

    listener = module.get<DisputeNotificationListener>(DisputeNotificationListener);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should enqueue notification events instead of writing console logs', async () => {
    const event = new DisputeCreatedEvent(
      { id: 'dispute-100', splitId: 'split-1', disputeType: 'claim', description: 'reason' } as any,
      'user-123',
    );

    await listener.handleDisputeCreated(event);

    expect(mockOutbox.enqueueEvent).toHaveBeenCalledWith(
      'dispute-100',
      'dispute.notification.created',
      expect.objectContaining({ raisedBy: 'user-123' }),
    );
    expect(console.log).not.toHaveBeenCalled();
  });
});
