'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Images, Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from '@/lib/validation/business';
import { updateBusinessProfileAction } from '../../actions/profileActions';
import type { BusinessProfileData } from '@/lib/types';
import { LogoUploader } from './LogoUploader';
import { BannerUploader } from './BannerUploader';
import { GalleryUploader } from '@/components/custom/GalleryUploader';
import { iconMap } from '@/app/business/registration/api/fetchCategories';

/**
 * One vertical with its category list, as the profile page builds it from
 * `businessService.getBusinessTypes({ onlyActive: true })` — the same source
 * registration uses, so the profile offers exactly the categories an owner
 * could have picked at signup.
 */
export type ProfileBusinessTypeOption = {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  categories: { id: string; name: string }[];
};

interface BusinessInfoFormProps {
  businessId: string;
  business: BusinessProfileData;
  businessTypes: ProfileBusinessTypeOption[];
}

export function BusinessInfoForm({
  businessId,
  business,
  businessTypes,
}: BusinessInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateBusinessProfileInput>({
    resolver: zodResolver(updateBusinessProfileSchema),
    defaultValues: {
      shop_name: business.shop_name,
      description: business.description ?? '',
      logo_url: business.logo_url ?? null,
      banner_url: business.banner_url ?? null,
      category_id: business.category_id ?? undefined,
      interior_images: business.interior_images ?? [],
    },
  });

  // The vertical that owns the shop's current category. Only a filter for the
  // category list — the persisted value stays category_id, and the DB trigger
  // syncs business_type_id from it (same single-source-of-truth as signup).
  const initialTypeId = businessTypes.find((t) =>
    t.categories.some((c) => c.id === business.category_id),
  )?.id;
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(
    initialTypeId,
  );
  const selectedType = businessTypes.find((t) => t.id === selectedTypeId);

  const logoUrl = watch('logo_url');
  const bannerUrl = watch('banner_url');
  const galleryImages = watch('interior_images') ?? [];

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    const nextType = businessTypes.find((t) => t.id === typeId);
    // The current category belongs to another vertical — clear it so the owner
    // picks one from the type they just chose (the trigger then re-syncs the
    // type from the category).
    if (
      nextType &&
      !nextType.categories.some((c) => c.id === business.category_id)
    ) {
      setValue('category_id', null, { shouldDirty: true });
    }
  };

  const onSubmit = async (data: UpdateBusinessProfileInput) => {
    setIsSubmitting(true);
    try {
      const result = await updateBusinessProfileAction(businessId, data);
      if (!result.success) {
        toast.error(
          result.error?.message ?? 'Failed to update business profile',
        );
        return;
      }
      toast.success('Business profile updated');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* ── Shop Identity: banner with the logo on its foreground ─────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="size-4" />
            Shop Identity
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            How your shop looks to customers — click the banner or logo to
            change them.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative">
            <BannerUploader
              businessId={businessId}
              value={bannerUrl ?? null}
              onChange={(url) =>
                setValue('banner_url', url, { shouldDirty: true })
              }
            />
            {/* The logo sits on the banner's foreground, like the live shop
                page hero. */}
            <div className="absolute bottom-6 left-6 z-10 rounded-2xl bg-black/35 p-1 backdrop-blur-sm">
              <LogoUploader
                compact
                businessId={businessId}
                value={logoUrl ?? null}
                onChange={(url) =>
                  setValue('logo_url', url, { shouldDirty: true })
                }
              />
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <FieldError>{errors.logo_url?.message}</FieldError>
            <FieldError>{errors.banner_url?.message}</FieldError>
          </div>
        </CardContent>
      </Card>

      {/* ── Basic Information ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-6">
          <Field>
            <FieldLabel htmlFor="shop_name">Business Name</FieldLabel>
            <Input
              id="shop_name"
              placeholder="Your business name"
              {...register('shop_name')}
            />
            <FieldError>{errors.shop_name?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="Describe your business…"
              rows={3}
              {...register('description')}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="business_type_id">Business Type</FieldLabel>
            <Select
              value={selectedTypeId ?? ''}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger id="business_type_id">
                <SelectValue placeholder="Select a business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => {
                  const Icon = iconMap[type.icon] ?? Store;
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {type.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedType?.description && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                {selectedType.description}
              </p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="category_id">Category</FieldLabel>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(val) =>
                    field.onChange(val === '' ? null : val)
                  }
                  disabled={!selectedType}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue
                      placeholder={
                        selectedType
                          ? `Choose a ${selectedType.name} category`
                          : 'Select a business type first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedType?.categories ?? []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.category_id?.message}</FieldError>
            {!errors.category_id?.message && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                Customers find your shop through this category in Explore, and
                it decides the type of products or services you can list.
              </p>
            )}
          </Field>
        </CardContent>
      </Card>

      {/* ── Photo Gallery ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Images className="size-4" />
            Photo Gallery
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Photos of your shop and offerings, shown on your shop page.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Field>
            <GalleryUploader
              businessId={businessId}
              value={galleryImages as string[]}
              onChange={(urls) =>
                setValue('interior_images', urls, { shouldDirty: true })
              }
            />
            <FieldError>{errors.interior_images?.message}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
