/**
 * Offering price formatting — the single source of truth for turning a
 * `products` row's price fields into display text.
 *
 * `products` is not a retail-only table: `price_type` has carried
 * `per_hour | per_day | per_person | per_event` since migration
 * `20260511000001`, plus a free-text `price_unit` override ("per pax",
 * "per table"). Every customer-facing surface rendered a bare `₱{price}`
 * and dropped both fields, so a ₱500/hr service read as a flat "₱500" and a
 * ₱3,500/day van rental as "₱3,500". See `.claude/OFFERINGS_MODEL.md` (G1).
 *
 * Pure — no React, no Supabase; usable from Server Components, Client
 * Components, and API routes (which need the string in the response payload
 * so older mobile clients get correct copy without a client release).
 */

import type { PriceType } from '@/lib/types';

/**
 * Suffix appended after the amount for each price type. `fixed` and `from`
 * carry no suffix — `from` expresses itself as a prefix instead.
 */
const PRICE_TYPE_SUFFIX: Record<PriceType, string> = {
  fixed: '',
  from: '',
  per_hour: '/hr',
  per_day: '/day',
  per_person: '/person',
  per_event: '/event',
  on_request: '',
};

const PRICE_TYPE_PREFIX: Partial<Record<PriceType, string>> = {
  from: 'From ',
};

/** Shown when an offering carries no price (quote-based; see Phase 3). */
export const PRICE_ON_REQUEST = 'Price on request';

export type OfferingPriceInput = {
  price: number | null | undefined;
  price_type?: PriceType | string | null;
  price_unit?: string | null;
};

/**
 * `₱1,234` — no forced decimals, matching every existing surface. Deliberately
 * not `phFormat` (`lib/helpers/currency.ts`), which renders `₱1,234.00` and
 * would visually change every product card in the app.
 */
export function formatPeso(value: number): string {
  return `₱${Number(value).toLocaleString('en-PH')}`;
}

function isPriceType(value: unknown): value is PriceType {
  return typeof value === 'string' && value in PRICE_TYPE_SUFFIX;
}

/**
 * Full display string for one price figure.
 *
 * ```
 * { price: 500,   price_type: 'per_hour' }                    → '₱500/hr'
 * { price: 12000, price_type: 'from' }                        → 'From ₱12,000'
 * { price: 350,   price_type: 'per_person' }                  → '₱350/person'
 * { price: 3500,  price_type: 'per_day' }                     → '₱3,500/day'
 * { price: 800,   price_type: 'per_event', price_unit: 'per table' }
 *                                                             → '₱800 per table'
 * { price: null }                                             → 'Price on request'
 * ```
 *
 * An unknown/absent `price_type` degrades to `fixed`, so a row written before
 * the column existed (or by a future value this build doesn't know) still
 * renders an amount rather than breaking.
 */
export function formatOfferingPrice(input: OfferingPriceInput): string {
  const { price, price_unit } = input;

  // `on_request` wins over any number still on the row. The DB CHECK only
  // requires a price for NON-quote types, so switching an existing offering to
  // quote-based leaves the old figure behind — showing it would quote a price
  // the business has withdrawn.
  if (input.price_type === 'on_request') return PRICE_ON_REQUEST;

  if (price == null || !Number.isFinite(Number(price))) {
    return PRICE_ON_REQUEST;
  }

  const priceType: PriceType = isPriceType(input.price_type)
    ? input.price_type
    : 'fixed';

  // The owner-supplied unit label wins over the enum's default suffix — it is
  // an explicit override ("per pax", "per table") and reads as its own phrase,
  // so it is space-separated rather than slash-joined.
  const unit = price_unit?.trim();
  const suffix = unit ? ` ${unit}` : PRICE_TYPE_SUFFIX[priceType];

  return `${PRICE_TYPE_PREFIX[priceType] ?? ''}${formatPeso(price)}${suffix}`;
}

/**
 * Sale-aware pair. `sale` is null when the offering isn't discounted, so
 * callers render `base` alone; when present, `base` is the struck-through
 * original. Both carry the same prefix/suffix, so "₱400/hr ₱500/hr" reads
 * correctly instead of "₱400 ₱500/hr".
 */
export function formatOfferingPricePair(
  input: OfferingPriceInput & { sale_price?: number | null },
): { base: string; sale: string | null } {
  const base = formatOfferingPrice(input);

  // A quote-based offering has nothing to discount — without this it would
  // render "Price on request" struck through beside "Price on request".
  const sale =
    input.price_type !== 'on_request' && input.sale_price != null
      ? formatOfferingPrice({ ...input, price: input.sale_price })
      : null;

  return { base, sale };
}
