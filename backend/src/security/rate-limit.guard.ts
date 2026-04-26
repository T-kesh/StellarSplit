import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerStorage } from "@nestjs/throttler";
import { Request } from "express";
import { extractRequestIdentity } from "./request-identity.util";

export const RATE_LIMIT_KEY = "rate_limit";

export interface RateLimitConfig {
  limit: number;
  ttl: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly storage: ThrottlerStorage
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const config = this.reflector.get<RateLimitConfig>(RATE_LIMIT_KEY, handler);

    if (!config) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const identity = extractRequestIdentity(req);

    const key = `rate:${identity}:${handler.name}`;

    const record = await this.storage.increment(
      key,
      config.ttl,
      config.limit,
      0,
      "identity"
    );

    if (record.totalHits > config.limit) {
      throw new HttpException(
        "Rate limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
