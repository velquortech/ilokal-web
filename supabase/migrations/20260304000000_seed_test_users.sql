-- Migration: Seed Test Users for Admin, Business Owner, and User roles
-- Creates 20 users per role (60 total) with REAL Supabase Auth entries
-- All users can log in with password: sample123
-- Users will appear in Supabase Authentication dashboard

-- ============================================================================
-- 1. DISABLE RLS ON PROFILES
-- ============================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE ADMIN USERS (20 total)
-- ============================================================================
DO $$
DECLARE
  _user_id uuid;
  _email text;
  _num int;
BEGIN
  FOR _num IN 1..20 LOOP
    _email := 'admin' || _num::text || '@test.local';
    _user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, reauthentication_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      _email,
      crypt('sample123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('role', 'admin'),
      false, false, false,
      '', '', '',
      '', '', ''
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      _user_id, _user_id::text, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
    VALUES (
      _user_id, _email,
      'Admin User ' || _num::text,
      '+123456' || LPAD(_num::text, 4, '0'),
      'admin', 'active', NOW(), NOW()
    );
  END LOOP;
END $$;

-- ============================================================================
-- 3. CREATE BUSINESS OWNER USERS (20 total)
-- ============================================================================
DO $$
DECLARE
  _user_id uuid;
  _email text;
  _num int;
BEGIN
  FOR _num IN 1..20 LOOP
    _email := 'business_owner' || _num::text || '@test.local';
    _user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, reauthentication_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      _email,
      crypt('sample123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('role', 'business_owner'),
      false, false, false,
      '', '', '',
      '', '', ''
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      _user_id, _user_id::text, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
    VALUES (
      _user_id, _email,
      'Business Owner ' || _num::text,
      '+234567' || LPAD(_num::text, 4, '0'),
      'business_owner', 'active', NOW(), NOW()
    );
  END LOOP;
END $$;

-- ============================================================================
-- 4. CREATE REGULAR USERS (20 total)
-- ============================================================================
DO $$
DECLARE
  _user_id uuid;
  _email text;
  _num int;
BEGIN
  FOR _num IN 1..20 LOOP
    _email := 'user' || _num::text || '@test.local';
    _user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, reauthentication_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      _email,
      crypt('sample123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('role', 'app_user'),
      false, false, false,
      '', '', '',
      '', '', ''
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      _user_id, _user_id::text, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
    VALUES (
      _user_id, _email,
      'User ' || _num::text,
      '+345678' || LPAD(_num::text, 4, '0'),
      'app_user', 'active', NOW(), NOW()
    );
  END LOOP;
END $$;

-- ============================================================================
-- 5. RE-ENABLE RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total users created: 60 (all visible in Supabase Authentication dashboard)
-- - 20 Admins:          admin1@test.local   ... admin20@test.local (role: 'admin')
-- - 20 Business Owners: business_owner1@test.local ... business_owner20@test.local (role: 'business_owner')
-- - 20 Consumers:       user1@test.local    ... user20@test.local (role: 'app_user')
--
-- Password for ALL accounts: sample123
-- Status: All profiles 'active', all emails confirmed
-- ============================================================================
