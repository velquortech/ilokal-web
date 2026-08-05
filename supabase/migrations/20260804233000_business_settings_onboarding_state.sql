-- Onboarding state for one shop.
--
-- ⚠️ NEEDS HUMAN APPROVAL BEFORE MERGE (schema change, per CLAUDE.md §Workflow),
-- then `make migrate-cloud` + a `supabase_migrations.schema_migrations` ledger
-- reconcile. **The cloud apply must land BEFORE the app deploy**: without these
-- columns `getOnboardingState` errors 42703 on every business dashboard load,
-- so the checklist can never be hidden and both writers silently return
-- `ok:false`. Applied and red-teamed on LOCAL ONLY so far.
--
-- Phase 1 and 2 of the onboarding work derive EVERY checklist item from the
-- data it describes — storing "logo uploaded ✓" duplicates a fact
-- `businesses.logo_url` already holds, and the two drift the first time an
-- owner deletes the logo. These are the only two facts with no other source:
-- whether the guided tour has been taken, and whether the setup card has been
-- dismissed. Until now both lived in localStorage, which is per-DEVICE: an
-- owner who dismissed the card on their phone was asked again on their laptop.
--
-- Why `business_settings` and not a new table (CLAUDE.md §DRY — prove the
-- existing one cannot hold it): it is already keyed by `business_id`, already
-- owner-scoped, and already the home for per-shop configuration. A parallel
-- `onboarding_state` table would mean a second set of RLS, indexes, queries,
-- service and UI for two nullable timestamps.
--
-- Why not `profiles`: onboarding is per SHOP, not per person. An owner with two
-- shops sets up each one, and a flag keyed to the user would report the second
-- shop as already onboarded.
--
-- NO new policy. "Owner manages own business settings" is `FOR ALL` with an
-- EXPLICIT `WITH CHECK` (verified against the live catalog, not just the
-- migration file — a `FOR ALL` policy silently reuses `USING` for writes, which
-- is the PR #18 lesson that cost `booking_requests` its owner UPDATE policy),
-- and its `auth.uid()` is already wrapped as `(select auth.uid())` by
-- `20260717000002`. So the write path is covered as-is.
--
-- No index is needed on `business_settings` itself — `business_id` is the
-- primary key and every read here is a point lookup by it. But the checklist
-- this unblocks counts `branches` per shop on every dashboard load, and
-- `branches.business_id` was never indexed (Postgres does not auto-index FKs),
-- so that read seq-scans the table. Added below.
--
-- NO backfill, and none is possible — the existing markers are in browsers we
-- cannot read. NULL means "not done", so an owner who dismissed the card
-- before this migration is asked once more, on one device. The client keeps
-- writing its localStorage marker as a local echo, so in practice even that
-- rarely shows.
--
-- NOT exposed publicly: `get_business_public_info` returns an EXPLICIT
-- four-column list, so a new column on this table is private by default. That
-- is asserted in `supabase/tests/onboarding_state.test.sql` rather than assumed.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS onboarding_tour_completed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_checklist_dismissed_at timestamptz;

COMMENT ON COLUMN public.business_settings.onboarding_tour_completed_at IS
  'When the post-registration guided tour was finished OR skipped — both mean "do not offer it again". NULL = never answered. Replaces the per-device localStorage marker.';

COMMENT ON COLUMN public.business_settings.onboarding_checklist_dismissed_at IS
  'When the owner hid the setup checklist. NULL = still shown. The checklist ITEMS stay fully derived; only this dismissal is stored.';

-- The checklist's branch step counts live, pinned branches for one shop on every
-- dashboard load. Partial, because the count always filters `archived_at IS
-- NULL`, so the index only has to carry the rows that can match.
CREATE INDEX IF NOT EXISTS idx_branches_business_id_live
  ON public.branches (business_id)
  WHERE archived_at IS NULL;

-- Seed the onboarding-tour kill switch so "row absent" is unreachable and its
-- reader can fail CLOSED like `enable_events` / `enable_bookings`. Without the
-- row, a reader has to choose a default for "no rows", and `app_settings` is
-- `SELECT … TO authenticated` — so an anonymous caller sees zero rows and NO
-- error, which an ON-by-default reader would turn into "enabled", silently
-- defeating an admin who switched it off. `ON CONFLICT DO NOTHING`: an admin's
-- existing choice must survive a re-run.
INSERT INTO public.app_settings (key, value)
VALUES ('enable_onboarding_tour', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
