-- Real view tracking behind weekly_view_count.
--
-- 20260607000001 added weekly_view_count to businesses/products as a seeded
-- demo column with no write path (the mobile recordBusinessView() POST hit a
-- non-existent route). This makes it real, keeping the read contract
-- unchanged (nearby_businesses / business_products / is_trending all keep
-- reading the same column):
--
--   • view_events — one row per user per item per *day* (dedupe is enforced
--     by unique indexes, so opening a product fifty times counts once today).
--   • record_view(...) RPC — inserts the event; on a first-view-of-the-day it
--     also bumps the denormalized counter so the UI moves immediately.
--   • rollup_weekly_view_counts() — recomputes the column as a true rolling
--     7-day count (applies the decay the live bump can't), scheduled nightly
--     via pg_cron. NOTE: the first rollup replaces the demo numbers from
--     supabase/seeds/view_counts.sql with real (initially small) counts.

CREATE TABLE public.view_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Plain DATE column for the daily-dedupe key: a timestamptz::date cast is
  -- timezone-dependent (not IMMUTABLE), so it can't live in an index expression.
  viewed_on DATE DEFAULT (NOW() AT TIME ZONE 'utc')::date NOT NULL,
  CHECK ((business_id IS NULL) <> (product_id IS NULL))
);

-- Dedupe: at most one event per user/item/day. record_view relies on these
-- via ON CONFLICT DO NOTHING.
CREATE UNIQUE INDEX uq_view_events_business_daily
  ON public.view_events (user_id, business_id, viewed_on)
  WHERE business_id IS NOT NULL;
CREATE UNIQUE INDEX uq_view_events_product_daily
  ON public.view_events (user_id, product_id, viewed_on)
  WHERE product_id IS NOT NULL;

-- Rollup scans "events for this item in the last 7 days".
CREATE INDEX idx_view_events_business_time
  ON public.view_events (business_id, viewed_at)
  WHERE business_id IS NOT NULL;
CREATE INDEX idx_view_events_product_time
  ON public.view_events (product_id, viewed_at)
  WHERE product_id IS NOT NULL;

-- RLS: no client policies — all writes go through the SECURITY DEFINER RPC,
-- and nothing client-side reads raw events.
ALTER TABLE public.view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all view events"
ON public.view_events FOR ALL
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Record one view for the calling user. SECURITY DEFINER: the caller has no
-- direct insert right on view_events and no update right on the counter
-- columns. Anonymous calls are a silent no-op (the app is auth-gated, but the
-- route is on the public path).
CREATE OR REPLACE FUNCTION public.record_view(
  p_business_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  IF (p_business_id IS NULL) = (p_product_id IS NULL) THEN
    RAISE EXCEPTION 'record_view: exactly one of business_id / product_id required';
  END IF;

  INSERT INTO public.view_events (user_id, business_id, product_id)
  VALUES (v_user, p_business_id, p_product_id)
  ON CONFLICT DO NOTHING;

  -- First view of the day by this user → live-bump the displayed counter.
  -- The nightly rollup re-derives the exact 7-day figure.
  IF FOUND THEN
    IF p_business_id IS NOT NULL THEN
      UPDATE public.businesses
        SET weekly_view_count = weekly_view_count + 1
        WHERE id = p_business_id;
    ELSE
      UPDATE public.products
        SET weekly_view_count = weekly_view_count + 1
        WHERE id = p_product_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_view(UUID, UUID) TO authenticated;

-- True rolling 7-day recount (event rows are already user/day-deduped, so a
-- plain COUNT is the dedup'd figure). Also prunes events older than the
-- window — they can no longer affect any count.
CREATE OR REPLACE FUNCTION public.rollup_weekly_view_counts() RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.businesses b SET weekly_view_count = (
    SELECT COUNT(*) FROM public.view_events e
    WHERE e.business_id = b.id AND e.viewed_at > NOW() - INTERVAL '7 days'
  );
  UPDATE public.products p SET weekly_view_count = (
    SELECT COUNT(*) FROM public.view_events e
    WHERE e.product_id = p.id AND e.viewed_at > NOW() - INTERVAL '7 days'
  );
  DELETE FROM public.view_events WHERE viewed_at < NOW() - INTERVAL '8 days';
$$;

-- Maintenance-only: invoked by the pg_cron job below (runs as table owner),
-- never by a client. Revoke the default PUBLIC execute so it isn't reachable as
-- a PostgREST RPC — otherwise any anon/authenticated caller could trigger the
-- site-wide recompute + view_events prune on demand. anon/authenticated are
-- granted EXECUTE directly by Supabase default privileges, so name them
-- explicitly (REVOKE FROM PUBLIC alone leaves those grants in place).
REVOKE EXECUTE ON FUNCTION public.rollup_weekly_view_counts() FROM PUBLIC, anon, authenticated;

-- Nightly rollup. Wrapped so environments without pg_cron (or without it
-- preloaded) still apply the migration — counts then just keep climbing until
-- the function is run manually or cron is enabled.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'rollup-weekly-view-counts',
    '15 3 * * *',
    $job$SELECT public.rollup_weekly_view_counts()$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable — schedule rollup_weekly_view_counts() manually (%).', SQLERRM;
END;
$$;
