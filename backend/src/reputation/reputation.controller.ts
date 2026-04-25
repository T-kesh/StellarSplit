import { Controller, Get, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import { ReputationService } from "./reputation.service";

interface AuthRequest extends Request {
  user: { walletAddress: string };
}

@Controller("reputation")
export class ReputationController {
  constructor(private readonly service: ReputationService) {}

  @Get(":walletAddress")
  async getReputation(@Param("walletAddress") walletAddress: string) {
    return this.service.getReputation(walletAddress);
  }

  @Get("my-score")
  async myScore(@Req() req: AuthRequest) {
    return this.service.getReputation(req.user.walletAddress);
  }

  @Get(":walletAddress/history")
  async history(@Param("walletAddress") walletAddress: string) {
    return this.service.getHistory(walletAddress);
  }

  @Get("leaderboard/trusted-payers")
  async leaderboard() {
    return this.service.leaderboard();
  }

  @Get("badge/:walletAddress")
  async badge(@Param("walletAddress") walletAddress: string) {
    return this.service.getBadge(walletAddress);
  }
}
