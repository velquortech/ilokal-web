# Signup page — Business tab: parities + action items

> Scope: the signup page's Business Owner path only (`components/auth/SignupForm.tsx`
> + `app/(auth)/actions/authActions.ts` + the profile-creation DB path).
> Investigated 2026-07-17. Delete this file when all items land.

## Root cause of the role bug (business signup saves `app_user`)

Three-step chain, confirmed against the live schema:

1. `supabase.auth.signUp()` fires the `on_auth_user_created` trigger
   (`handle_new_user`, migration `20260508000006`), which inserts the profile
   with a **hardcoded `role = 'app_user'`** — it never reads the chosen role.
2. `signupAction` then tries to fix it: it upserts `role: 'business_owner'`
   into `profiles` — but through the **new user's own cookie session**
   (non-admin, self-update).
3. The SEC-1 trigger `prevent_profile_self_privilege` (migration
   `20260717000001`) **silently reverts any non-admin self-change to `role`**.
   So the upsert succeeds but the role stays `app_user`.

Before SEC-1 the flow "worked" only because it rode the exact unguarded
self-update that was the CRITICAL privilege-escalation hole (any user could
make themselves `admin` the same way). The fix must NOT reopen that hole —
role must be assigned by a privileged path, never by client-session update.

## PARITY TABLE — current vs. target

| # | Area | Current state | Target state | Risk | Effort |
|---|------|---------------|--------------|------|--------|
| SB1 | Role persistence | `handle_new_user` hardcodes `'app_user'`; action's role upsert reverted by SEC-1 → business signups stored as `app_user` | Pass role via `auth.signUp({ options: { data: { role, full_name } } })`; `handle_new_user` reads `raw_user_meta_data->>'role'` through an **allowlist of `('app_user','business_owner')`** — `'admin'` (or anything else) falls back to `'app_user'`. SEC-1 stays untouched | HIGH (auth, migration) | S |
| SB2 | Role self-upsert in action | `signupAction` upserts `role` via the user's own session (dead write since SEC-1) | Stop writing `role` from the action entirely; profile row is fully correct from the trigger. Keep the upsert for `full_name`/`phone_number`/`avatar_url` only (unguarded columns — allowed self-updates) | MED | S |
| SB3 | UI side effects | 4 `useEffect`s drive toasts/redirect off `useActionState` state (loading, error, fieldErrors, success) — effect-vs-state races caused the stale "Creating your account..." toast | Single async submit handler: RHF `handleSubmit` → call the server action directly → sequential `toast.loading` → `toast.error`/`toast.success` (same toast id, updated in place) → redirect/modal. No `useEffect`, no `lastErrorShown` dedupe state | LOW | S |
| SB4 | Success message truth | Success toast/modal text derives from `state.role` (the *requested* role) while the DB row said `app_user` — UI lied | `signupFormAction` returns `response.user.role` (the *persisted* role, re-fetched after insert); once SB1 lands the persisted role is correct and message matches DB | LOW | — (falls out of SB1) |
| SB5 | Email-exists precheck | `signupAction` SELECTs `profiles` by email with the anon/cookie client — `profiles` public SELECT is restricted (`20260526000005`), so the check can't see other users' rows: dead code, and a user-enumeration surface if RLS ever loosened | Delete the precheck; rely on `auth.signUp`'s own duplicate-email handling (already mapped to a friendly message in the catch) | LOW | S |
| SB6 | Orphan-cleanup path | On profile upsert failure the action calls `supabase.auth.admin.deleteUser()` on the **anon-key cookie client** — always fails (admin API needs service role); silently swallowed | Either use `createServerAdminClient()` for cleanup, or drop the branch (once SB1 lands the trigger creates the profile atomically with the auth user, so the failure mode disappears) | LOW | S |
| SB7 | PII logging | `signupFormAction` `console.info`s the submitted name + email on every attempt | Remove the info logs (keep error logs, no PII) | LOW | S |

## ACTION ITEMS (ordered)

### SB-A — Migration: role-aware `handle_new_user` (fixes SB1). HIGH-risk, needs approval.
`make migrate-new name=handle_new_user_role_from_metadata`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- Allowlist: only the two self-service roles; anything else (incl. a
    -- forged 'admin') falls back to 'app_user'. Admin accounts are created
    -- by admins, never by signup metadata.
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('app_user', 'business_owner')
         THEN NEW.raw_user_meta_data->>'role'
         ELSE 'app_user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

Security note: `raw_user_meta_data` IS client-controllable (any caller of
`auth.signUp` can set it) — that's fine *only* because the allowlist restricts
it to the two roles anyone may freely pick at signup anyway. `'admin'` must
never be honored from metadata. `sync_role_to_jwt` fires on the INSERT, so the
JWT gets the right role immediately.

**Acceptance:** business signup → `profiles.role = 'business_owner'` + JWT
`app_metadata.role = 'business_owner'`; customer signup → `app_user`; signup
with forged `role: 'admin'` metadata → `app_user`. SEC-1 red-team still passes.
**Rollback:** re-apply the `20260508000006` function body.

### SB-B — Action cleanup (SB2, SB5, SB6, SB7). Ships with SB-A.
- `signupAction`: pass `options: { data: { full_name, role } }` to
  `auth.signUp`; drop `role` from the profile upsert payload; delete the
  email precheck; drop or fix the dead `auth.admin.deleteUser` branch; remove
  PII `console.info`s.

### SB-C — De-`useEffect` the form (SB3). **STATUS: DONE (2026-07-17).**
Replaced `useActionState` + 4 `useEffect`s with a single `handleSubmit`
async flow calling `signupFormAction` directly; toasts update one id in
place (`loading → error/success`); redirect/modal invoked inline. Removed
`lastErrorShown` and the hidden role input.

### Testing plan
- Unit: `handle_new_user` metadata allowlist (SQL test or red-team script) —
  business/customer/forged-admin cases.
- Route/action: `signupFormAction` returns persisted role; error branches
  (duplicate email, weak password) produce `error`/`fieldErrors` without
  throwing.
- Manual: business-tab signup end-to-end → dashboard redirect goes to
  `/business/...` (roleRoute depends on the now-correct role), profile row +
  JWT both `business_owner`.
