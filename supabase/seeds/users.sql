-- Dev seed: loginable accounts for admin dashboard, business dashboard, and mobile testing
-- Password for all accounts: ilokal@dev (local dev only — never use in production)
--
-- Accounts created:
--   admin@ilokal.dev       → role: admin       (access admin dashboard)
--   owner@ilokal.dev       → role: business_owner (owns all 5 seed businesses)
--   testuser@ilokal.dev    → role: user        (mobile app test account)

SET session_replication_role = replica;

-- ── Auth users ────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, email_change_token_current, reauthentication_token
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@ilokal.dev',
    crypt('ilokal@dev', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(), false, false,
    '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'owner@ilokal.dev',
    crypt('ilokal@dev', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(), false, false,
    '', '', '', '', '', ''
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'testuser@ilokal.dev',
    crypt('ilokal@dev', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(), false, false,
    '', '', '', '', '', ''
  )
ON CONFLICT (id) DO UPDATE SET
  confirmation_token        = '',
  recovery_token            = '',
  email_change_token_new    = '',
  email_change              = '',
  email_change_token_current= '',
  reauthentication_token    = '';

-- ── Auth identities (required for email login) ────────────────────────────────

INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"admin@ilokal.dev","email_verified":true,"phone_verified":false}',
    'email', NOW(), NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"owner@ilokal.dev","email_verified":true,"phone_verified":false}',
    'email', NOW(), NOW(), NOW()
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","email":"testuser@ilokal.dev","email_verified":true,"phone_verified":false}',
    'email', NOW(), NOW(), NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ── Profiles ──────────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, phone_number, avatar_url, role, status)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'admin@ilokal.dev',
    'Seed Admin',
    '+63 9120000001',
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatar.png',
    'admin',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'owner@ilokal.dev',
    'Seed Business Owner',
    '+63 9120000002',
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/00000000-0000-0000-0000-000000000001/avatar.png',
    'business_owner',
    'active'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'testuser@ilokal.dev',
    'Test User',
    '+63 9120000003',
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/ffffffff-ffff-ffff-ffff-ffffffffffff/avatar.png',
    'app_user',
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  full_name    = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  avatar_url   = EXCLUDED.avatar_url,
  updated_at   = NOW();

-- ── Test user domain data (subscriptions, redemptions, ratings) ───────────────
-- Depends on: businesses.sql, coupons.sql

