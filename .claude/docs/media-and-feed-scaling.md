# Media & Feed Scaling

How three high-traffic mobile surfaces stay smooth as users, businesses, and
followers grow: **image storage**, the **deals feed**, and **notification
fan-out**. All three were reworked to push per-request cost off the Node/runtime
hot path and to bound work as the catalog/follower counts scale.

Quick map:

| Subsystem        | Code                                                                 | Migration / test |
| ---------------- | -------------------------------------------------------------------- | ---------------- |
| Image pipeline   | `lib/api/helpers/image.ts` + the upload routes/actions               | `lib/api/helpers/__tests__/image.test.ts` |
| Deals feed       | `app/api/mobile/deals/route.ts` + `mobile_deals` RPC                 | `supabase/migrations/20260630000000_mobile_deals_rpc.sql`, `supabase/tests/mobile_deals_and_outbox.test.sql` |
| Notifications    | `notify_followers` + `notification_outbox` + worker                  | `supabase/migrations/20260630000001_notification_outbox.sql`, same SQL test |

---

## 1. Image pipeline — WebP + resize on upload

**Problem.** We're on the **free Supabase plan**, which has no on-the-fly image
transformation. Uploads were stored at full resolution (and logos/interiors
weren't even transcoded), so a 2 MB phone photo was served full-size into an
80 px thumbnail — the main cause of scroll jank and wasted bandwidth on low-end
devices.

**Approach.** Convert + downscale **at write time**. Every display image is
re-encoded to WebP and capped to a per-role max edge before it's stored.

### `lib/api/helpers/image.ts`

- `IMAGE_PRESETS` — max edge (px) per role: `logo`/`avatar` 512, `product` 1200,
  `hero` 1600. Generous retina headroom over the largest on-screen use; cuts
  multi-MB originals to tens of KB.
- `convertToWebP(file, { maxDimension?, quality? })` — decodes any supported
  upload, optionally downscales (`fit: 'inside'`, **never enlarges**), re-encodes
  to WebP (default quality 80). Animated GIF/WebP keep all frames. **Always
  re-encodes** (no WebP passthrough) so the resize cap applies even to an
  already-WebP upload.
- `uploadWebP(supabase, bucket, path, file, { maxDimension, upsert? })` — the
  single convert → `contentType: 'image/webp'` → upload primitive. Use this at
  every call site so the content type and resize cap can't be forgotten. Returns
  the stored object path.
- `ImageProcessingError` — thrown by `uploadWebP` when a file that passed the
  MIME allowlist still can't be decoded (corrupt/truncated). **Callers map it to
  a 4xx**, not a 500 — it's a bad request, not a server fault. A storage error
  propagates raw so callers log it server-side and return a generic message
  (never leak the driver error — see `security.md`).

### Call sites (all converted)

Web routes `business-logo`, `business-interior`, `avatar`, `product-image`; the
mobile `me/avatar` route; the `productActions`/`branchActions` server actions;
and registration (`lib/api/business/business.ts`, logo/banner/interiors).
**Docs are intentionally not converted** — `verification-docs` and
`branch-documents` stay raw (legibility-sensitive; converting a PDF would corrupt
it).

### Notes

- Existing objects uploaded before this change are still full-size; they're
  replaced naturally on the owner's next edit. A one-time backfill could
  re-encode them but isn't required.
- If we ever move to a paid plan, on-the-fly transforms become available and the
  presets can shift from write-time variants to request-time `?width=` params —
  but write-time WebP is still worth keeping for storage cost.

---

## 2. Deals feed — classification in the DB (`mobile_deals` RPC)

**Problem.** `app/api/mobile/deals/route.ts` fetched up to 500 coupon rows with
nested business/subscription joins on **every request**, then did the whole
pipeline in Node — map → category filter → flash/explore split → featured pick →
`is_subscribed` sort → slice. That's CPU + a large join payload per request, paid
by every concurrent user, and the page bound never reached the database.

**Approach.** The `mobile_deals(p_category, p_search, p_page, p_per_page)` RPC
(`SECURITY DEFINER`, like `nearby_businesses`) computes everything in SQL and
returns a single JSONB matching the route's response shape. The DB returns only
`featured + flash + one explore page`; Node does **no** filtering/sorting.

### Response shape (unchanged contract)

```jsonc
{
  "featured": { …deal… } | null,      // most-redeemed non-flash deal
  "flash":   [ …deals… ],             // expiring ≤ 7 days, excl. featured
  "explore": [ …deals… ],             // page of non-flash, subscribed-first
  "explore_total": 93,
  "explore_page": 1,
  "explore_per_page": 5,
  "explore_has_more": true
}
```

### Key design points

- **Raw image paths.** The deal objects carry RAW `business_logo_url` /
  `business_image_url` storage paths; the route resolves them with
  `resolveStorageUrl` (keeps the env-specific storage base in app code, matching
  the `nearby` route). See `app/api/helpers/storage.ts`.
- **One projection.** The deal object is built once as a `deal_json` column in
  the `candidates` CTE (computed from a `candidates_raw` CTE so the
  `is_subscribed` EXISTS runs once per row). No positional-arg helper, so no
  transposition risk.
- **Deterministic paging.** Every ordering has a final `id` tiebreaker, so
  OFFSET/LIMIT can't repeat or skip a deal across page requests when rows tie on
  `(is_subscribed, current_redemptions, expiry_date)` — common at cold start.
- **Bounded.** `explore_total` is counted once and `explore_has_more` derived
  from it. Supporting index: `idx_coupons_live_feed`.
- **Behaviour-preserving** vs. the old route: same featured pick, category filter
  (unknown category → empty), search across description/code/shop_name,
  subscribed-first sort, and pagination meta. No mobile change required.

---

## 3. Notification fan-out — adaptive inline / async outbox

**Problem.** `notify_followers` ran one `INSERT…SELECT` over every follower
**inside the publishing transaction**. Fine at seed scale, but a business with a
large following would slow its own product/post/coupon writes — the dashboard
waits for N inserts before the publish commits.

**Approach (adaptive).** Small audiences still fan out **inline** (instant, the
common case is unchanged). Above a threshold, the trigger enqueues **one**
`notification_outbox` row (O(1) for the publisher) and a **pg_cron worker**
expands it into per-follower `business_notifications` rows in batches, outside
any publish transaction. The live badge works either way — the worker writes the
same rows the mobile Realtime subscription already listens on; large audiences
just fill in over a few ticks.

### `notify_followers` (publish-time trigger helper)

- Visibility gate: only `verified`, non-archived businesses notify.
- **Bounded probe** decides the branch: `EXISTS (… OFFSET 500 LIMIT 1)` — stops
  at follower #501 instead of counting the entire following.
- ≤ 500 followers → inline `INSERT…SELECT`. Otherwise → one outbox row.
- `v_threshold` (500) is a tunable constant in the function.

### `process_notification_outbox(p_batch, p_max_rows, p_max_rows_per_event)` (cron, every minute)

- Drains pending/processing events oldest-first, `FOR UPDATE SKIP LOCKED` so
  concurrent ticks divide the queue without double-processing.
- **Keyset cursor** over `follows.user_id` (`last_user_id`) — resumes a
  partially-drained event across ticks with no dupes. (uuid has no `max()`
  aggregate; the cursor uses `max(user_id::text)::uuid`, whose canonical text
  sorts identically to the uuid type.)
- **Fairness:** a single event drains at most `p_max_rows_per_event` (default
  6000) before yielding to the next queued event, so a huge backlog can't starve
  a small event queued behind it. The whole call is also bounded by `p_max_rows`
  (default 20000).
- **One cursor write per event per call** (terminal `done`, or `processing` at a
  yield). The whole function is a single transaction, so per-batch UPDATEs would
  neither commit early nor aid crash recovery — a crash rolls the inserts back
  with the cursor.
- **Poison isolation:** each event is processed in a subtransaction; an error
  bumps `attempts` and parks the event as `failed` after 5 tries instead of
  retrying it forever.

### `prune_notification_outbox()` (cron, daily)

Deletes `done`/`failed` rows older than 7 days so the queue table doesn't grow
unbounded.

### Security / RLS

`notification_outbox` has RLS enabled with **no policy** (deny-all) — only the
`SECURITY DEFINER` fan-out and the cron worker (which bypass RLS) touch it.
`notify_followers`, `process_notification_outbox`, and `prune_notification_outbox`
are all `REVOKE`d from `PUBLIC, anon, authenticated` (trigger/cron-only).

---

## Testing

- **Image helper (unit, Vitest):**
  `yarn vitest run lib/api/helpers/__tests__/image.test.ts`
  — real sharp fixtures: WebP re-encode, downscale-to-cap, no-enlarge, no-WebP
  passthrough, corrupt-file rejection, and `uploadWebP` content-type / upsert /
  `ImageProcessingError` / storage-error propagation.

- **Deals RPC + outbox (SQL, against the local DB):**
  ```bash
  docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
    -v ON_ERROR_STOP=1 < supabase/tests/mobile_deals_and_outbox.test.sql
  ```
  Non-destructive (runs in a rolled-back transaction). Asserts deals shape /
  unknown-category-empty / featured pick / featured-not-in-buckets / deterministic
  paging / has_more, and the outbox inline path / worker exactly-once+idempotent /
  fairness / prune. Expected tail: `ALL SQL TESTS PASSED`.

## Deploying the migrations

Both migrations (`20260630000000_mobile_deals_rpc.sql`,
`20260630000001_notification_outbox.sql`) are applied to the **local** stack for
testing. Apply to staging/prod via the normal `make migrate-up` flow. The cron
jobs need pg_cron (already enabled); the scheduling block degrades gracefully if
it isn't (functions then run only when invoked manually).
