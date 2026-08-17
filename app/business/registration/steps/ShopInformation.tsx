'use client';

import { useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, LocateFixed } from 'lucide-react';
import { useGeolocation } from '@/components/custom/map/useGeolocation';

import { Controller } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Field, FieldError } from '@/components/ui/field';
import { getCitiesByProvince, getBarangaysByCity } from '@/lib/ph-locations';

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

const LOCKED_PROVINCE = 'ILOILO';

export function ShopInformation() {
  return (
    <div className="flex h-full flex-1 flex-col">
      <BasicInformation />
      <Separator className="my-10" />
      <Location />
    </div>
  );
}

function BasicInformation() {
  const { form } = useMultiStepForm();

  const description = form.watch('description') || '';

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <h2 className="font-semibold">Basic Information</h2>

      {/* SHOP NAME */}
      <Controller
        name="shop_name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                placeholder="Enter your shop name"
                {...field}
                aria-invalid={fieldState.invalid}
              />
            </div>

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* DESCRIPTION */}
      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="space-y-2">
              <Label htmlFor="description">Shop Description</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Describe your shop, what you sell, and what makes you unique..."
                {...field}
                aria-invalid={fieldState.invalid}
              />

              <p className="text-muted-foreground text-xs">
                {description.length} / 500 characters
              </p>
            </div>

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}

function Location() {
  const { form } = useMultiStepForm();

  const selectedCity = form.watch('location.city');
  const latitude = form.watch('location.latitude');
  const longitude = form.watch('location.longitude');

  const cities = getCitiesByProvince(LOCKED_PROVINCE);
  const barangays = selectedCity
    ? getBarangaysByCity(selectedCity, LOCKED_PROVINCE)
    : [];

  const handleCityChange = (value: string) => {
    form.setValue('location.city', value);
    form.setValue('location.barangay', '');
  };

  const handleBarangayChange = (value: string) => {
    form.setValue('location.barangay', value);
  };

  useEffect(() => {
    form.setValue('location.province', LOCKED_PROVINCE);
  }, [form]);

  // Derive geometry string whenever lat/lng change
  useEffect(() => {
    if (
      latitude != null &&
      longitude != null &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      form.setValue('location.geometry', `lat:${latitude},lng:${longitude}`, {
        shouldValidate: true,
      });
    } else {
      form.setValue('location.geometry', '', { shouldValidate: true });
    }
  }, [latitude, longitude, form]);

  const setCoordinates = useCallback(
    (lat: number, lng: number) => {
      form.setValue('location.latitude', lat, { shouldValidate: true });
      form.setValue('location.longitude', lng, { shouldValidate: true });
    },
    [form],
  );

  // Was twenty lines duplicated verbatim here and in branch creation.
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

  const geometryError = form.formState.errors.location?.geometry;

  return (
    <>
      <div className="grid h-full grid-cols-1 gap-x-10 md:grid-cols-2">
        <div className="flex h-full flex-col space-y-6">
          <h2 className="font-semibold">Location</h2>

          {/* PROVINCE — locked to Iloilo for current scope */}
          <Controller
            name="location.province"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select value={field.value} disabled>
                    <SelectTrigger id="province" className="w-full">
                      <SelectValue placeholder="Iloilo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LOCKED_PROVINCE}>
                        {LOCKED_PROVINCE}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* CITY */}
          <Controller
            name="location.city"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="city">City/Municipality</Label>
                  <Select
                    onValueChange={handleCityChange}
                    value={field.value}
                    disabled={cities.length === 0}
                  >
                    <SelectTrigger id="city" className="w-full">
                      <SelectValue placeholder="Select city/municipality" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* BARANGAY */}
          <Controller
            name="location.barangay"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Select
                    onValueChange={handleBarangayChange}
                    value={field.value}
                    disabled={!selectedCity}
                  >
                    <SelectTrigger id="barangay" className="w-full">
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map((brgy) => (
                        <SelectItem key={brgy} value={brgy}>
                          {brgy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* STREET */}
          <Controller
            name="location.street_address"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    {...field}
                  />
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* ZIP */}
          <Controller
            name="location.zip_code"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input id="zipCode" placeholder="5000" {...field} />
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* COORDINATES — read-only by design. Owners should never type
              coordinates; the map pin + "Use My Location" are the only ways
              to set them, and the values below just confirm what got set.
              space-y-6: the wizard's 24px rhythm, same as the branch step. */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Exact Location</h3>
                <p className="text-muted-foreground text-xs">
                  Click the map or use your device location
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="mr-2 h-4 w-4" />
                )}
                {isGeolocating ? 'Detecting...' : 'Use My Location'}
              </Button>
            </div>

            {geoError && <p className="text-destructive text-sm">{geoError}</p>}

            {latitude != null && longitude != null ? (
              <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
                {/* 6 decimals, not 4: the pin is stored to 6 (the map's
                    dragend rounds to 1e-6), and at zoom 16+ a single pixel is
                    ~2e-5 degrees — a small drag under 4 decimals displays as
                    "unchanged" while the pin actually moved. */}
                Pin set: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No pin set yet — tap the map or use your location.
              </p>
            )}

            {geometryError && (
              <p className="text-destructive text-sm">
                {geometryError.message}
              </p>
            )}
          </div>
        </div>

        {/* INTERACTIVE MAP — click to pin, drag to adjust. Shown at every
            width: hidden on mobile meant phones could only set a pin via
            "Use My Location", never by tapping the map. Mobile gets an
            explicit height (h-72); on desktop the grid stretches it to the
            form column's height with a 400px floor, as before. */}
        <div className="h-72 overflow-hidden rounded-md md:h-auto md:min-h-[400px]">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={handleLocationSelect}
          />
        </div>
      </div>

      {/* NOTE — mt-6: the wizard's 24px rhythm below the map. */}
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
        <p className="text-sm">
          <strong>Note:</strong> This address will be used for verification
          purposes and may be displayed to customers. Please ensure it&apos;s
          accurate.
        </p>
      </div>
    </>
  );
}
