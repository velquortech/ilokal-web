#!/usr/bin/env bash
# =============================================================================
# pull-live.sh — one-shot LIVE→local snapshot for the local Docker Supabase
# stack: replaces the local database rows AND storage files with a snapshot of
# the LIVE (cloud) project, restoring rows VERBATIM (absolute cloud URLs render
# because the dev CSP in next.config.ts is widened from .env.cloud).
#
# Usage:
#   make pull-live
#   bash supabase/scripts/pull-live.sh
#   bash supabase/scripts/pull-live.sh --dry-run   # review steps + commands, execute nothing
#   bash supabase/scripts/pull-live.sh -n          # same as --dry-run
#
# Credentials (all LIVE access is READ-ONLY — dumps, SELECTs, storage GETs;
# every write goes to the local Docker stack only):
#   1. SUPABASE_DB_URL inline (wins)                      — the LIVE connection string
#   2. SUPABASE_LIVE_DB_URL from the environment or .env
#   3. SUPABASE_DB_URL from the git-ignored .env.cloud    — recommended; this
#      repo keeps its live credentials there, together with
#      SUPABASE_SERVICE_ROLE_KEY (live) and NEXT_PUBLIC_SUPABASE_URL.
#   The local storage key is read from the git-ignored .env
#   (SUPABASE_SERVICE_ROLE_KEY). If the live key / host / local key are all
#   present, storage FILES are synced; otherwise the pull degrades to
#   database-only with a warning.
#
# What it does (in order):
#   1. `supabase db reset --no-seed` — the LOCAL database is rebuilt from the
#      repo's own migrations, so the schema always matches them and every prior
#      local test row is gone. (Local only; the live DB is never written.)
#   2. pg_dump the LIVE database — data only, scoped to public/auth/storage/
#      graphql_public, excluding migration ledgers and storage internals
#      (custom format, so pg_restore continues past benign errors).
#   3. Truncate the local public tables — clears the migration-seeded baseline
#      rows (business_types/business_categories) that otherwise collide with
#      the live data on restore.
#   4. pg_restore the dump into LOCAL as supabase_admin (the local superuser)
#      with --disable-triggers — the on_auth_user_created trigger would
#      otherwise pre-create profiles rows that collide with the dump's own
#      profiles data. (local `postgres` is NOT superuser, so it can't do
#      either of these.) The ENABLE ALWAYS flag is captured before the restore
#      and re-applied after it: --disable-triggers ends with
#      `ENABLE TRIGGER ALL`, which resets 'A' back to 'O' and would leave the
#      snapshot firing triggers differently from production.
#   5. spatial_ref_sys — pg_dump skips extension-member data, so the PostGIS
#      SRID rows are piped COPY live→local directly.
#   6. Restart kong (the reset recreates db/storage/auth but leaves kong
#      stale, which 502s /storage/v1/*) and wait for the local REST API.
#   7. Storage FILES — every object in the live storage.objects catalog is
#      downloaded (read-only) and uploaded into LOCAL storage. The SQL catalog
#      is the source of truth (the list API returns stale/partial entries).
#   8. Verify — public row counts, auth.users, storage object counts and the
#      ENABLE ALWAYS trigger count must match, or the script exits non-zero.
#      A failed storage object is reported HERE rather than aborting step 7,
#      so a partial sync can no longer skip the checks that would explain it. Every run's outcome (and any
#      drifted rows) is appended to REPORT_FILE
#      (default supabase/reports/pull-live.log, git-ignored) with a timestamp,
#      so drift from live is visible over time.
#
#   Rows are restored VERBATIM from live — absolute cloud storage URLs are left
#   as-is. Images render because the dev CSP in next.config.ts is widened with
#   the live storage origin (read from .env.cloud), so absolute URLs load
#   directly instead of being rewritten in the database.
#
# Destructive: the LOCAL stack is reset. Dev/testing tool only.
#
# Limitations:
#   - Auth sessions / refresh tokens are signed with the cloud JWT secret, so
#     users just sign in again locally (password hashes carry over).
#   - The migration ledger is preserved; `make migrate-up` stays correct.
# =============================================================================

set -euo pipefail

# Resolve repo root so `yarn supabase` and the .env files resolve regardless
# of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

