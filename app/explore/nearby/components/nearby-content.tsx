'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LocateFixed, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistance, DEFAULT_MAP_CENTER } from '@/lib/utils/geo';
import { explorePath } from '@/config/routeConfig';

interface NearbyBusiness {
  branch_id: string;
  branch_name: string;
  address: string | null;
  distance_meters: number;
  business_id: string;
  business_name: string;
  business_description: string | null;
  logo_url: string | null;
}

const RADII = [
  { meters: 1000, label: '1 km' },
  { meters: 3000, label: '3 km' },
  { meters: 5000, label: '5 km' },
  { meters: 10000, label: '10 km' },
];

type GeoState = 'locating' | 'granted' | 'denied';

/**
 * Shops Near Me — geolocates the visitor, then reads the public
 * `nearby_businesses` PostGIS feed (`/api/mobile/businesses/nearby`, the same
 * endpoint the app uses). Denied geolocation degrades to the Iloilo City
 * Proper center so the page still shows something useful.
 */
export function NearbyContent() {
  const [geo, setGeo] = React.useState<GeoState>('locating');
  const [pos, setPos] = React.useState<[number, number] | null>(null);
  const [radius, setRadius] = React.useState(5000);
  const [businesses, setBusinesses] = React.useState<NearbyBusiness[] | null>(
    null,
  );
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo('denied');
      setPos(DEFAULT_MAP_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo('granted');
        setPos([p.coords.latitude, p.coords.longitude]);
      },
      () => {
        setGeo('denied');
        setPos(DEFAULT_MAP_CENTER);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  React.useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    setBusinesses(null);
    setFailed(false);
    fetch(
      `/api/mobile/businesses/nearby?lat=${pos[0]}&lng=${pos[1]}&radius=${radius}`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body) => {
        if (!cancelled) setBusinesses(body.businesses ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setBusinesses([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pos, radius]);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="font-display text-[clamp(1.875rem,3vw,2.75rem)] leading-tight font-bold tracking-tight">
            Shops near me
          </h1>
          <p className="text-muted-foreground text-sm">
            {geo === 'denied'
              ? 'Location unavailable — showing shops around Iloilo City Proper.'
              : 'Verified shops closest to you, nearest first.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1">
          {RADII.map((r) => (
            <Button
              key={r.meters}
              variant={radius === r.meters ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRadius(r.meters)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {geo === 'locating' && !pos && (
        <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm">
          <LocateFixed className="h-4 w-4 animate-pulse" />
          Finding your location…
        </div>
      )}

      {businesses === null && pos && (
        <div className="space-y-3" aria-busy="true">
          <div role="status" className="sr-only">
            Loading nearby shops…
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} aria-hidden className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {businesses !== null && businesses.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          {failed
            ? 'Could not load nearby shops right now — please try again.'
            : `No verified shops within ${formatDistance(radius / 1000)} — try a wider radius.`}
        </div>
      )}

      {businesses !== null && businesses.length > 0 && (
        <div className="space-y-3">
          {businesses.map((b) => (
            <Link
              key={b.branch_id}
              href={explorePath(b.business_id)}
              className="bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-4 transition-colors"
            >
              <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-full border">
                {b.logo_url && (
                  <Image
                    src={b.logo_url}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.business_name}</p>
                <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {b.branch_name}
                  {b.address ? ` · ${b.address}` : ''}
                </p>
              </div>
              <span className="text-primary shrink-0 text-sm font-semibold">
                {formatDistance(b.distance_meters / 1000)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
