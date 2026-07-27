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
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, PriceType } from '@/lib/types';
import type {
  OfferingAttributeField,
  ServiceLocation,
} from '@/lib/types/offering';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
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
  price: number | null;
  price_type: PriceType;
  price_unit: string;
  category_id: string | undefined;
  image: File | null;
  is_available: boolean;
  // Service/rental attributes — only the ones the vertical's profile asks for
  // are rendered, but they all live in the form state so a switch of profile
  // never orphans a value mid-edit.
  duration_minutes: number | null;
  lead_time_minutes: number | null;
  inventory_count: number | null;
  capacity: number | null;
  deposit_amount: number | null;
  min_duration_units: number | null;
  max_duration_units: number | null;
  service_location: ServiceLocation;
};

/** Labels for the attribute inputs a profile can switch on. */
const ATTRIBUTE_LABELS: Record<
  Exclude<OfferingAttributeField, 'service_location'>,
  { label: string; hint?: string }
> = {
  duration_minutes: { label: 'Duration (minutes)', hint: 'e.g. 45' },
  lead_time_minutes: {
    label: 'Minimum notice (minutes)',
    hint: 'How far ahead customers must book',
  },
  inventory_count: {
    label: 'Units available',
    hint: 'How many can be booked at the same time',
  },
  capacity: { label: 'Capacity (people)', hint: 'How many one unit holds' },
  deposit_amount: { label: 'Deposit (₱)', hint: 'Shown to customers only' },
  min_duration_units: { label: 'Minimum booking length' },
  max_duration_units: { label: 'Maximum booking length' },
};

const SERVICE_LOCATION_LABELS: Record<ServiceLocation, string> = {
  at_business: 'At our location',
  at_customer: 'We come to the customer',
  both: 'Either',
};

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Fixed price',
  from: 'Starting from',
  per_hour: 'Per hour',
  per_day: 'Per day',
  per_person: 'Per person',
  per_event: 'Per event',
  on_request: 'Price on request (quote)',
};

