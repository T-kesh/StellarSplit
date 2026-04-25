import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useServiceWorkerStore } from "../store/serviceWorkerStore";
import {
  __resetServiceWorkerTestStateForTests,
  __setLastRegistrationForTests,
  applyServiceWorkerUpdate,
  registerServiceWorker,
  SW_EVENT_ERROR,
  SW_EVENT_REGISTERED,
  SW_EVENT_UPDATE_AVAILABLE,
} from "./sw-register";

describe("registerServiceWorker", () => {
  beforeEach(() => {
    useServiceWorkerStore.getState().reset();
    __resetServiceWorkerTestStateForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useServiceWorkerStore.getState().reset();
    __resetServiceWorkerTestStateForTests();
  });

  it("sets unsupported when serviceWorker is missing", async () => {
    vi.stubGlobal("navigator", {});
    await registerServiceWorker();
    expect(useServiceWorkerStore.getState().phase).toBe("unsupported");
  });

  it("emits registered and sets ready on success", async () => {
    const mockReg = {
      installing: null,
      waiting: null,
      addEventListener: (ev: string, fn: () => void) => {
        if (ev === "updatefound") (mockReg as { _u?: () => void })._u = fn;
      },
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const register = vi.fn().mockResolvedValue(mockReg);
    const addEventListener = vi.fn();
    vi.stubGlobal("navigator", {
      serviceWorker: { register, addEventListener },
    });

    const onRegistered = vi.fn();
    window.addEventListener(SW_EVENT_REGISTERED, onRegistered);
    const onError = vi.fn();
    window.addEventListener(SW_EVENT_ERROR, onError);

    await registerServiceWorker();

    expect(register).toHaveBeenCalledWith(
      "/sw.js",
      expect.objectContaining({ updateViaCache: "none" }),
    );
    expect(useServiceWorkerStore.getState().phase).toBe("ready");
    expect(onRegistered).toHaveBeenCalled();
    const evt = onRegistered.mock.calls[0][0] as CustomEvent<{
      registration: ServiceWorkerRegistration;
    }>;
    expect(evt.detail?.registration).toBe(mockReg);
    expect(onError).not.toHaveBeenCalled();
    window.removeEventListener(SW_EVENT_REGISTERED, onRegistered);
    window.removeEventListener(SW_EVENT_ERROR, onError);
  });

  it("emits error and sets store on register failure", async () => {
    const register = vi
      .fn()
      .mockRejectedValue(new Error("network or SW script missing"));
    vi.stubGlobal("navigator", {
      serviceWorker: { register, addEventListener: vi.fn() },
    });
    const onError = vi.fn();
    window.addEventListener(SW_EVENT_ERROR, onError);

    await registerServiceWorker();

    expect(useServiceWorkerStore.getState().phase).toBe("error");
    expect(useServiceWorkerStore.getState().error).toBe(
      "network or SW script missing",
    );
    expect(onError).toHaveBeenCalled();
    const fe = onError.mock.calls[0][0] as CustomEvent<{ message: string }>;
    expect(fe.detail.message).toBe("network or SW script missing");
    window.removeEventListener(SW_EVENT_ERROR, onError);
  });

  it("emits update available when a waiting worker exists and controller is active", async () => {
    const mockReg = {
      installing: null,
      waiting: { postMessage: vi.fn() },
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const register = vi.fn().mockResolvedValue(mockReg);
    vi.stubGlobal("navigator", {
      serviceWorker: { register, controller: {}, addEventListener: vi.fn() },
    });

    const onUpdate = vi.fn();
    window.addEventListener(SW_EVENT_UPDATE_AVAILABLE, onUpdate);

    await registerServiceWorker();

    expect(onUpdate).toHaveBeenCalled();
    expect(useServiceWorkerStore.getState().phase).toBe("update_available");
    window.removeEventListener(SW_EVENT_UPDATE_AVAILABLE, onUpdate);
  });

  it("applyServiceWorkerUpdate posts SKIP_WAITING to waiting worker", () => {
    const postMessage = vi.fn();
    const mockReg = { waiting: { postMessage } } as unknown as ServiceWorkerRegistration;
    __setLastRegistrationForTests(mockReg);
    const addListener = vi.fn();
    const removeListener = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("location", { ...location, reload });
    vi.stubGlobal("navigator", {
      serviceWorker: {
        addEventListener: addListener,
        removeEventListener: removeListener,
        controller: {},
      },
    });

    applyServiceWorkerUpdate();

    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    const handler = addListener.mock.calls.find(
      (c) => c[0] === "controllerchange",
    )?.[1] as (() => void) | undefined;
    expect(typeof handler).toBe("function");
    handler!();
    expect(reload).toHaveBeenCalled();
  });

  it("applyServiceWorkerUpdate reloads immediately when there is no waiting worker", () => {
    __setLastRegistrationForTests(
      { waiting: null } as ServiceWorkerRegistration,
    );
    const reload = vi.fn();
    vi.stubGlobal("location", { ...location, reload });

    applyServiceWorkerUpdate();

    expect(reload).toHaveBeenCalled();
  });
});
