-- Reviews: visit evidence, RPC-only writes, reports and moderation.
-- Spec: ilokal-mobile docs/superpowers/specs/2026-10-13-ratings-with-comments.md
--
-- WHY
-- ---
-- iLokal has no in-app payment, so "you bought something" can't gate a review.
-- The previous gate (SEC-4, 20260717080351) accepted any `user_redemptions` row,
-- and that row is a wallet CLAIM made from anywhere, not a visit. Worse, the
-- permissive `"Users manage own ratings" FOR ALL` policy let any signed-in user
-- write and UPDATE their own rows straight through PostgREST, bypassing every
-- route-level check.
--
-- This migration:
--   1. Defines visit EVIDENCE, resolved server-side: a counter-consumed
--      redemption (`visit_redeemed`) or an on-site check-in within 30 days
--      (`checkin`). Pre-existing reviews keep their rows as `legacy_claim`.
--   2. Makes every user write go through SECURITY DEFINER RPCs and revokes
--      table-level INSERT/UPDATE/DELETE from anon + authenticated.
--   3. Adds reports (auto-hide at 3 distinct reporters) and admin moderation.
--   4. Enforces the owner's `business_settings.allow_reviews` and a global
--      `app_settings.reviews_write_enabled` kill switch.
--
-- MODERATED ROWS MOVE OUT OF `business_ratings`
-- ----------------------------------------------
-- A hidden/removed review is MOVED into `business_rating_moderation` instead of
-- being flagged in place. Every aggregate in the schema (nearby_businesses*,
-- get_business_rating_summary, analytics_rating_summary, the public ratings
-- route) reads `business_ratings` directly; moving the row keeps all of them —
-- and any added later — correct without re-creating each function, whose
-- definitions differ between branches. `business_ratings` therefore means
-- "published reviews", full stop.
--
-- Errors are raised with a stable machine code as the MESSAGE (e.g. 'NO_VISIT')
-- and a human line as the HINT; the API routes map code → HTTP status.

-- ---------------------------------------------------------------------------
-- 1. business_ratings: evidence, edit marker, comment bound
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_ratings
  ADD COLUMN IF NOT EXISTS evidence  text NOT NULL DEFAULT 'legacy_claim',
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.business_ratings
  ADD CONSTRAINT business_ratings_evidence_check
    CHECK (evidence IN ('visit_redeemed', 'checkin', 'legacy_claim'));

-- NOT VALID: existing rows (seeded or legacy) are grandfathered; every new
-- write is bounded.
ALTER TABLE public.business_ratings
  ADD CONSTRAINT business_ratings_comment_len
    CHECK (comment IS NULL OR char_length(comment) <= 500) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_business_ratings_business_created
  ON public.business_ratings (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_ratings_user_created
  ON public.business_ratings (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Moderation holding table
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_rating_moderation (
  id           uuid PRIMARY KEY,               -- the original business_ratings.id
  user_id      uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  evidence     text NOT NULL,
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz,
  edited_at    timestamptz,
  status       text NOT NULL CHECK (status IN ('hidden', 'removed')),
  reason       text NOT NULL,
  moderated_at timestamptz NOT NULL DEFAULT now(),
  moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (user_id, business_id)
);

ALTER TABLE public.business_rating_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors see their own moderated review"
  ON public.business_rating_moderation FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Check-ins (evidence B). Raw coordinates are deliberately NOT stored —
--    only the computed distance (Data Privacy Act: collect the minimum).
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_checkins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id     uuid NOT NULL REFERENCES public.branches(id)   ON DELETE CASCADE,
  distance_m    integer NOT NULL,
  checked_in_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Manila')::date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id, checked_in_on)
);

ALTER TABLE public.business_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own check-ins"
  ON public.business_checkins FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Reports. No FK on rating_id: the row moves between business_ratings and
--    the moderation table, and the report must follow it.
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_rating_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id   uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  reason      text NOT NULL
    CHECK (reason IN ('fake', 'offensive', 'spam', 'personal_info', 'other')),
  note        text CHECK (note IS NULL OR char_length(note) <= 300),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rating_id, reporter_id)
);

CREATE INDEX idx_business_rating_reports_rating ON public.business_rating_reports (rating_id);

