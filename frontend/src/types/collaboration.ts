export interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  isTyping: boolean;
  lastSeen: Date;
  activeView: "split-details" | "items" | "payment";
  cursor?: { x: number; y: number }; // Added cursor CRDT tracking
}

export interface ActivityEvent {
  id: string;
  type:
    | "join"
    | "leave"
    | "item-added"
    | "item-updated"
    | "item-deleted"
    | "payment-status"
    | "custom";
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  splitId: string;
}

export interface ConflictInfo {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  remoteUser: string;
  timestamp: Date;
}

export interface SplitUpdate {
  type: string;
  payload: unknown;
  userId: string;
  timestamp: Date;
}

export interface CollaborationState {
  connected: boolean;
  presence: Record<string, PresenceUser>;
  activities: ActivityEvent[];
  conflicts: ConflictInfo[];
}
