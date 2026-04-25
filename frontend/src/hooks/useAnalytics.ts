import { useState, useEffect, useCallback } from "react";
import type { AnalyticsData, DateRange } from "../types/analytics";
import { fetchAnalyticsBundle } from "../utils/analytics-api";
import type { AnalyticsMode, AnalyticsSource } from "../services/analyticsDataProvider";

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  source: AnalyticsSource | null;
  loading: boolean;
  error: string | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  refetch: () => void;
}

function defaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function useAnalytics(mode: AnalyticsMode = "hybrid"): UseAnalyticsReturn {
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [source, setSource] = useState<AnalyticsSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalyticsBundle(dateRange, mode);
      setData(result.data);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [dateRange, mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, source, loading, error, dateRange, setDateRange, refetch: loadData };
}
