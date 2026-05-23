'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, PriceType } from '@/lib/types';
import {
  createProductAction,
  uploadProductImageAction,
} from '../../actions/productActions';

interface AddProductDialogProps {
  children: React.ReactNode;
  categories: Category[];
  onSuccess?: () => void;
}

type ProductFormValues = {
  name: string;
  description: string;
  price: number;
  price_type: PriceType;
  price_unit: string;
  category_id: string | undefined;
  image: File | null;
  is_available: boolean;
};

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Fixed price',
  from: 'Starting from',
  per_hour: 'Per hour',
  per_day: 'Per day',
  per_person: 'Per person',
  per_event: 'Per event',
};

export function AddProductDialog({
  children,
  categories,
  onSuccess,
}: AddProductDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: '',
      description: '',
      price_type: 'fixed',
      price_unit: '',
      category_id: undefined,
      image: null,
      is_available: true,
    },
  });

  const watchedPriceType = watch('price_type');

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      let image_url: string | undefined;

      if (data.image instanceof File) {
        const fd = new FormData();
        fd.append('file', data.image);
        const uploadResult = await uploadProductImageAction(fd);
        if (!uploadResult.success) {
          const msg = uploadResult.error?.message ?? 'Image upload failed';
          setServerError(msg);
          toast.error(msg);
          return;
        }
        image_url = uploadResult.data?.url;
      }

      const result = await createProductAction({
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        price_type: data.price_type,
        price_unit: data.price_unit || undefined,
        category_id: data.category_id!,
        image_url,
        is_available: data.is_available,
      });

      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to create product';
        setServerError(msg);
        toast.error(msg);
        return;
      }

      toast.success(`"${data.name}" added to your catalogue`);
      setOpen(false);
      reset();
      onSuccess?.();
    } catch {
      const msg = 'An unexpected error occurred';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset();
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-200 overflow-auto sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details for the new product
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Name */}
            <Field>
              <FieldLabel className={errors.name ? 'text-destructive' : ''}>
                Product Name
              </FieldLabel>
              <Input
                {...register('name', { required: 'Product name is required' })}
                placeholder="e.g. Flat White"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel>Description (Optional)</FieldLabel>
              <Textarea
                {...register('description')}
                placeholder="Brief product description"
                className="resize-none"
                rows={2}
              />
            </Field>

            {/* Category */}
            <Field>
              <FieldLabel
                className={errors.category_id ? 'text-destructive' : ''}
              >
                Category
              </FieldLabel>
              <Controller
                control={control}
                name="category_id"
                rules={{ required: 'Category is required' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={`w-full ${errors.category_id ? 'border-destructive' : ''}`}
                    >
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
              {errors.category_id && (
                <FieldError>{errors.category_id.message}</FieldError>
              )}
            </Field>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel className={errors.price ? 'text-destructive' : ''}>
                  Price
                </FieldLabel>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    ₱
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`pl-8 ${errors.price ? 'border-destructive' : ''}`}
                    {...register('price', {
                      required: 'Price is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Price cannot be negative' },
                    })}
                  />
                </div>
                {errors.price && (
                  <FieldError>{errors.price.message}</FieldError>
                )}
              </Field>

              {/* Price Type */}
              <Field>
                <FieldLabel>Price Type</FieldLabel>
                <Controller
                  control={control}
                  name="price_type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map(
                          (pt) => (
                            <SelectItem key={pt} value={pt}>
                              {PRICE_TYPE_LABELS[pt]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            {/* Price Unit — only shown for non-fixed types */}
            {watchedPriceType !== 'fixed' && (
              <Field>
                <FieldLabel>Price Unit Label (Optional)</FieldLabel>
                <Input
                  {...register('price_unit')}
                  placeholder='e.g. "per table", "per pax"'
                />
              </Field>
            )}

            {/* Image */}
            <Field className="flex flex-col">
              <FieldLabel>Product Image (Optional)</FieldLabel>
              <div className="relative min-h-32 flex-1">
                <Controller
                  control={control}
                  name="image"
                  render={({ field }) => (
                    <ImageUploadField
                      onChange={(file) =>
                        field.onChange(file instanceof File ? file : null)
                      }
                    />
                  )}
                />
              </div>
            </Field>

            {/* Availability */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-muted-foreground text-xs">
                  Visible to customers right away
                </p>
              </div>
              <Controller
                control={control}
                name="is_available"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {serverError && (
              <p className="text-destructive text-sm">{serverError}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-28">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Product'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
