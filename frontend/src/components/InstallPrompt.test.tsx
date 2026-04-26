import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useServiceWorkerStore } from "../store/serviceWorkerStore";
import InstallPrompt from "./InstallPrompt";

const applyServiceWorkerUpdate = vi.fn();
const forceRefreshWithCacheClear = vi.fn().mockResolvedValue(undefined);
const registerServiceWorker = vi.fn().mockResolvedValue(undefined);

vi.mock("../utils/sw-register", () => ({
  applyServiceWorkerUpdate: () => applyServiceWorkerUpdate(),
  forceRefreshWithCacheClear: () => forceRefreshWithCacheClear(),
  registerServiceWorker: () => registerServiceWorker(),
}));

const installApp = vi.fn();
const { mockUsePWA } = vi.hoisted(() => ({
  mockUsePWA: vi.fn(),
}));

vi.mock("../hooks/usePWA", () => ({
  usePWA: () => mockUsePWA() as ReturnType<typeof import("../hooks/usePWA").usePWA>,
}));

describe("InstallPrompt", () => {
  beforeEach(() => {
    useServiceWorkerStore.getState().reset();
    applyServiceWorkerUpdate.mockClear();
    forceRefreshWithCacheClear.mockClear();
    registerServiceWorker.mockClear();
    installApp.mockClear();
    mockUsePWA.mockReturnValue({
      isOnline: true,
      installPrompt: null,
      installApp,
    });
  });

  afterEach(() => {
    useServiceWorkerStore.getState().reset();
  });

  it("wires 'Reload to update' to applyServiceWorkerUpdate", () => {
    act(() => {
      useServiceWorkerStore.getState().setPhase("ready");
      useServiceWorkerStore.getState().setUpdateAvailable();
    });
    render(<InstallPrompt />);
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /reload to update/i }),
      );
    });
    expect(applyServiceWorkerUpdate).toHaveBeenCalledTimes(1);
  });

  it("wires 'Full refresh (clear cache)' to forceRefreshWithCacheClear", () => {
    act(() => {
      useServiceWorkerStore.getState().setPhase("ready");
      useServiceWorkerStore.getState().setUpdateAvailable();
    });
    render(<InstallPrompt />);
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /full refresh \(clear cache\)/i }),
      );
    });
    expect(forceRefreshWithCacheClear).toHaveBeenCalledTimes(1);
  });

  it("wires 'Try again' in error state to registerServiceWorker", () => {
    act(() => {
      useServiceWorkerStore.getState().setError("Registration failed");
    });
    render(<InstallPrompt />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });
    expect(registerServiceWorker).toHaveBeenCalledTimes(1);
  });

  it("wires the PWA install button to installApp when beforeinstallprompt was captured", () => {
    mockUsePWA.mockReturnValue({
      isOnline: true,
      installPrompt: {} as unknown,
      installApp,
    });
    act(() => {
      useServiceWorkerStore.getState().setPhase("ready");
    });
    render(<InstallPrompt />);
    expect(screen.getByText(/install stellarsplit/i)).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^install$/i }));
    });
    expect(installApp).toHaveBeenCalledTimes(1);
  });
});
