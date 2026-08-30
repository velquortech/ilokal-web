'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Loader2, Sparkles, Tag, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { ProductPicker } from './product-picker';
import {
  PROMO_TEMPLATES,
  getPromoTemplate,
  promoDefaults,
  templateChanges,
  flatDiscountLabel,
  DEFAULT_MAX_REDEMPTIONS_GLOBAL,
  DEFAULT_MAX_REDEMPTIONS_PER_USER,
} from './promo-templates';
import {
  promoFormSchema,
  type PromoFormValues,
  type PromoTemplateId,
} from '@/lib/validation/promoForm';
import type { Coupon, ProductResponse } from '@/lib/types';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { useFormDraft } from '@/hooks/useFormDraft';

interface PromoFormDialogProps {
  /** The element that opens the dialog (button, menu item, …). */
  children: React.ReactNode;
  /** Products available for "specific products" scope. */
  products: ProductResponse[];
  /** Existing coupon to edit, or null/absent for create (and duplicate). */
  initial?: Coupon | null;
  title: string;
  description: React.ReactNode;
  submitLabel: string;
  /** Build + send the request. `image` is a NEWLY picked file (null = none). */
  onSubmit: (payload: {
    values: PromoFormValues;
    image: File | null;
  }) => Promise<{ ok: boolean; message?: string }>;
  onSuccess?: () => void;
}