CONTAINER="${CONTAINER:-supabase_db_ilokal-web}"
DUMP_FILE="${DUMP_FILE:-/tmp/ilokal-live-data.dump}"
# Where each run's dated verification report is APPENDED (git-ignored — it is
# a runtime artifact, unlike the checked-in SQL probes in supabase/reports/).
REPORT_FILE="${REPORT_FILE:-supabase/reports/pull-live.log}"
# Set when the storage sync reports any failed object. Deliberately does not
# abort the run — see step 7.
STORAGE_FAILED=0
# How many ENABLE ALWAYS triggers existed before the restore — see step 4.
ALWAYS_COUNT=0

# ─────────────────────────────── args ──────────────────────────────────────
# --dry-run / -n: print every step and the exact commands (secrets masked)
# without executing anything, so the pull can be reviewed before it touches
# the local stack. Nothing is written — no reset, dump file, restore, storage
# upload, or verification query.
DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help)
      grep '^# ' "$0" | sed -E 's/^# ?//' | head -40
      exit 0
      ;;
    *)
      echo "error: unknown argument '$1' (expected --dry-run/-n or --help)." >&2
      exit 1
      ;;
  esac
  shift
done

# Execute a command, or — in dry-run — print it (secrets masked) and do
# nothing. Returns 0 in dry-run so `! maybe_run …` retry logic stays benign.
maybe_run() {
  if [ "$DRY_RUN" = 1 ]; then
    printf '  [dry-run] %s\n' "$(mask_secrets "$*")"
    return 0
  fi
  "$@"
}

# Replace every occurrence of a live/local credential in a printed command
# with a placeholder, so `--dry-run` output never leaks secrets.
mask_secrets() {
  local out="$*"
  [ -n "${LIVE_DB_URL:-}" ] && out="${out//$LIVE_DB_URL/<live-db-url>}"
  [ -n "${DB_PW:-}" ] && out="${out//$DB_PW/<postgres-password>}"
  [ -n "${LIVE_KEY:-}" ] && out="${out//$LIVE_KEY/<live-service-key>}"
  [ -n "${LOCAL_KEY:-}" ] && out="${out//$LOCAL_KEY/<local-service-key>}"
  printf '%s\n' "$out"
}

# ─────────────────────────── credentials (live → env vars) ──────────────────
# Resolve the LIVE connection string. Precedence:
#   1. SUPABASE_DB_URL inline (e.g. `SUPABASE_DB_URL=… make pull-live`) wins.
#   2. SUPABASE_LIVE_DB_URL from the environment or git-ignored .env.
#   3. SUPABASE_DB_URL from git-ignored .env.cloud (recommended).
LIVE_DB_URL="${SUPABASE_DB_URL:-${SUPABASE_LIVE_DB_URL:-}}"
if [ -z "$LIVE_DB_URL" ] && [ -f ".env" ]; then
  LIVE_DB_URL="$(
    grep -E '^SUPABASE_LIVE_DB_URL=' ".env" \
      | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true
  )"
fi
if [ -z "$LIVE_DB_URL" ] && [ -f ".env.cloud" ]; then
  LIVE_DB_URL="$(
    grep -E '^SUPABASE_DB_URL=' ".env.cloud" \
      | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true
  )"
fi

# Live storage key + host (used for the read-only object sync; optional).
LIVE_KEY="${LIVE_KEY:-}"
LIVE_HOST="${LIVE_HOST:-}"
if [ -z "$LIVE_KEY" ] && [ -f ".env.cloud" ]; then
  LIVE_KEY="$(
    grep -E '^SUPABASE_SERVICE_ROLE_KEY=' ".env.cloud" \
      | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true
  )"
fi
if [ -z "$LIVE_HOST" ] && [ -f ".env.cloud" ]; then
  LIVE_HOST="$(
    grep -E '^NEXT_PUBLIC_SUPABASE_URL=' ".env.cloud" \
      | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true
  )"
fi

# The live host is ALSO used by next.config.ts to widen the dev CSP (so
# absolute cloud URLs in restored rows render without row rewrites). Warn if it
# is missing — the pull still works, but absolute-URL images will be
# CSP-blocked in local dev.
if [ -z "$LIVE_HOST" ]; then
  echo "warning: NEXT_PUBLIC_SUPABASE_URL not found in .env.cloud — the dev" >&2
  echo "         CSP will not allow the cloud storage host, so rows restored" >&2
  echo "         with ABSOLUTE cloud URLs will show as broken images in local" >&2
  echo "         dev (files are still synced; the URLs are just CSP-blocked)." >&2
