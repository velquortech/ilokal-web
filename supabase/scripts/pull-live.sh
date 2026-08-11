#!/usr/bin/env bash
# =============================================================================
# pull-live.sh — snapshot the LIVE (cloud) database into the local Docker
# Supabase stack, for testing against real data.
#
# Usage:
#   SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres" \
#     bash supabase/scripts/pull-live.sh
#   # or, with the Makefile wrapper:
#   SUPABASE_DB_URL="postgresql://..." make pull-live
#
# What it does:
#   1. pg_dump the LIVE database — DATA ONLY, scoped to the four schemas we
#      replace, excluding the supabase_migrations.schema_migrations ledger.
#      The local SCHEMA comes from your own migrations (`make migrate-up`), so
#      the snapshot stays version-agnostic and the migration ledger is never
#      overwritten. pg_dump's own setval emission carries the live sequence
#      values, so serial/identity sequences are already correct.
#      Runs on the HOST network (--network host). The DIRECT cloud host
#      (db.<ref>.supabase.co) is IPv6-only, so SUPABASE_DB_URL must use the
#      SESSION POOLER (port 6543, user postgres.<ref>) which resolves IPv4 and
#      works from machines without IPv6.
#   2. TRUNCATE the local public/auth/storage/graphql_public tables (the same
#      four schemas the dump is scoped to, so nothing restores onto
#      untruncated rows).
#   3. RESTORE the dump with session_replication_role=replica, so INSERT
#      triggers (e.g. on_auth_user_created) do not double-fire on data that
#      is already consistent.
#
# Destructive: local data in those schemas is REPLACED. This is a dev/testing
# tool — do not point it at a production local copy you care about.
#
# Limitations (read before running):
#   - Storage OBJECTS metadata is copied, but the actual image FILES are not.
#     If the live rows hold absolute cloud URLs the images keep loading from
#     cloud; if they hold bare paths they will 404 locally until the objects
#     are copied (a storage sync is out of scope here).
#   - auth sessions / refresh tokens are signed with the cloud JWT secret, so
#     they will not work locally — users just sign in again with email +
#     password (the hashes carry over fine).
#   - The migration ledger is preserved, so `make migrate-up` stays correct.
# =============================================================================

set -euo pipefail

CONTAINER="${CONTAINER:-supabase_db_ilokal-web}"
DUMP_FILE="${DUMP_FILE:-/tmp/ilokal-live-dump.sql}"

# Resolve the LIVE (cloud) connection string. Precedence:
#   1. SUPABASE_DB_URL set inline (e.g. `SUPABASE_DB_URL=… make pull-live`) wins.
#   2. Otherwise SUPABASE_LIVE_DB_URL from the environment or the git-ignored
#      .env — the recommended place to store it, so the pull needs no shell
#      variables at all.
# The localhost guard below applies to whichever value resolves.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIVE_DB_URL="${SUPABASE_DB_URL:-${SUPABASE_LIVE_DB_URL:-}}"
if [ -z "$LIVE_DB_URL" ] && [ -f "$SCRIPT_DIR/../../.env" ]; then
  LIVE_DB_URL="$(
    grep -E '^SUPABASE_LIVE_DB_URL=' "$SCRIPT_DIR/../../.env" \
      | tail -1 | cut -d= -f2- | tr -d '"' | tr -d \' || true
  )"
fi

# ─────────────────────────────── guards ─────────────────────────────────────
if [ -z "${LIVE_DB_URL:-}" ]; then
  echo "error: no live DB connection string found." >&2
  echo "       Set SUPABASE_DB_URL inline (wins), or add SUPABASE_LIVE_DB_URL to" >&2
  echo "       your .env (git-ignored — recommended)." >&2
  echo "       Example: postgresql://postgres:PASS@db.REF.supabase.co:5432/postgres" >&2
  exit 1
fi

case "$LIVE_DB_URL" in
  *127.0.0.1*|*localhost*)
    echo "error: the live DB URL looks LOCAL — point it at the cloud project." >&2
    echo "       TIP: the shell's SUPABASE_DB_URL overrides .env. To use the .env" >&2
    echo "       SUPABASE_LIVE_DB_URL instead: unset SUPABASE_DB_URL" >&2
    exit 1
    ;;
esac

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  echo "error: local Supabase container '$CONTAINER' is not running." >&2
  echo "       Start it first: 'make setup-supabase' (or 'yarn supabase start')." >&2
  exit 1
fi

# ─────────────────────────────── 1. dump ────────────────────────────────────
# pg_dump runs in a THROWAWAY container on the HOST network, not via docker exec
# on the bridge: the DIRECT cloud host (db.<ref>.supabase.co) is IPv6-only and
# this machine has no IPv6 route ("Network is unreachable"), so SUPABASE_DB_URL
# must be the SESSION POOLER (port 6543, user postgres.<ref>) — it resolves
# IPv4 and is reachable. The image is the local DB container's own Postgres
# image (ships pg_dump matching the DB major version; no host-level client
# install needed) and dials out to the LIVE URL directly.
echo "→ Dumping LIVE database (data only, excluding the migration ledger)…"
DB_IMG="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null)"
DB_IMG="${DB_IMG:-public.ecr.aws/supabase/postgres:17.6.1.127}"
docker run --rm --network host -i "$DB_IMG" pg_dump "$LIVE_DB_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=auth \
  --schema=storage \
  --schema=graphql_public \
  --exclude-table-data='supabase_migrations.schema_migrations' \
  > "$DUMP_FILE"

# ─────────────────────────── 2. truncate local ──────────────────────────────
echo "→ Truncating local tables (public/auth/storage/graphql_public)…"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
      FROM pg_tables
     WHERE schemaname IN ('public', 'auth', 'storage', 'graphql_public')
  LOOP
    EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', r.schemaname, r.tablename);
  END LOOP;
END $$;
SQL

# ─────────────────────────── 3. restore ─────────────────────────────────────
echo "→ Restoring snapshot (session_replication_role=replica)…"
{
  echo "SET session_replication_role = replica;"
  cat "$DUMP_FILE"
} | docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1

echo "✓ Live snapshot loaded into local '$CONTAINER'."
echo "  Dump kept at: $DUMP_FILE (delete it if you don't need it)."
