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

      <div className="space-y-4">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="latitude"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 10.7312"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ''
                          ? undefined
                          : parseFloat(e.target.value),
                      )
                    }
                    onBlur={field.onBlur}
                  />
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="longitude"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 122.5649"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ''
                          ? undefined
                          : parseFloat(e.target.value),
                      )
                    }
                    onBlur={field.onBlur}
                  />
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </div>

      <div
        className="hidden overflow-hidden rounded-md md:block"
        style={{ minHeight: '320px' }}
      >
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={handleLocationSelect}
        />
      </div>
    </div>
  );
}
