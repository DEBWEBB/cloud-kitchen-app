import { useEffect, useMemo, useState } from "react";
import { normalizeLocation } from "../utils/haversineDistance";
import {
  buildFallbackRouteMetrics,
  requestRouteMetrics,
} from "../utils/requestRouteMetrics";

const EMPTY_METRICS = {
  distanceKm: null,
  lineDistanceKm: null,
  travelMinutes: null,
  source: "",
  sourceLabel: "",
  geometry: [],
  live: false,
  error: "",
};

export default function useRouteMetrics(
  from,
  to,
  enabled = true,
  pollMs = 20000
) {
  const safeFrom = useMemo(() => normalizeLocation(from), [from?.lat, from?.lng]);
  const safeTo = useMemo(() => normalizeLocation(to), [to?.lat, to?.lng]);
  const [metrics, setMetrics] = useState(() =>
    safeFrom && safeTo
      ? buildFallbackRouteMetrics(safeFrom, safeTo)
      : EMPTY_METRICS
  );

  useEffect(() => {
    if (!enabled || !safeFrom || !safeTo) {
      setMetrics(
        safeFrom && safeTo
          ? buildFallbackRouteMetrics(safeFrom, safeTo)
          : EMPTY_METRICS
      );
      return undefined;
    }

    let cancelled = false;

    const loadMetrics = async () => {
      const nextMetrics = await requestRouteMetrics({
        from: safeFrom,
        to: safeTo,
      });

      if (!cancelled) {
        setMetrics(nextMetrics);
      }
    };

    loadMetrics();

    if (!pollMs || pollMs <= 0) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(loadMetrics, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, pollMs, safeFrom, safeTo]);

  return metrics;
}
