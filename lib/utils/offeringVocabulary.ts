/**
 * Offering vocabulary resolver.
 *
 * Turns `business_types.offering_profile` + `businesses.offering_mode` into a
 * complete, always-renderable label set. A salon reads "Service Menu / Add
 * Service"; a café reads "Menu / Add Menu Item"; a van rental under a
 * "Transport & Rental" type reads "Our Fleet / Add Vehicle" — all from data.
 *
 * Pure: no React, no Supabase. The server resolves it once per request and
 * hands the result to the client provider, so this runs on both sides.
 *
 * FALLBACK CONTRACT (the reason this file exists rather than inlining lookups):
 * a NULL, malformed, partially-filled, or wrong-typed profile must degrade to
 * exactly today's retail copy — never to `undefined`, never to a blank
 * heading. `offering_profile` is admin-editable JSON; a typo in Studio can
 * reach production, and it must not be able to blank a page.
 */

import {
  BOOKING_MODES,
  OFFERING_ATTRIBUTE_FIELDS,
  defaultKindForMode,
  type BookingMode,
  type OfferingAttributeField,
  type OfferingKind,
  type OfferingMode,
  type OfferingNouns,
  type OfferingProfile,
  type OfferingVocabulary,
} from '@/lib/types/offering';
import { PRICE_TYPES } from '@/lib/types/product';

/** Exactly the copy every surface used before phase 2. */
export const DEFAULT_OFFERING_NOUNS: Required<OfferingNouns> = {
  singular: 'Product',
  plural: 'Products',
  catalogue: 'Product Catalogue',
  shopLabel: 'My Shop',
  dealsLabel: 'Coupons & Deals',
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Narrow one mode's noun set out of untrusted JSON. Anything that isn't a
 * usable string is dropped so the caller's default wins per-field — a profile
 * that defines only `catalogue` still gets sane singular/plural.
 */
function readNouns(value: unknown): OfferingNouns {
  if (typeof value !== 'object' || value === null) return {};
  const raw = value as Record<string, unknown>;
  const nouns: OfferingNouns = {};
  if (isNonEmptyString(raw.singular)) nouns.singular = raw.singular.trim();
  if (isNonEmptyString(raw.plural)) nouns.plural = raw.plural.trim();
  if (isNonEmptyString(raw.catalogue)) nouns.catalogue = raw.catalogue.trim();
  if (isNonEmptyString(raw.shopLabel)) nouns.shopLabel = raw.shopLabel.trim();
  if (isNonEmptyString(raw.dealsLabel))
    nouns.dealsLabel = raw.dealsLabel.trim();
  return nouns;
}

/**
 * Build the full vocabulary from a noun set. Derived labels are computed here
 * so a vertical cannot half-define itself.
 */
function deriveVocabulary(
  nouns: Required<OfferingNouns>,
  icon?: string,
  policy?: Partial<
    Pick<
      OfferingVocabulary,
      | 'fields'
      | 'allowedPriceTypes'
      | 'defaultBookingMode'
      | 'defaultKind'
      | 'allowedKinds'
    >
  >,
): OfferingVocabulary {
  const { singular, plural, catalogue, shopLabel, dealsLabel } = nouns;
  return {
    singular,
    plural,
    catalogue,
    shopLabel,
    dealsLabel,
    addLabel: `Add ${singular}`,
    updateLabel: `Update ${singular}`,
    saveLabel: `Save ${singular}`,
    nameRequiredLabel: `${singular} name is required`,
    imageLabel: `${singular} Photo`,
    totalLabel: `Total ${plural}`,
    emptyLabel: `No ${plural.toLowerCase()} yet`,
    // Retail defaults: no service fields, every price type, no booking.
    fields: policy?.fields ?? [],
    allowedPriceTypes: policy?.allowedPriceTypes ?? [...PRICE_TYPES],
    defaultBookingMode: policy?.defaultBookingMode ?? 'none',
    defaultKind: policy?.defaultKind ?? 'product',
    // A products-only business has nothing to toggle between; the picker
    // needs no kind axis until a 'both' shop is editing.
    allowedKinds: policy?.allowedKinds ?? (['product'] as OfferingKind[]),
    ...(icon ? { icon } : {}),
  };
}

/** Narrow `fields` out of untrusted JSON, dropping anything unrecognized. */
function readFields(value: unknown): OfferingAttributeField[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields = value.filter((f): f is OfferingAttributeField =>
    (OFFERING_ATTRIBUTE_FIELDS as readonly string[]).includes(f as string),
  );
  return fields.length ? fields : undefined;
}

/**
 * Narrow `allowed_price_types`. An empty or fully-invalid list would leave the
 * picker with nothing to choose, so it falls back to all of them.
 */
function readAllowedPriceTypes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const types = value.filter(
    (t): t is string =>
      typeof t === 'string' && (PRICE_TYPES as readonly string[]).includes(t),
  );
  return types.length ? types : undefined;
}

