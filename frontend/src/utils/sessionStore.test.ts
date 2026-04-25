import { describe, it, expect, beforeEach, vi } from "vitest";
import { sessionStore } from "./sessionStore";

describe("sessionStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("sets and gets items", () => {
    sessionStore.setItem("test-key", { foo: "bar" });
    const item = sessionStore.getItem<{ foo: string }>("test-key");
    expect(item).toEqual({ foo: "bar" });
  });

  it("handles expiry", () => {
    vi.useFakeTimers();
    sessionStore.setItem("expiring-key", "val", 1000);
    
    expect(sessionStore.getItem("expiring-key")).toBe("val");
    
    vi.advanceTimersByTime(1001);
    expect(sessionStore.getItem("expiring-key")).toBeNull();
    
    vi.useRealTimers();
  });

  it("subscribes to changes", () => {
    const listener = vi.fn();
    const unsubscribe = sessionStore.subscribe(listener);
    
    sessionStore.setItem("sub-key", "new-val");
    expect(listener).toHaveBeenCalledWith("sub-key", "new-val");
    
    unsubscribe();
    sessionStore.setItem("sub-key", "another-val");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
