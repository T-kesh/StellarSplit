import { sessionStore, SessionKey } from "./sessionStore";

export interface StoredParticipantIdentity {
  name: string;
  email?: string;
  walletAddress?: string;
}

const PARTICIPANT_DIRECTORY_KEY = 'participant-directory';

export function getStoredActiveUserId(): string | null {
  return sessionStore.getItem<string>(SessionKey.ACTIVE_USER_ID);
}

export function setStoredActiveUserId(userId: string | null): void {
  if (!userId) {
    sessionStore.removeItem(SessionKey.ACTIVE_USER_ID);
  } else {
    sessionStore.setItem(SessionKey.ACTIVE_USER_ID, userId);
  }
}

export function getStoredAuthToken(): string | null {
  return sessionStore.getItem<string>(SessionKey.AUTH_TOKEN);
}

export function setStoredAuthToken(token: string | null): void {
  if (!token) {
    sessionStore.removeItem(SessionKey.AUTH_TOKEN);
  } else {
    sessionStore.setItem(SessionKey.AUTH_TOKEN, token);
  }
}

// Keep the participant directory for now, but move it to sessionStore if needed later
export function storeSplitParticipantDirectory(
  splitId: string,
  identities: Record<string, StoredParticipantIdentity>,
): void {
  const currentDirectory = sessionStore.getItem<Record<string, Record<string, StoredParticipantIdentity>>>(PARTICIPANT_DIRECTORY_KEY) || {};
  currentDirectory[splitId] = {
    ...(currentDirectory[splitId] ?? {}),
    ...identities,
  };
  sessionStore.setItem(PARTICIPANT_DIRECTORY_KEY, currentDirectory);
}

export function getStoredSplitParticipantDirectory(
  splitId: string,
): Record<string, StoredParticipantIdentity> {
  const directory = sessionStore.getItem<Record<string, Record<string, StoredParticipantIdentity>>>(PARTICIPANT_DIRECTORY_KEY) || {};
  return directory[splitId] ?? {};
}