function readBookingMode(value: unknown): BookingMode | undefined {
  return typeof value === 'string' &&
    (BOOKING_MODES as readonly string[]).includes(value)
    ? (value as BookingMode)
    : undefined;
}

/** The vocabulary rendered when there is no usable profile at all. */
export const DEFAULT_OFFERING_VOCABULARY: OfferingVocabulary = deriveVocabulary(
  DEFAULT_OFFERING_NOUNS,
);

/**
 * Resolve the vocabulary for one business.
 *
 * `profile` is whatever came out of the JSONB column — typed as `unknown`
 * deliberately, because the DB cannot guarantee its shape.
 */
export function resolveOfferingVocabulary(
  profile: unknown,
  mode: OfferingMode | string | null | undefined,
): OfferingVocabulary {
  if (typeof profile !== 'object' || profile === null) {
    return DEFAULT_OFFERING_VOCABULARY;
  }

  const raw = profile as OfferingProfile & Record<string, unknown>;

  // An unknown mode falls back to 'products' — the retail reading, which is
  // what every business rendered as before phase 1.
  const key: keyof OfferingProfile =
    mode === 'services' || mode === 'both' ? mode : 'products';

  const nouns = readNouns(raw[key]);
  const icon = isNonEmptyString(raw.icon) ? raw.icon.trim() : undefined;

  return deriveVocabulary(
    {
      singular: nouns.singular ?? DEFAULT_OFFERING_NOUNS.singular,
      plural: nouns.plural ?? DEFAULT_OFFERING_NOUNS.plural,
      catalogue: nouns.catalogue ?? DEFAULT_OFFERING_NOUNS.catalogue,
      shopLabel: nouns.shopLabel ?? DEFAULT_OFFERING_NOUNS.shopLabel,
      dealsLabel: nouns.dealsLabel ?? DEFAULT_OFFERING_NOUNS.dealsLabel,
    },
    icon,
    {
      // Field policy is profile-level, not per-mode: which attributes a
      // vertical needs doesn't change when a salon starts selling shampoo.
      fields: readFields(raw.fields),
      allowedPriceTypes: readAllowedPriceTypes(raw.allowed_price_types),
      defaultBookingMode: readBookingMode(raw.default_booking_mode),
      // Derived from the mode, not the profile — a services business creates
      // services. Without this the form would keep writing kind='product' and
      // the phase-1 backfill would decay on every new row.
      defaultKind: defaultKindForMode(key === 'both' ? 'both' : key),
      // Same axis as defaultKind: single-mode shops offer one kind, 'both'
      // offers both so the form can ask which one this item is.
      allowedKinds:
        key === 'both'
          ? (['product', 'service'] as OfferingKind[])
          : key === 'services'
            ? (['service'] as OfferingKind[])
            : (['product'] as OfferingKind[]),
    },
  );
}
