import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThanOrEqual, Repository } from 'typeorm';
import { UserReputation } from './entities/user-reputation.entity';
import { ReputationEvent } from './entities/reputation-event.entity';
import { ReputationEventType } from './enums/reputation-event-type.enum';
import { ScoreCalculatorService } from './score-calculator.service';

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(UserReputation) private readonly userRepo: Repository<UserReputation>,
    @InjectRepository(ReputationEvent) private readonly eventRepo: Repository<ReputationEvent>,
    private readonly calculator: ScoreCalculatorService,
  ) {}

  async recordEvent(
    userId: string,
    splitId: string,
    eventType: ReputationEventType,
    manager?: EntityManager,
  ) {
    const impact = this.calculator.getImpact(eventType);

    const userRepo = manager
      ? manager.getRepository(UserReputation)
      : this.userRepo;
    const eventRepo = manager
      ? manager.getRepository(ReputationEvent)
      : this.eventRepo;

    // Idempotency: don't apply the same event type twice for the same split.
    const existingEvent = await eventRepo.findOne({
      where: { userId, splitId, eventType },
    });
    if (existingEvent) {
      return userRepo.findOne({ where: { userId } });
    }

    let reputation = await userRepo.findOne({ where: { userId } });
    if (!reputation) {
      reputation = userRepo.create({ userId, trustScore: 50, scoreHistory: [] });
    }

    // "Participation" should count distinct splits, not distinct event types.
    const hasAnyEventForSplit = await eventRepo.findOne({
      where: { userId, splitId },
    });

    if (!hasAnyEventForSplit) {
      reputation.totalSplitsParticipated += 1;
    }

    reputation.trustScore = Math.max(0, Math.min(100, reputation.trustScore + impact));
    reputation.lastScoreUpdate = new Date();
    reputation.scoreHistory.push({
      score: reputation.trustScore,
      date: new Date().toISOString(),
      reason: eventType,
    });

    // Payment outcome counters (tracked per event type, idempotent above).
    if (eventType === ReputationEventType.PAID_ON_TIME) {
      reputation.totalSplitsPaidOnTime += 1;
    }
    if (eventType === ReputationEventType.PAID_LATE) {
      reputation.totalSplitsLate += 1;
    }
    if (eventType === ReputationEventType.UNPAID_EXPIRED) {
      reputation.totalSplitsUnpaid += 1;
    }

    const event = eventRepo.create({ userId, splitId, eventType, scoreImpact: impact });
    await eventRepo.save(event);
    await userRepo.save(reputation);
    return reputation;
  }

  async getReputation(userId: string) {
    return this.userRepo.findOne({ where: { userId } });
  }

  async getHistory(userId: string) {
    return this.eventRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getBadge(userId: string) {
    const reputation = await this.getReputation(userId);
    if (!reputation || reputation.totalSplitsParticipated < 3) {
      return { badge: 'Hidden' };
    }
    return { badge: this.calculator.getBadge(reputation.trustScore) };
  }

  async leaderboard() {
    return this.userRepo.find({
      where: { totalSplitsParticipated: MoreThanOrEqual(3) },
      order: { trustScore: 'DESC' },
      take: 20,
    });
  }
}
