import {
  resolveEventMedia,
  type StorageClient,
} from '@/app/api/helpers/eventMedia';
import type {
  EventBusinessRef,
  EventProductRef,
  MobileEventWithRefs,
} from '@/lib/types';

/**
 * The mobile events read contract — one column list and one normaliser, shared
 * by `GET /api/mobile/events`, `/:id` and `/nearby`.
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
 * The list is exactly `MobileEventWithRefs`, which is `EventWithRefs` minus
 * the review trio, `priority` and `location`. `latitude`/`longitude` ARE
 * included: they are the DB's generated read-only projections of `location`,
 * which is what makes the point usable to a client (PostgREST hands
 * `location` itself back as WKB hex).
 *
 * `status` is included even though every route filters to `approved` —
 * mobile's schema declares it a required key, and a required key that is
 * merely always the same value still has to be present.
 *
 * ── Why the product embed selects `status` ──────────────────────────────────
 *
 * Products RLS (`20260526000007`) gates only `archived_at` and the shop being
 * verified — NOT `products.status`. So an offering the owner later set to
 * `unlisted` or `disabled` is still readable by anon, and embedding it
 * unfiltered would republish, on the event, an offering the shop has taken
 * down. Every other public product read filters `status = 'active'`
 * (`productQuery.getPublicMenu`, the mobile products route); this one has to
 * as well. `status` is projected so the normaliser can decide, and dropped
 * before the response — it is not part of the mobile product contract.
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
  product:products ( id, name, image_url, status )
`;

/**
 * The promoted offering as SELECTED — carries `status` so the gate below can
 * read it. Deliberately wider than `EventProductRef`, which is what is
 * actually returned.
 */
type ProductEmbed = EventProductRef & { status: string };

/**
 * A row as it arrives. The embeds are typed as "one or many" because PostgREST
 * returns a to-one embed as an ARRAY — modelling that here is what lets
 * `normaliseMobileEvent` declare a real return type instead of
 * `Record<string, unknown>`.
 */
export type MobileEventRow = Omit<
  MobileEventWithRefs,
  'business' | 'product'
> & {
  business: EventBusinessRef | EventBusinessRef[] | null;
  product: ProductEmbed | ProductEmbed[] | null;
};

/**
 * Shape one row for a mobile client.
 *
 * The return type is `MobileEventWithRefs` rather than an open record, so a
 * projection that drifts from the contract is a COMPILE error at every call
 * site rather than something only the contract test notices.
 */
export function normaliseMobileEvent(
  supabase: StorageClient,
  row: MobileEventRow,
): MobileEventWithRefs {
  const { image_url, business, product } = resolveEventMedia<
    EventBusinessRef,
    ProductEmbed
  >(supabase, row);

  // An offering the shop has unlisted or disabled is not promoted, and its
  // `status` never reaches the client — mobile's product schema is
  // `{ id, name, image_url }`, and returning a field the contract does not
  // declare is how the next reader starts depending on it.
  const publicProduct: EventProductRef | null =
    product && product.status === 'active'
      ? { id: product.id, name: product.name, image_url: product.image_url }
      : null;

  return {
    ...row,
    image_url,
    business,
    product: publicProduct,
  };
}
