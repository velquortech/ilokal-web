-- Dev seed: sample followers for the 5 seed businesses.
-- Depends on: businesses.sql (business ids …1101–…1105).
--
-- Creates a pool of throwaway app-user accounts (auth.users + profiles) and
-- links them to businesses via public.follows, so total_followers — the
-- analytics dashboard metric AND the mobile follower badge — shows believable
-- sample numbers instead of 0.
--
-- Idempotent: deterministic UUIDs + ON CONFLICT DO NOTHING, safe to re-run.

-- Skip the auto-create-profile trigger (and FK triggers) during the bulk
-- insert; we write profiles explicitly. Mirrors supabase/seeds/users.sql.
SET session_replication_role = replica;

DO $$
DECLARE
  pool_size CONSTANT int := 90;
  -- business_id → target follower count (kept < pool_size).
  biz_ids uuid[] := ARRAY[
    '11111111-1111-1111-1111-111111111101', -- The Artisan Roastery
    '11111111-1111-1111-1111-111111111102', -- Flora & Flour Bakery
    '11111111-1111-1111-1111-111111111103', -- The Handy Corner
    '11111111-1111-1111-1111-111111111104', -- Aura Hair Studio
    '11111111-1111-1111-1111-111111111105'  -- Luna & Leaf Bistro
  ]::uuid[];
  counts int[] := ARRAY[84, 67, 29, 73, 15];
  i int;
  j int;
  n int;
  uid uuid;
BEGIN
  -- 1. Throwaway follower accounts (login disabled — followers, not testers).
  FOR i IN 1..pool_size LOOP
    uid := ('dddddddd-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;

    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, reauthentication_token
    )
    VALUES (
      uid, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'follower' || i || '@ilokal.dev',
      crypt('ilokal@dev', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}', '{}',
      NOW(), NOW(), false, false,
      '', '', '', '', '', ''
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      uid, 'follower' || i || '@ilokal.dev',
      'Demo Follower ' || i, 'app_user'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 2. Follows — the first N pool users follow each business. Overlap across
  --    businesses is intentional (a user can follow several shops).
  FOR j IN 1..array_length(biz_ids, 1) LOOP
    n := counts[j];
    FOR i IN 1..n LOOP
      uid := ('dddddddd-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
      INSERT INTO public.follows (user_id, business_id, created_at)
      VALUES (uid, biz_ids[j], NOW() - (i || ' days')::interval)
      ON CONFLICT (user_id, business_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

RESET session_replication_role;
