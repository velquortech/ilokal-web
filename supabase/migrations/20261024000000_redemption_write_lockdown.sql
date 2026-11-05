-- Redemption write lockdown + RLS on the two tables that shipped without it.
--
-- WHY (production-readiness audit, 2026-10-24) — three holes reachable with
-- nothing but the public anon key that ships inside every mobile build:
--
--   1. `increment_coupon_redemptions(uuid)` is SECURITY DEFINER and was never
--      revoked from PUBLIC/anon, so anyone could call
--      /rest/v1/rpc/increment_coupon_redemptions in a loop and burn every
--      capped deal to "reached its redemption limit".
--   2. `user_redemptions` carried a permissive `"Users manage own interactions"
--      FOR ALL USING (auth.uid() = user_id)` policy. Through PostgREST a
--      signed-in user could insert redemptions for draft/expired/follow-gated
--      coupons past every cap, null out `expires_at`, flip `is_claimed` back to
--      reuse a one-time deal, pick their own cashier code (the code trigger
--      keeps a client-supplied one), or plant a claimed row that
--      `review_evidence()` scores as `visit_redeemed`. The routes' checks were
--      advisory: the table itself accepted anything owned by the caller.
--   3. `bida_of_the_day` (20260814130000) and `view_count_history`
--      (20260814140000) never enabled RLS, so the default Supabase grants let
--      anon read — and likely rewrite — the daily hero pick and every owner's
--      analytics history.
--
-- FIX — the same shape as the reviews lockdown (20261013100000): every user
-- write goes through a SECURITY DEFINER RPC that owns the rules, and the
-- table grants that let PostgREST bypass them are revoked.
--
--   * `redeem_coupon(coupon, branch)` — every gate the three claim paths
--     applied (published, started, not archived, verified live business,
--     expiry, global cap, branch belongs to the business and matches a
--     branch-scoped coupon, follow gate, one active copy, per-user cap), then
--     the insert and the counter bump, in ONE transaction holding the coupon
--     row lock. That lock serializes concurrent redeems of a coupon, so the
--     caps can't be raced and the old insert-then-roll-back dance is gone.
--   * `claim_my_redemption(id)` — the one legitimate client update:
--     unclaimed → claimed, own row, not expired. Never back.
--   * Direct INSERT/UPDATE/DELETE on `user_redemptions` revoked from anon and
--     authenticated; SELECT of one's own rows stays (the wallet reads it).
--   * `increment_coupon_redemptions` revoked from PUBLIC/anon/authenticated.
--     Kept (service_role still holds it) so a rollback is a grant, not a
--     re-create.
--   * RLS on `bida_of_the_day` (admins only — the public reads the pick
--     through the SECURITY DEFINER `bida_of_the_day()` RPC) and
--     `view_count_history` (no client access at all — written by the nightly
--     cron job, read by the service-role analytics client).
--
-- Error contract: MESSAGE = a stable machine code, HINT = the user-facing
-- line, exactly like the review RPCs. The routes map codes to the statuses
-- they returned before (app/api/helpers/redemptionErrors.ts).
--
-- DEPLOY: ships in the same release as the route changes that call these
-- RPCs. Applied before that code, the old routes' direct inserts are refused;
-- deployed before this migration, the new routes call a missing function.
--
-- Rollback:
--   GRANT INSERT, UPDATE, DELETE ON public.user_redemptions TO authenticated;
--   DROP POLICY "Users read own redemptions" ON public.user_redemptions;
--   CREATE POLICY "Users manage own interactions" ON public.user_redemptions
--     FOR ALL USING (auth.uid() = user_id);
--   GRANT EXECUTE ON FUNCTION public.increment_coupon_redemptions(uuid) TO anon, authenticated;
--   DROP FUNCTION public.redeem_coupon(uuid, uuid);
--   DROP FUNCTION public.claim_my_redemption(uuid);
--   ALTER TABLE public.bida_of_the_day DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.view_count_history DISABLE ROW LEVEL SECURITY;