export function PromoFormDialog({
  children,
  products,
  initial = null,
  title,
  description,
  submitLabel,
  onSubmit,
  onSuccess,
}: PromoFormDialogProps) {
  const { business } = useBusinessShop();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<File | null>(null);
  // The code a template last suggested, so switching 10% → 15% replaces the
  // auto code while a code the owner typed themselves is never clobbered.
  const lastSuggested = React.useRef('');

  // The whole form instance is kept so `useFormDraft` can subscribe to it —
  // a destructure-only read would leave `form` undefined and crash on mount.
  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoFormSchema),
    mode: 'onChange',
    defaultValues: promoDefaults(initial),
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = form;

  const values = watch();

  // ── Draft persistence (create mode only) ─────────────────────────────────
  // The form is long, and closing it mid-way loses the promo being built. In
  // CREATE mode the serializable values are kept in localStorage per business,
  // debounced, and merged back over the defaults on the next open. Discarded
  // on a successful create, and never applied in EDIT mode — a row's own
  // values are the source of truth there, and a stale draft must not clobber
  // them. Dates ride WITH the draft (the owner may have set them); a pristine
  // form is considered empty, so untouched defaults never get persisted.
  const draftKey = business?.id ? `ilokal-promo-draft:${business.id}` : '';
  const { readDraft, clearDraft } = useFormDraft<
    PromoFormValues,
    PromoFormValues
  >({
    form,
    key: draftKey,
    enabled: !initial && !!business?.id,
    pick: (v) => v,
    isEmpty: (p) =>
      !p.code &&
      !p.description &&
      p.discount_value == null &&
      p.bogo_buy == null &&
      p.bogo_get == null &&
      (!p.scope_values || p.scope_values.length === 0) &&
      // The caps now default to 100 / 3 (like the dates), so "still at the
      // defaults" counts as untouched — a pristine form must not write a
      // draft. Clearing a cap to '' (Unlimited) is equally pristine.
      (!p.max_redemptions_global ||
        p.max_redemptions_global === DEFAULT_MAX_REDEMPTIONS_GLOBAL) &&
      (!p.max_redemptions_per_user ||
        p.max_redemptions_per_user === DEFAULT_MAX_REDEMPTIONS_PER_USER),
  });

  // Re-seed from `initial` every time the dialog opens: an edit dialog reused
  // across rows must prefill row B when the owner opens it after row A. In
  // create mode the stored draft rides on top of the defaults.
  React.useEffect(() => {
    if (open) {
      reset(
        {
          ...promoDefaults(initial),
          ...(initial ? {} : (readDraft() ?? {})),
        },
        // keepDefaultValues: the draft is CURRENT values, not the form's
        // defaults. Without this, RHF's reset(values) rewrites
        // `_defaultValues` to the draft, so a later reset() in the submit
        // path (or any future no-arg reset) would restore the draft instead
        // of the defaults.
        { keepDefaultValues: true },
      );
      setImage(null);
      setServerError(null);
      lastSuggested.current = '';
    }
  }, [open, initial, reset, readDraft]);

  const applyTemplate = (id: PromoTemplateId) => {
    const tpl = getPromoTemplate(id);
    if (!tpl) return;
    const { updates, nextSuggestion } = templateChanges(
      tpl,
      values,
      lastSuggested.current,
    );
    lastSuggested.current = nextSuggestion;
    // Set each changed field explicitly (a generic loop can't narrow the
    // Partial union per key), then light the picked chip.
    if (updates.discount_type) setValue('discount_type', updates.discount_type);
    if ('discount_value' in updates)
      setValue('discount_value', updates.discount_value);
    if ('bogo_buy' in updates) setValue('bogo_buy', updates.bogo_buy);
    if ('bogo_get' in updates) setValue('bogo_get', updates.bogo_get);
    if ('code' in updates) setValue('code', updates.code ?? '');
    if ('start_date' in updates)
      setValue('start_date', updates.start_date ?? '');
    if ('expiry_date' in updates)
      setValue('expiry_date', updates.expiry_date ?? '');
    setValue('template', id);
    void trigger();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // No reset on close: the draft autosave already holds the values, and the
    // open effect re-seeds them — closing mid-form must not lose the work (a
    // reset here would also make the autosave overwrite the stored draft with
    // defaults). `setImage(null)` stays: the picked file is not in the draft.
    if (!next) {
      setImage(null);
      setServerError(null);
      lastSuggested.current = '';
    }
  };

  const submit = handleSubmit(async (formValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const result = await onSubmit({ values: formValues, image });
      if (!result.ok) {
        setServerError(result.message ?? 'Something went wrong');
        return;
      }
      // The draft's job is done: the promo was created. (No-op in edit mode,
      // where drafts are never written.)
      clearDraft();
      setOpen(false);
      reset(promoDefaults(initial));
      setImage(null);
      onSuccess?.();
    } catch {
      setServerError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  });

  const scope = values.usage_scope;
  const discountLabel = flatDiscountLabel(values);
  const previewDate = values.expiry_date
    ? new Date(values.expiry_date).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-6">
            {/* ── Start from a template ─────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Start from a template</p>
              <div className="flex flex-wrap gap-2">
                {PROMO_TEMPLATES.map((tpl) => {
                  const selected = values.template === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      title={tpl.description}
                      data-testid={`template-${tpl.id}`}
                      className={cn(
                        'border-border hover:border-muted-foreground/50 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        selected && 'border-primary bg-primary/5 text-primary',
                      )}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── What customers see (live preview) ─────────────────── */}
            <div className="bg-muted/50 border-border space-y-1 rounded-lg border p-3">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <Sparkles className="size-3.5" aria-hidden />
                What customers will see
              </p>
              <p className="text-sm" data-testid="promo-preview">
                <span className="text-primary font-semibold">
                  {discountLabel}
                </span>
                {values.code && (
                  <>
                    {' '}
                    · code{' '}
                    <span className="bg-muted rounded px-1 py-0.5 font-mono text-xs font-semibold tracking-wider">
                      {values.code.toUpperCase()}
                    </span>
                  </>
                )}
                {previewDate && (
                  <>
                    {' '}
                    · until <span className="font-medium">{previewDate}</span>
                  </>
                )}
              </p>
            </div>

            {/* ── The deal ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <p className="text-sm font-medium">The deal</p>

              {values.discount_type === 'percentage' && (
                <Field>
                  <FieldLabel
                    className={errors.discount_value ? 'text-destructive' : ''}
                  >
                    Discount Value (%)
                  </FieldLabel>{' '}
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="e.g. 10"
                    data-testid="promo-value"
                    className={
                      errors.discount_value ? 'border-destructive' : ''
                    }
                    {...register('discount_value', {
                      setValueAs: (v) =>
                        v === '' || v == null ? undefined : Number(v),
                    })}
                  />
                  {errors.discount_value && (
                    <FieldError>{errors.discount_value.message}</FieldError>
                  )}
                </Field>
              )}

              {values.discount_type === 'fixed_amount' && (
                <Field>
                  <FieldLabel
                    className={errors.discount_value ? 'text-destructive' : ''}
                  >
                    Discount Value (₱)
                  </FieldLabel>{' '}
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="e.g. 50"
                    data-testid="promo-value"
                    className={
                      errors.discount_value ? 'border-destructive' : ''
                    }
                    {...register('discount_value', {
                      setValueAs: (v) =>
                        v === '' || v == null ? undefined : Number(v),
                    })}
                  />
                  {errors.discount_value && (
                    <FieldError>{errors.discount_value.message}</FieldError>
                  )}
                </Field>
              )}

              {values.discount_type === 'bogo' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel
                      className={errors.bogo_buy ? 'text-destructive' : ''}
                    >
                      Buy
                    </FieldLabel>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="1"
                      data-testid="promo-buy"
                      className={errors.bogo_buy ? 'border-destructive' : ''}
                      {...register('bogo_buy', {
                        setValueAs: (v) =>
                          v === '' || v == null ? undefined : Number(v),
                      })}
                    />
                    {errors.bogo_buy && (
                      <FieldError>{errors.bogo_buy.message}</FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel
                      className={errors.bogo_get ? 'text-destructive' : ''}
                    >
                      Get (free)
                    </FieldLabel>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="1"
                      data-testid="promo-get"
                      className={errors.bogo_get ? 'border-destructive' : ''}
                      {...register('bogo_get', {
                        setValueAs: (v) =>
                          v === '' || v == null ? undefined : Number(v),
                      })}
                    />
                    {errors.bogo_get && (
                      <FieldError>{errors.bogo_get.message}</FieldError>
                    )}
                  </Field>
                </div>
              )}

              <Field>
                <FieldLabel className={errors.code ? 'text-destructive' : ''}>
                  Code
                </FieldLabel>
                <Input
                  {...register('code')}
                  placeholder="e.g. 10OFF"
                  data-testid="promo-code"
                  autoComplete="off"
                  className={cn(
                    'uppercase',
                    errors.code ? 'border-destructive' : '',
                  )}
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.code && <FieldError>{errors.code.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>Description (Optional)</FieldLabel>
                <Textarea
                  {...register('description')}
                  placeholder="Brief description for your customers"
                  className="resize-none"
                  rows={2}
                />
              </Field>
            </div>

            {/* ── Who can use it ────────────────────────────────────── */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Who can use it</p>

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

              {scope === 'specific_products' && (
                <Field>
                  <FieldLabel>Select Products</FieldLabel>
                  <Controller
                    control={control}
                    name="scope_values"
                    render={({ field }) => (
                      <ProductPicker
                        products={products}
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Field>
              )}

              {/* items-end: the two labels wrap to different line counts at
                  phone widths, so without it the inputs sit at different
                  heights — the left one floats above the right. Bottom-aligning
                  the cells keeps the pair level whatever the label does. */}
              <div className="grid grid-cols-2 items-end gap-4">
                <Field>
                  <FieldLabel>Max Total Uses (Optional)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    {...register('max_redemptions_global')}
                  />
                </Field>
                <Field>
                  <FieldLabel>Max Uses Per Customer (Optional)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    {...register('max_redemptions_per_user')}
                  />
                </Field>
              </div>
            </div>

            {/* ── When ──────────────────────────────────────────────── */}
            <div className="space-y-4">
              <p className="text-sm font-medium">When</p>
              {/* One column until `sm`. A datetime-local renders a wide
                  native control — "MM/DD/YYYY, --:-- --" — and two of them
                  side by side inside a dialog leave ~120px each at 320px,
                  where the value is truncated to nothing usable. The same
                  pair in `apply-sale.tsx` and `EventFormDialog` already
                  stacks for this reason; this was the last one that did not. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    className={errors.start_date ? 'text-destructive' : ''}
                  >
                    Start Date
                  </FieldLabel>
                  <Input
                    type="datetime-local"
                    className={errors.start_date ? 'border-destructive' : ''}
                    {...register('start_date')}
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
                    {...register('expiry_date')}
                  />
                  {errors.expiry_date && (
                    <FieldError>{errors.expiry_date.message}</FieldError>
                  )}
                </Field>
              </div>
            </div>

            {/* ── Type + Visibility ─────────────────────────────────── */}
            <div className="space-y-4">
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Controller
                  control={control}
                  name="promotion_type"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          {
                            value: 'coupon',
                            label: 'Coupon',
                            desc: 'Code-based discount customers enter',
                            icon: Ticket,
                          },
                          {
                            value: 'deal',
                            label: 'Deal',
                            desc: 'Featured promo on the deals feed',
                            icon: Tag,
                          },
                        ] as const
                      ).map((opt) => {
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
                            desc: 'Visible to customers now',
                          },
                        ] as const
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
            </div>

            {/* ── Photo (optional) ──────────────────────────────────── */}
            <Field className="flex flex-col">
              <FieldLabel>Photo (Optional)</FieldLabel>
              <div className="relative min-h-32 flex-1">
                <ImageUploadField
                  defaultValue={initial?.image_url ?? null}
                  onChange={(file) =>
                    setImage(file instanceof File ? file : null)
                  }
                  onError={(msg) => setServerError(msg)}
                  maxSizeBytes={2 * 1024 * 1024}
                  maxSizeLabel="2 MB"
                />
              </div>
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
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
