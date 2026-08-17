'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  Category,
  ProductResponse,
  ProductSectionWithCount,
} from '@/lib/types';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/types';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import { cn } from '@/lib/utils';
import { PRICE_TYPE_LABELS } from './offering-labels';
import type { PriceType } from '@/lib/types';
import {
  updateProductAction,
  uploadProductImageAction,
} from '../../actions/productActions';

interface UpdateProductDialogProps {
  product: ProductResponse;
  /** The shop's own groupings. Absent until the shop has made one. */
  sections?: ProductSectionWithCount[];
  /**
   * The platform taxonomy, already scoped to this shop's vertical by the
   * page. Optional for the same reason as `sections`: nothing renders until
   * there is a list to render.
   */
  categories?: Category[];
  children: React.ReactNode;
}

/**
 * Radix Select forbids an empty-string item value, so "no section" needs a
 * sentinel. Mapped back to NULL on submit — Uncategorised is a real state.
 */
const NO_SECTION = '__none__';

/** Same sentinel trick for Category — "no category" is a real, valid state. */
const NO_CATEGORY = '__none__';

type ProductFormValues = {
  name: string;
  description: string;
  /** Null for quote-based offerings, which carry no figure. */
  price: number | null;
  price_type: PriceType;
  status: 'active' | 'unlisted' | 'disabled';
  section_id: string;
  /** NO_CATEGORY when unset — mapped back to NULL on submit. */
  category_id: string;
  image_url: File | string | null;
};

export function UpdateProductDialog({
  product,
  sections,
  categories,
  children,
}: UpdateProductDialogProps) {
  const router = useRouter();
  const vocabulary = useOfferingVocabulary();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // One object for defaultValues AND reset — a partial reset() literal drops
  // whatever it omits, flipping those Selects to uncontrolled.
  const currentValues = React.useMemo<ProductFormValues>(
    () => ({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      price_type: product.price_type,
      status: product.status,
      image_url: product.image_url,
      section_id: product.section_id ?? NO_SECTION,
      category_id: product.category_id ?? NO_CATEGORY,
    }),
    [product],
  );

  // Kind-scoped options, mirroring the add dialog: a category marked for one
  // kind (NULL = either) is only offered for a row of that kind. The row's
  // kind is fixed — the update form does not change it — so the scope is the
  // stored value, never a picker.
  const categoryOptions = React.useMemo(() => {
    const scoped = (categories ?? []).filter(
      (cat) => !cat.kind || cat.kind === product.kind,
    );
    // The row's current category may sit outside the list (vertical or kind
    // changed since it was assigned); keep it selectable so the Select is
    // never blank and the owner can always save the row unchanged.
    if (
      product.category_id &&
      !scoped.some((cat) => cat.id === product.category_id)
    ) {
      return [
        ...scoped,
        {
          id: product.category_id,
          name: product.category?.name ?? 'Current category',
          slug: 'current',
          description: null,
          created_at: '',
          updated_at: '',
        } as Category,
      ];
    }
    return scoped;
  }, [categories, product]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({ defaultValues: currentValues });

  // Reactive, not derived from the stored row: an owner moving an offering OFF
  // "price on request" must get the price field back in the same session.
  const isQuoteBased = watch('price_type') === 'on_request';

  const priceTypeOptions = (
    Object.keys(PRICE_TYPE_LABELS) as PriceType[]
  ).filter(
    (pt) =>
      vocabulary.allowedPriceTypes.includes(pt) ||
      // Never hide the value the row already has, or it can't be changed.
      pt === product.price_type,
  );

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

      const nextIsQuote = data.price_type === 'on_request';

      const result = await updateProductAction(product.id, {
        name: data.name,
        description: data.description || undefined,
        // Omitted when the offering is (or becomes) quote-based, so the
        // update can't reintroduce a figure the business withdrew.
        ...(nextIsQuote ? {} : { price: data.price }),
        price_type: data.price_type,
        status: data.status,
        // Always sent, so an owner can move an offering back to
        // Uncategorised — omitting it would make that impossible.
        section_id: data.section_id === NO_SECTION ? null : data.section_id,
        // Always sent, so an owner can move an offering back to "no category"
        // — omitting it would make that impossible, the same rule as Section.
        category_id: data.category_id === NO_CATEGORY ? null : data.category_id,
        image_url,
      });

      if (!result.success) {
        const msg =
          result.error?.message ??
          `Failed to update ${vocabulary.singular.toLowerCase()}`;
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
      reset(currentValues);
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{vocabulary.updateLabel}</DialogTitle>
          <DialogDescription>
            Modify the details for {product.name}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <DialogBody className="space-y-4 text-left">
            <Field>
              <FieldLabel className={errors.name ? 'text-destructive' : ''}>
                {vocabulary.singular} Name
              </FieldLabel>
              <Input
                {...register('name', {
                  required: vocabulary.nameRequiredLabel,
                })}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea {...register('description')} className="resize-none" />
            </Field>

            {/* The shop's own grouping. Hidden until the shop has sections —
                except when this row already sits in one, or an owner could
                never move it out. */}
            {((sections && sections.length > 0) || product.section_id) && (
              <Field>
                <FieldLabel>Section</FieldLabel>
                <Controller
                  control={control}
                  name="section_id"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Uncategorised" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SECTION}>
                          Uncategorised
                        </SelectItem>
                        {(sections ?? []).map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                        {/* The row's current section may be missing from the
                            list (archived while this dialog was open); keep it
                            selectable so the Select is never blank. */}
                        {product.section_id &&
                          !(sections ?? []).some(
                            (s) => s.id === product.section_id,
                          ) && (
                            <SelectItem value={product.section_id}>
                              {product.section?.name ?? 'Current section'}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}

            {/* The platform taxonomy — the mobile menu's filter chips, not
                the shop's own Section. Options are scoped by vertical (the
                page) and by the row's kind, with an explicit "No category"
                state: NULL is a real, honest value (the add form made the
                field optional on purpose). */}
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

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

            {isQuoteBased ? (
              <p className="text-muted-foreground text-sm">
                Priced on request — customers see “Price on request” and contact
                you for a quote.
              </p>
            ) : (
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
                {errors.price && (
                  <FieldError>{errors.price.message}</FieldError>
                )}
              </Field>
            )}

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
                      maxSizeBytes={2 * 1024 * 1024}
                      maxSizeLabel="2 MB"
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
                      {PRODUCT_STATUS_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

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
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
