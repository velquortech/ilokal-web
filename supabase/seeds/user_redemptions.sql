-- Seed: user_redemptions
-- Requires: users.sql and coupons.sql to have run first.
-- References the test coupon (DRINK20) and branches from businesses.sql seed data.

-- Grab a real user id and branch id to satisfy FKs
DO $$
DECLARE
  v_user_id   UUID;
  v_coupon_id UUID;
  v_branch_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  SELECT id INTO v_coupon_id FROM public.coupons WHERE code = 'DRINK20' LIMIT 1;
  SELECT id INTO v_branch_id FROM public.branches LIMIT 1;

  IF v_user_id IS NULL OR v_coupon_id IS NULL OR v_branch_id IS NULL THEN
    RAISE NOTICE 'Skipping user_redemptions seed — missing user, coupon, or branch.';
    RETURN;
  END IF;

  -- Active redemption (not claimed, not expired)
  INSERT INTO public.user_redemptions (user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
  VALUES (v_user_id, v_coupon_id, v_branch_id, NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days', false)
  ON CONFLICT DO NOTHING;

  -- Claimed redemption
  INSERT INTO public.user_redemptions (user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
  VALUES (v_user_id, v_coupon_id, v_branch_id, NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', true)
  ON CONFLICT DO NOTHING;

  -- Expired redemption
  INSERT INTO public.user_redemptions (user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
  VALUES (v_user_id, v_coupon_id, v_branch_id, NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', false)
  ON CONFLICT DO NOTHING;
END $$;
