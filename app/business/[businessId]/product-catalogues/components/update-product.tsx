'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  updateProductAction,
  uploadProductImageAction,
} from '../../actions/productActions';

interface UpdateProductDialogProps {
  product: ProductResponse;
  children: React.ReactNode;
}

type ProductFormValues = {
  name: string;
  description: string;
  price: number;
  status: 'active' | 'inactive' | 'archived';
  image_url: File | string | null;
};

export function UpdateProductDialog({
  product,
  children,
}: UpdateProductDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      status: product.status,
      image_url: product.image_url,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      let image_url: string | undefined;

      if (data.image_url instanceof File) {
        const fd = new FormData();
        fd.append('file', data.image_url);
        const uploadResult = await uploadProductImageAction(fd);
        if (!uploadResult.success) {
          const msg = uploadResult.error?.message ?? 'Image upload failed';
          setServerError(msg);
          toast.error(msg);
          return;
        }
        image_url = uploadResult.data?.url;
      } else if (typeof data.image_url === 'string') {
        image_url = data.image_url;
      }

      const result = await updateProductAction(product.id, {
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        status: data.status,
        image_url,
      });

      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to update product';
        setServerError(msg);
        toast.error(msg);
        return;
      }

      toast.success(`"${data.name}" updated successfully`);
      setOpen(false);
      router.refresh();
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
      reset({
        name: product.name,
        description: product.description ?? '',
        price: product.price,
        status: product.status,
        image_url: product.image_url,
      });
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-max">
        <DialogHeader>
          <DialogTitle>Update Product</DialogTitle>
          <DialogDescription>
            Modify the details for {product.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-4 w-lg space-y-4 text-left">
            <Field>
              <FieldLabel className={errors.name ? 'text-destructive' : ''}>
                Product Name
              </FieldLabel>
              <Input
                {...register('name', { required: 'Product name is required' })}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea {...register('description')} className="resize-none" />
            </Field>

            <Field>
              <FieldLabel className={errors.price ? 'text-destructive' : ''}>
                Price
              </FieldLabel>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2">
                  ₱
                </span>
                <Input
                  type="number"
                  step="0.01"
                  {...register('price', {
                    required: 'Price is required',
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: 'Price cannot be negative',
                    },
                  })}
                  placeholder="0.00"
                  className={cn(
                    'pl-8',
                    errors.price ? 'border-destructive' : '',
                  )}
                />
              </div>
              {errors.price && <FieldError>{errors.price.message}</FieldError>}
            </Field>

            <Field className="flex flex-col">
              <FieldLabel
                className={errors.image_url ? 'text-destructive' : ''}
              >
                Product Image
              </FieldLabel>
              <div className="relative min-h-30 flex-1">
                <Controller
                  control={control}
                  name="image_url"
                  render={({ field }) => (
                    <ImageUploadField
                      defaultValue={
                        typeof field.value === 'string'
                          ? field.value
                          : undefined
                      }
                      onChange={(file) => field.onChange(file)}
                      maxSizeBytes={5 * 1024 * 1024}
                      maxSizeLabel="5 MB"
                    />
                  )}
                />
              </div>
              {errors.image_url && (
                <FieldError>{errors.image_url.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

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
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