fi
# Local storage key (for uploads into LOCAL storage). Env override wins so a
# scratch-stack check (check-pull-live.sh) can point at its own stack's key
# instead of the dev stack's .env.
LOCAL_KEY="${LOCAL_KEY:-}"
if [ -z "$LOCAL_KEY" ] && [ -f ".env" ]; then
  LOCAL_KEY="$(
    grep -E '^SUPABASE_SERVICE_ROLE_KEY=' ".env" \
      | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true
  )"
fi
# Local REST host. Env override wins — check-pull-live.sh runs against a scratch
# stack on offset ports (5532x) so it never touches the dev stack.
LOCAL_HOST="${LOCAL_HOST:-http://127.0.0.1:54321}"
# Optional: point the supabase CLI at a different project directory (the scratch
# stack's own config.toml). Empty by default → the repo's own project.
SUPABASE_WORKDIR="${SUPABASE_WORKDIR:-}"
SUPABASE_GLOBAL_FLAGS=()
if [ -n "$SUPABASE_WORKDIR" ]; then
  SUPABASE_GLOBAL_FLAGS=(--workdir "$SUPABASE_WORKDIR")
fi

# ─────────────────────────────── guards ─────────────────────────────────────
if [ -z "$LIVE_DB_URL" ]; then
  echo "error: no live DB connection string found." >&2
  echo "       Set SUPABASE_DB_URL inline (wins), SUPABASE_LIVE_DB_URL in .env," >&2
  echo "       or SUPABASE_DB_URL in .env.cloud (recommended — this repo's" >&2
  echo "       live credentials live there)." >&2
  exit 1
fi

case "$LIVE_DB_URL" in
  *127.0.0.1*|*localhost*)
    echo "error: the live DB URL looks LOCAL — point it at the cloud project." >&2
    echo "       TIP: the shell's SUPABASE_DB_URL overrides .env/.env.cloud. To" >&2
    echo "       use the .env.cloud value: unset SUPABASE_DB_URL" >&2
    exit 1
    ;;
esac

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  if [ "$DRY_RUN" = 1 ]; then
    echo "warning: local container '$CONTAINER' is not running — dry-run" >&2
    echo "         continues (nothing will be executed)." >&2
  else
    echo "error: local Supabase container '$CONTAINER' is not running." >&2
    echo "       Start it first: 'make setup-supabase' (or 'yarn supabase start')." >&2
    exit 1
  fi
fi

DO_STORAGE=1
if [ -z "$LIVE_KEY" ] || [ -z "$LIVE_HOST" ] || [ -z "$LOCAL_KEY" ]; then
  echo "warning: live service key / host / local key not all found — storage" >&2
  echo "         FILE sync will be SKIPPED (DB-only pull)." >&2
  DO_STORAGE=0
fi

SUFFIX="${CONTAINER#supabase_db_}"
DB_IMG="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || true)"
DB_IMG="${DB_IMG:-public.ecr.aws/supabase/postgres:17.6.1.127}"
# Local superuser credentials (needed for --disable-triggers on restore).
# supabase_admin's password matches the container's POSTGRES_PASSWORD.
DB_PW="$(docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | sed -n 's/^POSTGRES_PASSWORD=//p' | head -1 || true)"

echo "=================================================================="
echo " LIVE → LOCAL pull$([ "$DRY_RUN" = 1 ] && echo ' — DRY RUN (nothing will be executed)')"
echo "   live db : (set)  live storage: $([ "$DO_STORAGE" = 1 ] && echo yes || echo no)"
echo "   local   : $CONTAINER"
echo " Destructive to LOCAL data. No write ever goes to the live project."
echo "=================================================================="

# ───────────────────────────── 1. reset local ───────────────────────────────
# Rebuild LOCAL from migrations. The first reset can hiccup (container init
# race) — retry once before giving up.
echo "→ Resetting LOCAL database from migrations (no seed)…"
if ! maybe_run yarn --silent supabase "${SUPABASE_GLOBAL_FLAGS[@]}" db reset --no-seed --yes; then
  echo "  retrying reset once…"
  maybe_run yarn --silent supabase "${SUPABASE_GLOBAL_FLAGS[@]}" db reset --no-seed --yes