ALTER TABLE public.business_rating_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters see their own reports"
  ON public.business_rating_reports FOR SELECT
  USING (reporter_id = (SELECT auth.uid()) OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Close the direct-write path. Reads stay public; writes are RPC-only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own ratings" ON public.business_ratings;

REVOKE INSERT, UPDATE, DELETE ON public.business_ratings           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.business_rating_moderation FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.business_checkins          FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.business_rating_reports    FROM anon, authenticated;
REVOKE ALL ON public.business_rating_moderation FROM anon;
REVOKE ALL ON public.business_checkins          FROM anon;
REVOKE ALL ON public.business_rating_reports    FROM anon;

-- Global kill switch (true = reviews can be written). Missing key reads true.
INSERT INTO public.app_settings (key, value)
VALUES ('reviews_write_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Helpers (not callable by clients)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_evidence(p_user uuid, p_business uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_redemptions ur
      JOIN public.coupons c ON c.id = ur.coupon_id
      WHERE ur.user_id = p_user AND c.business_id = p_business AND ur.is_claimed
    ) THEN 'visit_redeemed'
    WHEN EXISTS (
      SELECT 1 FROM public.business_checkins ci
      WHERE ci.user_id = p_user AND ci.business_id = p_business
        AND ci.checked_in_on >= (now() AT TIME ZONE 'Asia/Manila')::date - 30
    ) THEN 'checkin'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.review_evidence_rank(p_evidence text)
RETURNS int LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_evidence
    WHEN 'visit_redeemed' THEN 3 WHEN 'checkin' THEN 2 WHEN 'legacy_claim' THEN 1 ELSE 0
  END;
$$;

-- Reviews closed for this business? Returns the blocking code, or NULL.
CREATE OR REPLACE FUNCTION public.reviews_block_reason(p_business uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business AND b.status = 'verified' AND b.archived_at IS NULL
    ) THEN 'BUSINESS_NOT_FOUND'
    WHEN COALESCE((SELECT s.allow_reviews FROM public.business_settings s
                   WHERE s.business_id = p_business), true) = false
      THEN 'REVIEWS_DISABLED'
    WHEN COALESCE((SELECT (a.value)::text::boolean FROM public.app_settings a
                   WHERE a.key = 'reviews_write_enabled'), true) = false
      THEN 'REVIEWS_PAUSED'
    ELSE NULL
  END;
$$;

-- "Ana Reyes" → "Ana R."; one word stays as is; nothing → "iLokal user".
CREATE OR REPLACE FUNCTION public.review_display_name(p_full_name text)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_full_name IS NULL OR btrim(p_full_name) = '' THEN 'iLokal user'
    WHEN array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1) = 1
      THEN btrim(p_full_name)
    ELSE split_part(btrim(p_full_name), ' ', 1) || ' ' ||
         upper(left((regexp_split_to_array(btrim(p_full_name), '\s+'))[
           array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1)], 1)) || '.'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_evidence(uuid, uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reviews_block_reason(uuid)   FROM PUBLIC, anon, authenticated;

-- Move a published review into moderation (used by reports + admin).
CREATE OR REPLACE FUNCTION public.move_rating_to_moderation(
  p_rating uuid, p_status text, p_reason text, p_by uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r public.business_ratings;
BEGIN
  DELETE FROM public.business_ratings WHERE id = p_rating RETURNING * INTO r;
  IF r.id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.business_rating_moderation
    (id, user_id, business_id, rating, comment, evidence, created_at, updated_at,
     edited_at, status, reason, moderated_by)
  VALUES
    (r.id, r.user_id, r.business_id, r.rating, r.comment, r.evidence, r.created_at,
     r.updated_at, r.edited_at, p_status, p_reason, p_by);
  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.move_rating_to_moderation(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. My review + eligibility for one business
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_business_review(p_business uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_mine     jsonb;
  v_block    text;
  v_evidence text;
  v_last     date;
  v_coords   boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;

  SELECT jsonb_build_object(
           'id', r.id, 'rating', r.rating, 'comment', r.comment,
           'created_at', r.created_at, 'edited', r.edited_at IS NOT NULL,
           'evidence', r.evidence, 'status', 'published', 'moderation_reason', NULL)
    INTO v_mine
    FROM public.business_ratings r
   WHERE r.user_id = v_uid AND r.business_id = p_business;

  IF v_mine IS NULL THEN
    SELECT jsonb_build_object(
             'id', m.id, 'rating', m.rating, 'comment', m.comment,
             'created_at', m.created_at, 'edited', m.edited_at IS NOT NULL,
             'evidence', m.evidence, 'status', m.status, 'moderation_reason', m.reason)
      INTO v_mine
      FROM public.business_rating_moderation m
     WHERE m.user_id = v_uid AND m.business_id = p_business;
  END IF;

  v_block := public.reviews_block_reason(p_business);
  IF v_block = 'BUSINESS_NOT_FOUND' THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND' USING HINT = 'Business not found';
  END IF;

  v_evidence := public.review_evidence(v_uid, p_business);
  SELECT max(ci.checked_in_on) INTO v_last
    FROM public.business_checkins ci
   WHERE ci.user_id = v_uid AND ci.business_id = p_business;
  SELECT EXISTS (
    SELECT 1 FROM public.branches b
     WHERE b.business_id = p_business AND b.archived_at IS NULL AND b.location IS NOT NULL
  ) INTO v_coords;

  RETURN jsonb_build_object(
    'mine', v_mine,
    'eligibility', CASE
      WHEN v_block IS NOT NULL THEN
        jsonb_build_object('can_review', false, 'reason', v_block,
                           'can_check_in', false, 'checked_in_on', v_last)
      WHEN v_mine IS NOT NULL AND v_mine->>'status' <> 'published' THEN
        jsonb_build_object('can_review', false, 'reason', 'UNDER_REVIEW',
                           'can_check_in', false, 'checked_in_on', v_last)
      WHEN v_evidence IS NOT NULL OR v_mine IS NOT NULL THEN
        jsonb_build_object(
          'can_review', true,
          'evidence', COALESCE(v_evidence, v_mine->>'evidence'),
          'expires_on', CASE WHEN v_evidence = 'checkin' THEN v_last + 30 END,
          'checked_in_on', v_last)
      ELSE
        jsonb_build_object('can_review', false, 'reason', 'NO_VISIT',
                           'can_check_in', v_coords, 'checked_in_on', v_last)
    END);
END $$;

-- ---------------------------------------------------------------------------
-- 8. Create / edit my review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_business_rating(
  p_business uuid, p_rating int, p_comment text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_block    text;
  v_comment  text := NULLIF(btrim(COALESCE(p_comment, '')), '');
  v_existing public.business_ratings;
  v_evidence text;
  v_row      public.business_ratings;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'INVALID_RATING' USING HINT = 'Pick 1 to 5 stars';
  END IF;

  v_block := public.reviews_block_reason(p_business);
  IF v_block = 'BUSINESS_NOT_FOUND' THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND' USING HINT = 'Business not found';
  ELSIF v_block = 'REVIEWS_DISABLED' THEN
    RAISE EXCEPTION 'REVIEWS_DISABLED' USING HINT = 'This shop isn''t accepting reviews';
  ELSIF v_block = 'REVIEWS_PAUSED' THEN
    RAISE EXCEPTION 'REVIEWS_PAUSED' USING HINT = 'Reviews are paused right now. Please try again later';
  END IF;

  IF EXISTS (SELECT 1 FROM public.business_rating_moderation m
              WHERE m.user_id = v_uid AND m.business_id = p_business) THEN
    RAISE EXCEPTION 'UNDER_REVIEW' USING HINT = 'Your review for this shop is being checked by our team';
  END IF;

  IF v_comment IS NOT NULL THEN
    IF char_length(v_comment) > 500 THEN
      RAISE EXCEPTION 'COMMENT_TOO_LONG' USING HINT = 'Keep your comment under 500 characters';
    END IF;
    -- Links and phone numbers are how review spam advertises itself.
    IF v_comment ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|ph|io|co|me|shop|link|ly|app)\M)'
       OR v_comment ~ '(\+?63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}'
       OR v_comment ~ '\d[\d\s-]{9,}\d' THEN
      RAISE EXCEPTION 'COMMENT_REJECTED'
        USING HINT = 'Please leave out links and phone numbers';
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.business_ratings
   WHERE user_id = v_uid AND business_id = p_business FOR UPDATE;
  v_evidence := public.review_evidence(v_uid, p_business);

  IF v_existing.id IS NULL THEN
    IF v_evidence IS NULL THEN
      RAISE EXCEPTION 'NO_VISIT'
        USING HINT = 'Check in at the shop, or use one of its deals at the counter, to leave a review';
    END IF;
    IF (SELECT count(*) FROM public.business_ratings r
         WHERE r.user_id = v_uid AND r.created_at > now() - interval '24 hours') >= 5 THEN
      RAISE EXCEPTION 'RATE_LIMITED' USING HINT = 'You''ve posted a lot of reviews today. Try again tomorrow';
    END IF;
    INSERT INTO public.business_ratings (user_id, business_id, rating, comment, evidence)
    VALUES (v_uid, p_business, p_rating, v_comment, v_evidence)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.business_ratings SET
      rating    = p_rating,
      comment   = v_comment,
      evidence  = CASE WHEN public.review_evidence_rank(v_evidence)
                            > public.review_evidence_rank(evidence)
                       THEN v_evidence ELSE evidence END,
      edited_at = CASE WHEN rating IS DISTINCT FROM p_rating
                         OR comment IS DISTINCT FROM v_comment
                       THEN now() ELSE edited_at END
    WHERE id = v_existing.id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'rating', v_row.rating, 'comment', v_row.comment,
    'created_at', v_row.created_at, 'edited', v_row.edited_at IS NOT NULL,
    'evidence', v_row.evidence, 'status', 'published', 'moderation_reason', NULL);
END $$;

-- ---------------------------------------------------------------------------
-- 9. Delete my review (published or under moderation)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_business_rating(p_business uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;
  WITH d1 AS (DELETE FROM public.business_ratings
               WHERE user_id = v_uid AND business_id = p_business RETURNING id),
       d2 AS (DELETE FROM public.business_rating_moderation
               WHERE user_id = v_uid AND business_id = p_business AND status = 'hidden'
               RETURNING id)
  SELECT array_agg(id) INTO v_ids FROM (SELECT id FROM d1 UNION ALL SELECT id FROM d2) x;
  IF v_ids IS NULL THEN RETURN false; END IF;
  DELETE FROM public.business_rating_reports WHERE rating_id = ANY (v_ids);
  RETURN true;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Report a review. 3 distinct reporters hide it pending admin review.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_business_rating(
  p_rating uuid, p_reason text, p_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); r public.business_ratings; v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;
  IF p_reason NOT IN ('fake', 'offensive', 'spam', 'personal_info', 'other') THEN
    RAISE EXCEPTION 'INVALID_REASON' USING HINT = 'Pick a reason';
  END IF;
  SELECT * INTO r FROM public.business_ratings WHERE id = p_rating;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'REVIEW_NOT_FOUND' USING HINT = 'This review is no longer available';
  END IF;
  IF r.user_id = v_uid THEN
    RAISE EXCEPTION 'OWN_REVIEW' USING HINT = 'You can''t report your own review';
  END IF;

  INSERT INTO public.business_rating_reports (rating_id, business_id, reporter_id, reason, note)
  VALUES (p_rating, r.business_id, v_uid, p_reason, NULLIF(btrim(COALESCE(p_note, '')), ''))
  ON CONFLICT (rating_id, reporter_id) DO NOTHING;

  SELECT count(DISTINCT reporter_id) INTO v_count
    FROM public.business_rating_reports WHERE rating_id = p_rating;
  IF v_count >= 3 THEN
    PERFORM public.move_rating_to_moderation(p_rating, 'hidden', 'auto:reports', NULL);
    RETURN jsonb_build_object('hidden', true);
  END IF;
  RETURN jsonb_build_object('hidden', false);
END $$;

-- ---------------------------------------------------------------------------
-- 11. Check in (evidence B). The server decides "near enough" from the
--     branch's stored location; the client only reports a fix.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_business_checkin(
  p_business uuid, p_lat double precision, p_lng double precision,
  p_accuracy_m double precision, p_mocked boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
-- PostGIS lives in `public` locally but may sit in `extensions` (Supabase
-- dashboard default) or `postgis` elsewhere; schemas that don't exist are
-- ignored, so listing all three keeps ST_* resolvable wherever it's installed.
SET search_path = public, extensions, postgis, pg_temp
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_branch   uuid;
  v_distance double precision;
  v_day      date := (now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;
  IF public.reviews_block_reason(p_business) = 'BUSINESS_NOT_FOUND' THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND' USING HINT = 'Business not found';
  END IF;
  IF COALESCE(p_mocked, false) THEN
    RAISE EXCEPTION 'MOCK_LOCATION' USING HINT = 'Turn off mock locations to check in';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_LOCATION' USING HINT = 'We couldn''t read your location';
  END IF;
  IF p_accuracy_m IS NULL OR p_accuracy_m > 100 THEN
    RAISE EXCEPTION 'LOW_ACCURACY'
      USING HINT = 'Your location isn''t precise enough yet. Step outside or wait a moment and try again';
  END IF;

  SELECT b.id, ST_Distance(b.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
    INTO v_branch, v_distance
    FROM public.branches b
   WHERE b.business_id = p_business AND b.archived_at IS NULL AND b.location IS NOT NULL
   ORDER BY b.location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
   LIMIT 1;

  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'NO_BRANCH_LOCATION' USING HINT = 'This shop hasn''t set its location yet';
  END IF;
  IF v_distance > 150 THEN
    RAISE EXCEPTION 'TOO_FAR'
      USING DETAIL = round(v_distance)::text,
            HINT = 'You need to be at the shop to check in';
  END IF;

  INSERT INTO public.business_checkins (user_id, business_id, branch_id, distance_m, checked_in_on)
  VALUES (v_uid, p_business, v_branch, round(v_distance)::int, v_day)
  ON CONFLICT (user_id, business_id, checked_in_on) DO NOTHING;

  RETURN jsonb_build_object('checked_in_on', v_day, 'distance_m', round(v_distance)::int);
END $$;

-- ---------------------------------------------------------------------------
-- 12. Public review list. SECURITY DEFINER so authors' display names resolve
--     for anon callers; only the shaped name + avatar leave the database.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_business_reviews(
  p_business uuid, p_sort text DEFAULT 'recent', p_limit int DEFAULT 10,
  p_offset int DEFAULT 0, p_with_comment boolean DEFAULT true
) RETURNS TABLE (
  id uuid, rating smallint, comment text, created_at timestamptz, edited boolean,
  evidence text, display_name text, avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, r.rating, r.comment, r.created_at, r.edited_at IS NOT NULL, r.evidence,
         public.review_display_name(p.full_name), p.avatar_url
    FROM public.business_ratings r
    JOIN public.profiles p ON p.id = r.user_id
   WHERE r.business_id = p_business
     AND p.archived_at IS NULL AND COALESCE(p.status, 'active') = 'active'
     AND (NOT p_with_comment OR r.comment IS NOT NULL)
   ORDER BY
     CASE WHEN p_sort = 'highest' THEN r.rating END DESC NULLS LAST,
     CASE WHEN p_sort = 'lowest'  THEN r.rating END ASC  NULLS LAST,
     public.review_evidence_rank(r.evidence) DESC,
     r.created_at DESC
   LIMIT LEAST(GREATEST(p_limit, 1), 21) OFFSET GREATEST(p_offset, 0);  -- 20 + 1 over-fetch for has_more
$$;

-- ---------------------------------------------------------------------------
-- 13. Admin moderation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_business_rating(
  p_rating uuid, p_action text, p_reason text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE m public.business_rating_moderation;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING HINT = 'Admins only';
  END IF;
  IF p_action IN ('hide', 'remove') THEN
    IF public.move_rating_to_moderation(
         p_rating, CASE p_action WHEN 'hide' THEN 'hidden' ELSE 'removed' END,
         COALESCE(p_reason, 'admin'), auth.uid()) THEN
      RETURN true;
    END IF;
    UPDATE public.business_rating_moderation
       SET status = CASE p_action WHEN 'hide' THEN 'hidden' ELSE 'removed' END,
           reason = COALESCE(p_reason, reason), moderated_at = now(), moderated_by = auth.uid()
     WHERE id = p_rating;
    RETURN FOUND;
  ELSIF p_action = 'restore' THEN
    DELETE FROM public.business_rating_moderation WHERE id = p_rating RETURNING * INTO m;
    IF m.id IS NULL THEN RETURN false; END IF;
    INSERT INTO public.business_ratings
      (id, user_id, business_id, rating, comment, evidence, created_at, updated_at, edited_at)
    VALUES (m.id, m.user_id, m.business_id, m.rating, m.comment, m.evidence,
            m.created_at, m.updated_at, m.edited_at);
    DELETE FROM public.business_rating_reports WHERE rating_id = p_rating;
    RETURN true;
  END IF;
  RAISE EXCEPTION 'INVALID_ACTION' USING HINT = 'Use hide, remove or restore';
END $$;

-- ---------------------------------------------------------------------------
-- 14. Grants
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_my_business_review(uuid)                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_business_rating(uuid, int, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_my_business_rating(uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_business_rating(uuid, text, text)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_business_checkin(uuid, double precision, double precision, double precision, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.moderate_business_rating(uuid, text, text)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_business_review(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_business_rating(uuid, int, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_business_rating(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_business_rating(uuid, text, text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_business_checkin(uuid, double precision, double precision, double precision, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_business_rating(uuid, text, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_reviews(uuid, text, int, int, boolean) TO anon, authenticated;
