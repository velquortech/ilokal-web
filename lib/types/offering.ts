/**
 * Offering Domain Types
 *
 * The `products` table backs every kind of thing a business lists — retail
 * goods, salon services, van rentals, tours. These two discriminators
 * (migration `20260727000000`) are what tell them apart. See
 * `.claude/OFFERINGS_MODEL.md` for the full model.
 */

/**
 * Ground truth for a single offering row (`products.kind`). Queries and
 * filters use this.
 *
 * Deliberately coarse: HOW an offering transacts (walk-in, inquiry,
 * appointment, date-range rental) is a separate axis — `booking_mode`, added
 * in phase 3 — which is what keeps this from sprawling into
 * `product | service | rental | room | tour | …`.
 */
export type OfferingKind = 'product' | 'service';

export const OFFERING_KINDS: readonly OfferingKind[] = [
  'product',
  'service',
] as const;

/**
 * A business's declared intent (`businesses.offering_mode`). Drives catalogue
 * vocabulary, which form fields render, and the explore filter — NOT queries.
 *
 * `'both'` is not an edge case: a salon sells shampoo, a cafe rents its
 * function room, a B&B sells rooms and breakfast.
 *
 * Stored, never derived by scanning `products` — a business with no rows yet
 * would otherwise be "unknown", and deriving it costs a scan on every render.
 */
export type OfferingMode = 'products' | 'services' | 'both';

export const OFFERING_MODES: readonly OfferingMode[] = [
  'products',
  'services',
  'both',
] as const;

/**
 * How an offering transacts — the second axis, kept separate from
 * `OfferingKind` on purpose (D3). A haircut and a van hire are both
 * `kind: 'service'`, but their availability math differs completely.
 *
 * - `none`       — walk in, or just buy it (retail, menu items)
 * - `inquiry`    — call/message, no structured slot (repairs, quotes)
 * - `request`    — customer proposes a time, owner confirms (catering, events)
 * - `timeslot`   — a duration against a provider (salon, clinic)
 * - `date_range` — whole days against unit stock (van rental, rooms)
 *
 * Phase 3 stores and displays this; phase 4's `booking_requests` acts on it.
 */
export type BookingMode =
  | 'none'
  | 'inquiry'
  | 'request'
  | 'timeslot'
  | 'date_range';

export const BOOKING_MODES: readonly BookingMode[] = [
  'none',
  'inquiry',
  'request',
  'timeslot',
  'date_range',
] as const;

/** Where the offering is delivered. */
export type ServiceLocation = 'at_business' | 'at_customer' | 'both';

export const SERVICE_LOCATIONS: readonly ServiceLocation[] = [
  'at_business',
  'at_customer',
  'both',
] as const;

/**
 * Service/rental attributes on a `products` row (migration
 * `20260727000003`). All optional — a retail product carries none of them.
 */
export type OfferingAttributes = {
  booking_mode: BookingMode;
  /** Appointment length. */
  duration_minutes: number | null;
  /** Minimum notice before a booking may start. */
  lead_time_minutes: number | null;
  /** Concurrently bookable units (3 vans). NOT `capacity`. */
  inventory_count: number | null;
  /** People one unit holds (12-seater van). NOT a concurrency limit. */
  capacity: number | null;
  /** Displayed only — never collected in-app. */
  deposit_amount: number | null;
  /** Booking-length bounds, in the unit implied by `price_type`. */
  min_duration_units: number | null;
  max_duration_units: number | null;
  service_location: ServiceLocation;
};

/**
 * Mirrors the DB column defaults from `20260727000003`. Use it to complete a
 * row shape (fixtures, demo data, optimistic UI) — a retail product carries
 * exactly these.
 */
export const DEFAULT_OFFERING_ATTRIBUTES: OfferingAttributes = {
  booking_mode: 'none',
  duration_minutes: null,
  lead_time_minutes: null,
  inventory_count: null,
  capacity: null,
  deposit_amount: null,
  min_duration_units: null,
  max_duration_units: null,
  service_location: 'at_business',
};

/** The attribute keys a profile may ask the form to render. */
export const OFFERING_ATTRIBUTE_FIELDS = [
  'duration_minutes',
  'lead_time_minutes',
  'inventory_count',
  'capacity',
  'deposit_amount',
  'min_duration_units',
  'max_duration_units',
  'service_location',
] as const;

export type OfferingAttributeField = (typeof OFFERING_ATTRIBUTE_FIELDS)[number];

/**
 * One mode's noun set, as stored in `business_types.offering_profile`.
 * Every field is optional on the wire — the resolver fills gaps from the
 * retail default rather than rendering `undefined`.
 */
