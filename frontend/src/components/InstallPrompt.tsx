import { usePWA } from "../hooks/usePWA";
import { useServiceWorkerStore } from "../store/serviceWorkerStore";
import {
  applyServiceWorkerUpdate,
  forceRefreshWithCacheClear,
  registerServiceWorker,
} from "../utils/sw-register";

const InstallPrompt = () => {
  const { installPrompt, installApp } = usePWA();
  const phase = useServiceWorkerStore((s) => s.phase);
  const error = useServiceWorkerStore((s) => s.error);
  const clearError = useServiceWorkerStore((s) => s.clearError);
  const dismissUpdateBanner = useServiceWorkerStore(
    (s) => s.dismissUpdateBanner,
  );

  const showPwaCard = installPrompt;
  const showUpdate = phase === "update_available";
  const showError = phase === "error" && error;
  if (!showPwaCard && !showUpdate && !showError) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-[200] flex max-w-md flex-col gap-3"
      data-testid="pwa-floating-cta"
    >
      {showUpdate && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-theme bg-card-theme p-4 text-theme shadow-lg"
        >
          <p className="text-sm font-semibold">A new version is available</p>
          <p className="mt-1 text-sm text-muted-theme">
            Reload the app to use the latest StellarSplit. You can do a full
            refresh to clear cached assets if something still looks out of
            date.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyServiceWorkerUpdate()}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
            >
              Reload to update
            </button>
            <button
              type="button"
              onClick={() => void forceRefreshWithCacheClear()}
              className="rounded-lg border border-theme px-3 py-1.5 text-sm font-medium text-theme"
            >
              Full refresh (clear cache)
            </button>
            <button
              type="button"
              onClick={dismissUpdateBanner}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-theme hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {showError && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-50 p-4 text-sm text-red-900 shadow-lg dark:bg-red-950/40 dark:text-red-100"
        >
          <p className="font-semibold">App update could not be prepared</p>
          <p className="mt-1 opacity-90">{error}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void registerServiceWorker();
              }}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white dark:bg-red-600"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => void clearError()}
              className="rounded-lg px-3 py-1.5 text-sm underline"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => void forceRefreshWithCacheClear()}
              className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm font-medium"
            >
              Full refresh
            </button>
          </div>
        </div>
      )}

      {showPwaCard && (
        <div className="rounded-lg bg-zinc-900 p-4 text-white shadow-lg">
          <p>Install StellarSplit for a better experience</p>
          <button
            type="button"
            onClick={installApp}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Install
          </button>
        </div>
      )}
    </div>
  );
};

export default InstallPrompt;
