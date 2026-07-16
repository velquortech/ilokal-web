-- ============================================================
-- Dashboard Demo Seed
-- Populates realistic analytics data for two branches so the
-- home dashboard (all-branches + per-branch views) has data.
--
-- Auto-detects the first non-seed verified business.
-- Creates a second branch if one doesn't already exist.
--
-- Run via:
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     < supabase/seeds/dashboard_demo.sql
-- ============================================================

SET session_replication_role = replica;

DO $$
DECLARE
  v_business_id   UUID;
  v_branch_1_id   UUID;
  v_branch_2_id   UUID;
  v_branch_1_name TEXT;
  v_branch_2_name TEXT;
  v_owner_id      UUID;

  -- Coupon IDs — branch 1
  v_c1a UUID := 'dddd0001-0000-0000-0000-000000000001';
  v_c1b UUID := 'dddd0001-0000-0000-0000-000000000002';
  v_c1c UUID := 'dddd0001-0000-0000-0000-000000000003';
  -- Coupon IDs — branch 2
  v_c2a UUID := 'dddd0002-0000-0000-0000-000000000001';
  v_c2b UUID := 'dddd0002-0000-0000-0000-000000000002';

  -- 20 fake app-user profiles
  u UUID[] := ARRAY[
    'aaaa0001-0000-0000-0000-000000000001'::uuid,
    'aaaa0001-0000-0000-0000-000000000002'::uuid,
    'aaaa0001-0000-0000-0000-000000000003'::uuid,
    'aaaa0001-0000-0000-0000-000000000004'::uuid,
    'aaaa0001-0000-0000-0000-000000000005'::uuid,
    'aaaa0001-0000-0000-0000-000000000006'::uuid,
    'aaaa0001-0000-0000-0000-000000000007'::uuid,
    'aaaa0001-0000-0000-0000-000000000008'::uuid,
    'aaaa0001-0000-0000-0000-000000000009'::uuid,
    'aaaa0001-0000-0000-0000-000000000010'::uuid,
    'aaaa0001-0000-0000-0000-000000000011'::uuid,
    'aaaa0001-0000-0000-0000-000000000012'::uuid,
    'aaaa0001-0000-0000-0000-000000000013'::uuid,
    'aaaa0001-0000-0000-0000-000000000014'::uuid,
    'aaaa0001-0000-0000-0000-000000000015'::uuid,
    'aaaa0001-0000-0000-0000-000000000016'::uuid,
    'aaaa0001-0000-0000-0000-000000000017'::uuid,
    'aaaa0001-0000-0000-0000-000000000018'::uuid,
    'aaaa0001-0000-0000-0000-000000000019'::uuid,
    'aaaa0001-0000-0000-0000-000000000020'::uuid
  ];

