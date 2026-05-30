-- Analytics seed data for the dev business account
-- Only inserts when the target business exists

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = 'c25214ac-4bbd-4106-b50d-859aecd94675') THEN
    RETURN;
  END IF;

  -- ----------------------------------------------------------------
  -- 1. Coupons for dev business
  -- ----------------------------------------------------------------
  INSERT INTO public.coupons
    (id, business_id, code, description, discount, promotion_type, status, usage_scope,
     start_date, expiry_date, max_redemptions_global, current_redemptions)
  VALUES
    ('cb010000-0000-0000-0000-000000000000',
     'c25214ac-4bbd-4106-b50d-859aecd94675',
     'DEV20', '20% Off Any Item',
     '{"type":"percentage","value":20}',
     'deal', 'published', 'any',
     NOW() - INTERVAL '180 days', NOW() + INTERVAL '30 days',
     100, 17),
    ('cb020000-0000-0000-0000-000000000000',
     'c25214ac-4bbd-4106-b50d-859aecd94675',
     'DEVSAVE', 'Save ₱50 on Your Order',
     '{"type":"fixed_amount","value":50}',
     'coupon', 'published', 'any',
     NOW() - INTERVAL '180 days', NOW() + INTERVAL '60 days',
     80, 12),
    ('cb030000-0000-0000-0000-000000000000',
     'c25214ac-4bbd-4106-b50d-859aecd94675',
     'DEVBOGO', 'Buy 1 Get 1 at 50% Off',
     '{"type":"percentage","value":50}',
     'deal', 'published', 'any',
     NOW() - INTERVAL '180 days', NOW() + INTERVAL '30 days',
     60, 6)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 2. Demo users in auth.users
  -- ----------------------------------------------------------------
  INSERT INTO auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at,
     raw_app_meta_data, raw_user_meta_data, is_super_admin)
  VALUES
    ('cd010000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev1@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd020000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev2@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd030000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev3@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd040000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev4@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd050000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev5@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd060000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev6@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd070000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev7@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd080000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev8@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd090000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev9@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd0a0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev10@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd0b0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev11@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd0c0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev12@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd0d0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev13@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd0e0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev14@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cd0f0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dev15@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 3. Profiles for demo users
  -- ----------------------------------------------------------------
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES
    ('cd010000-0000-0000-0000-000000000000', 'dev1@seed.local',  'Dev User 1',  'user', 'active'),
    ('cd020000-0000-0000-0000-000000000000', 'dev2@seed.local',  'Dev User 2',  'user', 'active'),
    ('cd030000-0000-0000-0000-000000000000', 'dev3@seed.local',  'Dev User 3',  'user', 'active'),
    ('cd040000-0000-0000-0000-000000000000', 'dev4@seed.local',  'Dev User 4',  'user', 'active'),
    ('cd050000-0000-0000-0000-000000000000', 'dev5@seed.local',  'Dev User 5',  'user', 'active'),
    ('cd060000-0000-0000-0000-000000000000', 'dev6@seed.local',  'Dev User 6',  'user', 'active'),
    ('cd070000-0000-0000-0000-000000000000', 'dev7@seed.local',  'Dev User 7',  'user', 'active'),
    ('cd080000-0000-0000-0000-000000000000', 'dev8@seed.local',  'Dev User 8',  'user', 'active'),
    ('cd090000-0000-0000-0000-000000000000', 'dev9@seed.local',  'Dev User 9',  'user', 'active'),
    ('cd0a0000-0000-0000-0000-000000000000', 'dev10@seed.local', 'Dev User 10', 'user', 'active'),
    ('cd0b0000-0000-0000-0000-000000000000', 'dev11@seed.local', 'Dev User 11', 'user', 'active'),
    ('cd0c0000-0000-0000-0000-000000000000', 'dev12@seed.local', 'Dev User 12', 'user', 'active'),
    ('cd0d0000-0000-0000-0000-000000000000', 'dev13@seed.local', 'Dev User 13', 'user', 'active'),
    ('cd0e0000-0000-0000-0000-000000000000', 'dev14@seed.local', 'Dev User 14', 'user', 'active'),
    ('cd0f0000-0000-0000-0000-000000000000', 'dev15@seed.local', 'Dev User 15', 'user', 'active')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 4. Subscriptions (15 followers, spread across months)
  -- ----------------------------------------------------------------
  INSERT INTO public.subscriptions (id, user_id, business_id, created_at)
  VALUES
    -- Dec 2025 cohort (u01-u03, ~175 days ago)
    (gen_random_uuid(), 'cd010000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '175 days'),
    (gen_random_uuid(), 'cd020000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '175 days'),
    (gen_random_uuid(), 'cd030000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '175 days'),
    -- Jan 2026 cohort (u04-u07, ~135 days ago)
    (gen_random_uuid(), 'cd040000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cd050000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cd060000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cd070000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '135 days'),
    -- Feb 2026 cohort (u08-u09, ~109 days ago)
    (gen_random_uuid(), 'cd080000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '109 days'),
    (gen_random_uuid(), 'cd090000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '109 days'),
    -- Mar 2026 cohort (u10-u11, ~81 days ago)
    (gen_random_uuid(), 'cd0a0000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '81 days'),
    (gen_random_uuid(), 'cd0b0000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '81 days'),
    -- Apr 2026 cohort (u12-u15, ~54 days ago)
    (gen_random_uuid(), 'cd0c0000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '54 days'),
    (gen_random_uuid(), 'cd0d0000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '54 days'),
    (gen_random_uuid(), 'cd0e0000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '54 days'),
    (gen_random_uuid(), 'cd0f0000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', NOW() - INTERVAL '54 days')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 5. Coupon redemptions
  -- ----------------------------------------------------------------
  -- Champions: u01-u03 (coupon A = DEV20)
  INSERT INTO public.coupon_redemptions (id, coupon_id, user_id, redeemed_at)
  VALUES
    -- u01
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd010000-0000-0000-0000-000000000000', NOW() - INTERVAL '170 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd010000-0000-0000-0000-000000000000', NOW() - INTERVAL '140 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd010000-0000-0000-0000-000000000000', NOW() - INTERVAL '110 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd010000-0000-0000-0000-000000000000', NOW() - INTERVAL '75 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd010000-0000-0000-0000-000000000000', NOW() - INTERVAL '45 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd010000-0000-0000-0000-000000000000', NOW() - INTERVAL '3 days'),
    -- u02
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd020000-0000-0000-0000-000000000000', NOW() - INTERVAL '165 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd020000-0000-0000-0000-000000000000', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd020000-0000-0000-0000-000000000000', NOW() - INTERVAL '105 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd020000-0000-0000-0000-000000000000', NOW() - INTERVAL '70 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd020000-0000-0000-0000-000000000000', NOW() - INTERVAL '40 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd020000-0000-0000-0000-000000000000', NOW() - INTERVAL '5 days'),
    -- u03
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd030000-0000-0000-0000-000000000000', NOW() - INTERVAL '160 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd030000-0000-0000-0000-000000000000', NOW() - INTERVAL '130 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd030000-0000-0000-0000-000000000000', NOW() - INTERVAL '100 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd030000-0000-0000-0000-000000000000', NOW() - INTERVAL '65 days'),
    (gen_random_uuid(), 'cb010000-0000-0000-0000-000000000000', 'cd030000-0000-0000-0000-000000000000', NOW() - INTERVAL '7 days'),
    -- Loyal: u04-u07 (coupon B = DEVSAVE)
    -- u04
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd040000-0000-0000-0000-000000000000', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd040000-0000-0000-0000-000000000000', NOW() - INTERVAL '105 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd040000-0000-0000-0000-000000000000', NOW() - INTERVAL '10 days'),
    -- u05
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd050000-0000-0000-0000-000000000000', NOW() - INTERVAL '130 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd050000-0000-0000-0000-000000000000', NOW() - INTERVAL '55 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd050000-0000-0000-0000-000000000000', NOW() - INTERVAL '12 days'),
    -- u06
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd060000-0000-0000-0000-000000000000', NOW() - INTERVAL '125 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd060000-0000-0000-0000-000000000000', NOW() - INTERVAL '14 days'),
    -- u07
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd070000-0000-0000-0000-000000000000', NOW() - INTERVAL '120 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd070000-0000-0000-0000-000000000000', NOW() - INTERVAL '50 days'),
    -- New: u08-u09 (coupon C = DEVBOGO)
    (gen_random_uuid(), 'cb030000-0000-0000-0000-000000000000', 'cd080000-0000-0000-0000-000000000000', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), 'cb030000-0000-0000-0000-000000000000', 'cd090000-0000-0000-0000-000000000000', NOW() - INTERVAL '8 days'),
    -- At-risk: u10-u13 (coupon C = DEVBOGO)
    (gen_random_uuid(), 'cb030000-0000-0000-0000-000000000000', 'cd0a0000-0000-0000-0000-000000000000', NOW() - INTERVAL '80 days'),
    (gen_random_uuid(), 'cb030000-0000-0000-0000-000000000000', 'cd0b0000-0000-0000-0000-000000000000', NOW() - INTERVAL '75 days'),
    (gen_random_uuid(), 'cb030000-0000-0000-0000-000000000000', 'cd0c0000-0000-0000-0000-000000000000', NOW() - INTERVAL '50 days'),
    (gen_random_uuid(), 'cb030000-0000-0000-0000-000000000000', 'cd0d0000-0000-0000-0000-000000000000', NOW() - INTERVAL '45 days'),
    -- Lost: u14-u15 (coupon B = DEVSAVE)
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd0e0000-0000-0000-0000-000000000000', NOW() - INTERVAL '155 days'),
    (gen_random_uuid(), 'cb020000-0000-0000-0000-000000000000', 'cd0f0000-0000-0000-0000-000000000000', NOW() - INTERVAL '115 days');

  -- ----------------------------------------------------------------
  -- 6. Business ratings
  -- ----------------------------------------------------------------
  INSERT INTO public.business_ratings (id, user_id, business_id, rating)
  VALUES
    (gen_random_uuid(), 'cd010000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 5),
    (gen_random_uuid(), 'cd020000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 5),
    (gen_random_uuid(), 'cd030000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 4),
    (gen_random_uuid(), 'cd040000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 4),
    (gen_random_uuid(), 'cd050000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 5),
    (gen_random_uuid(), 'cd060000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 3),
    (gen_random_uuid(), 'cd070000-0000-0000-0000-000000000000', 'c25214ac-4bbd-4106-b50d-859aecd94675', 4)
  ON CONFLICT (user_id, business_id) DO NOTHING;

END $$;
