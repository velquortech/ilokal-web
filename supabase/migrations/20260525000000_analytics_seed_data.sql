-- Analytics seed data for development
-- Only inserts when the test cafe business exists

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001') THEN
    RETURN;
  END IF;

  -- ----------------------------------------------------------------
  -- 1. Coupons for Test Cafe
  -- ----------------------------------------------------------------
  INSERT INTO public.coupons
    (id, business_id, code, description, discount, promotion_type, status, usage_scope,
     start_date, expiry_date, max_redemptions_global, current_redemptions)
  VALUES
    ('ca010000-0000-0000-0000-000000000000',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'DISC20', '20% Off Any Item',
     '{"type":"percentage","value":20}',
     'deal', 'published', 'any',
     NOW() - INTERVAL '180 days', NOW() + INTERVAL '30 days',
     100, 17),
    ('ca020000-0000-0000-0000-000000000000',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'SAVE50', 'Save ₱50 on Your Order',
     '{"type":"fixed_amount","value":50}',
     'coupon', 'published', 'any',
     NOW() - INTERVAL '180 days', NOW() + INTERVAL '60 days',
     80, 12),
    ('ca030000-0000-0000-0000-000000000000',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'BOGO50', 'Buy 1 Get 1 at 50% Off',
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
    ('cc010000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo1@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc020000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo2@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc030000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo3@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc040000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo4@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc050000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo5@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc060000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo6@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc070000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo7@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc080000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo8@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc090000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo9@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc0a0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo10@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc0b0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo11@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc0c0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo12@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc0d0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo13@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc0e0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo14@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('cc0f0000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'demo15@seed.local', '',
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 3. Profiles for demo users
  -- ----------------------------------------------------------------
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES
    ('cc010000-0000-0000-0000-000000000000', 'demo1@seed.local',  'Demo User 1',  'user', 'active'),
    ('cc020000-0000-0000-0000-000000000000', 'demo2@seed.local',  'Demo User 2',  'user', 'active'),
    ('cc030000-0000-0000-0000-000000000000', 'demo3@seed.local',  'Demo User 3',  'user', 'active'),
    ('cc040000-0000-0000-0000-000000000000', 'demo4@seed.local',  'Demo User 4',  'user', 'active'),
    ('cc050000-0000-0000-0000-000000000000', 'demo5@seed.local',  'Demo User 5',  'user', 'active'),
    ('cc060000-0000-0000-0000-000000000000', 'demo6@seed.local',  'Demo User 6',  'user', 'active'),
    ('cc070000-0000-0000-0000-000000000000', 'demo7@seed.local',  'Demo User 7',  'user', 'active'),
    ('cc080000-0000-0000-0000-000000000000', 'demo8@seed.local',  'Demo User 8',  'user', 'active'),
    ('cc090000-0000-0000-0000-000000000000', 'demo9@seed.local',  'Demo User 9',  'user', 'active'),
    ('cc0a0000-0000-0000-0000-000000000000', 'demo10@seed.local', 'Demo User 10', 'user', 'active'),
    ('cc0b0000-0000-0000-0000-000000000000', 'demo11@seed.local', 'Demo User 11', 'user', 'active'),
    ('cc0c0000-0000-0000-0000-000000000000', 'demo12@seed.local', 'Demo User 12', 'user', 'active'),
    ('cc0d0000-0000-0000-0000-000000000000', 'demo13@seed.local', 'Demo User 13', 'user', 'active'),
    ('cc0e0000-0000-0000-0000-000000000000', 'demo14@seed.local', 'Demo User 14', 'user', 'active'),
    ('cc0f0000-0000-0000-0000-000000000000', 'demo15@seed.local', 'Demo User 15', 'user', 'active')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 4. Subscriptions (15 followers, spread across months)
  -- ----------------------------------------------------------------
  INSERT INTO public.subscriptions (id, user_id, business_id, created_at)
  VALUES
    -- Dec 2025 cohort (u01-u03, ~175 days ago)
    (gen_random_uuid(), 'cc010000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '175 days'),
    (gen_random_uuid(), 'cc020000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '175 days'),
    (gen_random_uuid(), 'cc030000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '175 days'),
    -- Jan 2026 cohort (u04-u07, ~135 days ago)
    (gen_random_uuid(), 'cc040000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cc050000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cc060000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'cc070000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '135 days'),
    -- Feb 2026 cohort (u08-u09, ~109 days ago)
    (gen_random_uuid(), 'cc080000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '109 days'),
    (gen_random_uuid(), 'cc090000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '109 days'),
    -- Mar 2026 cohort (u10-u11, ~81 days ago)
    (gen_random_uuid(), 'cc0a0000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '81 days'),
    (gen_random_uuid(), 'cc0b0000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '81 days'),
    -- Apr 2026 cohort (u12-u15, ~54 days ago)
    (gen_random_uuid(), 'cc0c0000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '54 days'),
    (gen_random_uuid(), 'cc0d0000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '54 days'),
    (gen_random_uuid(), 'cc0e0000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '54 days'),
    (gen_random_uuid(), 'cc0f0000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() - INTERVAL '54 days')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------
  -- 5. Coupon redemptions
  -- ----------------------------------------------------------------
  -- Champions: u01-u03 (coupon A = DISC20)
  INSERT INTO public.coupon_redemptions (id, coupon_id, user_id, redeemed_at)
  VALUES
    -- u01
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc010000-0000-0000-0000-000000000000', NOW() - INTERVAL '170 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc010000-0000-0000-0000-000000000000', NOW() - INTERVAL '140 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc010000-0000-0000-0000-000000000000', NOW() - INTERVAL '110 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc010000-0000-0000-0000-000000000000', NOW() - INTERVAL '75 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc010000-0000-0000-0000-000000000000', NOW() - INTERVAL '45 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc010000-0000-0000-0000-000000000000', NOW() - INTERVAL '3 days'),
    -- u02
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc020000-0000-0000-0000-000000000000', NOW() - INTERVAL '165 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc020000-0000-0000-0000-000000000000', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc020000-0000-0000-0000-000000000000', NOW() - INTERVAL '105 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc020000-0000-0000-0000-000000000000', NOW() - INTERVAL '70 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc020000-0000-0000-0000-000000000000', NOW() - INTERVAL '40 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc020000-0000-0000-0000-000000000000', NOW() - INTERVAL '5 days'),
    -- u03
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc030000-0000-0000-0000-000000000000', NOW() - INTERVAL '160 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc030000-0000-0000-0000-000000000000', NOW() - INTERVAL '130 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc030000-0000-0000-0000-000000000000', NOW() - INTERVAL '100 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc030000-0000-0000-0000-000000000000', NOW() - INTERVAL '65 days'),
    (gen_random_uuid(), 'ca010000-0000-0000-0000-000000000000', 'cc030000-0000-0000-0000-000000000000', NOW() - INTERVAL '7 days'),
    -- Loyal: u04-u07 (coupon B = SAVE50)
    -- u04
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc040000-0000-0000-0000-000000000000', NOW() - INTERVAL '135 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc040000-0000-0000-0000-000000000000', NOW() - INTERVAL '105 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc040000-0000-0000-0000-000000000000', NOW() - INTERVAL '10 days'),
    -- u05
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc050000-0000-0000-0000-000000000000', NOW() - INTERVAL '130 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc050000-0000-0000-0000-000000000000', NOW() - INTERVAL '55 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc050000-0000-0000-0000-000000000000', NOW() - INTERVAL '12 days'),
    -- u06
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc060000-0000-0000-0000-000000000000', NOW() - INTERVAL '125 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc060000-0000-0000-0000-000000000000', NOW() - INTERVAL '14 days'),
    -- u07
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc070000-0000-0000-0000-000000000000', NOW() - INTERVAL '120 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc070000-0000-0000-0000-000000000000', NOW() - INTERVAL '50 days'),
    -- New: u08-u09 (coupon C = BOGO50)
    (gen_random_uuid(), 'ca030000-0000-0000-0000-000000000000', 'cc080000-0000-0000-0000-000000000000', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), 'ca030000-0000-0000-0000-000000000000', 'cc090000-0000-0000-0000-000000000000', NOW() - INTERVAL '8 days'),
    -- At-risk: u10-u13 (coupon C = BOGO50)
    (gen_random_uuid(), 'ca030000-0000-0000-0000-000000000000', 'cc0a0000-0000-0000-0000-000000000000', NOW() - INTERVAL '80 days'),
    (gen_random_uuid(), 'ca030000-0000-0000-0000-000000000000', 'cc0b0000-0000-0000-0000-000000000000', NOW() - INTERVAL '75 days'),
    (gen_random_uuid(), 'ca030000-0000-0000-0000-000000000000', 'cc0c0000-0000-0000-0000-000000000000', NOW() - INTERVAL '50 days'),
    (gen_random_uuid(), 'ca030000-0000-0000-0000-000000000000', 'cc0d0000-0000-0000-0000-000000000000', NOW() - INTERVAL '45 days'),
    -- Lost: u14-u15 (coupon B = SAVE50)
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc0e0000-0000-0000-0000-000000000000', NOW() - INTERVAL '155 days'),
    (gen_random_uuid(), 'ca020000-0000-0000-0000-000000000000', 'cc0f0000-0000-0000-0000-000000000000', NOW() - INTERVAL '115 days');

  -- ----------------------------------------------------------------
  -- 6. Business ratings
  -- ----------------------------------------------------------------
  INSERT INTO public.business_ratings (id, user_id, business_id, rating)
  VALUES
    (gen_random_uuid(), 'cc010000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 5),
    (gen_random_uuid(), 'cc020000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 5),
    (gen_random_uuid(), 'cc030000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 4),
    (gen_random_uuid(), 'cc040000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 4),
    (gen_random_uuid(), 'cc050000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 5),
    (gen_random_uuid(), 'cc060000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 3),
    (gen_random_uuid(), 'cc070000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 4)
  ON CONFLICT (user_id, business_id) DO NOTHING;

END $$;
