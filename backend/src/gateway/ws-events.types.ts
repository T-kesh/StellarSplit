// ── Inbound message payloads ──────────────────────────────────────────────────

export interface JoinSplitPayload {
  splitId: string;
}

export interface LeaveSplitPayload {
  splitId: string;
}

export interface SplitPresencePayload {
  splitId: string;
}

export interface SplitActivityPayload {
  splitId: string;
  activity: SplitActivityData;
}

export interface SplitActivityData {
  type: string;
  actorId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

// ── Outbound event payloads ───────────────────────────────────────────────────

export interface JoinedSplitEvent {
  splitId: string;
  room: string;
}

export interface LeftSplitEvent {
  splitId: string;
  room: string;
}

export interface SplitPresenceEvent {
  splitId: string;
  /** Socket IDs currently in the room. */
  participants: string[];
}

export interface SplitActivityBroadcastEvent {
  splitId: string;
  activity: SplitActivityData;
}

export interface PaymentReceivedEvent {
  splitId: string;
  paymentId: string;
  participantId: string;
  amount: number;
  currency: string;
  txHash: string;
  timestamp: string;
}

export interface SplitUpdatedEvent {
  splitId: string;
  changes: Record<string, unknown>;
  updatedAt: string;
}

export interface ParticipantJoinedEvent {
  splitId: string;
  participantId: string;
  userId: string;
  joinedAt: string;
}

// ── Handler return shapes ─────────────────────────────────────────────────────

export interface WsHandlerResponse<T> {
  event: string;
  data: T;
}
