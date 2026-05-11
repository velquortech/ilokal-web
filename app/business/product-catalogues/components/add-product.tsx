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
import { Field, FieldLabel, FieldError } from '@/components/ui/field'; // Ensure FieldError is exported/added
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropsWithChildren } from 'react';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { Product } from '../../libs/types/product.type';
import { cn } from '@/lib/utils';
import { calculateSalePercentage } from '../../libs/helper';

type ProductFormValues = Omit<Product, 'id' | 'badge' | 'image'> & {
  image: File;
};

export function AddProductDialog({ children }: PropsWithChildren) {
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: '',
      description: '',
      status: 'unlisted',
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    console.info('Valid Product Data:', data);
    setOpen(false);
    reset();
  };

  const discount = calculateSalePercentage(watch('price'), watch('salePrice'));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-max">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the details for the new item
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 w-lg space-y-4">
            {/* Product Name */}
            <Field>
              <FieldLabel className={errors.name ? 'text-destructive' : ''}>
                Product Name
              </FieldLabel>
              <Input
                {...register('name', {
                  required: 'Product name is required',
                })}
                placeholder="Product name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel>Description (Optional)</FieldLabel>
              <Textarea
                {...register('description')}
                placeholder="Description"
                className="resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {/* Base Price */}
              <Field>
                <FieldLabel className={errors.price ? 'text-destructive' : ''}>
                  Base Price
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

                {errors.price && (
                  <FieldError>{errors.price.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel className="text-primary">
                  Sale Price (Optional)
                </FieldLabel>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2">
                    ₱
                  </span>
                  <Input
                    type="number"
                    className="border-primary/50 bg-primary/5 [appearance:textfield] pl-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...register('salePrice')}
                  />
                  {discount > 0 && (
                    <span className="bg-primary absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      -{discount}%
                    </span>
                  )}
                </div>
              </Field>
            </div>

            {/* Image Upload Area */}

            <Field className="flex h-full flex-col">
              <FieldLabel className={errors.image ? 'text-destructive' : ''}>
                Product Image
              </FieldLabel>
              <div className="relative flex-1">
                <Controller
                  control={control}
                  name="image"
                  rules={{ required: 'Product image is required' }}
                  render={({ field }) => (
                    <ImageUploadField
                      onChange={(file) => field.onChange(file)}
                    />
                  )}
                />
              </div>
              {errors.image && <FieldError>{errors.image.message}</FieldError>}
            </Field>

            {/* Status */}
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Controller
                control={control}
                name="status"
                rules={{ required: 'Status is required' }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={errors.status ? 'border-destructive' : ''}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <FieldError>{errors.status.message}</FieldError>
              )}
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