fi

# Wait for the freshly recreated db container to accept connections.
echo "→ Waiting for the local database…"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] poll until ready: docker exec $CONTAINER psql -U postgres -d postgres -tAc 'select 1' (45 × 2s)"
else
  for _ in $(seq 1 45); do
    if docker exec "$CONTAINER" psql -U postgres -d postgres -tAc 'select 1' >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

# ─────────────────────────────── 2. dump live ───────────────────────────────
# pg_dump runs in a THROWAWAY container on the HOST network: the DIRECT cloud
# host (db.<ref>.supabase.co) is IPv6-only, so LIVE_DB_URL must be the SESSION
# POOLER (port 6543, user postgres.<ref>), which resolves IPv4. Custom format
# (-Fc) so pg_restore continues past benign errors. Excludes migration ledgers
# and storage internals (storage.objects/buckets come from the file sync; the
# local storage service owns them).
echo "→ Dumping LIVE database (data only, read-only)…"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] docker run --rm --network host -i $DB_IMG pg_dump $(mask_secrets "$LIVE_DB_URL") \\"
  echo "            --data-only --no-owner --no-privileges --format=custom --schema=public --schema=auth \\"
  echo "            --schema=storage --schema=graphql_public --exclude-table-data='storage.*' … > $DUMP_FILE"
else
  docker run --rm --network host -i "$DB_IMG" pg_dump "$LIVE_DB_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --format=custom \
    --schema=public \
    --schema=auth \
    --schema=storage \
    --schema=graphql_public \
    --exclude-table-data='storage.*' \
    --exclude-table-data='supabase_migrations.schema_migrations' \
    --exclude-table-data='auth.schema_migrations' \
    --exclude-table-data='storage.migrations' \
    --exclude-table-data='storage.buckets_vectors' \
    --exclude-table-data='storage.vector_indexes' \
    --exclude-table-data='spatial_ref_sys' \
    > "$DUMP_FILE"
fi

# ─────────────────────────── 3. truncate local public ───────────────────────
# The reset left migration-seeded baseline rows (business_types,
# business_categories, …) that collide with live data on restore — clear the
# public tables. auth/storage are already empty after the reset.
echo "→ Truncating local public tables…"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] docker exec -i $CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=1 (DO block:"
  echo "            TRUNCATE every public table not owned by an extension, CASCADE)"
else
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.schemaname, t.tablename
      FROM pg_tables t
      LEFT JOIN pg_depend d
        ON d.classid = 'pg_class'::regclass
       AND d.objid = format('%I.%I', t.schemaname, t.tablename)::regclass
       AND d.refclassid = 'pg_extension'::regclass
      LEFT JOIN pg_extension e
        ON e.oid = d.refobjid
       AND e.extnamespace = 'public'::regnamespace
     WHERE t.schemaname = 'public'
       AND e.oid IS NULL  -- skip extension-owned tables (e.g. postgis spatial_ref_sys)
       AND has_table_privilege('postgres', t.schemaname || '.' || t.tablename, 'TRUNCATE')
  LOOP
    EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', r.schemaname, r.tablename);
  END LOOP;
END $$;
SQL
fi

# ─────────────────────────────── 4. restore ─────────────────────────────────
# pg_restore as supabase_admin (the local superuser) with --disable-triggers:
# the on_auth_user_created trigger on auth.users would otherwise pre-create
# profiles rows that collide with the dump's own profiles data (plain postgres
# is not superuser, so it can't disable triggers itself).
echo "→ Restoring live data into LOCAL…"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] docker cp $DUMP_FILE $CONTAINER:/tmp/live-data.dump"
  echo "  [dry-run] docker exec -e PGPASSWORD=<postgres-password> $CONTAINER pg_restore -U supabase_admin -d postgres \\"
  echo "            --data-only --no-owner --no-privileges --disable-triggers /tmp/live-data.dump > /tmp/pull-live-restore.log"
  echo "            (grep 'pg_restore: error' → benign: realtime partitions / storage internals / auth dupes)"
  echo "  [dry-run] docker exec $CONTAINER rm -f /tmp/live-data.dump"
