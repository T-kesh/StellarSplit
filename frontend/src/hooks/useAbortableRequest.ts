import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

interface UseAbortableRequestReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for managing abort-safe asynchronous requests.
 *
 * Creates an AbortController that is aborted when dependencies change or the component unmounts,
 * preventing stale response callbacks from updating state after a newer request has been initiated.
 * This prevents race conditions where rapid changes (e.g., filter updates, user switches) cause
 * old responses to overwrite new data.
 *
 * @param fetcher Function that accepts a signal and returns a Promise resolving to data
 * @param deps Dependency list that triggers a new request when changed
 * @returns Object with data, loading, error, and refetch function
 */
export function useAbortableRequest<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): UseAbortableRequestReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const refreshCounterRef = useRef(0);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(controller.signal);
      // Only update state if this request was not aborted
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      // Ignore abort errors (thrown when controller.abort() is called)
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      // Only clear loading if this request was not aborted
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetcher]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    void fetchData();

    // Cleanup: abort the request if dependencies change or component unmounts
    return () => {
      controllerRef.current?.abort();
    };
  }, [fetchData, ...deps]);

  // Manual refresh that increments a counter to re-trigger the fetch
  const refetch = useCallback(() => {
    refreshCounterRef.current += 1;
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
