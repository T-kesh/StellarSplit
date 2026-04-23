import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { RateLimitGuard } from "./rate-limit.guard";
import { IpThrottleGuard } from "./throttle.guard";
import { AuditLogService } from "./audit-log.service";
import { SecurityMiddleware } from "./security.middleware";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60,
        limit: 100,
      },
    ]),
  ],
  providers: [RateLimitGuard, IpThrottleGuard, AuditLogService, SecurityMiddleware],
  exports: [RateLimitGuard, IpThrottleGuard, AuditLogService],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes("*");
  }
}