-- ── 1. redeem_coupon ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_coupon_id uuid,
  p_branch_id uuid DEFAULT NULL
)
RETURNS public.user_redemptions
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_coupon  public.coupons;
  v_branch  uuid;
  v_ok      boolean;
  v_total   int;
  v_active  int;
  v_row     public.user_redemptions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;

  -- The row lock is the concurrency story: every redeem of this coupon queues
  -- here, so the cap and per-user checks below can't be raced.
  SELECT c.* INTO v_coupon
    FROM public.coupons c
    JOIN public.businesses b ON b.id = c.business_id
   WHERE c.id = p_coupon_id
     AND c.status = 'published'
     AND c.archived_at IS NULL
     AND c.start_date <= now()
     AND b.status = 'verified'
     AND b.archived_at IS NULL
     FOR UPDATE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUPON_NOT_FOUND' USING HINT = 'Coupon not found or not yet active';
  END IF;

  -- A branch-scoped coupon defaults to its branch; otherwise the given branch
  -- must be a live branch of the coupon's business.
  v_branch := COALESCE(p_branch_id, v_coupon.branch_id);
  IF v_branch IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.branches br
       WHERE br.id = v_branch
         AND br.business_id = v_coupon.business_id
         AND br.archived_at IS NULL
    ) INTO v_ok;
    IF NOT v_ok OR (v_coupon.branch_id IS NOT NULL AND v_coupon.branch_id <> v_branch) THEN
      RAISE EXCEPTION 'BRANCH_MISMATCH' USING HINT = 'This deal cannot be redeemed at that branch';
    END IF;
  END IF;

  IF v_coupon.expiry_date < now() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED' USING HINT = 'Coupon has expired';
  END IF;

  IF v_coupon.max_redemptions_global IS NOT NULL
     AND v_coupon.current_redemptions >= v_coupon.max_redemptions_global THEN
    RAISE EXCEPTION 'COUPON_LIMIT_REACHED' USING HINT = 'Coupon has reached its redemption limit';
  END IF;

  IF v_coupon.requires_follow AND NOT EXISTS (
    SELECT 1 FROM public.follows f
     WHERE f.user_id = v_uid AND f.business_id = v_coupon.business_id
  ) THEN
    RAISE EXCEPTION 'FOLLOW_REQUIRED' USING HINT = 'Follow this business to claim this deal';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE NOT COALESCE(ur.is_claimed, false)
                            AND (ur.expires_at IS NULL OR ur.expires_at > now()))
    INTO v_total, v_active
    FROM public.user_redemptions ur
   WHERE ur.coupon_id = p_coupon_id AND ur.user_id = v_uid;

  IF v_active > 0 THEN
    RAISE EXCEPTION 'ALREADY_IN_WALLET' USING HINT = 'You already have this deal in your wallet';
  END IF;

  IF v_coupon.max_redemptions_per_user IS NOT NULL
     AND v_total >= v_coupon.max_redemptions_per_user THEN
    RAISE EXCEPTION 'PER_USER_LIMIT_REACHED'
      USING HINT = 'You have already redeemed this coupon the maximum number of times';
  END IF;

  -- `code` is left NULL so trg_set_redemption_code assigns a server one.
  INSERT INTO public.user_redemptions (user_id, coupon_id, branch_id, expires_at)
  VALUES (v_uid, p_coupon_id, v_branch, v_coupon.expiry_date)
  RETURNING * INTO v_row;

  UPDATE public.coupons
     SET current_redemptions = current_redemptions + 1
   WHERE id = p_coupon_id;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.redeem_coupon(uuid, uuid) IS
  'The only client path that creates a redemption. Applies every claim gate and '
  'bumps current_redemptions under the coupon row lock. Raises MESSAGE = code, '
  'HINT = user-facing text.';

-- ── 2. claim_my_redemption ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_my_redemption(p_redemption_id uuid)
RETURNS public.user_redemptions
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_redemptions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING HINT = 'Sign in to continue';
  END IF;

  SELECT * INTO v_row
    FROM public.user_redemptions
   WHERE id = p_redemption_id AND user_id = v_uid
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_FOUND' USING HINT = 'Redemption not found';
  END IF;
  IF COALESCE(v_row.is_claimed, false) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED' USING HINT = 'Redemption already claimed';
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RAISE EXCEPTION 'REDEMPTION_EXPIRED' USING HINT = 'Redemption has expired';
  END IF;

  UPDATE public.user_redemptions
     SET is_claimed = true
   WHERE id = p_redemption_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_my_redemption(uuid) IS
  'Marks the caller''s own unexpired redemption as claimed. One-way.';

-- ── 3. user_redemptions: read-only to clients ───────────────────────────────

DROP POLICY IF EXISTS "Users manage own interactions" ON public.user_redemptions;
DROP POLICY IF EXISTS "Users read own redemptions" ON public.user_redemptions;
CREATE POLICY "Users read own redemptions"
  ON public.user_redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.user_redemptions FROM anon, authenticated;
REVOKE ALL ON public.user_redemptions FROM anon;

-- ── 4. Grants on the functions ──────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.increment_coupon_redemptions(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon(uuid, uuid)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_my_redemption(uuid)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.redeem_coupon(uuid, uuid)  TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.claim_my_redemption(uuid)  TO authenticated, service_role;

-- ── 5. bida_of_the_day: admins only ─────────────────────────────────────────

ALTER TABLE public.bida_of_the_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bida picks" ON public.bida_of_the_day;
CREATE POLICY "Admins manage bida picks"
  ON public.bida_of_the_day
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.bida_of_the_day FROM anon;

-- ── 6. view_count_history: no client access ─────────────────────────────────

ALTER TABLE public.view_count_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.view_count_history FROM anon, authenticated;
