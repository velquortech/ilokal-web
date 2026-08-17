# Live database snapshot for local testing (`make pull-live`)

Test against **real** data: replaces the local Docker Supabase stack's
`public` / `auth` data **and storage files** with a snapshot of the live
(cloud) project.

```bash
# Recommended: live credentials live in .env.cloud (git-ignored), then:
make pull-live

# Or inline (overrides everything):
SUPABASE_DB_URL='postgresql://postgres:PASS@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require' make pull-live

# Review every step + command WITHOUT executing anything (secrets masked):
bash supabase/scripts/pull-live.sh --dry-run

# Regression check: run pull-live against a SCRATCH stack and assert the
# verification block (dev stack untouched). Needs live creds in .env.cloud;
# skips (exit 0) without them.
make pull-live-check
```

## What it does (in order)

1. **Resets the LOCAL database from migrations** (`supabase db reset --no-seed`)
   — local schema always matches the repo's own migrations, and every prior
   local test row is gone.
2. **Dumps the LIVE db, data-only** (custom format) scoped to
   `public` / `auth` / `storage` / `graphql_public`, excluding migration
   ledgers, storage internals and extension-member tables. Read-only.
3. **Truncates** local `public` tables — clears the migration-seeded baseline
   rows (`business_types`, `business_categories`, …) that collide with live
   data on restore.
4. **pg_restores** the dump into LOCAL. No `--disable-triggers` /
   `session_replication_role`: local `postgres` is NOT superuser, so both fail —
   the truncate removes the duplicate source and pg_restore loads FK-ordered.
5. **spatial_ref_sys** — PostGIS SRID rows are piped `COPY` live→local (pg_dump
   skips extension-member data).
6. **Restarts kong** (the reset leaves it with a stale upstream that 502s
   `/storage/v1/*`) and waits for the local REST API.
7. **Storage FILES** — every object in the live `storage.objects` catalog (the
   authoritative source — the list API returns stale/partial entries) is
   downloaded read-only from live and uploaded into LOCAL storage.
8. **Verifies** — public row counts, `auth.users` and storage object counts
   must match live, or the script exits non-zero. Every run appends a **dated
   report** to `supabase/reports/pull-live.log` (git-ignored; `REPORT_FILE`
   overrides the path) recording the exit status, which tables drifted from
   live (live vs local counts), and storage per-bucket drift — so drift over
   time is visible by reading the log instead of re-running queries.

Rows are restored **verbatim** — absolute cloud storage URLs are left as-is.
They render because the dev CSP in `next.config.ts` is widened with the live
storage origin (`liveStorageOrigin` reads `NEXT_PUBLIC_SUPABASE_URL` from
`.env.cloud`), so absolute URLs load directly instead of being rewritten in the
database.

## Regression check (`make pull-live-check`)

`supabase/scripts/check-pull-live.sh` runs `pull-live.sh` against a **scratch**
local Supabase stack and asserts the verification block passed:

- The scratch stack has its own `project_id` (`ilokal-web-check` → containers
  `supabase_*_ilokal-web-check`), ports offset +1000 (`5532x`, dev holds
  `5432x`), and its own generated storage key — so the dev stack is **never
  touched**, even while it is running.
- It applies the repo's own migrations (symlinked into the scratch project),
  runs the real `pull-live.sh` against it (read-only live access from
  `.env.cloud`), and asserts the `✓ Live snapshot loaded …` banner plus the
  `public tables: identical to live` line — a script regression fails the check.
- Without `.env.cloud` it prints `SKIP` and exits 0, so CI without live
  credentials stays green. The PR workflow's `Pull-live-check` job passes the
  live creds as secrets (`SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`) when configured.

## Environment

| Variable                   | Purpose                                                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_DB_URL`          | Optional — inline live (cloud) connection string. **Wins over `.env.cloud`/`.env`.** Refuses `localhost`/`127.0.0.1`.                                                                                                                   |
| `SUPABASE_LIVE_DB_URL`     | Optional — live (cloud) connection string kept in the git-ignored `.env`; used when `SUPABASE_DB_URL` is unset.                                                                                                                         |
| `.env.cloud`               | Recommended store for live creds: `SUPABASE_DB_URL` (live), `SUPABASE_SERVICE_ROLE_KEY` (live storage key) and `NEXT_PUBLIC_SUPABASE_URL` (live host). Used for the storage file sync, and by the dev CSP widening in `next.config.ts`. |
| `.env`                     | `SUPABASE_SERVICE_ROLE_KEY` (the LOCAL storage key) — read for uploading into local storage.                                                                                                                                            |
| `CONTAINER`                | Optional — local container name (default `supabase_db_ilokal-web`).                                                                                                                                                                     |
| `DUMP_FILE`                | Optional — where the dump is written (default `/tmp/ilokal-live-data.dump`).                                                                                                                                                            |
| `REPORT_FILE`              | Optional — where the dated verification report is appended (default `supabase/reports/pull-live.log`).                                                                                                                                  |
| `LOCAL_HOST` / `LOCAL_KEY` | Optional — overrides for the LOCAL REST host and storage key (defaults: `http://127.0.0.1:54321` and `.env`'s key). Used by `check-pull-live.sh` to target the scratch stack.                                                           |
| `SUPABASE_WORKDIR`         | Optional — points the supabase CLI at another project directory (`--workdir`). Used by `check-pull-live.sh` so `db reset` hits the scratch stack, not the dev one.                                                                      |
| `LIVE_KEY` / `LIVE_HOST`   | Optional — overrides for the LIVE service key / host (fall back to `.env.cloud`). Lets CI pass live creds without a checked-in `.env.cloud`.                                                                                            |

If the live storage key / host / local key are all present, the storage FILE
sync runs; otherwise the pull degrades to **database-only** with a warning
(backwards compatible with the old script's DB-only behaviour).

## Networking

The DIRECT host `db.<ref>.supabase.co` is **IPv6-only**, and machines without an
IPv6 route (including the Docker bridge here) cannot reach it. Use the
**session pooler** as `SUPABASE_DB_URL` instead:
`postgresql://postgres.<ref>:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`
— port 6543 is SESSION mode (required by `pg_dump`/`psql`; 5432 is transaction
mode and will break dumps). The dump runs with `--network host`; the
truncate/restore steps still run against the local container over its socket.

## Safety

- **Every LIVE access is read-only** — dumps, `SELECT`s, storage `GET`s. No
  write ever goes to the live project; all writes target the local Docker
  stack.
- **Destructive**: the LOCAL stack is reset and its data replaced. Dev/testing
  only.

## Limitations

- **Auth sessions / refresh tokens are invalid locally** (signed with the
  cloud JWT secret). Users simply sign in again — password hashes carry over.
- **Absolute-URL images need the cloud reachable** — rows carry live's
  absolute cloud URLs, and the dev CSP allows the cloud host, so those images
  load from the cloud (not local storage) while developing. If the machine is
  offline, those images break; the files still exist in local storage, but
  nothing rewrites the rows to point at them.
- **Postgres version must match** — the local stack must run the same major
  version as the remote (see `supabase/config.toml` → `[db] major_version`).
