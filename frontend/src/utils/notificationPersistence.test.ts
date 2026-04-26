import { describe, it, expect, beforeEach, vi } from "vitest";
import { notificationPersistence } from "./notificationPersistence";
import type { Notification } from "../types/notifications";

describe("notificationPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves and loads notifications", () => {
    const notifications: Notification[] = [
      { id: "1", type: "payment_received", title: "Test", message: "Msg", read: false, createdAt: new Date().toISOString() }
    ];
    notificationPersistence.save(notifications);
    const loaded = notificationPersistence.load();
    expect(loaded).toEqual(notifications);
  });

  it("merges local and incoming notifications correctly", () => {
    const local: Notification[] = [
      { id: "1", type: "payment_received", title: "Test", message: "Msg", read: true, createdAt: "2024-01-01T00:00:00.000Z" }
    ];
    const incoming: Notification[] = [
      { id: "1", type: "payment_received", title: "Test Updated", message: "Msg Updated", read: false, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "2", type: "split_completed", title: "New", message: "New Msg", read: false, createdAt: "2024-01-02T00:00:00.000Z" }
    ];

    const merged = notificationPersistence.merge(local, incoming);
    
    expect(merged).toHaveLength(2);
    // ID 1 should be merged, preserving read: true
    const n1 = merged.find(n => n.id === "1");
    expect(n1?.read).toBe(true);
    expect(n1?.title).toBe("Test Updated");
    
    // Results should be sorted by date descending
    expect(merged[0].id).toBe("2");
  });
});
