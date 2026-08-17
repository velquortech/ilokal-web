'use client';

/**
 * Click-to-pin map.
 *
 * Shared by the registration wizard, branch creation and the event form — it
 * lived under `app/business/registration/components/` while branch-create was
 * already reaching across features to import it, which is the repo's own
 * trigger for moving a component here (CLAUDE.md §DRY).
 *
 * Client-only by necessity: leaflet touches `window` at import, so every call
 * site mounts it through `dynamic(..., { ssr: false })`.
 */

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationSearch } from './LocationSearch';

/**
 * Iloilo City Proper. A world map at zoom 2 asks the user to find their own
 * city before they can pin anything — the same fallback `lib/utils/geo.ts`
 * uses when geolocation is denied.
 */
const DEFAULT_CENTER: [number, number] = [10.7312, 122.5649];

/**
 * Leaflet's default marker resolves its icon by a URL relative to the CSS,
 * which 404s under a bundler — hence the self-hosted copies in
 * `public/leaflet`.
 */
const pinIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  /**
   * Leaflet's own default is `true`, and that is right on a full-page form.
   * Inside a SCROLLING container — a dialog body — it means a wheel scroll
   * with the pointer over the map zooms the map instead of scrolling the form,
   * and the user is stuck mid-form. Those call sites pass `false`; the +/−
   * buttons and pinch still zoom.
   */
  scrollWheelZoom?: boolean;
}

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      // A click that landed ON the pin is a grab, not a re-pin. Markers bubble
      // mouse events to the map, so without this guard a tap on the icon (or a
      // sub-threshold drag that resolves as a click) re-places the pin at the
      // icon's CENTRE — ~20px north of the point it points at, 2-4m at the
      // zooms these maps use — which is how the pin seemed to "jump" the
      // moment you grabbed it. Leaflet suppresses the click after a real
      // drag, so this only ever eats genuine taps on the pin itself.
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target?.closest?.('.leaflet-marker-icon, .leaflet-marker-shadow')) {
        return;
      }
      const { lat, lng } = e.latlng;
      onLocationSelect(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
    },
  });
  return null;
}

function MapSyncer({
  latitude,
  longitude,
}: {
  latitude?: number;
  longitude?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (
      latitude != null &&
      longitude != null &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
    }
  }, [latitude, longitude, map]);
  return null;
}

/**
 * Re-measure whenever the container's box changes.
 *
 * Leaflet lays tiles out against the size it measured at mount. Inside a
 * dialog that mount happens mid-open-animation, so it measures a box that is
 * still scaling and paints a grey band where the map should be. A
 * `ResizeObserver` covers that, a viewport rotation, and a column that reflows
 * at a breakpoint — without any of them having to know about the others.
 */
function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    // Covers the case where the box is already settled and no resize will ever
    // fire.
    map.invalidateSize();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  scrollWheelZoom = true,
}: LocationPickerProps) {
  const hasPin =
    latitude != null &&
    longitude != null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  return (
    // `isolate` + `z-0` are load-bearing, not decoration. Leaflet gives its own
    // panes `z-index: 400` and its control corners `1000` — above a sticky
    // header (`z-50`) and above a Radix dialog's chrome — and with no stacking
    // context here those numbers compete with the whole page, so the map paints
    // over the nav. Contained on the shared component rather than at each of the
    // four call sites, which is also why the hint badge below keeps its
    // `z-[1000]`: it now competes with the tiles, nothing else. The map wrapper
    // carries its own `z-0` so the search dropdown (`z-[1000]`) always renders
    // above leaflet's panes.
    <div className="location-picker relative isolate z-0 flex h-full w-full flex-col gap-2">
      <style>
        {
          '.location-picker .leaflet-container { cursor: crosshair !important; }'
        }
      </style>

      {/* Type a place name instead of panning and tapping — the box sits
          above the map so a phone keyboard never covers it. Picking a result
          goes through the same `onLocationSelect` as a tap. */}
      <LocationSearch onSelect={onLocationSelect} />

      <div className="relative z-0 min-h-0 flex-1">
        <MapContainer
          center={hasPin ? [latitude, longitude] : DEFAULT_CENTER}
          zoom={hasPin ? 16 : 13}
          scrollWheelZoom={scrollWheelZoom}
          style={{ height: '100%', width: '100%' }}
          className="rounded-md"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onLocationSelect={onLocationSelect} />
          <MapSyncer latitude={latitude} longitude={longitude} />
          <InvalidateOnResize />
          {hasPin && (
            <Marker
              position={[latitude, longitude]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  onLocationSelect(
                    parseFloat(lat.toFixed(6)),
                    parseFloat(lng.toFixed(6)),
                  );
                },
              }}
            />
          )}
        </MapContainer>

        {!hasPin && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[1000] flex justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
              Click anywhere to pin your location
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
