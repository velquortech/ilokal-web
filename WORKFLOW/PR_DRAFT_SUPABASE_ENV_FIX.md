PR Title: fix(supabase): make service role key and DB URL server-only

Branch name: fix/supabase-server-envs

Description

- Remove accidental client exposure of Supabase server secrets and DB URL.
- Enforce server-only env names: `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL`.
- Update local bootstrap and config to avoid writing server secrets with `NEXT_PUBLIC_` prefix.
- Harden CSP in production to disallow `unsafe-inline` and `unsafe-eval` for scripts/styles.

Files changed (high level)

- `supabase/server.ts` — require `SUPABASE_SERVICE_ROLE_KEY` for admin server client.
- `next.config.ts` — stop exporting server-only envs; tighten security headers/CSP.
- `Makefile` — write server-only env names when bootstrapping `.env` locally.
- `WORKFLOW/PR_SUPABASE_ENV_FIX.md` and `WORKFLOW/SECRET_ROTATION_STEPS.md` — documentation and rotation checklist.

Why

- `NEXT_PUBLIC_` env vars are in client bundles. Any server-only secret exposed this way is a critical leak.

Risk & Rollback

- Risk: Low — changes only rename/read env vars and update local bootstrap and config. No DB migrations.
- Rollback: Revert this branch to restore previous behavior if needed; re-add old env names to CI temporarily while investigating.

Reviewer checklist

- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` are added to GitHub Actions and hosting provider secrets (server scope only).
- [ ] Verify `next.config.ts` does not export server-only secrets (search for `NEXT_PUBLIC_SUPABASE*`).
- [ ] Run `npm run ci:checks` and confirm tests pass locally and on CI.
- [ ] Smoke test staging admin flows that use the service key.

Post-merge actions

1. Create new `service_role` key in Supabase Console and add it to CI/hosting as `SUPABASE_SERVICE_ROLE_KEY`.
2. Redeploy staging and run smoke tests. After stable, revoke the old key in Supabase.
3. Remove any local or backup files that contain the old `NEXT_PUBLIC_` secret names.

Commands

```bash
# Run lint, protected-route checks, and tests
npm run ci:checks

# Regenerate local .env (Makefile target)
make setup-supabase
```

## Suggested PR body (copy to GitHub)

Summary

This PR ensures Supabase server secrets (service role key and DB URL) are never exposed to client bundles. It updates the server wrapper to require `SUPABASE_SERVICE_ROLE_KEY`, removes any export of server-only secrets from `next.config.ts`, and updates the local bootstrap `Makefile` to use server-scoped env names.

Why

Exposing server-only secrets with `NEXT_PUBLIC_` is a security risk — this change prevents accidental leakage and adds a small documentation/rotation workflow to safely rotate keys.

Changes

- Require `SUPABASE_SERVICE_ROLE_KEY` in `supabase/server.ts`.
- Stop exporting server secrets from `next.config.ts`.
- Update `Makefile` to write server-only env names for local bootstrapping.
- Add `WORKFLOW/SECRET_ROTATION_STEPS.md` with rotation and CI update checklist.

Checklist

- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` to repository secrets and hosting envs (server-only).
- [ ] Redeploy staging and run `npm run ci:checks`.
- [ ] Revoke old Supabase service role key after staging validates.

I will not open the PR automatically; confirm if you want me to create the GitHub PR from this branch.

## API wrapper: isomorphic Supabase client (branch: feat-backend/isomorphic-service-layer-auth-wrapper)

- **Purpose:** Centralize Supabase client creation and unify server/client auth flows.

### How to use (short)

- Server (API routes / server actions):

```ts
import { createServerSupabase } from 'supabase/server';
const { supabaseAdmin, setAuthCookie } = createServerSupabase({ req, res });
```

- Client (browser):

```ts
import { createClientSupabase } from 'supabase/client';
const supabase = createClientSupabase();
```

### Benefits

- Keeps service-role secrets server-only and removes accidental client exposure.
- Centralizes cookie handling and auth flows for consistency across the app.
- Provides typed responses and Zod-friendly patterns for safer runtime validation.
- Easier to mock and test; simpler operational rotation (see WORKFLOW docs).

### Short examples & notes

- Server insert:

```ts
const { supabaseAdmin } = createServerSupabase({ req, res });
await supabaseAdmin.from('items').insert({ name: 'x' });
```

- Client read:

```ts
const client = createClientSupabase();
const { data } = await client.from('items').select('*');
```

### Reviewer checklist (API wrapper)

- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` exist in CI/hosting (server scope only).
- [ ] Search for accidental `NEXT_PUBLIC_` server secrets in the repo.
- [ ] Run `npm run ci:checks` and smoke-test admin endpoints that use the service key.
