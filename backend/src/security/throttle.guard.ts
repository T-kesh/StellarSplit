import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Request } from "express";
import { extractRequestIdentity } from "./request-identity.util";

@Injectable()
export class IpThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    return extractRequestIdentity(req);
  }
}