else
  # ── Remember which triggers are ENABLE ALWAYS, BEFORE the restore ────────
  # `--disable-triggers` wraps the load in `ALTER TABLE … DISABLE TRIGGER ALL`
  # / `… ENABLE TRIGGER ALL`, and that re-enable resets tgenabled from 'A'
  # (ALWAYS) back to 'O' (origin only) on EVERY trigger it touches.
  #
  # That silently makes local behave differently from production. The seeds run
  # under `session_replication_role = replica`, which SKIPS origin-only
  # triggers — so after a pull, `make seed` fails on the NOT NULL column
  # trg_set_redemption_code exists to populate, and trg_businesses_sync_business_type
  # stops resolving business_type_id. Both are the exact failures those triggers
  # were made ALWAYS to prevent.
  #
  # Step 1 rebuilt the database from the repo's migrations, so the flags are
  # correct at this point. Read from pg_trigger rather than a hardcoded list, so
  # a newly added ENABLE ALWAYS trigger is preserved without editing this file.
  ALWAYS_SQL="$(docker exec "$CONTAINER" psql -U postgres -d postgres -tA -c \
    "SELECT format('ALTER TABLE %s ENABLE ALWAYS TRIGGER %I;', tgrelid::regclass, tgname)
       FROM pg_trigger WHERE tgenabled = 'A' AND NOT tgisinternal;")"
  ALWAYS_COUNT="$(printf '%s' "$ALWAYS_SQL" | grep -c ';' || true)"

  docker cp "$DUMP_FILE" "$CONTAINER:/tmp/live-data.dump"
  docker exec -e PGPASSWORD="$DB_PW" "$CONTAINER" pg_restore -U supabase_admin -d postgres \
    --data-only --no-owner --no-privileges --disable-triggers /tmp/live-data.dump \
    > /tmp/pull-live-restore.log 2>&1 || true

  # ── …and put them back ───────────────────────────────────────────────────
  if [ "$ALWAYS_COUNT" -gt 0 ]; then
    printf '%s\n' "$ALWAYS_SQL" \
      | docker exec -i -e PGPASSWORD="$DB_PW" "$CONTAINER" \
          psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1
    echo "  restored ENABLE ALWAYS on $ALWAYS_COUNT trigger(s)"
  fi
  RESTORE_ERRORS="$(grep -c 'pg_restore: error' /tmp/pull-live-restore.log || true)"
  echo "  pg_restore errors: ${RESTORE_ERRORS} (benign: realtime partitions / storage internals / auth dupes)"
  if [ "$RESTORE_ERRORS" -gt 0 ]; then
    grep 'pg_restore: error' /tmp/pull-live-restore.log | head -5
  fi
  docker exec "$CONTAINER" rm -f /tmp/live-data.dump
fi

# ─────────────────────────── 5. spatial_ref_sys ─────────────────────────────
# Extension-member data is skipped by pg_dump — pipe it directly instead.
# The reset re-creates the postgis extension (populating spatial_ref_sys), so
# clear it first to avoid duplicate-key conflicts on the COPY.
echo "→ Copying spatial_ref_sys (PostGIS SRIDs) live→local…"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] docker exec -e PGPASSWORD=<postgres-password> $CONTAINER psql -U supabase_admin -d postgres -c 'DELETE FROM public.spatial_ref_sys'"
  echo "  [dry-run] docker run --rm --network host -i $DB_IMG psql <live-db-url> -tA -c 'COPY public.spatial_ref_sys TO STDOUT' |"
  echo "            docker exec -i $CONTAINER psql -U supabase_admin -d postgres -tA -c 'COPY public.spatial_ref_sys FROM STDIN'"
else
  docker exec -e PGPASSWORD="$DB_PW" "$CONTAINER" psql -U supabase_admin -d postgres \
    -c 'DELETE FROM public.spatial_ref_sys' >/dev/null
  docker run --rm --network host -i "$DB_IMG" psql "$LIVE_DB_URL" -tA \
    -c 'COPY public.spatial_ref_sys TO STDOUT' 2>/dev/null \
    | docker exec -i -e PGPASSWORD="$DB_PW" "$CONTAINER" psql -U supabase_admin -d postgres -tA \
        -c 'COPY public.spatial_ref_sys FROM STDIN' >/dev/null
