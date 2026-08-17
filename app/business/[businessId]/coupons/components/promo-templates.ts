import type { Coupon, CreateCouponRequest, DiscountValue } from '@/lib/types';
import { isoToManilaInput, manilaInputToIso } from '@/lib/utils/eventSchedule';
import type {
  PromoFormValues,
  PromoTemplateId,
} from '@/lib/validation/promoForm';

/**
 * The preset chips that head the promo dialog. Selecting one prefills the
 * discount fields and suggests a code; the owner keeps control of everything.
 * `discount_type: null` marks the "custom" chip — build from scratch.
 */
export interface PromoTemplate {
  id: 'pct5' | 'pct10' | 'pct15' | 'fixed' | 'free' | 'bogo' | 'custom';
  label: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free' | 'bogo' | null;
  /** The value to prefill for percentage/fixed, null otherwise. */
  discount_value: number | null;
  /** Suggested code when this preset is picked (owner can edit). */
  suggest: string;
}

export const PROMO_TEMPLATES: PromoTemplate[] = [
  {
    id: 'pct5',
    label: '5% off',
    description: 'Five percent off the total',
    discount_type: 'percentage',
    discount_value: 5,
    suggest: '5OFF',
  },
  {
    id: 'pct10',
    label: '10% off',
    description: 'Ten percent off the total',
    discount_type: 'percentage',
    discount_value: 10,
    suggest: '10OFF',
  },
  {
    id: 'pct15',
    label: '15% off',
    description: 'Fifteen percent off the total',
    discount_type: 'percentage',
    discount_value: 15,
    suggest: '15OFF',
  },
  {
    id: 'fixed',
    label: '₱ off',
    description: 'A fixed peso amount off',
    discount_type: 'fixed_amount',
    discount_value: null,
    suggest: 'PESO',
  },
  {
    id: 'free',
    label: 'FREE',
    description: 'A free item or offer — no payment needed',
    discount_type: 'free',
    discount_value: null,
    suggest: 'FREE',
  },
  {
    id: 'bogo',
    label: 'Buy 1 Take 1',
    description: 'Buy some, get some free',
    discount_type: 'bogo',
    discount_value: null,
    suggest: 'B1T1',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Build the promo from scratch',
    discount_type: null,
    discount_value: null,
    suggest: '',
  },
];

export function getPromoTemplate(
  id: PromoTemplate['id'],
): PromoTemplate | undefined {
  return PROMO_TEMPLATES.find((t) => t.id === id);
}

/**
 * A `datetime-local` string `offsetMs` from now, as MANILA wall-clock.
 *
 * A `datetime-local` value carries no zone, so it must be read and written in
 * one fixed zone or an owner abroad schedules a different instant than the one
 * they read — the same rule events and the sale dialog follow (eventSchedule).
 */
export function localDatetime(offsetMs: number): string {
  return isoToManilaInput(new Date(Date.now() + offsetMs).toISOString());
}

/** Default expiry for a preset: 30 days out. */
export const DEFAULT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The pure part of picking a template: what changes in the form, and the code
 * to suggest next. The dialog applies each returned key via `setValue`; a
 * second copy of this in the component would drift the moment a preset is
 * added or renamed.
 *
 * `current` is what the owner already typed (the code gets overwritten only
 * while it is empty or still the previous suggestion, so a hand-typed code is
 * never clobbered; dates default only when still untouched).
 */
export function templateChanges(
  tpl: PromoTemplate,
  current: Pick<PromoFormValues, 'code' | 'start_date' | 'expiry_date'>,
  lastSuggestedCode: string,
): { updates: Partial<PromoFormValues>; nextSuggestion: string } {
  const updates: Partial<PromoFormValues> = {};
  let nextSuggestion = lastSuggestedCode;

  // Custom leaves every field alone — the whole point is full control.
  if (tpl.id === 'custom') return { updates, nextSuggestion };

  if (tpl.discount_type) updates.discount_type = tpl.discount_type;

  // Set the fields the selected type uses and clear the ones it does not, so
  // switching 10% → BOGO can't leave a stray value behind.
  if (tpl.discount_type === 'bogo') {
    updates.discount_value = undefined;
    updates.bogo_buy = 1;
    updates.bogo_get = 1;
  } else if (tpl.discount_type === 'free') {
    updates.discount_value = undefined;
    updates.bogo_buy = undefined;
    updates.bogo_get = undefined;
  } else if (tpl.discount_type) {
    // percentage / fixed_amount
    updates.discount_value = tpl.discount_value ?? undefined;
    updates.bogo_buy = undefined;
    updates.bogo_get = undefined;
  }

  if (tpl.suggest && (!current.code || current.code === lastSuggestedCode)) {
    updates.code = tpl.suggest;
    nextSuggestion = tpl.suggest;
  }
  if (!current.start_date) updates.start_date = localDatetime(0);
  if (!current.expiry_date)
    updates.expiry_date = localDatetime(DEFAULT_EXPIRY_MS);

  return { updates, nextSuggestion };
}

/**
 * Which preset chip an existing discount maps to (edit prefill). Exact matches
 * only — a 7% discount is "Custom", not a mislabeled "5% off" chip.
 */
