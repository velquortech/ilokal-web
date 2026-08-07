'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
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
import { Loader2, Tag, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { useCelebrate } from '@/components/custom/Celebrate';
import { cn } from '@/lib/utils';
import type {
  CouponStatus,
  DiscountType,
  PromotionType,
  UsageScope,
  ProductResponse,
} from '@/lib/types';
import { createCouponAction } from '../../actions/couponActions';
import { uploadProductImageAction } from '../../actions/productActions';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { ProductPicker } from './product-picker';
import { useBusinessShop } from '@/providers/BusinessProvider';

interface AddCouponDialogProps {
  children: React.ReactNode;
  products: ProductResponse[];
  onSuccess?: () => void;
}

type CouponFormValues = {
  promotion_type: PromotionType;
  status: CouponStatus;
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  usage_scope: UsageScope;
  scope_values: string[];
  start_date: string;
  expiry_date: string;
  max_redemptions_global: string;
  max_redemptions_per_user: string;
  image: File | null;
};

const PROMOTION_OPTIONS: {
  value: PromotionType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'coupon',
    label: 'Coupon',
    description: 'Code-based discount customers enter to redeem',
    icon: Ticket,
  },
  {
    value: 'deal',
    label: 'Deal',
    description: 'Featured promotion tied to specific products',
    icon: Tag,
  },
];

