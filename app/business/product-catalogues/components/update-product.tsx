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
import { Product } from '../../libs/types/product.type';
import { calculateSalePercentage } from '../../libs/helper';
import { cn } from '@/lib/utils';

interface UpdateProductDialogProps {
  product: Product;
  children: React.ReactNode;
}

// Updated type: image can be a File (new) or a string (existing URL)
type ProductFormValues = Omit<Product, 'id' | 'badge' | 'image'> & {
  image: File | string;
};

export function UpdateProductDialog({
  product,
  children,
}: UpdateProductDialogProps) {
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: product.name,
      description: product.description,
      price: product.price,
      status: product.status,
      image: product.image, // Directly set the URL as the default value
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    // If data.image is a string, no new file was uploaded.
    // If data.image is an instance of File, you'll need to upload it.
    console.info('Updated Product Data:', data);
    setOpen(false);
  };

  const discount = calculateSalePercentage(watch('price'), watch('salePrice'));

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

            <Field className="flex flex-col">
              <FieldLabel className={errors.image ? 'text-destructive' : ''}>
                Product Image
              </FieldLabel>
              <div className="relative min-h-30 flex-1">
                <Controller
                  control={control}
                  name="image"
                  rules={{ required: 'Image is required' }}
                  render={({ field }) => (
                    <ImageUploadField
                      defaultValue={field.value}
                      onChange={(file) => field.onChange(file)}
                    />
                  )}
                />
              </div>
              {errors.image && <FieldError>{errors.image.message}</FieldError>}
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
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
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
