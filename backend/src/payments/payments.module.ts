import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentProcessorService } from "./payment-processor.service";
import { PaymentReconciliationService } from "./payment-reconciliation.service";
import { PaymentReconciliationProcessor } from "./payment-reconciliation.processor";
import { PaymentSettlementProcessor } from "./payment-settlement.processor";
import { StellarModule } from "../stellar/stellar.module";
import { forwardRef } from "@nestjs/common";
import { PaymentGateway } from "../websocket/payment.gateway";
import { Payment } from "../entities/payment.entity";
import { Participant } from "../entities/participant.entity";
import { Split } from "../entities/split.entity";
import { IdempotencyRecord } from "../entities/idempotency-record.entity";
import { EmailModule } from "../email/email.module";
import { MultiCurrencyModule } from "../multi-currency/multi-currency.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { GatewayModule } from "../gateway/gateway.module";
import { IdempotencyService } from "../common/idempotency/idempotency.service";
import { IdempotencyInterceptor } from "../common/idempotency/idempotency.interceptor";
import { ReputationModule } from "../reputation/reputation.module";
import { QueueJobPolicy, JobPolicyTier } from "../common/queue-job-policy";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Participant, Split, IdempotencyRecord]),
    // Register Bull queues for payment processing
    BullModule.registerQueue(
      QueueJobPolicy.forQueue('payment-reconciliation', JobPolicyTier.CRITICAL),
      QueueJobPolicy.forQueue('payment-settlement', JobPolicyTier.CRITICAL),
    ),
    forwardRef(() => StellarModule),
    EmailModule,
    MultiCurrencyModule,
    AnalyticsModule,
    GatewayModule,
    ReputationModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProcessorService,
    PaymentReconciliationService,
    PaymentReconciliationProcessor,
    PaymentSettlementProcessor,
    PaymentGateway,
    IdempotencyService,
    AnalyticsModule,
    IdempotencyInterceptor,
  ],
  exports: [
    PaymentsService,
    PaymentProcessorService,
    IdempotencyService,
    PaymentReconciliationService,
  ],
})
export class PaymentsModule {}
