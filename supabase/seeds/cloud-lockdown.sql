-- Cloud security rail — run LAST, after every other seed file (see `make seed-cloud`).
--
-- Purpose: the seed data ships ~150 sample auth accounts so dashboards, follower
-- badges and analytics look realistic. On a publicly reachable cloud project those
-- accounts (with their well-known seed passwords baked into git) must NOT be able to
-- sign in. This disables interactive login for every SEEDED account while leaving the
-- rows in place so FK references (businesses.owner_id, follows.user_id,
-- *_ratings.user_id, user_redemptions.user_id) stay intact.
--
-- ALLOWED to log in (the only sanctioned dev accounts):
--   admin@ilokal.dev      → admin dashboard
--   owner@ilokal.dev      → business dashboard (owns the seed businesses)
--   testuser@ilokal.dev   → mobile app test account
--
-- Real accounts created via normal sign-up AFTER this runs are never touched —
-- they don't match the seed patterns below — so genuine new users work normally.
--
-- Idempotent: only ever (re)locks the same seed-pattern rows.
--
-- The three sanctioned accounts keep the in-git `ilokal@dev` password (set/reset
-- by users.sql's upsert) so they stay predictably loginable across re-seeds — this
-- file never rotates them. If you need a secret password for a real preview, change
-- it by hand in the dashboard AFTER seeding, not via the seeder.

-- 1. Lock out every sample account: ban (GoTrue rejects login while banned_until is
--    in the future) AND null the password (defence-in-depth — even if un-banned, the
--    known seed passwords no longer work). Excludes the three sanctioned accounts.
UPDATE auth.users
SET banned_until       = '2999-12-31 00:00:00+00',  -- far future; GoTrue blocks login while banned
    encrypted_password = NULL
WHERE (
       email LIKE '%@test.local'           -- 60 bulk dashboard test users (sample123)
    OR email LIKE 'follower%@ilokal.dev'   -- 90 follower fixtures
)
AND email NOT IN ('admin@ilokal.dev', 'owner@ilokal.dev', 'testuser@ilokal.dev');

-- 2. Make sure the three sanctioned accounts are explicitly NOT banned (re-runnable
--    safety: clears a ban if one was ever set, e.g. by tightening the patterns above).
UPDATE auth.users
SET banned_until = NULL
WHERE email IN ('admin@ilokal.dev', 'owner@ilokal.dev', 'testuser@ilokal.dev');

-- Report what the gate looks like now.
\echo 'cloud-lockdown: login-enabled accounts after lockdown ->'
SELECT email, role, (banned_until IS NULL AND encrypted_password IS NOT NULL) AS can_login
FROM auth.users
WHERE banned_until IS NULL AND encrypted_password IS NOT NULL
ORDER BY email;
