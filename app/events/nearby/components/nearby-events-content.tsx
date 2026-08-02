'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, LocateFixed, MapPin, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistance, DEFAULT_MAP_CENTER } from '@/lib/utils/geo';
import { eventPath } from '@/config/routeConfig';
import { brandToneFor } from '@/lib/utils/brandTone';
import { formatEventWhen, eventPhase } from '@/lib/utils/eventSchedule';
import { cn } from '@/lib/utils';
import type { NearbyEvent } from '@/lib/types';

const RADII = [
  { meters: 5000, label: '5 km' },
  { meters: 20000, label: '20 km' },
  { meters: 50000, label: '50 km' },
];

type GeoState = 'locating' | 'granted' | 'denied';

/**
 * Events near me.
 *
 * The PULL half of the nearby feature: this page asks, holding the visitor's
 * own coordinates. There is no push infrastructure in this repo — see
 * `.claude/EVENTS.md` D7 — so nothing arrives unprompted.
 *
 * Same shape as `/explore/nearby`, including the fallback: denied geolocation
 * degrades to Iloilo City Proper so the page still shows something useful
 * rather than an empty apology.
 */
export function NearbyEventsContent() {
  const [geo, setGeo] = React.useState<GeoState>('locating');
  const [pos, setPos] = React.useState<[number, number] | null>(null);
  const [radius, setRadius] = React.useState(20000);
  const [events, setEvents] = React.useState<NearbyEvent[] | null>(null);
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
    setEvents(null);
    setFailed(false);

    fetch(
      `/api/mobile/events/nearby?lat=${pos[0]}&lng=${pos[1]}&radius=${radius}`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body) => {
        if (!cancelled) setEvents(body.events ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setEvents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pos, radius]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Events near me</h1>
        <p className="text-muted-foreground">
          {geo === 'denied'
            ? 'Showing events around Iloilo City Proper — turn on location for what is closest to you.'
            : 'Sorted by how far you would have to go.'}
        </p>
      </header>

      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Search radius"
      >
        {RADII.map(({ meters, label }) => (
          <Button
            key={meters}
            size="sm"
            variant={radius === meters ? 'default' : 'ghost'}
            onClick={() => setRadius(meters)}
          >
            {label}
          </Button>
        ))}
        {geo === 'locating' && (
          <span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-sm">
            <LocateFixed className="size-3 animate-pulse" aria-hidden />
            Finding you…
          </span>
        )}
      </div>

      {events === null ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-40 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : failed ? (
        <Empty
          icon={TriangleAlert}
          title="We couldn't load nearby events"
          body="Something went wrong on our side. Try again in a moment."
        />
      ) : events.length === 0 ? (
        <Empty
          icon={CalendarDays}
          title="Nothing on within this radius"
          body="Try a wider search, or browse everything that's coming up."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <NearbyCard key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NearbyCard({ event }: { event: NearbyEvent }) {
  const live = eventPhase(event) === 'live';

  return (
    <li>
      <Link
        href={eventPath(event.id)}
        className="focus-visible:ring-ring block h-full overflow-hidden rounded-xl border transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <div
          className={cn(
            'flex h-24 items-center justify-center px-4 text-center',
            brandToneFor(event.id),
          )}
        >
          <span className="font-display line-clamp-2 text-lg leading-tight font-bold">
            {event.name}
          </span>
        </div>
        <div className="space-y-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-primary text-sm font-medium">
              {/* The RPC answers in metres; the helper takes km. */}
              {formatDistance(event.distance_meters / 1000)} away
            </span>
            {live && (
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                Happening now
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {formatEventWhen(event)}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="line-clamp-1">{event.address}</span>
          </p>
        </div>
      </Link>
    </li>
  );
}

function Empty({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof CalendarDays;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Icon className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}
