'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  haversineKm,
  formatDistance,
  DEFAULT_MAP_CENTER,
} from '@/lib/utils/geo';
import type { PublicBranch } from '@/lib/types';

const pinIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface BusinessMapProps {
  branches: PublicBranch[];
}

/**
 * MapContainer's `center` is initial-only — when the visitor's position
 * arrives later the view must be moved imperatively or the "you are here"
 * marker can sit entirely off-viewport.
 */
function RecenterOnUser({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, map.getZoom());
  }, [map, pos]);
  return null;
}

/**
 * Branch map with an optional straight-line (haversine) polyline from the
 * visitor's location to each branch. No routing API in the stack, so the line
 * is as-the-crow-flies — the label says "away", not "drive".
 */
export function BusinessMap({ branches }: BusinessMapProps) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  const located = branches.filter((b) => b.coordinates);
  // PostGIS GeoJSON is [lng, lat]; leaflet wants [lat, lng].
  const pins = located.map((b) => ({
    ...b,
    latLng: [b.coordinates![1], b.coordinates![0]] as [number, number],
  }));

  const center = userPos ?? pins[0]?.latLng ?? DEFAULT_MAP_CENTER;

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setGeoDenied(true),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  // No auto-request: a permission prompt with no user gesture is hostile on a
  // public page — geolocation runs only from the "Use my location" button.

  if (pins.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        This shop hasn&apos;t pinned its branches on the map yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-72 overflow-hidden rounded-xl border">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterOnUser pos={userPos} />
          {pins.map((branch) => (
            <Marker key={branch.id} position={branch.latLng} icon={pinIcon}>
              <Popup>
                <span className="font-medium">{branch.name}</span>
                {branch.address ? <br /> : null}
                {branch.address}
                {userPos && (
                  <>
                    <br />
                    {formatDistance(
                      haversineKm(
                        userPos[0],
                        userPos[1],
                        branch.latLng[0],
                        branch.latLng[1],
                      ),
                    )}{' '}
                    away
                  </>
                )}
              </Popup>
            </Marker>
          ))}
          {userPos && (
            <>
              <Marker position={userPos} icon={pinIcon} opacity={0.7}>
                <Popup>You are here</Popup>
              </Marker>
              {pins.map((branch) => (
                <Polyline
                  key={`line-${branch.id}`}
                  positions={[userPos, branch.latLng]}
                  pathOptions={{
                    color: '#65A30D',
                    weight: 3,
                    dashArray: '6 8',
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {userPos
            ? 'Dashed lines are straight-line distances from your location.'
            : geoDenied
              ? 'Location unavailable — showing branch pins only.'
              : 'Allow location access to see how far each branch is.'}
        </p>
        {!userPos && (
          <Button variant="outline" size="sm" onClick={locate}>
            <LocateFixed className="h-4 w-4" />
            Use my location
          </Button>
        )}
      </div>
    </div>
  );
}
