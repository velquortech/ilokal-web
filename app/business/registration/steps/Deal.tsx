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

/** Windows an owner actually thinks in. Days, because the DB stores a date. */
const DURATION_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
];

const EMPTY_DEAL = {
  code: '',
  description: '',
  discount_type: 'percentage' as const,
  discount_value: null as unknown as number,
  duration_days: 30,
  // 🔴 Draft. See registrationDealSchema — publishing makes the coupon
  // immediately redeemable by a stranger.
  publish: false,
};

/**
 * The optional launch deal.
 *
 * Optional on purpose, and the ordering is the argument: a shop with no menu
 * has nothing to discount, which is why the menu step is required and this one
 * is not. It is also the only step in the wizard that can cost the owner real
 * money, so nothing here is filled in on their behalf.
 */
export function ShopDeal() {
  const { form, vocabulary } = useMultiStepForm();
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;

  const deal = useWatch({ control, name: 'deal' });
  const isAdding = deal !== null && deal !== undefined;
  const dealErrors = errors.deal as
    | Partial<Record<keyof typeof EMPTY_DEAL, { message?: string }>>
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

        <div className="border-border flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No deal yet. Continue to finish registering, or add one now.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue('deal', EMPTY_DEAL, { shouldValidate: true })
            }
          >
            <BadgePercent className="mr-1 h-4 w-4" />
            Add a launch deal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-7">
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

      <div className="space-y-4 rounded-lg border p-5">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deal-type">Discount</Label>
            <Select
              value={deal.discount_type}
              onValueChange={(value) =>
                setValue(
                  'deal.discount_type',
                  value as 'percentage' | 'fixed_amount',
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger id="deal-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage off</SelectItem>
                <SelectItem value="fixed_amount">Peso amount off</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
        </div>

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

        <Button
          type="button"
          variant="ghost"
          onClick={() => setValue('deal', null, { shouldValidate: true })}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Remove this deal
        </Button>
      </div>
    </div>
  );
}
