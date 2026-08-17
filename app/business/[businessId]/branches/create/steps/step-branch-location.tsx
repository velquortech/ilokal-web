'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { Loader2, LocateFixed } from 'lucide-react';
import { useGeolocation } from '@/components/custom/map/useGeolocation';
import { useBranchForm } from '../provider/branch-form-provider';

const LocationPicker = dynamic(
  () =>
    import('@/components/custom/map/LocationPicker').then(
      (m) => m.LocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-full w-full animate-pulse rounded-md" />
    ),
  },
);

export function StepBranchLocation() {
  const { form } = useBranchForm();

  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');

  const setCoordinates = useCallback(
    (lat: number, lng: number) => {
      form.setValue('latitude', lat, { shouldValidate: true });
      form.setValue('longitude', lng, { shouldValidate: true });
    },
    [form],
  );

  // Was twenty lines duplicated verbatim here and in the registration wizard.
  const {
    detect: handleDetectLocation,
    isDetecting: isGeolocating,
    error: geoError,
    clearError,
  } = useGeolocation(setCoordinates);

  // Pinning by hand answers the failure message, so it should stop being shown.
  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      clearError();
      setCoordinates(lat, lng);
    },
    [clearError, setCoordinates],
  );

  return (
    <div className="flex h-full flex-col space-y-6">
      <h2 className="font-semibold">Branch Location</h2>

      <Controller
        name="address"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="e.g. 123 Iznart St., Iloilo City"
                {...field}
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* space-y-6: the wizard's 24px field rhythm — this heading + pin
          summary must sit as far apart as every other field group. */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Exact Coordinates</h3>
            <p className="text-muted-foreground text-xs">
              Optional — click the map or use your device location
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDetectLocation}
            disabled={isGeolocating}
          >
            {isGeolocating ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LocateFixed className="mr-2 size-4" />
            )}
            {isGeolocating ? 'Detecting...' : 'Use My Location'}
          </Button>
        </div>

        {geoError && <p className="text-destructive text-sm">{geoError}</p>}

        {/* COORDINATES — read-only by design, same treatment as the
            registration wizard. Owners should never type coordinates; the map
            pin + "Use My Location" are the only ways to set them, and the
            values below just confirm what got set. */}
        {latitude != null && longitude != null ? (
          <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
            {/* 6 decimals, not 4: the pin is stored to 6 (the map's dragend
                rounds to 1e-6), and at zoom 16+ a single pixel is ~2e-5
                degrees — a small drag under 4 decimals displays as
                "unchanged" while the pin actually moved. */}
            Pin set: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            No pin set yet — tap the map or use your location.
          </p>
        )}
      </div>

      {/* Shown at every width — hidden on mobile meant phones could only
          set a pin via "Use My Location", never by tapping the map. */}
      <div className="h-72 overflow-hidden rounded-md md:h-auto md:min-h-[320px]">
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={handleLocationSelect}
        />
      </div>
    </div>
  );
}
