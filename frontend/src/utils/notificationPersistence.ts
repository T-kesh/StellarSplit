import type { Notification } from "../types/notifications";

const STORAGE_KEY = "stellarsplit.notifications";

export const notificationPersistence = {
  save(notifications: Notification[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error("Failed to save notifications", e);
    }
  },

  load(): Notification[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to load notifications", e);
      return [];
    }
  },

  merge(local: Notification[], incoming: Notification[]): Notification[] {
    const map = new Map<string, Notification>();
    
    // Process local notifications first
    local.forEach(n => map.set(n.id, n));
    
    // Merge incoming, preserve 'read' status if local was already read
    incoming.forEach(n => {
      if (map.has(n.id)) {
        const existing = map.get(n.id)!;
        map.set(n.id, {
          ...n,
          read: existing.read || n.read,
          createdAt: existing.createdAt || n.createdAt, // Prefer local timestamp if available
        });
      } else {
        map.set(n.id, n);
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
};
