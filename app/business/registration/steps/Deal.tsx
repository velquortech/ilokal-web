'use client';

import { useWatch } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field';
import { BadgePercent, X } from 'lucide-react';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import { cn } from '@/lib/utils';
import { PROMO_TEMPLATES } from '@/app/business/[businessId]/coupons/components/promo-templates';
import { MAX_FILE_SIZE } from '../validator/business-registration-form-schema';

/** Windows an owner actually thinks in. Days, because the DB stores a date. */
const DURATION_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
];

/** Minted per deal so its photo can be cached like an offering's. */
const newUid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyDeal = () => ({
  uid: newUid(),
  code: '',
  description: '',
  discount_type: 'percentage' as const,
  discount_value: null as unknown as number,
  bogo_buy: undefined,
  bogo_get: undefined,
  duration_days: 30,
  // 🔴 Draft. See registrationDealSchema — publishing makes the coupon
  // immediately redeemable by a stranger.
  publish: false,
});

/**
 * The optional launch deal.
 *
 * Optional on purpose, and the ordering is the argument: a shop with no menu
 * has nothing to discount, which is why the menu step is required and this one
 * is not. It is also the only step in the wizard that can cost the owner real
 * money, so nothing here is filled in on their behalf.
 */
export function ShopDeal() {
  const { form, vocabulary, offeringImages } = useMultiStepForm();
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;

  const deal = useWatch({ control, name: 'deal' });
  const isAdding = deal !== null && deal !== undefined;
  const dealErrors = errors.deal as
    | Partial<Record<string, { message?: string }>>
    | undefined;

  if (!isAdding) {
    return (
      <div className="flex flex-1 flex-col gap-7">
        <Alert>
          <BadgePercent />
          <AlertTitle>Want to open with a deal?</AlertTitle>
          <AlertDescription>
            A launch discount gives shoppers a reason to try you. Entirely
            optional — you can skip this and add one any time from your
            dashboard.
          </AlertDescription>
        </Alert>

        {/* Absorbs the leftover height, for the same reason the menu step's
            list does: the wizard stretches each step to fill the column above
            Back/Next, and slack nobody claims pools at the bottom as a dead
            band. Here it makes the one thing on the step — the offer to add a
            deal — the thing that fills the space. */}
        <div className="border-border flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No deal yet. Continue to finish registering, or add one now.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue('deal', emptyDeal(), { shouldValidate: true })
            }
          >
            <BadgePercent className="mr-1 h-4 w-4" />
            Add a launch deal
          </Button>
        </div>
      </div>
    );
  }

  // gap-6: the wizard's 24px rhythm — the alert and the deal form sit as far
  // apart as field groups on the other steps.
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <Alert className="flex-1">
          <BadgePercent />
          <AlertTitle>Your launch deal</AlertTitle>
          <AlertDescription>
            Shoppers show the code at your counter. You can edit or delete it
            from your dashboard at any time.
          </AlertDescription>
        </Alert>
      </div>

      {/* space-y-6: the wizard's 24px field rhythm — code, discount chips,
          value, description, duration and publish are all fields, so they sit
          as far apart as fields do anywhere else in the wizard. */}
      <div className="space-y-6 rounded-lg border p-5">
        <div className="space-y-2">
          <Label htmlFor="deal-code">Code</Label>
          <Input
            id="deal-code"
            {...register('deal.code')}
            placeholder="e.g. OPENING20"
            autoComplete="off"
            // Stored uppercase by the schema; showing it uppercase as they type
            // means the code they read here is the code the cashier sees.
            className="uppercase"
          />
          {dealErrors?.code?.message && (
            <FieldError>{dealErrors.code.message}</FieldError>
          )}
        </div>

        {/* PRESET CHIPS — the same vocabulary as the dashboard coupon dialog
            (Phase 1), so the wizard teaches owners what they'll see later.
            Picking one fills the discount fields below; the code stays
            manual because a launch code is the owner's own marketing choice. */}
        <div className="space-y-2">
          <Label>Discount</Label>
          <div className="flex flex-wrap gap-2">
            {PROMO_TEMPLATES.filter((tpl) => tpl.id !== 'custom').map((tpl) => {
              // Exact match, like the dashboard dialog: "10% off" only
              // lights up when the value is 10, not every percentage chip.
              const selected =
                tpl.discount_type === 'percentage' ||
                tpl.discount_type === 'fixed_amount'
                  ? deal.discount_type === tpl.discount_type &&
                    deal.discount_value === tpl.discount_value
                  : deal.discount_type === tpl.discount_type;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  title={tpl.description}
                  onClick={() => {
                    setValue(
                      'deal.discount_type',
                      tpl.discount_type ?? 'percentage',
                      { shouldValidate: true },
                    );
                    // Same prefill as the dashboard dialog: a preset sets
                    // its value (5/10/15 or buy 1 get 1) and clears the
                    // fields the other arms don't use.
                    if (tpl.discount_type === 'bogo') {
                      setValue('deal.discount_value', null);
                      setValue('deal.bogo_buy', 1);
                      setValue('deal.bogo_get', 1);
                    } else if (tpl.discount_type === 'free') {
                      setValue('deal.discount_value', null);
                      setValue('deal.bogo_buy', undefined);
                      setValue('deal.bogo_get', undefined);
                    } else if (tpl.discount_type) {
                      setValue('deal.discount_value', tpl.discount_value);
                      setValue('deal.bogo_buy', undefined);
                      setValue('deal.bogo_get', undefined);
                    }
                  }}
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

        {/* TYPE-SPECIFIC FIELDS — percentage/fixed take a value, BOGO takes
            buy/get quantities, FREE takes neither. */}
        {(deal.discount_type === 'percentage' ||
          deal.discount_type === 'fixed_amount') && (
          <div className="space-y-2">
            <Label htmlFor="deal-value">
              {deal.discount_type === 'percentage'
                ? 'How much (%)'
                : 'How much (₱)'}
            </Label>
            <Input
              id="deal-value"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={deal.discount_type === 'percentage' ? '20' : '50'}
              {...register('deal.discount_value', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
            {dealErrors?.discount_value?.message && (
              <FieldError>{dealErrors.discount_value.message}</FieldError>
            )}
          </div>
        )}

        {deal.discount_type === 'bogo' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-buy">Buy</Label>
              <Input
                id="deal-buy"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="1"
                {...register('deal.bogo_buy', {
                  setValueAs: (v) =>
                    v === '' || v == null ? undefined : Number(v),
                })}
              />
              {dealErrors?.bogo_buy?.message && (
                <FieldError>{dealErrors.bogo_buy.message}</FieldError>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-get">Get (free)</Label>
              <Input
                id="deal-get"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="1"
                {...register('deal.bogo_get', {
                  setValueAs: (v) =>
                    v === '' || v == null ? undefined : Number(v),
                })}
              />
              {dealErrors?.bogo_get?.message && (
                <FieldError>{dealErrors.bogo_get.message}</FieldError>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="deal-description">Description (optional)</Label>
          <Textarea
            id="deal-description"
            {...register('deal.description')}
            placeholder={`e.g. 20% off any ${vocabulary.singular.toLowerCase()} for our opening week`}
            className="resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal-duration">Runs for</Label>
          <Select
            value={String(deal.duration_days)}
            onValueChange={(value) =>
              setValue('deal.duration_days', Number(value), {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="deal-duration" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 🔴 The one control here that costs money. Unticked by default: a
            published coupon inside its window reaches the app's Deals feed and
            is immediately redeemable — a real cashier code and a real
            notification, for a discount nobody re-read. The copy says what
            each choice means rather than naming a status the owner has no
            reason to know. */}
        <div className="bg-muted/40 flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            id="deal-publish"
            checked={deal.publish}
            onCheckedChange={(checked) =>
              setValue('deal.publish', checked === true, {
                shouldValidate: true,
              })
            }
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="deal-publish" className="font-medium">
              Make it live as soon as my shop is
            </Label>
            <p className="text-muted-foreground text-sm">
              Leave this unticked and the deal is saved as a draft — nobody can
              redeem it until you publish it from your dashboard.
            </p>
          </div>
        </div>

        {/* Optional, and last, for the same reason as the offering photo: it
            must never stand between the owner and the fields that decide what
            the deal actually is. Falls back to the shop's own logo and
            interior photo when absent, which is what every deal card showed
            before `coupons.image_url` existed. */}
        <div className="space-y-2">
          <Label>Photo (optional)</Label>
          <div className="relative min-h-32">
            <ImageUploadField
              onChange={(image) =>
                offeringImages.set(
                  deal.uid,
                  image instanceof File ? image : null,
                )
              }
              maxSizeBytes={MAX_FILE_SIZE}
              maxSizeLabel="2 MB"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            // Drop the photo with the deal, or its blob outlives the thing it
            // belonged to.
            if (deal.uid) offeringImages.remove(deal.uid);
            setValue('deal', null, { shouldValidate: true });
          }}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Remove this deal
        </Button>
      </div>
    </div>
  );
}
