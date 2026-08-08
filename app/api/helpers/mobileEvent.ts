import { resolveStorageUrl } from '@/app/api/helpers/storage';

/**
 * The mobile events read contract — one column list and one normaliser, shared
 * by `GET /api/mobile/events` and `GET /api/mobile/events/:id`.
 *
 * ── Why an explicit column list, not `*` ────────────────────────────────────
 *
 * RLS is ROW-level. The public policy on `events` decides which rows an
 * anonymous caller may read; it says nothing about which COLUMNS come back.
 * `select('*')` therefore ships `review_note` (the admin's rejection text),
 * `reviewed_by` (an `auth.users` id), `reviewed_at`, `priority` and the raw
 * WKB `location` to every unauthenticated mobile client.
 *
 * Nothing breaks visibly, which is what makes it durable: the mobile Zod
 * schemas (`schemas/events.ts`) are plain `z.object()`, so unknown keys are
 * STRIPPED rather than rejected — the extra columns arrive, get dropped, and
 * no one ever sees a symptom.
 *
 * So the column list is the contract, the same reasoning that made
 * `get_business_public_info` (20260727000006) and `public_feature_flags`
 * (20260802034107) functions with fixed return lists instead of broad SELECT
 * grants: a column added to `events` later stays private by default. Unlike
 * those, this one needs no migration — the gate is the projection.
 *
 * The list is exactly `MobileEventWithRefs` (mobile `types/events.ts`), which
 * is `EventWithRefs` (lib/types/event.ts) minus the review trio, `priority`
 * and `location`. `latitude`/`longitude` ARE included: they are the DB's
 * generated read-only projections of `location`, which is what makes the point
 * usable to a client (PostgREST hands `location` itself back as WKB hex).
 *
 * `status` is included even though both routes filter to `approved` — mobile's
 * schema declares it a required key, and a required key that is merely always
 * the same value still has to be present.
 */
export const MOBILE_EVENT_SELECT = `
  id,
  business_id,
  product_id,
  name,
  description,
  address,
  latitude,
  longitude,
  image_url,
  starts_at,
  ends_at,
  daily_start_time,
  daily_end_time,
  link_url,
  ticket_url,
  status,
  created_at,
  updated_at,
  archived_at,
  business:businesses ( id, shop_name, logo_url ),
  product:products ( id, name, image_url )
`;

/** A row as it arrives, before the embeds are unwrapped. */
export type MobileEventRow = Record<string, unknown> & {
  business?: unknown;
  product?: unknown;
};

type StorageClient = Parameters<typeof resolveStorageUrl>[0];

/**
 * PostgREST returns a to-one embed as an ARRAY. Reading `.shop_name` off it
 * yields `undefined`, which renders as a shop with no name — so every read
 * unwraps first.
 */
function firstOrNull<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

/**
 * Shape one row for a mobile client: unwrap the two to-one embeds and resolve
 * every stored image path to a URL.
 *
 * The resolution is not optional. Seeds store full public URLs while real
 * uploads store raw in-bucket paths, so handing back the stored value
 * unchanged yields a broken image for exactly the events real users created —
 * the standing mobile-route rule in CLAUDE.md.
 */
export function normaliseMobileEvent(
  supabase: StorageClient,
  row: MobileEventRow,
): Record<string, unknown> {
  const business = firstOrNull<Record<string, unknown>>(row.business);
  const product = firstOrNull<Record<string, unknown>>(row.product);

  return {
    ...row,
    business: business
      ? {
          ...business,
          logo_url: resolveStorageUrl(
            supabase,
            'shop-logos',
            (business.logo_url as string | null) ?? null,
          ),
        }
      : null,
    product: product
      ? {
          ...product,
          image_url: resolveStorageUrl(
            supabase,
            'product-images',
            (product.image_url as string | null) ?? null,
          ),
        }
      : null,
    image_url: resolveStorageUrl(
      supabase,
      'event-images',
      (row.image_url as string | null) ?? null,
    ),
  };
}
