'use client';

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Controller } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Field, FieldError } from '@/components/ui/field';
import { getCitiesByProvince, getBarangaysByCity } from '@/lib/ph-locations';

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

  useEffect(() => {
    form.setValue('location.province', LOCKED_PROVINCE);
  }, [form]);

  const selectedCity = form.watch('location.city');
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

  return (
    <>
      <div className="grid h-full grid-cols-2 gap-x-10">
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
                  <Input id="zipCode" placeholder="10001" {...field} />
                </div>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {/* MAP (unchanged) */}
        <div className="bg-muted overflow-hidden rounded-md">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62720.67739692793!2d122.54770015!3d10.7312181!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33aee56fe538d781%3A0xe8250cd6bc30a488!2sIloilo%20City%2C%20Iloilo!5e0!3m2!1sen!2sph!4v1774010152358!5m2!1sen!2sph"
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      {/* NOTE */}
      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
        <p className="text-sm">
          <strong>Note:</strong> This address will be used for verification
          purposes and may be displayed to customers. Please ensure it's
          accurate.
        </p>
      </div>
    </>
  );
}
