export interface JoinRoomPayload {
  roomId: string;
}

export interface JoinUserRoomPayload {
  userId: string;
}

export interface JoinedRoomEvent {
  roomId: string;
}

export interface JoinedUserRoomEvent {
  userId: string;
}

export interface PaymentStatusUpdatePayload {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  splitId?: string;
  participantId?: string;
  amount?: number;
  currency?: string;
  txHash?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface SplitCompletionPayload {
  splitId: string;
  totalAmount: number;
  currency: string;
  completedAt: string;
  participantCount: number;
  payments: Array<{
    paymentId: string;
    participantId: string;
    amount: number;
    status: string;
  }>;
}

export interface PaymentNotificationPayload {
  type: 'payment_received' | 'payment_sent' | 'payment_failed' | 'refund_processed';
  paymentId: string;
  splitId?: string;
  participantId?: string;
  amount: number;
  currency: string;
  txHash?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityNewPayload {
  activityId: string;
  userId: string;
  type: 'payment' | 'split' | 'participant' | 'system';
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ActivityReadPayload {
  activityIds: string[];
}

export interface WsHandlerResponse<T> {
  event: string;
  data: T;
}

export interface WsJwtPayload {
  sub?: string;
  userId?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}