fi

# ─────────────────────────────── 6. kong restart ────────────────────────────
# The reset recreates db/storage/auth but leaves kong with a stale upstream,
# which 502s /storage/v1/* — restart it and wait for the local REST API.
echo "→ Restarting local kong…"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] docker restart supabase_kong_${SUFFIX}"
  echo "  [dry-run] poll until ready: curl -H \"apikey: <local-service-key>\" $LOCAL_HOST/rest/v1/ (30 × 2s)"
else
  docker restart "supabase_kong_${SUFFIX}" >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    if curl -s -o /dev/null -m 5 -H "apikey: $LOCAL_KEY" \
        "$LOCAL_HOST/rest/v1/" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

if [ "$DO_STORAGE" = 1 ]; then
  # ─────────────────────────── 7. storage FILE sync ─────────────────────────
  # Every object in the live storage.objects catalog (the source of truth —
  # the list API returns stale/partial entries) is downloaded READ-ONLY from
  # live and uploaded into LOCAL storage only.
  echo "→ Syncing live storage files into LOCAL storage…"
  if [ "$DRY_RUN" = 1 ]; then
    echo "  [dry-run] read live catalog: docker run --rm --network host -i $DB_IMG psql <live-db-url> -tA -c \"select bucket_id || name from storage.objects;\""
    echo "  [dry-run] write /tmp/pull-live-sync.XXXXXX.mjs, then run:"
    echo "            LIVE_HOST=<live-host> LOCAL_HOST=$LOCAL_HOST LIVE_KEY=<live-service-key> \\"
    echo "            LOCAL_KEY=<local-service-key> LIVE_CATALOG=<…> node <script>"
    echo "            (GET every live object READ-ONLY → POST into LOCAL storage, x-upsert)"
  else
    LIVE_CATALOG="$(
      docker run --rm --network host -i "$DB_IMG" psql "$LIVE_DB_URL" -tA \
        -c "select bucket_id || E'\\t' || name from storage.objects;" 2>/dev/null
    )"
    SYNC_JS="$(mktemp /tmp/pull-live-sync.XXXXXX.mjs)"
    cat > "$SYNC_JS" <<'NODE_EOF'
const LIVE = process.env.LIVE_HOST;
const LOCAL = process.env.LOCAL_HOST;
const liveKey = process.env.LIVE_KEY;
const localKey = process.env.LOCAL_KEY;
const entries = process.env.LIVE_CATALOG
  .split('\n')
  .map((line) => line.split('\t'))
  .filter((p) => p.length === 2 && p[0]);

let ok = 0, fail = 0;
const failures = [];
for (const [bucket, name] of entries) {
  const enc = name.split('/').map(encodeURIComponent).join('/');
  // BOTH headers, deliberately. A service key sent only as a Bearer token is
  // accepted for PUBLIC buckets and REJECTED (400) for private ones, so
  // `business-docs` failed while the other five buckets synced fine — which
  // reads as "those files are missing" rather than "this request is malformed".
  // The Supabase clients always send `apikey` alongside the bearer token.
  const get = await fetch(`${LIVE}/storage/v1/object/${encodeURIComponent(bucket)}/${enc}`, {
    headers: { apikey: liveKey, Authorization: `Bearer ${liveKey}` },
  });
  if (!get.ok) {
    failures.push(`GET ${bucket}/${name}: ${get.status}`);
    fail++;
    continue;
  }
  const buf = Buffer.from(await get.arrayBuffer());
  const ctype = get.headers.get('content-type') || 'application/octet-stream';
  const put = await fetch(`${LOCAL}/storage/v1/object/${encodeURIComponent(bucket)}/${enc}`, {
    method: 'POST',
    // Same reasoning as the GET above: the local stack has private buckets too,
    // so an apikey-only write would fail on exactly the objects the GET fix
    // just made reachable.
    headers: {
      apikey: localKey,
      Authorization: `Bearer ${localKey}`,
      'Content-Type': ctype,
      'x-upsert': 'true',
    },
    body: new Uint8Array(buf),
  });
  if (put.ok) ok++;
  else {
    failures.push(`PUT ${bucket}/${name}: ${put.status}`);
    fail++;
  }
}
console.log(`  storage: ${ok} uploaded, ${fail} failed (catalog ${entries.length})`);
if (failures.length) {
  console.error(failures.slice(0, 10).join('\n'));
  process.exit(1);
}
NODE_EOF
    # NOT allowed to abort the run. The helper exits 1 when any object fails,
    # and under `set -e` that killed the script BEFORE step 9 — so the one part
    # that checks the snapshot against live, and writes the report, was skipped
    # exactly when something had gone wrong. The failure is remembered and
    # folded into the verification verdict instead, so the run still ends
    # non-zero but only after it has said what actually drifted.
    if ! LIVE_HOST="$LIVE_HOST" LOCAL_HOST="$LOCAL_HOST" \
         LIVE_KEY="$LIVE_KEY" LOCAL_KEY="$LOCAL_KEY" \
         LIVE_CATALOG="$LIVE_CATALOG" node "$SYNC_JS"; then
      STORAGE_FAILED=1
    fi
    rm -f "$SYNC_JS"
  fi
