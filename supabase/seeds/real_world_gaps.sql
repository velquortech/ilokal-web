-- real_world_gaps.sql — simulate real-world image coverage on LOCAL seeds.
--
-- Real shops don't all upload every photo: some never set a logo, some skip
-- the banner, some have no gallery, and a handful are placeholder shells with
-- nothing at all. This file recreates that spread so the mobile/web surfaces
-- (fallbacks, placeholders, "no image yet" states) are actually exercised
-- instead of being dead code paths that only exist in theory.
--
-- Deterministic, NOT random: the gap per business is derived from md5(id), so
-- every re-run (and every fresh `make seed`) yields the SAME final state —
-- idempotent, reviewable, and stable across machines. Run LAST, after
-- bulk_seed has set banner_url.
--
-- LOCAL-ONLY: deliberately NOT in the Makefile CLOUD_SEED_FILES list and NOT in
-- supabase/config.toml — cloud seeding must never null images on a project that
-- is meant to look finished. Only `make seed` (docker exec to the local
-- container) applies it.
--
-- Spread (per business, r = md5-derived 0..99):
--   r >= 95  -> no images at all (unless featured: then keep logo + interiors)
--   85..94   -> no interior gallery
--   70..84   -> no logo (featured shops keep their logo)
--   50..69   -> no banner
--   else     -> full image set
--
-- "Featured" = an ACTIVE non-Free subscription (the promoted-deals surface
-- needs an image to render, so featured shops are never fully bare).
--
-- Hero showcase shops (businesses.sql 101..116) are NEVER gapped — they are
-- the marquee surface (home/featured placement), so they always keep their
-- full authored image set. Gaps land only on filler (f0000001-…) and
-- cross-province (117..121) businesses.

DO $$
DECLARE
  v_biz      uuid;
  v_r        int;
  v_featured boolean;
BEGIN
  FOR v_biz IN SELECT id FROM public.businesses WHERE archived_at IS NULL LOOP
    -- Hero showcase shops keep their full image set, always.
    IF v_biz::text BETWEEN '11111111-1111-1111-1111-111111111101'
                       AND '11111111-1111-1111-1111-111111111116' THEN
      CONTINUE;
    END IF;

    v_r := ('x' || substr(md5(v_biz::text), 1, 2))::bit(8)::int % 100;

    SELECT EXISTS (
      SELECT 1
        FROM public.business_subscriptions bs
        JOIN public.subscription_plans sp ON sp.id = bs.plan_id
       WHERE bs.business_id = v_biz
         AND bs.status = 'active'
         AND sp.name <> 'Free Tier'
    ) INTO v_featured;

    IF v_r >= 95 THEN
      IF v_featured THEN
        UPDATE public.businesses SET banner_url = NULL WHERE id = v_biz;
      ELSE
        UPDATE public.businesses
           SET logo_url = NULL, banner_url = NULL, interior_images = NULL
         WHERE id = v_biz;
      END IF;
    ELSIF v_r BETWEEN 85 AND 94 THEN
      UPDATE public.businesses SET interior_images = NULL WHERE id = v_biz;
    ELSIF v_r BETWEEN 70 AND 84 AND NOT v_featured THEN
      UPDATE public.businesses SET logo_url = NULL WHERE id = v_biz;
    ELSIF v_r BETWEEN 50 AND 69 THEN
      UPDATE public.businesses SET banner_url = NULL WHERE id = v_biz;
    END IF;
  END LOOP;
END $$;
