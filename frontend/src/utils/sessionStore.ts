/**
 * Session storage layer with versioning, expiry, and cross-tab synchronization.
 */

const SESSION_VERSION = "1.0.0";
const STORAGE_PREFIX = "stellarsplit.session.";

export const SessionKey = {
  ACTIVE_USER_ID: "active-user-id",
  AUTH_TOKEN: "auth-token",
  VERSION: "version",
} as const;

export type SessionKeyType = typeof SessionKey[keyof typeof SessionKey];

interface SessionData {
  value: any;
  expiresAt?: number;
}

class SessionStore {
  private static instance: SessionStore;
  private listeners: Set<(key: string, value: any) => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageChange);
      this.initVersion();
    }
  }

  public static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  private initVersion() {
    const currentVersion = this.getItem(SessionKey.VERSION);
    if (currentVersion !== SESSION_VERSION) {
      // Handle migration or clear stale data
      if (currentVersion) {
        console.warn(`Session version mismatch: ${currentVersion} vs ${SESSION_VERSION}. Clearing stale session.`);
        this.clearAll();
      }
      this.setItem(SessionKey.VERSION, SESSION_VERSION);
    }
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (event.key?.startsWith(STORAGE_PREFIX)) {
      const key = event.key.replace(STORAGE_PREFIX, "");
      const value = event.newValue ? JSON.parse(event.newValue).value : null;
      this.listeners.forEach((listener) => listener(key, value));
    }
  };

  public setItem(key: string, value: any, ttlMs?: number) {
    if (typeof window === "undefined") return;

    const data: SessionData = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    };

    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    this.listeners.forEach((listener) => listener(key, value));
  }

  public getItem<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;

    try {
      const data: SessionData = JSON.parse(raw);
      
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.removeItem(key);
        return null;
      }

      return data.value as T;
    } catch {
      return null;
    }
  }

  public removeItem(key: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    this.listeners.forEach((listener) => listener(key, null));
  }

  public clearAll() {
    if (typeof window === "undefined") return;
    
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  public subscribe(listener: (key: string, value: any) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const sessionStore = SessionStore.getInstance();
