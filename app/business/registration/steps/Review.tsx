'use client';

import { useMultiStepForm } from '../provider/registration-form-provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { FileText, HandCoins } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { BusinessProps } from '../validator/business-registration-form-schema';

export function ShopReview() {
  const { form } = useMultiStepForm();
  const data = useWatch<BusinessProps>({ control: form.control });

  return (
    <div className="flex flex-col space-y-6">
      {/* Step 1: Business Category */}
      <Card>
        <CardHeader>
          <CardTitle>Business Category</CardTitle>
          <CardDescription>
            Review your selected business category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2">
            <Label>Name:</Label>
            <p className="text-muted-foreground">
              {data.business_category?.name || 'N/A'}
            </p>
          </div>
          <div className="mt-2">
            <Label>Description:</Label>
            <p className="text-muted-foreground">
              {data.business_category?.description || 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Shop Information */}
      <Card className="flex flex-col pr-8 md:flex-row">
        <div className="min-w-0 flex-1">
          <CardHeader>
            <CardTitle>Shop Information</CardTitle>
            <CardDescription>Review your shop details</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <Label>Shop Name</Label>
              <p className="text-muted-foreground">{data.shop_name || 'N/A'}</p>
            </div>

            <div>
              <Label>Description</Label>
              <p className="text-muted-foreground max-w-xl">
                {data.description || 'N/A'}
              </p>
            </div>

            <div>
              <Label>Location</Label>
              <p className="text-muted-foreground">
                {data.location
                  ? `${data.location.street_address}, ${data.location.barangay}, ${data.location.city}, ${data.location.province}, ${data.location.zip_code}`
                  : 'N/A'}
              </p>
            </div>

            <div>
              <Label>Coordinates</Label>
              <p className="text-muted-foreground">
                {data.location?.latitude != null &&
                data.location?.longitude != null
                  ? `${data.location.latitude}, ${data.location.longitude}`
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </div>

        {/* MAP — hidden on mobile */}
        <div className="bg-muted ml-auto hidden h-64 w-full overflow-hidden rounded-md md:block md:h-auto md:w-64 md:shrink-0 lg:w-80">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62720.67739692793!2d122.54770015!3d10.7312181!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33aee56fe538d781%3A0xe8250cd6bc30a488!2sIloilo%20City%2C%20Iloilo!5e0!3m2!1sen!2sph!4v1774010152358!5m2!1sen!2sph"
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </Card>

      {/* Step 3: Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>Review uploaded images</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label className="mb-2">Shop Logo</Label>
            {data.shop_logo ? (
              <Image
                src={URL.createObjectURL(data.shop_logo)}
                alt="Shop Logo"
                width={400}
                height={400}
                className="rounded-lg border object-contain"
              />
            ) : (
              <p className="text-muted-foreground">No logo uploaded</p>
            )}
          </div>

          <div className="mt-4">
            <Label>Interior Images</Label>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.interior_images && data.interior_images.length > 0 ? (
                data.interior_images.map((file: File, idx: number) => (
                  <Image
                    key={idx}
                    src={URL.createObjectURL(file)}
                    alt={`Interior ${idx + 1}`}
                    width={0}
                    height={0}
                    className="h-full w-full rounded-lg border object-contain"
                  />
                ))
              ) : (
                <p className="text-muted-foreground">
                  No interior images uploaded
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Review uploaded documents</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div className="border-border inline-flex items-center gap-2 rounded-md border p-4">
            <div className="bg-primary/10 text-primary mr-5 rounded-sm p-2">
              <FileText />
            </div>
            {data.business_license ? (
              <div className="flex w-full flex-row items-center justify-between">
                <p className="flex flex-col font-medium">
                  {data.business_license.name}
                  <span className="text-muted-foreground text-sm font-normal">
                    Business License
                  </span>
                </p>
                <span className="text-muted-foreground">
                  {(data.business_license.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">No file uploaded</p>
            )}
          </div>

          <div className="border-border mt-4 inline-flex items-center gap-2 rounded-md border p-4">
            <div className="bg-primary/10 text-primary mr-5 rounded-sm p-2">
              <HandCoins />
            </div>
            {data.tax_certificate ? (
              <div className="flex w-full flex-row items-center justify-between">
                <p className="flex flex-col font-medium">
                  {data.tax_certificate.name}
                  <span className="text-muted-foreground text-sm font-normal">
                    Tax Certificate
                  </span>
                </p>
                <span className="text-muted-foreground">
                  {(data.tax_certificate.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">No file uploaded</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