export function AddProductDialog({
  children,
  categories,
  onSuccess,
}: AddProductDialogProps) {
  const { selectedBranchId } = useBusinessShop();
  const vocabulary = useOfferingVocabulary();
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
      price: null,
      price_type: 'fixed',
      price_unit: '',
      category_id: undefined,
      image: null,
      is_available: true,
      duration_minutes: null,
      lead_time_minutes: null,
      inventory_count: null,
      capacity: null,
      deposit_amount: null,
      min_duration_units: null,
      max_duration_units: null,
      service_location: 'at_business',
    },
  });

  const watchedPriceType = watch('price_type');
  const isQuoteBased = watchedPriceType === 'on_request';

  // The vertical decides which price types are offered and which service
  // attributes appear. An empty/absent policy resolves to "all types, no
  // attributes" — exactly the pre-phase-3 form.
  const priceTypeOptions = (
    Object.keys(PRICE_TYPE_LABELS) as PriceType[]
  ).filter((pt) => vocabulary.allowedPriceTypes.includes(pt));
  const attributeFields = vocabulary.fields;
  const numericAttributes = attributeFields.filter(
    (f): f is Exclude<OfferingAttributeField, 'service_location'> =>
      f !== 'service_location',
  );

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

      const quoteBased = data.price_type === 'on_request';

      const result = await createProductAction({
        name: data.name,
        description: data.description || undefined,
        // A quote-based offering carries no figure at all — the DB CHECK
        // permits NULL only for this price type.
        price: quoteBased ? null : data.price,
        price_type: data.price_type,
        price_unit: data.price_unit || undefined,
        category_id: data.category_id!,
        image_url,
        is_available: data.is_available,
        branch_id: selectedBranchId ?? null,
        // Sent EXPLICITLY: the DB defaults `kind` to 'product' and cannot tell
        // an omitted field from a deliberate one, so a services business would
        // otherwise keep minting products (the phase-1 decay).
        kind: vocabulary.defaultKind,
        booking_mode: vocabulary.defaultBookingMode,
        // Only the attributes this vertical actually renders are sent; the
        // rest stay NULL rather than shipping stale form state.
        ...Object.fromEntries(
          numericAttributes.map((field) => [field, data[field] ?? null]),
        ),
        ...(attributeFields.includes('service_location') && {
          service_location: data.service_location,
        }),
      });

      if (!result.success) {
        const msg =
          result.error?.message ??
          `Failed to create ${vocabulary.singular.toLowerCase()}`;
        setServerError(msg);
        toast.error(msg);
        return;
      }

      toast.success(`"${data.name}" added to your catalogue`);
      setOpen(false);
      reset();
      onSuccess?.();
    } catch {
      const msg =
        'Something went wrong, or check image size the limit is 2MB per image only';
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
        name: '',
        description: '',
        price_type: 'fixed',
        price_unit: '',
        category_id: undefined,
        image: null,
        is_available: true,
      });
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{vocabulary.addLabel}</DialogTitle>
            <DialogDescription>
              Fill in the details for the new{' '}
              {vocabulary.singular.toLowerCase()}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Name */}
            <Field>
              <FieldLabel className={errors.name ? 'text-destructive' : ''}>
                {vocabulary.singular} Name
              </FieldLabel>
              <Input
                {...register('name', {
                  required: vocabulary.nameRequiredLabel,
                })}
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
                placeholder={`Brief ${vocabulary.singular.toLowerCase()} description`}
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

            {/* Price — hidden entirely for quote-based offerings, which have
                no figure to enter (the DB CHECK requires NULL there). */}
            <div
              className={isQuoteBased ? 'space-y-4' : 'grid grid-cols-2 gap-4'}
            >
              {!isQuoteBased && (
                <Field>
                  <FieldLabel
                    className={errors.price ? 'text-destructive' : ''}
                  >
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
              )}

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
                        {priceTypeOptions.map((pt) => (
                          <SelectItem key={pt} value={pt}>
                            {PRICE_TYPE_LABELS[pt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            {isQuoteBased && (
              <p className="text-muted-foreground text-sm">
                Customers will see “Price on request” and can contact you for a
                quote.
              </p>
            )}

            {/* Price Unit — only shown for non-fixed, priced types */}
            {watchedPriceType !== 'fixed' && !isQuoteBased && (
              <Field>
                <FieldLabel>Price Unit Label (Optional)</FieldLabel>
                <Input
                  {...register('price_unit')}
                  placeholder='e.g. "per table", "per pax"'
                />
              </Field>
            )}

            {/* Service / rental attributes — rendered only for the fields
                this vertical's offering_profile asks for. A retail profile
                lists none, so the form is byte-identical to before phase 3. */}
            {attributeFields.length > 0 && (
              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-sm font-medium">
                  {vocabulary.singular} details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {numericAttributes.map((field) => (
                    <Field key={field}>
                      <FieldLabel>{ATTRIBUTE_LABELS[field].label}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        placeholder={ATTRIBUTE_LABELS[field].hint}
                        {...register(field, {
                          // An empty input is "not specified", not 0 — NaN
                          // would fail the DB CHECK with a driver error.
                          setValueAs: (v) =>
                            v === '' || v == null ? null : Number(v),
                          min: { value: 0, message: 'Cannot be negative' },
                        })}
                      />
                    </Field>
                  ))}
                </div>
                {attributeFields.includes('service_location') && (
                  <Field>
                    <FieldLabel>Where is it delivered?</FieldLabel>
                    <Controller
                      control={control}
                      name="service_location"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(
                                SERVICE_LOCATION_LABELS,
                              ) as ServiceLocation[]
                            ).map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {SERVICE_LOCATION_LABELS[loc]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                )}
              </div>
            )}

            {/* Image */}
            <Field className="flex flex-col">
              <FieldLabel>{vocabulary.imageLabel} (Optional)</FieldLabel>
              <div className="relative min-h-32 flex-1">
                <Controller
                  control={control}
                  name="image"
                  render={({ field }) => (
                    <ImageUploadField
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
                vocabulary.saveLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
