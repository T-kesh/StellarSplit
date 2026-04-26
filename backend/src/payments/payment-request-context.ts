/**
 * Canonical idempotency context for payment requests.
 * The key is sourced exclusively from the `Idempotency-Key` HTTP header —
 * not from the request body — to prevent mismatched replay semantics.
 */
export interface PaymentRequestContext {
  /** Value of the `Idempotency-Key` header; undefined when the header is absent. */
  idempotencyKey: string | undefined;
  /** External reference carried through for webhook replay correlation. */
  externalReference?: string;
}
