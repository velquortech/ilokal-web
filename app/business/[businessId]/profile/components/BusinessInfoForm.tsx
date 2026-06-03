'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from '@/lib/validation/business';
import { updateBusinessProfileAction } from '../../actions/profileActions';
import { getCategoriesAction } from '../../actions/productActions';
import type { BusinessProfileData, Category } from '@/lib/types';
import { LogoUploader } from './LogoUploader';
import { GalleryUploader } from './GalleryUploader';

interface BusinessInfoFormProps {
  businessId: string;
  business: BusinessProfileData;
}

export function BusinessInfoForm({ businessId, business }: BusinessInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategoriesAction().then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

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
      banner_url: business.banner_url ?? '',
      category_id: business.category_id ?? undefined,
      interior_images: business.interior_images ?? [],
    },
  });

  const logoUrl = watch('logo_url');
  const galleryImages = watch('interior_images') ?? [];

  const onSubmit = async (data: UpdateBusinessProfileInput) => {
    setIsSubmitting(true);
    try {
      const result = await updateBusinessProfileAction(businessId, data);
      if (!result.success) {
        toast.error(result.error?.message ?? 'Failed to update business profile');
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
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="size-4" />
          Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

          {/* Logo */}
          <Field>
            <FieldLabel>Business Logo</FieldLabel>
            <LogoUploader
              businessId={businessId}
              value={logoUrl ?? null}
              onChange={(url) => setValue('logo_url', url, { shouldDirty: true })}
            />
            <FieldError>{errors.logo_url?.message}</FieldError>
          </Field>

          <Separator />

          {/* Basic info */}
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
            <FieldLabel htmlFor="category_id">Category</FieldLabel>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(val) => field.onChange(val === '' ? null : val)}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.category_id?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="banner_url">Banner URL</FieldLabel>
            <Input
              id="banner_url"
              placeholder="https://example.com/banner.png"
              {...register('banner_url')}
            />
            <FieldError>{errors.banner_url?.message}</FieldError>
          </Field>

          <Separator />

          {/* Gallery */}
          <Field>
            <FieldLabel>Photo Gallery</FieldLabel>
            <GalleryUploader
              businessId={businessId}
              value={galleryImages as string[]}
              onChange={(urls) =>
                setValue('interior_images', urls, { shouldDirty: true })
              }
            />
            <FieldError>{errors.interior_images?.message}</FieldError>
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
