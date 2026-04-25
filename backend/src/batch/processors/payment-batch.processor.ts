import { Process, Processor, OnQueueFailed } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BatchJob, BatchJobStatus } from "../entities/batch-job.entity";
import { BatchOperation, BatchOperationStatus } from "../entities/batch-operation.entity";
import { BatchProgressService } from "../batch-progress.service";
import { BatchJobData } from "../batch.service";
import { PaymentRequestContext } from "../../payments/payment-request-context";
import { PaymentsService } from "../../payments/payments.service";
import { logJobFailure } from "../../common/queue-job-policy";

interface PaymentPayload {
  splitId: string;
  participantId: string;
  stellarTxHash: string;
  idempotencyKey?: string;
}

@Processor("batch_payments")
export class PaymentBatchProcessor {
  private readonly logger = new Logger(PaymentBatchProcessor.name);

  constructor(
    @InjectRepository(BatchJob)
    private batchJobRepository: Repository<BatchJob>,
    @InjectRepository(BatchOperation)
    private batchOperationRepository: Repository<BatchOperation>,
    private batchProgressService: BatchProgressService,
    private paymentsService: PaymentsService,
  ) {}

  @Process("process")
  async handlePaymentBatch(job: Job<BatchJobData>): Promise<void> {
    const { batchId, chunkSize, concurrency } = job.data;

    this.logger.log(`Starting payment batch ${batchId}`);

    await this.batchJobRepository.update(batchId, {
      status: BatchJobStatus.PROCESSING,
      started_at: new Date(),
    });

    try {
      const operations = await this.batchOperationRepository.find({
        where: {
          batch_id: batchId,
          status: BatchOperationStatus.PENDING,
        },
        order: { operation_index: "ASC" },
      });

      if (operations.length === 0) {
        this.logger.warn(`No pending operations for batch ${batchId}`);
        return;
      }

      for (let i = 0; i < operations.length; i += chunkSize) {
        const chunk = operations.slice(i, i + chunkSize);

        this.logger.debug(
          `Processing chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(operations.length / chunkSize)}`,
        );

        await this.processChunk(chunk, concurrency);

        const progress = Math.round(((i + chunk.length) / operations.length) * 100);
        await job.progress(progress);
      }

      await this.batchJobRepository.update(batchId, {
        status: BatchJobStatus.COMPLETED,
        completed_at: new Date(),
      });

      this.logger.log(`Completed payment batch ${batchId}`);
    } catch (error: any) {
      logJobFailure(this.logger, job, error, { context: 'payment-batch' });

      await this.batchJobRepository.update(batchId, {
        status: BatchJobStatus.FAILED,
        error_message: error.message,
        completed_at: new Date(),
      });

      throw error;
    }
  }

  /**
   * Dead-letter handler: fires when the payment batch job has exhausted all retries.
   */
  @OnQueueFailed()
  async onFailed(job: Job<BatchJobData>, err: Error) {
    logJobFailure(this.logger, job, err, { context: 'payment-batch-dead-letter' });

    const { batchId } = job.data;
    if (batchId) {
      try {
        await this.batchJobRepository.update(batchId, {
          status: BatchJobStatus.FAILED,
          error_message: err.message,
          completed_at: new Date(),
        });
      } catch {
        // best effort
      }
    }
  }

  /**
   * Process a chunk of operations with concurrency control
   */
  private async processChunk(
    operations: BatchOperation[],
    concurrency: number,
  ): Promise<void> {
    const queue = [...operations];
    const executing: Promise<void>[] = [];

    while (queue.length > 0 || executing.length > 0) {
      while (executing.length < concurrency && queue.length > 0) {
        const operation = queue.shift()!;
        executing.push(this.processOperation(operation));
      }

      if (executing.length > 0) {
        await Promise.race(executing);

        for (let i = executing.length - 1; i >= 0; i--) {
          const promise = executing[i];
          const result = await Promise.race([
            promise.then(() => ({ done: true })),
            Promise.resolve({ done: false }),
          ]);
          if (result.done) {
            executing.splice(i, 1);
          }
        }
      }
    }

    await Promise.all(executing);
  }

  /**
   * Process a single payment operation via the real payment service
   */
  private async processOperation(operation: BatchOperation): Promise<void> {
    try {
      await this.batchProgressService.markOperationStarted(operation.id);

      const payload = operation.payload as PaymentPayload;
      this.validatePayload(payload);

      const context: PaymentRequestContext = {
        idempotencyKey: payload.idempotencyKey,
      };
      const result = await this.paymentsService.submitPayment(
        payload.splitId,
        payload.participantId,
        payload.stellarTxHash,
        context,
      );

      await this.batchProgressService.markOperationCompleted(operation.id, {
        paymentId: result.paymentId,
        splitId: payload.splitId,
        participantId: payload.participantId,
        stellarTxHash: payload.stellarTxHash,
        isDuplicate: result.isDuplicate ?? false,
        processedAt: new Date().toISOString(),
      });

      this.logger.debug(`Completed payment operation ${operation.id}`);
    } catch (error: any) {
      this.logger.error(`Failed payment operation ${operation.id}: ${error.message}`);

      await this.batchProgressService.markOperationFailed(
        operation.id,
        error.message,
        error.code || "PAYMENT_ERROR",
      );
    }
  }

  /**
   * Validate payment payload before submission
   */
  private validatePayload(payload: PaymentPayload): void {
    if (!payload.splitId) {
      throw new Error("Split ID is required");
    }

    if (!payload.participantId) {
      throw new Error("Participant ID is required");
    }

    if (!payload.stellarTxHash || payload.stellarTxHash.length < 10) {
      throw new Error("Invalid Stellar transaction hash");
    }
  }
}
