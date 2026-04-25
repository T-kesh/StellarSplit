import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Repository,
  LessThanOrEqual,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export enum DisputeOutboxEventStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('dispute_outbox_events')
@Index(['status', 'nextAttemptAt'])
@Index(['disputeId'])
export class DisputeOutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  disputeId!: string;

  @Column({ type: 'varchar', length: 128 })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: DisputeOutboxEventStatus,
    default: DisputeOutboxEventStatus.PENDING,
  })
  status!: DisputeOutboxEventStatus;

  @Column({ type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextAttemptAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Injectable()
export class DisputeOutboxPublisher {
  private readonly logger = new Logger(DisputeOutboxPublisher.name);
  private readonly maxAttempts = 5;

  constructor(
    @InjectRepository(DisputeOutboxEvent)
    private readonly outboxRepository: Repository<DisputeOutboxEvent>,
  ) {}

  async enqueueEvent(
    disputeId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<DisputeOutboxEvent> {
    const event = this.outboxRepository.create({
      id: uuidv4(),
      disputeId,
      eventType,
      payload,
      status: DisputeOutboxEventStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: new Date(),
    });

    const saved = await this.outboxRepository.save(event);

    this.logger.log(
      `Enqueued dispute outbox event ${saved.id} for dispute ${disputeId}`,
    );

    return saved;
  }

  async getPendingEvents(now: Date = new Date()): Promise<DisputeOutboxEvent[]> {
    return this.outboxRepository.find({
      where: {
        status: DisputeOutboxEventStatus.PENDING,
        nextAttemptAt: LessThanOrEqual(now),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async publishPendingEvents(
    handler: (event: DisputeOutboxEvent) => Promise<void>,
  ): Promise<void> {
    const now = new Date();
    const events = await this.outboxRepository.find({
      where: [
        {
          status: DisputeOutboxEventStatus.PENDING,
            nextAttemptAt: LessThanOrEqual(now),
        },
        {
          status: DisputeOutboxEventStatus.FAILED,
            nextAttemptAt: LessThanOrEqual(now),
        },
      ],
      order: {
        createdAt: 'ASC',
      },
    });

    for (const event of events) {
      try {
        await handler(event);
        await this.markDelivered(event);
      } catch (error) {
        await this.scheduleRetry(event, error);
      }
    }
  }

  async markDelivered(event: DisputeOutboxEvent): Promise<DisputeOutboxEvent> {
    event.status = DisputeOutboxEventStatus.DELIVERED;
    event.nextAttemptAt = undefined;
    const saved = await this.outboxRepository.save(event);

    this.logger.log(`Dispute outbox event ${saved.id} delivered`);
    return saved;
  }

  async scheduleRetry(
    event: DisputeOutboxEvent,
    error: unknown,
  ): Promise<DisputeOutboxEvent> {
    event.attemptCount += 1;
    event.nextAttemptAt = new Date(
      Date.now() + this.getBackoffDelay(event.attemptCount),
    );
    event.status =
      event.attemptCount >= this.maxAttempts
        ? DisputeOutboxEventStatus.FAILED
        : DisputeOutboxEventStatus.PENDING;

    const saved = await this.outboxRepository.save(event);

    this.logger.warn(
      `Dispute outbox event ${saved.id} retry scheduled (attempt ${saved.attemptCount})`,
      error as string,
    );

    return saved;
  }

  private getBackoffDelay(attemptCount: number): number {
    return Math.min(60_000 * attemptCount, 5 * 60_000);
  }
}