export type OfferingNouns = {
  /** "Service", "Menu Item", "Vehicle" */
  singular?: string;
  /** "Services", "Menu Items", "Fleet" */
  plural?: string;
  /** Page/nav heading: "Service Menu", "Menu", "Our Fleet" */
  catalogue?: string;
  /**
   * Sidebar entry for the owner's storefront. Universal default "My Shop" —
   * only a vertical that genuinely renames the storefront (e.g. "My Fleet")
   * should define it. Part of the nav pass so the one label that varies per
   * vertical can be data-driven like `catalogue`.
   */
  shopLabel?: string;
  /**
   * Sidebar entry for promos. Universal default "Coupons & Deals" — kept in
   * the vocabulary for the same reason as `shopLabel`: nav copy that could
   * vary per vertical should not be hardcoded in the nav config.
   */
  dealsLabel?: string;
};

/**
 * `business_types.offering_profile` — vocabulary keyed by the business's
 * `offering_mode`, so a mixed business gets its own wording instead of a
 * concatenation guess. Presentation only; never schema or validation (D4).
 */
export type OfferingProfile = {
  products?: OfferingNouns;
  services?: OfferingNouns;
  both?: OfferingNouns;
  /** lucide icon name, for the nav entry. */
  icon?: string;
  /** Which service attributes the add/edit form renders. */
  fields?: OfferingAttributeField[];
  /** Which price types the picker offers. Absent ⇒ all of them. */
  allowed_price_types?: string[];
  /** Preselected booking mode for a new offering. */
  default_booking_mode?: BookingMode;
};

/**
 * The resolved, always-complete vocabulary a surface renders. Derived labels
 * are computed rather than stored so the JSON stays small and a vertical can't
 * half-define itself ("Add Service" but "Update Product").
 */
export type OfferingVocabulary = {
  singular: string;
  plural: string;
  catalogue: string;
  /** Sidebar entry for the owner's storefront ("My Shop"). */
  shopLabel: string;
  /** Sidebar entry for promos ("Coupons & Deals"). */
  dealsLabel: string;
  /** "Add Service" */
  addLabel: string;
  /** "Update Service" */
  updateLabel: string;
  /** "Save Service" */
  saveLabel: string;
  /** "Service name is required" */
  nameRequiredLabel: string;
  /** "Service Photo" */
  imageLabel: string;
  /** "Total Services" */
  totalLabel: string;
  /** "No services yet" */
  emptyLabel: string;
  icon?: string;
  /**
   * Field policy resolved alongside the words — which typed service columns
   * the form renders, which price types it offers, and what a new offering
   * starts as. Still presentation only (D4): never schema, never validation.
   */
  fields: OfferingAttributeField[];
  /** Non-empty; falls back to every price type when the profile says nothing. */
  allowedPriceTypes: string[];
  defaultBookingMode: BookingMode;
  /**
   * What a NEW offering should be created as, from the business's
   * `offering_mode`. The form sends this explicitly — the DB cannot infer it,
   * because it can't tell "field omitted" from "explicitly 'product'".
   */
  defaultKind: OfferingKind;
  /**
   * The kinds this business may add. One entry for a single-mode shop
   * (products-only or services-only); both for a 'both' shop, which is where
   * the form must ASK rather than guess (see `defaultKindForMode`). Drives the
   * kind toggle and, through it, which categories the picker offers.
   */
  allowedKinds: OfferingKind[];
};

/** Whether a business in this mode lists services at all. */
export function modeAllowsServices(mode: OfferingMode): boolean {
  return mode === 'services' || mode === 'both';
}

/** Whether a business in this mode lists retail products at all. */
export function modeAllowsProducts(mode: OfferingMode): boolean {
  return mode === 'products' || mode === 'both';
}

/**
 * The `kind` a new offering should default to for a business in this mode.
 * `'both'` is genuinely ambiguous, so it falls back to `'product'` and the
 * form is expected to ask.
 */
export function defaultKindForMode(mode: OfferingMode): OfferingKind {
  return mode === 'services' ? 'service' : 'product';
}

/**
 * The `offering_mode` a business of this VERTICAL will be created with.
 *
 * ⚠️ Mirrors `sync_business_type_id()` (migration `20260727000000`), which
 * seeds the column from the vertical NAME on INSERT. The trigger is the
 * authority — this exists only for the registration wizard, which has to
 * resolve the shop's vocabulary BEFORE the row exists, so there is nothing to
 * read the real value from. Every other surface reads
 * `businesses.offering_mode` and must keep doing so.
 *
 * Keyed on the name because the trigger is keyed on the name; an admin
 * renaming a vertical breaks both together rather than silently diverging.
 * Anything unrecognised resolves to `'products'` — the column default, and
 * what the trigger leaves in place when its CASE does not match.
 */
export function offeringModeForVerticalName(
  name: string | null | undefined,
): OfferingMode {
  switch (name?.trim()) {
    case 'Services':
      return 'services';
    case 'Tourism & Leisure':
      return 'both';
    case 'Entertainment & Events':
      return 'both';
    case 'Health & Wellness':
      return 'services';
    case 'Education & Learning':
      return 'services';
    case 'Home & Property Services':
      return 'services';
    default:
      return 'products';
  }
}