export function AddCouponDialog({
  children,
  products,
  onSuccess,
}: AddCouponDialogProps) {
  const { selectedBranchId } = useBusinessShop();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const celebrate = useCelebrate();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CouponFormValues>({
    defaultValues: {
      promotion_type: 'coupon',
      status: 'draft' as CouponStatus,
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      usage_scope: 'any',
      scope_values: [],
      start_date: '',
      expiry_date: '',
      max_redemptions_global: '',
      max_redemptions_per_user: '',
      image: null,
    },
  });

  const watchedScope = watch('usage_scope');
  const filteredProducts = selectedBranchId
    ? products.filter((p) => p.branch_id === selectedBranchId)
    : products;

  const onSubmit = async (data: CouponFormValues) => {
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

      const result = await createCouponAction({
        promotion_type: data.promotion_type,
        status: data.status,
        code: data.code,
        description: data.description || undefined,
        discount: { type: data.discount_type, value: data.discount_value },
        usage_scope: data.usage_scope,
        scope_values: data.scope_values.length ? data.scope_values : undefined,
        start_date: new Date(data.start_date).toISOString(),
        expiry_date: new Date(data.expiry_date).toISOString(),
        max_redemptions_global: data.max_redemptions_global
          ? parseInt(data.max_redemptions_global, 10)
          : undefined,
        max_redemptions_per_user: data.max_redemptions_per_user
          ? parseInt(data.max_redemptions_per_user, 10)
          : undefined,
        image_url: image_url ?? null,
        branch_id: selectedBranchId ?? null,
      });

      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to create coupon';
        setServerError(msg);
        toast.error(msg);
        return;
      }

      const kind = data.promotion_type === 'deal' ? 'Deal' : 'Coupon';
      const live = data.status === 'published';
      toast.success(
        `${kind} "${data.code.toUpperCase()}" ${live ? 'is live' : 'saved as a draft'}`,
      );
      // Only a PUBLISHED promo is an outcome — saving a draft is housekeeping,
      // and confetti on it would make the burst mean nothing.
      if (live) celebrate();
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
      reset({
        promotion_type: 'coupon',
        status: 'draft' as CouponStatus,
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        usage_scope: 'any',
        scope_values: [],
        start_date: '',
        expiry_date: '',
        max_redemptions_global: '',
        max_redemptions_per_user: '',
      });
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Add Coupon or Deal</DialogTitle>
            <DialogDescription>
              Create a discount coupon or a featured deal for your customers
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Promotion Type Toggle */}
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Controller
                control={control}
                name="promotion_type"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {PROMOTION_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = field.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon
                              className={cn(
                                'size-4',
                                selected
                                  ? 'text-primary'
                                  : 'text-muted-foreground',
                              )}
                            />
                            <span
                              className={cn(
                                'text-sm font-medium',
                                selected && 'text-primary',
                              )}
                            >
                              {opt.label}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {opt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </Field>

            {/* Visibility Status */}
            <Field>
              <FieldLabel>Visibility</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          value: 'draft',
                          label: 'Draft',
                          desc: 'Only you can see this',
                        },
                        {
                          value: 'published',
                          label: 'Published',
                          desc: 'Visible to customers',
                        },
                      ] as {
                        value: CouponStatus;
                        label: string;
                        desc: string;
                      }[]
                    ).map((opt) => {
                      const selected = field.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            'flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors',
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50',
                          )}
                        >
                          <span
                            className={cn(
                              'text-sm font-medium',
                              selected && 'text-primary',
                            )}
                          >
                            {opt.label}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </Field>

            {/* Code */}
            <Field>
              <FieldLabel className={errors.code ? 'text-destructive' : ''}>
                Code
              </FieldLabel>
              <Input
                {...register('code', {
                  required: 'Code is required',
                  minLength: {
                    value: 2,
                    message: 'Code must be at least 2 characters',
                  },
                  maxLength: {
                    value: 50,
                    message: 'Code must be at most 50 characters',
                  },
                })}
                placeholder="e.g. SUMMER20"
                className={`uppercase ${errors.code ? 'border-destructive' : ''}`}
                style={{ textTransform: 'uppercase' }}
              />
              {errors.code && <FieldError>{errors.code.message}</FieldError>}
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel>Description (Optional)</FieldLabel>
              <Textarea
                {...register('description')}
                placeholder="Brief description for your customers"
                className="resize-none"
                rows={2}
              />
            </Field>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Discount Type</FieldLabel>
                <Controller
                  control={control}
                  name="discount_type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          Percentage (%)
                        </SelectItem>
                        <SelectItem value="fixed_amount">
                          Fixed Amount (₱)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel
                  className={errors.discount_value ? 'text-destructive' : ''}
                >
                  Discount Value
                </FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className={errors.discount_value ? 'border-destructive' : ''}
                  {...register('discount_value', {
                    required: 'Discount value is required',
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'Must be greater than 0' },
                  })}
                />
                {errors.discount_value && (
                  <FieldError>{errors.discount_value.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Usage Scope */}
            <Field>
              <FieldLabel>Applies To</FieldLabel>
              <Controller
                control={control}
                name="usage_scope"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">All products</SelectItem>
                      <SelectItem value="specific_products">
                        Specific products
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {/* Product Picker */}
            {watchedScope === 'specific_products' && (
              <Field>
                <FieldLabel>Select Products</FieldLabel>
                <Controller
                  control={control}
                  name="scope_values"
                  render={({ field }) => (
                    <ProductPicker
                      products={filteredProducts}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel
                  className={errors.start_date ? 'text-destructive' : ''}
                >
                  Start Date
                </FieldLabel>
                <Input
                  type="datetime-local"
                  className={errors.start_date ? 'border-destructive' : ''}
                  {...register('start_date', {
                    required: 'Start date is required',
                  })}
                />
                {errors.start_date && (
                  <FieldError>{errors.start_date.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel
                  className={errors.expiry_date ? 'text-destructive' : ''}
                >
                  Expiry Date
                </FieldLabel>
                <Input
                  type="datetime-local"
                  className={errors.expiry_date ? 'border-destructive' : ''}
                  {...register('expiry_date', {
                    required: 'Expiry date is required',
                  })}
                />
                {errors.expiry_date && (
                  <FieldError>{errors.expiry_date.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Redemption Limits */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Max Total Uses (Optional)</FieldLabel>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  min={1}
                  {...register('max_redemptions_global')}
                />
              </Field>

              <Field>
                <FieldLabel>Max Uses Per Customer (Optional)</FieldLabel>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  min={1}
                  {...register('max_redemptions_per_user')}
                />
              </Field>
            </div>

            {serverError && (
              <p className="text-destructive text-sm">{serverError}</p>
            )}

            {/* The deal's own photo. Optional — a card without one falls back
                to the shop's logo and first interior image, which is what
                every deal showed before `coupons.image_url` existed. Goes
                through the shared field so it runs `compressImage`; a phone
                photo is 3-6 MB against a 2 MB cap. */}
            <Field className="flex flex-col">
              <FieldLabel>Photo (Optional)</FieldLabel>
              <div className="relative min-h-32 flex-1">
                <Controller
                  control={control}
                  name="image"
                  render={({ field }) => (
                    <ImageUploadField
                      defaultValue={null}
                      onChange={(file) =>
                        field.onChange(file instanceof File ? file : null)
                      }
                      onError={(msg) => setServerError(msg)}
                      maxSizeBytes={2 * 1024 * 1024}
                      maxSizeLabel="2 MB"
                    />
                  )}
                />
              </div>
            </Field>
          </DialogBody>

          <DialogFooter>
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
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
