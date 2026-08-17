/**
 * Client-side place search for the map's location-search box.
 *
 * Nominatim is the geocoder for OpenStreetMap — the same project the map's
 * tiles already load from (`tile.openstreetmap.org`), so the app's OSM usage
 * policy is unchanged. The browser sends its own User-Agent, which is what
 * Nominatim's policy asks for; no key is needed.
 *
 * `format=jsonv2` returns `display_name`, `lat` and `lon` as strings; the
 * pair is parsed here so the caller never sees a string it could forget to
 * parse. Rows that fail to parse are dropped rather than returned as NaN.
 */

export interface GeocodeResult {
  /** Human-readable place name, e.g. "Iloilo City Proper, Iloilo, Western Visayas, Philippines". */
  name: string;
  latitude: number;
  longitude: number;
}

export async function geocodePlace(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '5');
  url.searchParams.set('accept-language', 'en');

  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Geocoding request failed (${res.status})`);
  }

  const rows = (await res.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  return rows
    .map((row) => ({
      name: row.display_name ?? '',
      latitude: parseFloat(row.lat ?? ''),
      longitude: parseFloat(row.lon ?? ''),
    }))
    .filter(
      (result) =>
        result.name !== '' &&
        Number.isFinite(result.latitude) &&
        Number.isFinite(result.longitude),
    );
}
