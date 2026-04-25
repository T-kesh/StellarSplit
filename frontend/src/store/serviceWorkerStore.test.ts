import { afterEach, describe, expect, it } from "vitest";
import { useServiceWorkerStore } from "./serviceWorkerStore";

describe("serviceWorkerStore", () => {
  afterEach(() => {
    useServiceWorkerStore.getState().reset();
  });

  it("starts idle", () => {
    expect(useServiceWorkerStore.getState().phase).toBe("idle");
  });

  it("setError sets error phase and clearError recovers from error to idle", () => {
    useServiceWorkerStore.getState().setError("boom");
    expect(useServiceWorkerStore.getState().phase).toBe("error");
    expect(useServiceWorkerStore.getState().error).toBe("boom");
    useServiceWorkerStore.getState().clearError();
    expect(useServiceWorkerStore.getState().error).toBeNull();
    expect(useServiceWorkerStore.getState().phase).toBe("idle");
  });

  it("setUpdateAvailable is ignored while in error", () => {
    useServiceWorkerStore.getState().setError("failed");
    useServiceWorkerStore.getState().setUpdateAvailable();
    expect(useServiceWorkerStore.getState().phase).toBe("error");
  });

  it("dismissUpdateBanner returns to ready", () => {
    useServiceWorkerStore.getState().setPhase("ready");
    useServiceWorkerStore.getState().setUpdateAvailable();
    expect(useServiceWorkerStore.getState().phase).toBe("update_available");
    useServiceWorkerStore.getState().dismissUpdateBanner();
    expect(useServiceWorkerStore.getState().phase).toBe("ready");
  });
});
