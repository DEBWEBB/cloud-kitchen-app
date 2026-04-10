const EARTH_RADIUS_KM = 6371;

const toRad = (value) => (value * Math.PI) / 180;

export const isValidLocation = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      Number.isFinite(Number(value.lat)) &&
      Number.isFinite(Number(value.lng))
  );

export const normalizeLocation = (value) =>
  isValidLocation(value)
    ? {
        lat: Number(value.lat),
        lng: Number(value.lng),
      }
    : null;

export const roundDistanceKm = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(digits))
    : null;

export const haversineKm = (coord1, coord2) => {
  const from = normalizeLocation(coord1);
  const to = normalizeLocation(coord2);
  if (!from || !to) {
    return null;
  }

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const estimateTravelMinutes = (
  distanceKm,
  { speedKmph = 18, minMinutes = 5 } = {}
) => {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return null;
  }

  return Math.max(minMinutes, Math.round((distanceKm / speedKmph) * 60));
};

export default function haversine(coord1, coord2) {
  return haversineKm(coord1, coord2) ?? 0;
}