fi
# Rows are restored verbatim — absolute cloud URLs are left as-is and render
# via the dev CSP widening in next.config.ts (liveStorageOrigin reads
# NEXT_PUBLIC_SUPABASE_URL from .env.cloud, the same file used above).

# ─────────────────────────── 9. verify + report ─────────────────────────────
# Public row counts, auth.users and storage object counts must match live. The
# outcome (plus any drifted rows) is APPENDED to REPORT_FILE with a timestamp,
# so drift from live is visible over time — a run that drifts shows exactly
# which tables moved, and how far.
#
# The counts files (written below) are `table|count` lines from psql -tA;
# awk compares live vs local and prints only the rows that differ.
write_report() {
  local status="$1"
  mkdir -p "$(dirname "$REPORT_FILE")"
  {
    echo "──────────────────────────────────────────────────────────"
    echo "$(date -Is) — pull-live: $status"
    echo "  container: $CONTAINER"
    if diff -q /tmp/pull-live-live-counts.txt /tmp/pull-live-local-counts.txt >/dev/null 2>&1; then
      echo "  public tables: identical to live ($(wc -l < /tmp/pull-live-live-counts.txt) tables)"
    else
      echo "  public tables: DRIFT from live ($(wc -l < /tmp/pull-live-live-counts.txt) tables):"
      # Iterates BOTH files: a row differs when its count moved, and a table
      # that exists only on one side shows as "live X vs local (missing)" /
      # "local-only" — otherwise an empty local DB would report drift with no
      # rows (exactly what happened the first time this ran against a fresh
      # reset before the storage sync).
      awk -F'|' '
        NR==FNR { live[$1]=$2; next }
        { if ($2 != live[$1]) print "    " $1 ": live " live[$1] " vs local " $2; seen[$1]=1 }
        END { for (k in live) if (!(k in seen)) print "    " k ": live " live[k] " vs local (missing)" }
      ' /tmp/pull-live-live-counts.txt /tmp/pull-live-local-counts.txt
    fi
    echo "  auth.users: live $LIVE_AUTH vs local $LOCAL_AUTH"
    if [ "$DO_STORAGE" = 1 ]; then
      if diff -q /tmp/pull-live-live-objs.txt /tmp/pull-live-local-objs.txt >/dev/null 2>&1; then
        echo "  storage objects: identical to live per bucket"
      else
        echo "  storage objects: DRIFT from live per bucket:"
        awk -F'|' '
          NR==FNR { live[$1]=$2; next }
          { if ($2 != live[$1]) print "    " $1 ": live " live[$1] " vs local " $2; seen[$1]=1 }
          END { for (k in live) if (!(k in seen)) print "    " k ": live " live[k] " vs local (missing)" }
        ' /tmp/pull-live-live-objs.txt /tmp/pull-live-local-objs.txt
      fi
    fi
  } >> "$REPORT_FILE"
}

echo "→ Verifying alignment with live…"
COUNT_SQL="SELECT relname AS tbl, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I', relname), false, true, '')))[1]::text::int AS cnt FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY tbl;"
if [ "$DRY_RUN" = 1 ]; then
  echo "  [dry-run] diff public row counts live vs local ($COUNT_SQL)"
  echo "  [dry-run] compare auth.users count live vs local"
  [ "$DO_STORAGE" = 1 ] && echo "  [dry-run] compare storage.objects per-bucket counts live vs local"
  echo "  [dry-run] append dated report to $REPORT_FILE"
  echo "✓ Dry-run complete — nothing was executed. Run without --dry-run to apply the pull."
  exit 0
