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
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import type { ProductResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UpdateProductDialogProps {
  product: ProductResponse;
  children: React.ReactNode;
}

type ProductFormValues = {
  name: string;
  description: string | null;
  price: number;
  status: 'active' | 'inactive' | 'archived';
  image_url: File | string | null;
};

export function UpdateProductDialog({
  product,
  children,
}: UpdateProductDialogProps) {
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: product.name,
      description: product.description,
      price: product.price,
      status: product.status,
      image_url: product.image_url,
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    console.info('Updated Product Data:', data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Input {...register('name', { required: 'Required' })} />
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
                      value: 0.01,
                      message: 'Price must be at least 0.01',
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
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
