# Live database snapshot for local testing (`make pull-live`)

Test against **real** data: replaces the local Docker DB's `public` / `auth` /
`storage` data with a snapshot of the live (cloud) database.

```bash
# Recommended: store the cloud URL once in .env (git-ignored), then:
make pull-live

# Or inline (overrides .env):
SUPABASE_DB_URL='postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres' make pull-live
```

## What it does

1. **Dumps the live DB, data-only**, scoped to the four schemas it replaces
   (`public` / `auth` / `storage` / `graphql_public`) and excluding
   `supabase_migrations.schema_migrations`. The local *schema* comes from your
   own migrations (`make migrate-up`), so the snapshot stays version-agnostic
   and the migration ledger is never overwritten. pg_dump's own setval
   emission carries the live sequence values.
2. **Truncates** local `public` / `auth` / `storage` / `graphql_public` tables
   (exactly the schemas the dump is scoped to, so nothing restores onto
   untruncated rows).
3. **Restores** the dump with `session_replication_role = replica`, so INSERT
   triggers (e.g. `on_auth_user_created`) don't double-fire on already-consistent data.

## Environment

| Variable               | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `SUPABASE_DB_URL`      | Optional — inline live (cloud) connection string. **Wins over `.env`.** Refuses `localhost`/`127.0.0.1`. |
| `SUPABASE_LIVE_DB_URL` | Optional — live (cloud) connection string kept in the git-ignored `.env`; used when `SUPABASE_DB_URL` is unset. |
| `CONTAINER`            | Optional — local container name (default `supabase_db_ilokal-web`). |
| `DUMP_FILE`            | Optional — where the dump is written (default `/tmp/ilokal-live-dump.sql`). |

## Store the live URL once, in `.env` (recommended)

```bash
# .env — git-ignored (see .gitignore: `.env*` except `.env.example`)
SUPABASE_LIVE_DB_URL=postgresql://postgres:REAL-PASSWORD@db.<ref>.supabase.co:5432/postgres
```

Then `make pull-live` needs no shell variables. Precedence: an inline
`SUPABASE_DB_URL=… make pull-live` overrides the `.env` value; if your shell has
a stale `SUPABASE_DB_URL` exported (e.g. pointing at the local stack), run
`unset SUPABASE_DB_URL` so the `.env` value is used. The localhost guard applies
to whichever value resolves.

Prereqs: Docker running and the local Supabase stack started (`make setup-supabase`
or `yarn supabase start`). The dump runs with the local Postgres image's own
`pg_dump`, so no host-level Postgres client install is needed.

**Networking:** the DIRECT host `db.<ref>.supabase.co` is **IPv6-only**, and
machines without an IPv6 route (including the Docker bridge here) cannot reach
it. Use the **session pooler** as `SUPABASE_DB_URL` instead:
`postgresql://postgres.<ref>:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`
— port 6543 is SESSION mode (required by `pg_dump`/`psql`; 5432 is transaction
mode and will break dumps). The dump runs with `--network host` (see
`supabase/seeds/cloud-clean-replace.sh` for the same workaround); the
truncate/restore steps still run against the local container over its socket.

## Limitations

- **Storage image *files* are not transferred** — only `storage.objects`
  metadata. If live rows hold absolute cloud URLs, images keep loading from
  cloud; if they hold bare paths, they 404 locally until the objects are
  synced (out of scope here).
- **Auth sessions / refresh tokens are invalid locally** (signed with the
  cloud JWT secret). Users simply sign in again — password hashes carry over.
- **Destructive**: local data in those schemas is replaced. Dev/testing only.
- **Postgres version must match** — the local stack must run the same major
  version as the remote (see `supabase/config.toml` → `[db] major_version`).

## Order of operations for a full real-data environment

```bash
make migrate-up     # schema up to date (or migrate-reset for a clean slate)
make pull-live      # real data in
# if the app uses bare storage paths: sync live storage objects (future work)
```
