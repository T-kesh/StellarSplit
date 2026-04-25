/**
 * Shared queue-job policy for Bull processors.
 *
 * Centralises retry, backoff, dead-letter, and structured-failure defaults
 * so every processor declares consistent behaviour instead of ad-hoc
 * per-queue settings.
 *
 * ## Usage
 *
 * ### 1. Queue registration (module file)
 * ```ts
 * BullModule.registerQueue(
 *   QueueJobPolicy.forQueue('analytics-export', JobPolicyTier.STANDARD),
 * )
 * ```
 *
 * ### 2. Inside a processor
 * ```ts
 * import { QueueJobPolicy, structuredFailureLog } from '../common/queue-job-policy';
 *
 * catch (err) {
 *   this.logger.error(
 *     structuredFailureLog(job, err, { context: 'export-generation' }),
 *   );
 * }
 * ```
 */

import { Job } from 'bull';
import { Logger } from '@nestjs/common';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BackoffType = 'exponential' | 'fixed';

export interface JobPolicyOptions {
  /** Maximum number of attempts before the job is marked failed. */
  attempts: number;
  /** Backoff strategy applied between retries. */
  backoff: { type: BackoffType; delay: number };
  /** Remove job data from Redis once it completes successfully. */
  removeOnComplete: boolean;
  /** Remove failed job data from Redis after all attempts are exhausted. */
  removeOnFail: boolean;
}

/**
 * Preset tiers that map to sensible defaults for different job criticality.
 *
 * | Tier       | Attempts | Backoff               | removeOnComplete | removeOnFail |
 * |------------|----------|-----------------------|------------------|--------------|
 * | CRITICAL   | 5        | exponential 2 000 ms | false            | false        |
 * | STANDARD   | 3        | exponential 1 000 ms | true             | false        |
 * | BEST_EFFORT| 1        | —                     | true             | true         |
 */
export enum JobPolicyTier {
  /** Financial / settlement jobs that must never be silently lost. */
  CRITICAL = 'CRITICAL',
  /** Regular background work that should retry a few times. */
  STANDARD = 'STANDARD',
  /** Fire-and-forget jobs (notifications, analytics export). */
  BEST_EFFORT = 'BEST_EFFORT',
}

/* ------------------------------------------------------------------ */
/*  Policy presets                                                     */
/* ------------------------------------------------------------------ */

const TIER_DEFAULTS: Record<JobPolicyTier, JobPolicyOptions> = {
  [JobPolicyTier.CRITICAL]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: false,
    removeOnFail: false,
  },
  [JobPolicyTier.STANDARD]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
  [JobPolicyTier.BEST_EFFORT]: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 0 },
    removeOnComplete: true,
    removeOnFail: true,
  },
};

/* ------------------------------------------------------------------ */
/*  Queue registration helper                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a `BullModule.registerQueue()`-compatible config object that
 * includes `name` and `defaultJobOptions` from the chosen policy tier.
 *
 * Partial overrides can be supplied via `overrides` — they are merged
 * shallowly into the tier defaults.
 *
 * @example
 * ```ts
 * BullModule.registerQueue(
 *   QueueJobPolicy.forQueue('payment-settlement', JobPolicyTier.CRITICAL),
 * )
 * ```
 */
export function forQueue(
  name: string,
  tier: JobPolicyTier = JobPolicyTier.STANDARD,
  overrides?: Partial<JobPolicyOptions>,
): { name: string; defaultJobOptions: JobPolicyOptions } {
  const base = { ...TIER_DEFAULTS[tier] };
  const merged: JobPolicyOptions = overrides
    ? {
        attempts: overrides.attempts ?? base.attempts,
        backoff: overrides.backoff ?? base.backoff,
        removeOnComplete: overrides.removeOnComplete ?? base.removeOnComplete,
        removeOnFail: overrides.removeOnFail ?? base.removeOnFail,
      }
    : base;

  return { name, defaultJobOptions: merged };
}

/* ------------------------------------------------------------------ */
/*  Structured failure logging                                         */
/* ------------------------------------------------------------------ */

export interface FailureLogMeta {
  /** Optional free-form context (e.g. "export-generation"). */
  context?: string;
  /** Any extra metadata to include. */
  [key: string]: unknown;
}

/**
 * Produce a structured log object for a failed job.  Every processor
 * should call this (or delegate to `logJobFailure`) in their catch block
 * so that failure metadata has a consistent shape across the codebase.
 *
 * The returned object is safe to pass to `Logger.error()` as a string
 * via `JSON.stringify`, or to spread into a structured log.
 */
export function structuredFailureLog(
  job: Job,
  error: unknown,
  meta?: FailureLogMeta,
): Record<string, unknown> {
  const err = error instanceof Error ? error : new Error(String(error));

  return {
    jobId: job.id,
    jobName: job.name,
    queueName: job.queue.name,
    attemptsMade: job.attemptsMade,
    attemptsTotal: job.opts?.attempts ?? 1,
    data: job.data,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

/**
 * Convenience helper that logs a structured failure via the NestJS Logger.
 * Uses `error.message` as the plain-text message and attaches the full
 * structured payload as a stringified context object.
 */
export function logJobFailure(
  logger: Logger,
  job: Job,
  error: unknown,
  meta?: FailureLogMeta,
): void {
  const payload = structuredFailureLog(job, error, meta);
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(err.message, JSON.stringify(payload));
}

/* ------------------------------------------------------------------ */
/*  Dead-letter helper                                                 */
/* ------------------------------------------------------------------ */

/**
 * When a job has exhausted all retries, it should be routed to a
 * dead-letter queue for manual inspection.  Call this from a Bull
 * `@OnQueueFailed` or `@OnQueueError` handler.
 *
 * This is a thin wrapper that clones the original job data with an
 * additional `deadLetterMeta` field containing the failure context.
 */
export async function routeToDeadLetter(
  deadLetterQueue: { add: (name: string, data: unknown, opts?: unknown) => Promise<unknown> },
  job: Job,
  error: unknown,
): Promise<void> {
  const payload = structuredFailureLog(job, error, {
    deadLetteredAt: new Date().toISOString(),
  });

  await deadLetterQueue.add(job.name, payload, {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  });
}

/* ------------------------------------------------------------------ */
/*  Re-exports for convenience                                         */
/* ------------------------------------------------------------------ */

export const QueueJobPolicy = {
  forQueue,
  TIER_DEFAULTS,
  structuredFailureLog,
  logJobFailure,
  routeToDeadLetter,
} as const;
