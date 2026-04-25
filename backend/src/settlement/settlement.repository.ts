import { AppDataSource } from "../database/data-source";
import { IsNull, LessThan } from "typeorm";
import { User } from "./entities/user.entity";

export const userRepo = AppDataSource.getRepository(User);

export async function findActiveParticipants(): Promise<User[]> {
  const now = new Date();

  return userRepo.find({
    where: [
      { snoozedUntil: IsNull() },
      { snoozedUntil: LessThan(now) },
    ],
  });
}

export async function updateSnooze(userId: string, untilDate: Date) {
  await userRepo.update(userId, { snoozedUntil: untilDate });
}

export async function clearSnooze(userId: string) {
  await userRepo.update(userId, { snoozedUntil: null });
}
