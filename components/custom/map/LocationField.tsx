'use client';

/**
 * Pin a place: a map, the two numbers it produces, and a device-location
 * shortcut.
 *
 * The reason this exists rather than two number inputs: **nobody knows their
 * own coordinates.** Blank ones are not harmless either — `events_nearby`
 * filters `location IS NOT NULL`, so an event filed without a pin is invisible
 * to "events near me" and to the mobile endpoint. And a guessed pair is worse
 * than a blank one, because every number in range is valid: a typo puts the
 * pin in the sea and nothing anywhere reports an error.
 *
 * The inputs stay, and stay editable. The map is a `div`, so it gives a
 * keyboard user nothing — it is an aid, never the only way to set a value.
 *
 * Values are strings, not numbers, because a half-typed "10." is not a number
 * and a controlled numeric input that rejects it eats the keystroke. The owner
 * of the form parses on submit.
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useGeolocation } from './useGeolocation';

// Leaflet touches `window` at import time, so the map can only exist on the
// client. The skeleton keeps the box the same height, so nothing below it
// jumps when the tiles arrive.
const LocationPicker = dynamic(
  () => import('./LocationPicker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-full w-full animate-pulse rounded-md" />
    ),
  },
);

interface LocationFieldProps {
  latitude: string;
  longitude: string;
  onChange: (next: { latitude: string; longitude: string }) => void;
  /** Overrides the default explanation of what a pin buys. */
  hint?: React.ReactNode;
  /** Map height. Shorter inside a dialog than on a full-page form. */
  height?: number;
  /**
   * Pass `false` inside a scrolling container: leaflet's wheel zoom otherwise
   * swallows the scroll and traps the reader mid-form.
   */
  scrollWheelZoom?: boolean;
}

/** A usable number, or undefined — what the map needs to place a marker. */
function toCoordinate(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function LocationField({
  latitude,
  longitude,
  onChange,
  hint,
  height = 260,
  scrollWheelZoom = true,
}: LocationFieldProps) {
  const lat = toCoordinate(latitude);
  const lng = toCoordinate(longitude);
  const hasPin = lat != null && lng != null;

  const setPin = React.useCallback(
    (nextLat: number, nextLng: number) =>
      onChange({ latitude: String(nextLat), longitude: String(nextLng) }),
    [onChange],
  );

  const { detect, isDetecting, error, clearError } = useGeolocation(setPin);

  // Pinning by hand answers "click the map or enter coordinates manually", so
  // the message should stop being shown once they have.
  const pinFromMap = React.useCallback(
    (nextLat: number, nextLng: number) => {
      clearError();
      setPin(nextLat, nextLng);
    },
    [clearError, setPin],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Pin the location</p>
          <p className="text-muted-foreground text-xs">
            {hint ??
              'Click the map, drag the pin, or use your device. This is what puts your event in “events near me”.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPin && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ latitude: '', longitude: '' })}
            >
              <X />
              Clear pin
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detect}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LocateFixed />
            )}
            {isDetecting ? 'Detecting…' : 'Use my location'}
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div
        className="overflow-hidden rounded-md border"
        style={{ height: `${height}px` }}
      >
        <LocationPicker
          latitude={lat}
          longitude={lng}
          onLocationSelect={pinFromMap}
          scrollWheelZoom={scrollWheelZoom}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="location-lat">
            Latitude <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="location-lat"
            inputMode="decimal"
            value={latitude}
            onChange={(e) => onChange({ latitude: e.target.value, longitude })}
            placeholder="10.6973"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="location-lng">
            Longitude <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="location-lng"
            inputMode="decimal"
            value={longitude}
            onChange={(e) => onChange({ latitude, longitude: e.target.value })}
            placeholder="122.5649"
          />
        </Field>
      </div>

      {hasPin && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="size-3" aria-hidden />
          Pinned at {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
