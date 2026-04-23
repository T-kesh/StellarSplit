import { IsString, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Payment submission body.
 * Idempotency is handled exclusively via the `Idempotency-Key` HTTP header
 * (see PaymentRequestContext) — do not add an idempotencyKey field here.
 */
export class SubmitPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  splitId!: string;

  @IsUUID()
  @IsNotEmpty()
  participantId!: string;

  @IsString()
  @IsNotEmpty()
  stellarTxHash!: string;

  /**
   * External reference for webhook replay correlation.
   * Carried through from body so callers can correlate server responses
   * with their own webhook events without depending on the idempotency key.
   */
  @IsOptional()
  @IsString()
  externalReference?: string;
}