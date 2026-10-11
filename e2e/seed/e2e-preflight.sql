-- ============================================================
-- E2E preflight — LOCAL ONLY
--
-- Makes the seven demo flows reachable. Idempotent: re-running changes
-- nothing. Run via `make e2e-preflight`.
--
-- Three jobs:
--   1. Turn on the feature flags that default OFF (events, bookings).
--   2. Pre-seed ONE approved event, because the approval gate is a DB trigger
--      and an owner genuinely cannot approve their own event.
--   3. Load dashboard_demo.sql, which `make seed-db` does not run, so the
--      analytics dashboard has real numbers instead of zeros.
-- ============================================================

\set ON_ERROR_STOP on

-- ── 1. Feature flags ────────────────────────────────────────────────────────
-- Both default false. Without these, every /events route and the customer
-- bookings surface 404.
INSERT INTO public.app_settings (key, value)
VALUES ('enable_events', 'true'::jsonb),
       ('enable_bookings', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ── 2. One pre-approved event ───────────────────────────────────────────────
--
-- WHY THIS IS SEEDED RATHER THAN CLICKED:
--   `set_event_initial_status` forces every non-admin insert down to
--   draft/pending_review, and `guard_event_review_columns` reverts any later
--   attempt to raise it. That is the feature — an owner cannot publish to the
--   front page. The video films the owner submitting a real proposal (which
--   correctly stays pending_review); THIS row is what the customer half then
--   finds live on /events and on the /explore dateline banner.
--
--   The trigger returns NEW unchanged when auth.uid() IS NULL (service role or
--   seed), so this INSERT lands as 'approved' as written. Verified against
--   20260802034107_events.sql, not assumed.
--
-- Dates are relative to now() so the event is always "on right now" — which is
-- also the one case the dateline banner promotes ahead of chronology.
INSERT INTO public.events (
  id, business_id, product_id, name, description, address, location,
  starts_at, ends_at, daily_start_time, daily_end_time,
  status, priority
)
VALUES (
  'eeee0000-0000-0000-0000-0000000000e1',
  '11111111-1111-1111-1111-111111111101',           -- The Artisan Roastery (see DEMO_BUSINESS)
  NULL,
  'Iloilo Coffee & Street Food Night Market',
  'Three nights along the Esplanade — local roasters pouring beside the barbecue and banana cue stalls.',
  'Iloilo River Esplanade, Iloilo City',
  ST_SetSRID(ST_MakePoint(122.5649, 10.6973), 4326)::geography,  -- lng, lat
  now() - INTERVAL '1 day',
  now() + INTERVAL '2 days',
  '16:00',
  '23:00',
  'approved',
  10
)
ON CONFLICT (id) DO UPDATE SET
  -- Name and business_id are refreshed too, not just the dates: without them a
  -- row seeded by an earlier version of this file keeps its old name and shop
  -- forever, and the banner on /explore quietly disagrees with this file.
  business_id = EXCLUDED.business_id,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  status      = 'approved',
  starts_at   = now() - INTERVAL '1 day',
  ends_at     = now() + INTERVAL '2 days',
  priority    = 10,
  archived_at = NULL;


-- ── 3. Analytics demo data ──────────────────────────────────────────────────
-- dashboard_demo.sql is NOT in `make seed-db`'s file list, so a normal
-- `make seed` leaves the owner dashboard flat. Without it flow 2 films an
-- empty product.
--
-- It is run by `make e2e-preflight` as a SEPARATE psql invocation rather than
-- included here: `\ir` resolves relative to the including FILE, and this file
-- is piped into psql over stdin (`docker exec -i ... < file`), where there is
-- no file to be relative to. Including it would fail exactly when someone runs
-- the documented command.


-- ── Report ──────────────────────────────────────────────────────────────────
\echo ''
\echo 'E2E preflight complete:'
SELECT
  (SELECT value::text FROM app_settings WHERE key = 'enable_events')   AS enable_events,
  (SELECT value::text FROM app_settings WHERE key = 'enable_bookings') AS enable_bookings,
  (SELECT count(*) FROM events WHERE status = 'approved' AND archived_at IS NULL) AS approved_events,
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'product-images')       AS product_images;
