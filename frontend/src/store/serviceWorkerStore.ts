import { create } from "zustand";

/**
 * PWA / service worker UI state. Updated by `registerServiceWorker` in sw-register
 * and by user actions (dismiss, retry) from InstallPrompt.
 */
export type ServiceWorkerUiPhase =
  | "idle"
  | "registering"
  | "ready"
  | "update_available"
  | "error"
  | "unsupported";

export type ServiceWorkerStore = {
  phase: ServiceWorkerUiPhase;
  error: string | null;

  setPhase: (phase: ServiceWorkerUiPhase) => void;
  setError: (message: string | null) => void;
  setUpdateAvailable: () => void;
  /** Hide the "new version" bar until a future update is detected. */
  dismissUpdateBanner: () => void;
  clearError: () => void;
  /** Tests only: reset to initial. */
  reset: () => void;
};

const initial: Pick<ServiceWorkerStore, "phase" | "error"> = {
  phase: "idle",
  error: null,
};

export const useServiceWorkerStore = create<ServiceWorkerStore>((set, get) => ({
  ...initial,

  setPhase: (phase) => set({ phase }),

  setError: (message) => {
    if (message) {
      set({ error: message, phase: "error" });
      return;
    }
    set((s) => ({
      error: null,
      phase: s.phase === "error" ? "ready" : s.phase,
    }));
  },

  setUpdateAvailable: () => {
    if (get().phase === "error") return;
    set({ phase: "update_available", error: null });
  },

  dismissUpdateBanner: () => {
    set({ phase: "ready" });
  },

  clearError: () => {
    set((s) => ({
      error: null,
      phase: s.phase === "error" ? "idle" : s.phase,
    }));
  },

  reset: () => set({ ...initial }),
}));