export function templateForDiscount(
  discount: DiscountValue | null,
): PromoTemplateId {
  if (!discount) return 'custom';
  const match = PROMO_TEMPLATES.find((t) => {
    if (t.id === 'custom' || t.discount_type === null) return false;
    if (t.discount_type !== discount.type) return false;
    if (
      t.discount_type === 'percentage' ||
      t.discount_type === 'fixed_amount'
    ) {
      return t.discount_value === discount.value;
    }
    return true; // free / bogo chips match by type
  });
  return (match?.id as PromoTemplateId) ?? 'custom';
}

/**
 * Flat form values for a fresh dialog, or prefilled from an existing coupon
 * (edit / duplicate-as-draft). Dates default to now→+30 days so a preset
 * never needs them to be legal.
 */
export function promoDefaults(initial?: Coupon | null): PromoFormValues {
  if (!initial) {
    return {
      promotion_type: 'coupon',
      status: 'draft',
      template: 'custom',
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: undefined,
      bogo_buy: undefined,
      bogo_get: undefined,
      usage_scope: 'any',
      scope_values: [],
      start_date: localDatetime(0),
      expiry_date: localDatetime(DEFAULT_EXPIRY_MS),
      max_redemptions_global: '',
      max_redemptions_per_user: '',
    };
  }

  const d = initial.discount;
  let discount_type: PromoFormValues['discount_type'] = 'percentage';
  let discount_value: number | undefined;
  let bogo_buy: number | undefined;
  let bogo_get: number | undefined;
  if (d) {
    discount_type = d.type;
    if (d.type === 'percentage' || d.type === 'fixed_amount') {
      discount_value = d.value;
    } else if (d.type === 'bogo') {
      bogo_buy = d.buy;
      bogo_get = d.get;
    }
  }

  return {
    promotion_type: initial.promotion_type ?? 'coupon',
    status: initial.status ?? 'draft',
    template: templateForDiscount(d),
    code: initial.code,
    description: initial.description ?? '',
    discount_type,
    discount_value,
    bogo_buy,
    bogo_get,
    usage_scope: initial.usage_scope === 'any' ? 'any' : 'specific_products',
    scope_values: (initial.scope_values as string[] | undefined) ?? [],
    start_date: isoToManilaInput(initial.start_date),
    expiry_date: isoToManilaInput(initial.expiry_date),
    max_redemptions_global: initial.max_redemptions_global?.toString() ?? '',
    max_redemptions_per_user:
      initial.max_redemptions_per_user?.toString() ?? '',
  };
}

/**
 * Turn the dialog's flat form values into the stored `DiscountValue` union.
 * The schema guarantees the fields exist for each type (percentage/fixed
 * carry `discount_value`, bogo carries buy/get) — the non-null assertions
 * only discharge what validation already proved.
 */
export function buildDiscount(values: PromoFormValues): DiscountValue {
  switch (values.discount_type) {
    case 'percentage':
      return { type: 'percentage', value: values.discount_value! };
    case 'fixed_amount':
      return { type: 'fixed_amount', value: values.discount_value! };
    case 'free':
      return { type: 'free', value: null };
    case 'bogo':
      return {
        type: 'bogo',
        buy: values.bogo_buy!,
        get: values.bogo_get!,
        value: null,
      };
  }
}

/** A short human label for the flat form values (the dialog's preview line). */
export function flatDiscountLabel(values: PromoFormValues): string {
  switch (values.discount_type) {
    case 'percentage':
      return `${values.discount_value ?? 0}% off`;
    case 'fixed_amount':
      return `₱${values.discount_value ?? 0} off`;
    case 'free':
      return 'FREE';
    case 'bogo':
      return `Buy ${values.bogo_buy ?? 1} Get ${values.bogo_get ?? 1} FREE`;
  }
}

/**
 * The API request the dialog's flat values become. Shared by create and
 * update so the two call sites cannot drift (dates → ISO, caps → ints,
 * flat discount → the stored union, code uppercased).
 */
export function buildPromoRequest(
  values: PromoFormValues,
  opts: { imageUrl?: string; branchId?: string | null } = {},
): CreateCouponRequest {
  return {
    promotion_type: values.promotion_type,
    status: values.status,
    code: values.code.trim().toUpperCase(),
    description: values.description?.trim() || undefined,
    discount: buildDiscount(values),
    usage_scope: values.usage_scope,
    scope_values: values.scope_values?.length ? values.scope_values : undefined,
    // A `datetime-local` value has no zone; read it as Manila so the instant
    // stored round-trips to the same wall-clock the owner typed. `?? ''` only
    // fires on an unparseable value, which the schema rejects anyway.
    start_date: manilaInputToIso(values.start_date) ?? '',
    expiry_date: manilaInputToIso(values.expiry_date) ?? '',
    max_redemptions_global: values.max_redemptions_global
      ? parseInt(values.max_redemptions_global, 10)
      : undefined,
    max_redemptions_per_user: values.max_redemptions_per_user
      ? parseInt(values.max_redemptions_per_user, 10)
      : undefined,
    image_url: opts.imageUrl ?? null,
    branch_id: opts.branchId ?? null,
  };
}
