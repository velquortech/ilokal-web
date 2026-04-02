# CI / Hosting Secret Update Commands

Purpose: quick, copy-paste commands to add or update `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` in GitHub Actions and Vercel. Replace placeholders before running.

---

## GitHub (recommended: `gh` CLI)

Prereq: `gh` installed and authenticated as a user with repo admin rights.

Set a repository secret:

```bash
# export values into your shell (do NOT commit these)
export SUPABASE_SERVICE_ROLE_KEY="<new-service-role-key>"
export SUPABASE_DB_URL="<supabase-db-url>"

# set secrets in the repository
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY" --repo Velquor-Tech/ilokal-web
gh secret set SUPABASE_DB_URL --body "$SUPABASE_DB_URL" --repo Velquor-Tech/ilokal-web

# verify
gh secret list --repo Velquor-Tech/ilokal-web
```

If you prefer the REST API (non-interactive CI script), use `GITHUB_TOKEN` with the encrypted-secrets REST endpoints — follow GitHub docs for `actions/secrets`.

Notes:

- Use repository secrets for general use. Use environment-specific secrets (Environments) if you need staged separation.
- Do NOT create secrets with the `NEXT_PUBLIC_` prefix.

---

## Vercel

Prereq: `vercel` CLI installed and `VERCEL_TOKEN` env var set for a token with project write access.

Interactive (recommended):

```bash
# add secret (interactive expects value input)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_DB_URL production
```

Non-interactive (using Vercel API):

- Use the Vercel REST API to create/update environment variables. Example (replace placeholders):

```bash
export VERCEL_TOKEN="<your-vercel-token>"
PROJECT_ID="$(vercel projects ls --json | jq -r '.[] | select(.name=="ilokal-web") | .id')"

# Set env var via API
curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"SUPABASE_SERVICE_ROLE_KEY","value":"<new-service-role-key>","target":["production"]}'

curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"SUPABASE_DB_URL","value":"<supabase-db-url>","target":["production"]}'
```

---

## Quick rollout checklist

- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to GitHub and hosting (staging first).
- [ ] Redeploy staging and run `npm run ci:checks`.
- [ ] Smoke-test admin flows that require the service key.
- [ ] After staging stable, add secrets to production host and redeploy.
- [ ] Revoke old Supabase `service_role` key in the Supabase Console.

---

## Safety notes

- Never store the service role key in client-exposed env vars or commit it to the repo.
- Prefer short-lived rotation cadence if a key may have been exposed.
- Update internal runbooks with the new secret names.

If you want, I can now:

- (A) produce the exact `gh` and `vercel` commands pre-filled with values you provide, or
- (B) open a secure checklist issue/PR draft with these steps inserted.

I will not call any API that would write secrets unless you provide the values and explicit approval.
