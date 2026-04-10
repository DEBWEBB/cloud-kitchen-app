import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";
import {
  estimateTravelMinutes,
  haversineKm,
  normalizeLocation,
  roundDistanceKm,
} from "./haversineDistance";

const ROUTE_CACHE_TTL_MS = 15000;
const routeMetricsCache = new Map();
const routeMetricsInFlight = new Map();

const buildRouteCacheKey = (from, to) => {
  if (!from || !to) {
    return "";
  }

  return [
    Number(from.lat).toFixed(3),
    Number(from.lng).toFixed(3),
    Number(to.lat).toFixed(3),
    Number(to.lng).toFixed(3),
  ].join(":");
};

const normalizeGeometry = (value, from, to) => {
  if (!Array.isArray(value) || value.length < 2) {
    return from && to ? [from, to] : [];
  }

  const points = value
    .map((point) => normalizeLocation(point))
    .filter(Boolean);

  return points.length >= 2 ? points : from && to ? [from, to] : [];
};

export const getRouteSourceLabel = (source) => {
  switch (source) {
    case "geoapify-route":
      return "Road route";
    case "haversine-fallback":
      return "Straight-line fallback";
    default:
      return "Live estimate";
  }
};

export const buildFallbackRouteMetrics = (from, to) => {
  const safeFrom = normalizeLocation(from);
  const safeTo = normalizeLocation(to);
  const distanceKm = roundDistanceKm(haversineKm(safeFrom, safeTo));

  return {
    distanceKm,
    lineDistanceKm: distanceKm,
    travelMinutes: estimateTravelMinutes(distanceKm),
    source: "haversine-fallback",
    sourceLabel: getRouteSourceLabel("haversine-fallback"),
    geometry: safeFrom && safeTo ? [safeFrom, safeTo] : [],
    live: false,
  };
};

export const requestRouteMetrics = async ({ from, to }) => {
  const safeFrom = normalizeLocation(from);
  const safeTo = normalizeLocation(to);
  const fallback = buildFallbackRouteMetrics(safeFrom, safeTo);
  const cacheKey = buildRouteCacheKey(safeFrom, safeTo);

  if (!safeFrom || !safeTo) {
    return {
      ...fallback,
      distanceKm: null,
      lineDistanceKm: null,
      travelMinutes: null,
      geometry: [],
    };
  }

  const cachedEntry = routeMetricsCache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.createdAt < ROUTE_CACHE_TTL_MS) {
    return cachedEntry.metrics;
  }

  const inFlightRequest = routeMetricsInFlight.get(cacheKey);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const requestPromise = (async () => {
    let response;
    try {
      response = await fetch(getApiUrl("/api/route-metrics"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: safeFrom,
          to: safeTo,
        }),
      });
    } catch {
      return {
        ...fallback,
        error: getApiUnreachableMessage("Route service"),
      };
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...fallback,
        error: payload?.error || "Could not calculate route metrics.",
      };
    }

    const distanceKm =
      typeof payload?.distanceKm === "number"
        ? payload.distanceKm
        : fallback.distanceKm;
    const lineDistanceKm =
      typeof payload?.lineDistanceKm === "number"
        ? payload.lineDistanceKm
        : fallback.lineDistanceKm;

    return {
      distanceKm,
      lineDistanceKm,
      travelMinutes:
        typeof payload?.travelMinutes === "number"
          ? payload.travelMinutes
          : estimateTravelMinutes(distanceKm),
      source: payload?.source || fallback.source,
      sourceLabel: getRouteSourceLabel(payload?.source || fallback.source),
      geometry: normalizeGeometry(payload?.geometry, safeFrom, safeTo),
      live: true,
    };
  })();

  routeMetricsInFlight.set(cacheKey, requestPromise);

  try {
    const metrics = await requestPromise;
    routeMetricsCache.set(cacheKey, {
      createdAt: Date.now(),
      metrics,
    });
    return metrics;
  } finally {
    routeMetricsInFlight.delete(cacheKey);
  }
};