BEGIN
  -- ── 1. Resolve business (first non-seed verified business) ──
  SELECT b.id, b.owner_id INTO v_business_id, v_owner_id
  FROM   public.businesses b
  JOIN   public.profiles   p ON p.id = b.owner_id
  WHERE  b.status = 'verified'
    AND  p.email  <> 'seedowner@ilokal.dev'
  ORDER BY b.created_at
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No non-seed verified business found. Please register and verify a business first.';
  END IF;

  RAISE NOTICE 'Using business_id=%', v_business_id;

  -- ── 2. Resolve or create two active branches ─────────────────
  SELECT id, name INTO v_branch_1_id, v_branch_1_name
  FROM   public.branches
  WHERE  business_id = v_business_id
    AND  archived_at IS NULL
    AND  status      = 'active'
  ORDER BY created_at
  LIMIT 1;

  IF v_branch_1_id IS NULL THEN
    RAISE EXCEPTION 'No active branch found. Please add at least one branch first.';
  END IF;

  -- Try to get a second existing branch
  SELECT id, name INTO v_branch_2_id, v_branch_2_name
  FROM   public.branches
  WHERE  business_id = v_business_id
    AND  archived_at IS NULL
    AND  status      = 'active'
    AND  id         <> v_branch_1_id
  ORDER BY created_at
  LIMIT 1;

  -- Create a second branch if none exists
  IF v_branch_2_id IS NULL THEN
    v_branch_2_id   := gen_random_uuid();
    v_branch_2_name := 'Jaro Branch';

    INSERT INTO public.branches
      (id, business_id, name, address, location, status)
    VALUES (
      v_branch_2_id,
      v_business_id,
      v_branch_2_name,
      'Rizal St., Jaro, Iloilo City',
      ST_MakePoint(122.5660, 10.7300)::geography,
      'active'
    );
    RAISE NOTICE 'Created second branch: % (%)', v_branch_2_name, v_branch_2_id;
  END IF;

  RAISE NOTICE 'Branch 1: % (%)  |  Branch 2: % (%)',
    v_branch_1_name, v_branch_1_id, v_branch_2_name, v_branch_2_id;

  -- ── 3. Fake user profiles ─────────────────────────────────────
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES
    (u[1],  'demo.user01@ilokal.dev', 'Ana Reyes',       'app_user'),
    (u[2],  'demo.user02@ilokal.dev', 'Ben Santos',      'app_user'),
    (u[3],  'demo.user03@ilokal.dev', 'Cara Lim',        'app_user'),
    (u[4],  'demo.user04@ilokal.dev', 'Dan Torres',      'app_user'),
    (u[5],  'demo.user05@ilokal.dev', 'Eva Cruz',        'app_user'),
    (u[6],  'demo.user06@ilokal.dev', 'Fred Dela Cruz',  'app_user'),
    (u[7],  'demo.user07@ilokal.dev', 'Gina Flores',     'app_user'),
    (u[8],  'demo.user08@ilokal.dev', 'Hiro Gonzales',   'app_user'),
    (u[9],  'demo.user09@ilokal.dev', 'Isa Bautista',    'app_user'),
    (u[10], 'demo.user10@ilokal.dev', 'Joel Ramos',      'app_user'),
    (u[11], 'demo.user11@ilokal.dev', 'Kim Soriano',     'app_user'),
    (u[12], 'demo.user12@ilokal.dev', 'Luis Villanueva', 'app_user'),
    (u[13], 'demo.user13@ilokal.dev', 'Mia Aquino',      'app_user'),
    (u[14], 'demo.user14@ilokal.dev', 'Noel Padilla',    'app_user'),
    (u[15], 'demo.user15@ilokal.dev', 'Ora Mercado',     'app_user'),
    (u[16], 'demo.user16@ilokal.dev', 'Pio Salazar',     'app_user'),
    (u[17], 'demo.user17@ilokal.dev', 'Quin Abad',       'app_user'),
    (u[18], 'demo.user18@ilokal.dev', 'Rosa Navarro',    'app_user'),
    (u[19], 'demo.user19@ilokal.dev', 'Sam Castillo',    'app_user'),
    (u[20], 'demo.user20@ilokal.dev', 'Tita Ocampo',     'app_user')
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Follows — spread across 6 months ────────────────
  INSERT INTO public.follows (user_id, business_id, created_at)
  VALUES
    (u[1],  v_business_id, NOW() - INTERVAL '5 months 12 days'),
    (u[2],  v_business_id, NOW() - INTERVAL '5 months 3 days'),
    (u[3],  v_business_id, NOW() - INTERVAL '4 months 20 days'),
    (u[4],  v_business_id, NOW() - INTERVAL '4 months 8 days'),
    (u[5],  v_business_id, NOW() - INTERVAL '4 months 2 days'),
    (u[6],  v_business_id, NOW() - INTERVAL '3 months 25 days'),
    (u[7],  v_business_id, NOW() - INTERVAL '3 months 14 days'),
    (u[8],  v_business_id, NOW() - INTERVAL '3 months 5 days'),
    (u[9],  v_business_id, NOW() - INTERVAL '2 months 18 days'),
    (u[10], v_business_id, NOW() - INTERVAL '2 months 9 days'),
    (u[11], v_business_id, NOW() - INTERVAL '2 months 1 day'),
    (u[12], v_business_id, NOW() - INTERVAL '1 month 22 days'),
    (u[13], v_business_id, NOW() - INTERVAL '1 month 11 days'),
    (u[14], v_business_id, NOW() - INTERVAL '1 month 4 days'),
    (u[15], v_business_id, NOW() - INTERVAL '1 month 1 day'),
    (u[16], v_business_id, NOW() - INTERVAL '18 days'),
    (u[17], v_business_id, NOW() - INTERVAL '10 days'),
    (u[18], v_business_id, NOW() - INTERVAL '5 days'),
    (u[19], v_business_id, NOW() - INTERVAL '2 days'),
    (u[20], v_business_id, NOW() - INTERVAL '1 day')
  ON CONFLICT (user_id, business_id) DO NOTHING;

  -- ── 5. Coupons — branch 1 (3 deals) ──────────────────────────
  INSERT INTO public.coupons
    (id, business_id, branch_id, code, description, discount,
     start_date, expiry_date, status, max_redemptions_global, current_redemptions)
  VALUES
    (v_c1a, v_business_id, v_branch_1_id,
     'B1-WELCOME', '20% off your first visit.',
     '{"type":"percentage","value":20}',
     NOW() - INTERVAL '6 months', NOW() + INTERVAL '30 days',
     'published', 50, 0),
    (v_c1b, v_business_id, v_branch_1_id,
     'B1-LOYAL', '₱100 off orders over ₱500.',
     '{"type":"fixed_amount","value":100}',
     NOW() - INTERVAL '4 months', NOW() + INTERVAL '14 days',
     'published', 30, 0),
    (v_c1c, v_business_id, v_branch_1_id,
     'B1-FLASH', '15% off this week only.',
     '{"type":"percentage","value":15}',
     NOW() - INTERVAL '2 months', NOW() + INTERVAL '7 days',
     'published', 20, 0)
  ON CONFLICT (id) DO NOTHING;

  -- ── 6. Coupons — branch 2 (2 deals) ──────────────────────────
  INSERT INTO public.coupons
    (id, business_id, branch_id, code, description, discount,
     start_date, expiry_date, status, max_redemptions_global, current_redemptions)
  VALUES
    (v_c2a, v_business_id, v_branch_2_id,
     'B2-INTRO', '25% off any purchase.',
     '{"type":"percentage","value":25}',
     NOW() - INTERVAL '5 months', NOW() + INTERVAL '30 days',
     'published', 40, 0),
    (v_c2b, v_business_id, v_branch_2_id,
     'B2-WEEKEND', '₱50 off every Saturday and Sunday.',
     '{"type":"fixed_amount","value":50}',
     NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 days',
     'published', 25, 0)
  ON CONFLICT (id) DO NOTHING;

  -- ── 7. Redemptions — Branch 1 (busier, champion-heavy) ───────
  INSERT INTO public.user_redemptions
    (user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
  VALUES
    -- u1: champion — 5 recent redemptions
    (u[1], v_c1a, v_branch_1_id, NOW() - INTERVAL '5 months 10 days', NOW() + INTERVAL '1 day', TRUE),
    (u[1], v_c1b, v_branch_1_id, NOW() - INTERVAL '3 months 5 days',  NOW() + INTERVAL '1 day', TRUE),
    (u[1], v_c1a, v_branch_1_id, NOW() - INTERVAL '25 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[1], v_c1b, v_branch_1_id, NOW() - INTERVAL '18 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[1], v_c1c, v_branch_1_id, NOW() - INTERVAL '10 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[1], v_c1a, v_branch_1_id, NOW() - INTERVAL '4 days',           NOW() + INTERVAL '7 days', FALSE),
    -- u2: champion — 4 recent redemptions
    (u[2], v_c1a, v_branch_1_id, NOW() - INTERVAL '4 months 2 days',  NOW() + INTERVAL '1 day', TRUE),
    (u[2], v_c1b, v_branch_1_id, NOW() - INTERVAL '28 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[2], v_c1a, v_branch_1_id, NOW() - INTERVAL '20 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[2], v_c1c, v_branch_1_id, NOW() - INTERVAL '14 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[2], v_c1b, v_branch_1_id, NOW() - INTERVAL '6 days',           NOW() + INTERVAL '7 days', FALSE),
    -- u3: loyal — 2 distinct months
    (u[3], v_c1a, v_branch_1_id, NOW() - INTERVAL '2 months 15 days', NOW() + INTERVAL '1 day', TRUE),
    (u[3], v_c1c, v_branch_1_id, NOW() - INTERVAL '35 days',          NOW() + INTERVAL '7 days', FALSE),
    -- u4: loyal — 2 months
    (u[4], v_c1b, v_branch_1_id, NOW() - INTERVAL '3 months 1 day',   NOW() + INTERVAL '1 day', TRUE),
    (u[4], v_c1a, v_branch_1_id, NOW() - INTERVAL '45 days',          NOW() + INTERVAL '7 days', FALSE),
    -- u5: new customer — 1 redemption in last 14 days
    (u[5], v_c1c, v_branch_1_id, NOW() - INTERVAL '8 days',           NOW() + INTERVAL '7 days', FALSE),
    -- u6: at_risk — last redemption 60 days ago
    (u[6], v_c1a, v_branch_1_id, NOW() - INTERVAL '5 months',         NOW() + INTERVAL '1 day', TRUE),
    (u[6], v_c1b, v_branch_1_id, NOW() - INTERVAL '60 days',          NOW() + INTERVAL '1 day', TRUE),
    -- u7: lost — last redemption 120 days ago
    (u[7], v_c1a, v_branch_1_id, NOW() - INTERVAL '5 months 20 days', NOW() + INTERVAL '1 day', TRUE),
    (u[7], v_c1b, v_branch_1_id, NOW() - INTERVAL '4 months',         NOW() + INTERVAL '1 day', TRUE),
    -- u8: new customer
    (u[8], v_c1c, v_branch_1_id, NOW() - INTERVAL '5 days',           NOW() + INTERVAL '7 days', FALSE),
    -- u9: loyal — 3 months
    (u[9], v_c1a, v_branch_1_id, NOW() - INTERVAL '3 months 8 days',  NOW() + INTERVAL '1 day', TRUE),
    (u[9], v_c1b, v_branch_1_id, NOW() - INTERVAL '2 months 5 days',  NOW() + INTERVAL '1 day', TRUE),
    (u[9], v_c1c, v_branch_1_id, NOW() - INTERVAL '38 days',          NOW() + INTERVAL '7 days', FALSE),
    -- u10: at_risk
    (u[10], v_c1a, v_branch_1_id, NOW() - INTERVAL '4 months',        NOW() + INTERVAL '1 day', TRUE),
    (u[10], v_c1b, v_branch_1_id, NOW() - INTERVAL '70 days',         NOW() + INTERVAL '1 day', TRUE);

  -- ── 8. Redemptions — Branch 2 (lighter, different mix) ───────
  INSERT INTO public.user_redemptions
    (user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
  VALUES
    -- u11: loyal at branch 2
    (u[11], v_c2a, v_branch_2_id, NOW() - INTERVAL '4 months 10 days', NOW() + INTERVAL '1 day', TRUE),
    (u[11], v_c2b, v_branch_2_id, NOW() - INTERVAL '2 months 20 days', NOW() + INTERVAL '1 day', TRUE),
    (u[11], v_c2a, v_branch_2_id, NOW() - INTERVAL '40 days',          NOW() + INTERVAL '7 days', FALSE),
    -- u12: new customer
    (u[12], v_c2a, v_branch_2_id, NOW() - INTERVAL '11 days',          NOW() + INTERVAL '7 days', FALSE),
    -- u13: at_risk
    (u[13], v_c2b, v_branch_2_id, NOW() - INTERVAL '5 months',         NOW() + INTERVAL '1 day', TRUE),
    (u[13], v_c2a, v_branch_2_id, NOW() - INTERVAL '75 days',          NOW() + INTERVAL '1 day', TRUE),
    -- u14: lost
    (u[14], v_c2b, v_branch_2_id, NOW() - INTERVAL '5 months 5 days',  NOW() + INTERVAL '1 day', TRUE),
    (u[14], v_c2a, v_branch_2_id, NOW() - INTERVAL '120 days',         NOW() + INTERVAL '1 day', TRUE),
    -- u15: champion at branch 2
    (u[15], v_c2a, v_branch_2_id, NOW() - INTERVAL '3 months',         NOW() + INTERVAL '1 day', TRUE),
    (u[15], v_c2b, v_branch_2_id, NOW() - INTERVAL '26 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[15], v_c2a, v_branch_2_id, NOW() - INTERVAL '17 days',          NOW() + INTERVAL '7 days', FALSE),
    (u[15], v_c2b, v_branch_2_id, NOW() - INTERVAL '9 days',           NOW() + INTERVAL '7 days', FALSE),
    (u[15], v_c2a, v_branch_2_id, NOW() - INTERVAL '3 days',           NOW() + INTERVAL '7 days', FALSE),
    -- u16: new customer
    (u[16], v_c2b, v_branch_2_id, NOW() - INTERVAL '7 days',           NOW() + INTERVAL '7 days', FALSE),
    -- u17: at_risk
    (u[17], v_c2a, v_branch_2_id, NOW() - INTERVAL '80 days',          NOW() + INTERVAL '1 day', TRUE);

  -- ── 9. Sync redemption counters ───────────────────────────────
  UPDATE public.coupons
  SET current_redemptions = (
    SELECT COUNT(*)
    FROM   public.user_redemptions
    WHERE  coupon_id = coupons.id
  )
  WHERE id IN (v_c1a, v_c1b, v_c1c, v_c2a, v_c2b);

  RAISE NOTICE 'Seed complete. Branch 1 "%" → 3 coupons, 10 users, 25 redemptions. Branch 2 "%" → 2 coupons, 7 users, 15 redemptions.',
    v_branch_1_name, v_branch_2_name;

END $$;

SET session_replication_role = DEFAULT;
