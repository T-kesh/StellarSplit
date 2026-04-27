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

export type PaymentStatusUpdatePayload = Record<string, unknown>;

export type SplitCompletionPayload = Record<string, unknown>;

export type PaymentNotificationPayload = Record<string, unknown>;

export type ActivityNewPayload = unknown;

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