fi
docker run --rm --network host -i "$DB_IMG" psql "$LIVE_DB_URL" -tA \
  -c "$COUNT_SQL" 2>/dev/null > /tmp/pull-live-live-counts.txt
docker exec "$CONTAINER" psql -U postgres -d postgres -tA \
  -c "$COUNT_SQL" > /tmp/pull-live-local-counts.txt
FAIL=0
if ! diff -q /tmp/pull-live-live-counts.txt /tmp/pull-live-local-counts.txt >/dev/null; then
  echo "  FAIL: public table row counts differ from live:" >&2
  diff /tmp/pull-live-live-counts.txt /tmp/pull-live-local-counts.txt >&2 || true
  FAIL=1
fi
LIVE_AUTH="$(
  docker run --rm --network host -i "$DB_IMG" psql "$LIVE_DB_URL" -tA \
    -c 'select count(*) from auth.users' 2>/dev/null
)"
LOCAL_AUTH="$(docker exec "$CONTAINER" psql -U postgres -d postgres -tA -c 'select count(*) from auth.users')"
if [ "$LIVE_AUTH" != "$LOCAL_AUTH" ]; then
  echo "  FAIL: auth.users differs — live $LIVE_AUTH vs local $LOCAL_AUTH" >&2
  FAIL=1
fi
if [ "$DO_STORAGE" = 1 ]; then
  OBJ_SQL="select bucket_id, count(*) from storage.objects group by bucket_id order by 1;"
  docker run --rm --network host -i "$DB_IMG" psql "$LIVE_DB_URL" -tA \
    -c "$OBJ_SQL" 2>/dev/null > /tmp/pull-live-live-objs.txt
  docker exec "$CONTAINER" psql -U postgres -d postgres -tA \
    -c "$OBJ_SQL" > /tmp/pull-live-local-objs.txt
  if ! diff -q /tmp/pull-live-live-objs.txt /tmp/pull-live-local-objs.txt >/dev/null; then
    echo "  FAIL: storage object counts differ from live:" >&2
    diff /tmp/pull-live-live-objs.txt /tmp/pull-live-local-objs.txt >&2 || true
    FAIL=1
  fi
fi

# The restore downgrades ENABLE ALWAYS triggers and step 4 puts them back.
# Asserted rather than assumed: a local database whose trigger firing rules
# differ from production is not a faithful snapshot, and the difference is
# invisible until `make seed` fails much later for an unrelated-looking reason.
ALWAYS_NOW="$(docker exec "$CONTAINER" psql -U postgres -d postgres -tA \
  -c "SELECT count(*) FROM pg_trigger WHERE tgenabled = 'A' AND NOT tgisinternal;")"
if [ "$ALWAYS_NOW" != "$ALWAYS_COUNT" ]; then
  echo "  FAIL: ENABLE ALWAYS triggers — $ALWAYS_COUNT before the restore, $ALWAYS_NOW after." >&2
  echo "        Local trigger semantics no longer match production; seeds will skip them." >&2
  FAIL=1
fi

# A storage object that never transferred is a real mismatch, reported here
# rather than as an early exit that skips every check above.
if [ "$STORAGE_FAILED" = 1 ]; then
  echo "  FAIL: the storage sync reported failed objects (see above)." >&2
  FAIL=1
fi

if [ "$FAIL" = 1 ]; then
  write_report "MISMATCH"
  echo "✗ Pull COMPLETED WITH MISMATCHES — inspect the diffs above." >&2
  echo "  Report appended to: $REPORT_FILE" >&2
  exit 1
fi

write_report "OK"
echo "✓ Live snapshot loaded into local '$CONTAINER'."
echo "  - public tables: identical to live ($(wc -l < /tmp/pull-live-live-counts.txt) tables)"
echo "  - auth.users: $LOCAL_AUTH"
[ "$DO_STORAGE" = 1 ] && echo "  - storage objects: identical to live"
echo "  Report appended to: $REPORT_FILE"
echo "  Dump kept at: $DUMP_FILE (delete it if you don't need it)."
