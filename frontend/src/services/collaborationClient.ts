import { io, Socket } from 'socket.io-client';
import { getStoredAuthToken } from '../utils/session';
import { BASE_API_URL } from '../constants/api';
import type { PresenceUser, ActivityEvent, ConflictInfo, SplitUpdate } from '../types/collaboration';

/**
 * Socket event payload types for type-safe event handling.
 *
 * These interfaces define the exact shape of each event emitted by the server.
 */
export interface ServerToClientEvents {
  connect: () => void;
  disconnect: () => void;
  participant_joined: (user: PresenceUser) => void;
  participant_left: (userId: string) => void;
  split_activity: (activity: ActivityEvent) => void;
  split_updated: (update: SplitUpdate) => void;
  cursor_updated: (payload: { userId: string; coords: { x: number; y: number } }) => void;
}

/**
 * Client-to-server event payloads.
 */
export interface ClientToServerEvents {
  join_split: (payload: { splitId: string; user: Partial<PresenceUser> }) => void;
  leave_split: (payload: { splitId: string }) => void;
  split_activity: (payload: { splitId: string; activity: ActivityEvent }) => void;
  cursor_move: (payload: {
    splitId: string;
    userId: string | undefined;
    coords: { x: number; y: number };
  }) => void;
}

/**
 * Creates and returns a typed Socket.io client for collaboration features.
 *
 * Handles:
 * - Extracting the socket URL from BASE_API_URL
 * - Obtaining the auth token from sessionStore (not raw localStorage)
 * - Configuring the socket with correct transports and path
 *
 * @returns A Socket.io client instance configured for the collaboration namespace
 */
export function createCollaborationSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  // Extract protocol and host from BASE_API_URL
  const url = new URL(
    BASE_API_URL.startsWith('http') ? BASE_API_URL : window.location.origin,
  );
  const socketUrl = `${url.protocol}//${url.host}`;

  // Get auth token from sessionStore (not raw localStorage)
  const token = getStoredAuthToken();

  return io(socketUrl, {
    path: '/socket.io',
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
}
