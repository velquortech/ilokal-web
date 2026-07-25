/**
 * Pure geo helpers shared by the customer map UI and server queries.
 * Straight-line (haversine) math only — the stack has no routing API, so
 * distances are as-the-crow-flies, matching the `nearby_businesses` RPC.
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** "850 m" below 1 km, "1.2 km" up to 10 km, "12 km" beyond. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Iloilo City Proper — fallback center when geolocation is unavailable. */
export const DEFAULT_MAP_CENTER: [number, number] = [10.6969, 122.5644];