-- Follows: Artisan Roastery, Flora & Flour, Luna & Leaf
INSERT INTO public.follows (id, user_id, business_id)
VALUES
  ('55555555-5555-5555-5555-555555555501', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111101'),
  ('55555555-5555-5555-5555-555555555502', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111102'),
  ('55555555-5555-5555-5555-555555555503', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111105')
ON CONFLICT (user_id, business_id) DO NOTHING;

-- Redemptions: active (not claimed, not expired) | claimed | expired
INSERT INTO public.user_redemptions (id, user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
VALUES
  -- active: Cold Brew BOGO at Artisan Roastery Ermita — expires in 25 mins
  ('66666666-6666-6666-6666-666666666601',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '44444444-4444-4444-4444-444444444402',
    '22222222-2222-2222-2222-222222222201',
    NOW(), NOW() + INTERVAL '25 minutes', false),

  -- claimed: Free Pandesal at Flora & Flour Binondo
  ('66666666-6666-6666-6666-666666666602',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '44444444-4444-4444-4444-444444444403',
    '22222222-2222-2222-2222-222222222202',
    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '105 minutes', true),

  -- expired: ₱100 Off Power Tools at Handy Corner Paco (not claimed, already expired)
  ('66666666-6666-6666-6666-666666666603',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '44444444-4444-4444-4444-444444444405',
    '22222222-2222-2222-2222-222222222203',
    NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', false)
ON CONFLICT (id) DO NOTHING;

-- Ratings: one per business
INSERT INTO public.business_ratings (id, user_id, business_id, rating, comment)
VALUES
  ('77777777-7777-7777-7777-777777777701', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111101', 5, 'Best specialty coffee in Manila. The pour over is exceptional.'),
  ('77777777-7777-7777-7777-777777777702', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111102', 4, 'Ube pandesal is addictive. Gets crowded on weekends though.'),
  ('77777777-7777-7777-7777-777777777703', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111103', 3, 'Good stock. Staff could be more knowledgeable on products.'),
  ('77777777-7777-7777-7777-777777777704', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111104', 5, 'Amazing stylists. Hair color came out exactly as I wanted.'),
  ('77777777-7777-7777-7777-777777777705', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111105', 4, 'Healthy and filling bowls. Turmeric latte is a must-try.')
ON CONFLICT (id) DO NOTHING;

-- Follows: testuser follows 3 of the new businesses
INSERT INTO public.follows (id, user_id, business_id)
VALUES
  ('55555555-5555-5555-5555-555555555504', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111106'),
  ('55555555-5555-5555-5555-555555555505', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555506', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111116')
ON CONFLICT (user_id, business_id) DO NOTHING;

-- Ratings: testuser rates all 11 new businesses
INSERT INTO public.business_ratings (id, user_id, business_id, rating, comment)
VALUES
  ('77777777-7777-7777-7777-777777777706', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111106', 5, 'Great craft beer selection and the pulutan platter is massive. Perfect night out.'),
  ('77777777-7777-7777-7777-777777777707', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111107', 5, 'Best isaw in Iloilo. Sauce is perfectly balanced. Always comes back here.'),
  ('77777777-7777-7777-7777-777777777708', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111108', 4, 'Everything I need just around the corner. Tita Nena is so welcoming.'),
  ('77777777-7777-7777-7777-777777777709', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111109', 5, 'Beautiful hablon pieces — bought a blouse and a scarf. Proudly Ilonggo.'),
  ('77777777-7777-7777-7777-777777777710', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111110', 5, 'Amazing Filipino lit selection. Staff recommended a great local author novel.'),
  ('77777777-7777-7777-7777-777777777711', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 5, 'The hilot massage was incredible. Most relaxed I have felt in months.'),
  ('77777777-7777-7777-7777-777777777712', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111112', 4, 'Clean gym, great equipment, and the yoga class instructor is excellent.'),
  ('77777777-7777-7777-7777-777777777713', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111113', 4, 'Screen replacement done in under an hour at a very fair price.'),
  ('77777777-7777-7777-7777-777777777714', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111114', 5, 'Charming guesthouse with the most genuine Filipino hospitality. Highly recommend.'),
  ('77777777-7777-7777-7777-777777777715', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111115', 5, 'Hablon weaving class was eye-opening. Took home a piece I made myself.'),
  ('77777777-7777-7777-7777-777777777716', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111116', 5, 'Amazing live band on Friday night. The cocktail pitcher was great value too.')
ON CONFLICT (id) DO NOTHING;

-- ── Bulk test users (60 total: 20 per role) ───────────────────────────────────
-- admin1-20@test.local | business_owner1-20@test.local | user1-20@test.local
-- Password for all: sample123

DO $$
DECLARE
  _user_id uuid;
  _email   text;
  _num     int;
BEGIN
  FOR _num IN 1..20 LOOP
    _email := 'admin' || _num::text || '@test.local';
    SELECT id INTO _user_id FROM auth.users WHERE email = _email;
    IF _user_id IS NULL THEN
      _user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, is_sso_user, is_anonymous,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current, reauthentication_token
      ) VALUES (
        _user_id, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        _email, crypt('sample123', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('role', 'admin'),
        false, false, false, '', '', '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        _user_id, _user_id::text, _user_id,
        jsonb_build_object('sub', _user_id::text, 'email', _email,
          'email_verified', true, 'phone_verified', false),
        'email', NOW(), NOW(), NOW()
      );
      INSERT INTO public.profiles (
        id, email, full_name, phone_number, role, status, created_at, updated_at
      ) VALUES (
        _user_id, _email,
        'Admin User ' || _num::text,
        '+123456' || LPAD(_num::text, 4, '0'),
        'admin', 'active', NOW(), NOW()
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  _user_id uuid;
  _email   text;
  _num     int;
BEGIN
  FOR _num IN 1..20 LOOP
    _email := 'business_owner' || _num::text || '@test.local';
    SELECT id INTO _user_id FROM auth.users WHERE email = _email;
    IF _user_id IS NULL THEN
      _user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, is_sso_user, is_anonymous,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current, reauthentication_token
      ) VALUES (
        _user_id, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        _email, crypt('sample123', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('role', 'business_owner'),
        false, false, false, '', '', '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        _user_id, _user_id::text, _user_id,
        jsonb_build_object('sub', _user_id::text, 'email', _email,
          'email_verified', true, 'phone_verified', false),
        'email', NOW(), NOW(), NOW()
      );
      INSERT INTO public.profiles (
        id, email, full_name, phone_number, role, status, created_at, updated_at
      ) VALUES (
        _user_id, _email,
        'Business Owner ' || _num::text,
        '+234567' || LPAD(_num::text, 4, '0'),
        'business_owner', 'active', NOW(), NOW()
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  _user_id uuid;
  _email   text;
  _num     int;
BEGIN
  FOR _num IN 1..20 LOOP
    _email := 'user' || _num::text || '@test.local';
    SELECT id INTO _user_id FROM auth.users WHERE email = _email;
    IF _user_id IS NULL THEN
      _user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, is_sso_user, is_anonymous,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current, reauthentication_token
      ) VALUES (
        _user_id, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        _email, crypt('sample123', gen_salt('bf')),
        NOW(), NOW(), NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('role', 'app_user'),
        false, false, false, '', '', '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        _user_id, _user_id::text, _user_id,
        jsonb_build_object('sub', _user_id::text, 'email', _email,
          'email_verified', true, 'phone_verified', false),
        'email', NOW(), NOW(), NOW()
      );
      INSERT INTO public.profiles (
        id, email, full_name, phone_number, role, status, created_at, updated_at
      ) VALUES (
        _user_id, _email,
        'User ' || _num::text,
        '+345678' || LPAD(_num::text, 4, '0'),
        'app_user', 'active', NOW(), NOW()
      );
    END IF;
  END LOOP;
END $$;

SET session_replication_role = DEFAULT;
