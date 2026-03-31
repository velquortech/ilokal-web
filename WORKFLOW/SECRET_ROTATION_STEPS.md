# Supabase Service Key Rotation & CI Update

Purpose: provide a safe, repeatable checklist to rotate the Supabase `service_role` key and update CI/deployment secrets without downtime.

Preconditions:

- You (or a repo admin) have access to the Supabase project dashboard.
- You (or a repo admin) can update GitHub Actions secrets and your hosting provider (Vercel) environment variables.
- New key will be created before revoking the old key to avoid downtime.

Steps

1. Create new `service_role` key in Supabase

- Open Supabase Console → Settings → API → Service Role
- Create a new `service_role` key (copy it once; Supabase will show it only on creation)

2. Add new key to CI / Hosting (do NOT expose as NEXT_PUBLIC)

- GitHub Actions:
  - Go to repository Settings → Secrets and variables → Actions → New repository secret
  - Add `SUPABASE_SERVICE_ROLE_KEY` with the new key value
  - Add/verify `SUPABASE_DB_URL` exists and is correct
- Vercel (or other host):
  - Add `SUPABASE_SERVICE_ROLE_KEY` (server scope only) in project Environment Variables
  - Add `SUPABASE_DB_URL` (server scope only)

3. Smoke-test deployments (staging)

- Trigger a staging deployment or redeploy the branch that uses the new secrets.
- Run these checks:
  - `npm run ci:checks` (lint, protected-route check, tests)
  - Manual quick API smoke tests for admin endpoints that use the service key
  - Confirm server-side functionality (admin dashboards, scheduled jobs)

4. Cutover: revoke old key

- After staging is healthy and no errors appear for 24–48 hours (or your acceptable window), in Supabase Console revoke the old `service_role` key.
- If anything breaks, restore the previous key immediately and investigate.

5. Housekeeping

- Update any internal runbooks that referenced the old key name/value.
- Audit repository and CI history for accidental exposures; rotate other keys if needed.

Notes & Safety

- Never store `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_...` — public env vars expose secrets.
- Use `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations only.
- Consider adding a CI lint-check to fail if any server-only secret is named with `NEXT_PUBLIC_`.

Suggested GitHub PR body snippet

- Summary: Rotate Supabase `service_role` key and update CI/hosting secrets to `SUPABASE_SERVICE_ROLE_KEY` (server-only) and `SUPABASE_DB_URL`.
- Checklist:
  - [ ] Add new secrets to GitHub Actions and Vercel
  - [ ] Redeploy staging and run `npm run ci:checks`
  - [ ] Revoke old key in Supabase Console
  - [ ] Confirm production health

Contact

- If you want, I can draft the PR body and reviewer checklist (I won't open the PR without your confirmation).
