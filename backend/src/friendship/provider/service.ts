import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Friendship } from "../friendship.entity";
import { Repository } from "typeorm";

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private readonly repo: Repository<Friendship>,
  ) {}

  private canonicalPair(userId: string, friendId: string) {
    return userId < friendId
      ? { userId, friendId }
      : { userId: friendId, friendId: userId };
  }

  private friendViewForUser(record: Friendship, viewerId: string) {
    const otherUserId = record.userId === viewerId ? record.friendId : record.userId;
    const pendingDirection =
      record.status === "pending"
        ? record.requestedByUserId === viewerId
          ? "outgoing"
          : "incoming"
        : null;

    return {
      id: record.id,
      userId: viewerId,
      friendId: otherUserId,
      status: record.status,
      pendingDirection,
      blockedByUserId: record.blockedByUserId ?? null,
      createdAt: record.createdAt,
    };
  }

  async sendRequest(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException("Cannot friend yourself");
    }

    const pair = this.canonicalPair(userId, friendId);
    const exists = await this.repo.findOne({
      where: pair,
    });

    if (!exists) {
      const created = await this.repo.save({
        ...pair,
        status: "pending",
        requestedByUserId: userId,
        blockedByUserId: null,
      });

      return this.friendViewForUser(created, userId);
    }

    if (exists.status === "accepted") {
      return this.friendViewForUser(exists, userId);
    }

    if (exists.status === "blocked") {
      if (exists.blockedByUserId && exists.blockedByUserId !== userId) {
        throw new ConflictException("Friendship is blocked by the other user");
      }

      throw new ConflictException("Friendship is blocked");
    }

    if (exists.requestedByUserId === userId) {
      return this.friendViewForUser(exists, userId);
    }

    const accepted = await this.repo.save({
      ...exists,
      status: "accepted",
      requestedByUserId: null,
      blockedByUserId: null,
    });

    return this.friendViewForUser(accepted, userId);
  }

  async acceptRequest(userId: string, friendId: string) {
    const pair = this.canonicalPair(userId, friendId);
    const exists = await this.repo.findOne({ where: pair });

    if (!exists) {
      throw new BadRequestException("No friendship request to accept");
    }

    if (exists.status === "accepted") {
      return this.friendViewForUser(exists, userId);
    }

    if (exists.status === "blocked") {
      throw new ConflictException("Cannot accept a blocked friendship");
    }

    if (exists.requestedByUserId === userId) {
      throw new BadRequestException("Cannot accept your own outgoing request");
    }

    const accepted = await this.repo.save({
      ...exists,
      status: "accepted",
      requestedByUserId: null,
      blockedByUserId: null,
    });

    return this.friendViewForUser(accepted, userId);
  }

  async block(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException("Cannot block yourself");
    }

    const pair = this.canonicalPair(userId, friendId);
    const exists = await this.repo.findOne({ where: pair });

    if (!exists) {
      const created = await this.repo.save({
        ...pair,
        status: "blocked",
        requestedByUserId: null,
        blockedByUserId: userId,
      });

      return this.friendViewForUser(created, userId);
    }

    if (exists.status === "blocked" && exists.blockedByUserId === userId) {
      return this.friendViewForUser(exists, userId);
    }

    const blocked = await this.repo.save({
      ...exists,
      status: "blocked",
      requestedByUserId: null,
      blockedByUserId: userId,
    });

    return this.friendViewForUser(blocked, userId);
  }

  async getFriends(userId: string) {
    const records = await this.repo.find({
      where: [
        { userId, status: "accepted" },
        { friendId: userId, status: "accepted" },
        { userId, status: "pending" },
        { friendId: userId, status: "pending" },
      ],
      order: { createdAt: "DESC" },
    });

    return records.map((record) => this.friendViewForUser(record, userId));
  }
}
