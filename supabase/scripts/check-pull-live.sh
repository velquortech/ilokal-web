#!/usr/bin/env bash
# =============================================================================
# check-pull-live.sh — regression check for pull-live.sh.
#
# Runs pull-live.sh against a SCRATCH local Supabase stack (own project_id,
# offset ports, own storage key) and asserts the verification block passed, so
# a script regression (tab escaping, restore order, kong handling, verify SQL)
# fails loudly instead of silently shipping a broken pull.
#
# Why a scratch stack and not the dev stack:
#   * pull-live.sh RESETS whatever local stack it targets. Pointing it at the
#     dev stack would destroy the developer's working data on every check.
#   * The scratch stack uses ports 5532x (dev holds 5432x) and containers named
#     supabase_*_ilokal-web-check, so it coexists with a running dev stack.
#   * It still reads LIVE credentials (.env.cloud) read-only — the whole point
#     is to verify the real live→local path end to end.
#
# Usage:
#   make pull-live-check
#   bash supabase/scripts/check-pull-live.sh
#
# Exit codes:
#   0  — verification block passed (or the check was SKIPPED: no live creds)
#   1  — pull-live.sh failed, the verification block did not pass, or setup failed
#
# Requires: docker, the supabase CLI (yarn supabase), and live credentials in
# the git-ignored .env.cloud (SUPABASE_DB_URL + SUPABASE_SERVICE_ROLE_KEY +
# NEXT_PUBLIC_SUPABASE_URL). Without .env.cloud the check skips with exit 0 —
# CI runners without live creds must not fail the build.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# ─────────────────────────────── guards ─────────────────────────────────────
if [ ! -f ".env.cloud" ]; then
  echo "SKIP: .env.cloud not found — live credentials required for pull-live-check." >&2
  echo "      (CI without live creds must not fail; run it where .env.cloud exists.)" >&2
  exit 0
fi
if ! command -v docker >/dev/null 2>&1 || ! docker ps >/dev/null 2>&1; then
  echo "error: docker is not available — pull-live-check needs the local stack." >&2
  exit 1
fi

SCRATCH_PROJECT="ilokal-web-check"
# Offset every port by +1000: dev holds 5432x, scratch uses 5532x.
BASE=5432
OFFSET=5532

echo "================================================================"
echo " pull-live-check — scratch-stack regression test"
echo "   live db : (set, read-only via .env.cloud)"
echo "   scratch : $SCRATCH_PROJECT (ports ${OFFSET}1x, containers supabase_*_${SCRATCH_PROJECT})"
echo "   dev     : untouched"
echo "================================================================"

# ─────────────────────────── scratch project dir ────────────────────────────
# A supabase project is a directory with supabase/config.toml + migrations.
SCRATCH="$(mktemp -d /tmp/ilokal-pull-live-check.XXXXXX)"
trap 'teardown' EXIT

teardown() {
  # Stop the scratch stack if it was started. `supabase stop` reads the workdir
  # config and stops only the scratch containers (named by project_id).
  if [ -d "$SCRATCH/supabase" ]; then
    yarn --silent supabase --workdir "$SCRATCH" stop >/dev/null 2>&1 || true
  fi
  rm -rf "$SCRATCH"
}

mkdir -p "$SCRATCH/supabase"
# Rewrite the repo config: distinct project_id (→ distinct container names) and
# every local port bumped +1000 so the scratch stack never collides with a
# running dev stack (5432x). The scratch DB must still run the SAME postgres
# major version as live (config keeps major_version), so the dump restores.
sed \
  -e "s/^project_id = \"ilokal-web\"/project_id = \"${SCRATCH_PROJECT}\"/" \
  -e "s/${BASE}\([0-9]\)/${OFFSET}\1/g" \
  supabase/config.toml > "$SCRATCH/supabase/config.toml"
# The scratch stack applies the repo's own migrations (schema must match the
# dump). Symlink — read-only, no copies to go stale.
ln -s "$REPO_ROOT/supabase/migrations" "$SCRATCH/supabase/migrations"

# ─────────────────────────── start scratch stack ────────────────────────────
echo "→ Starting scratch stack (ports ${OFFSET}1x)…"
yarn --silent supabase --workdir "$SCRATCH" start >/tmp/ilokal-pull-live-check-start.log 2>&1 \
  || { echo "error: scratch stack failed to start — see /tmp/ilokal-pull-live-check-start.log" >&2; exit 1; }

# The scratch stack generates its OWN service role key; the dev .env's key
# would upload into the dev stack. Extract it from the start output.
SCRATCH_KEY="$(
  grep -oE 'sb_secret_[A-Za-z0-9_-]+' /tmp/ilokal-pull-live-check-start.log \
    | head -1
)"
if [ -z "$SCRATCH_KEY" ]; then
  echo "error: could not find the scratch stack's service role key in start output." >&2
  tail -20 /tmp/ilokal-pull-live-check-start.log >&2 || true
  exit 1
fi

# ───────────────────────────── run pull-live ────────────────────────────────
echo "→ Running pull-live.sh against the scratch stack…"
# Point every knob at the scratch stack: container name (docker exec/dump),
# local REST host (kong), local storage key (uploads), CLI workdir (db reset).
set +e
CONTAINER="supabase_db_${SCRATCH_PROJECT}" \
LOCAL_HOST="http://127.0.0.1:${OFFSET}1" \
LOCAL_KEY="$SCRATCH_KEY" \
SUPABASE_WORKDIR="$SCRATCH" \
  bash supabase/scripts/pull-live.sh > /tmp/ilokal-pull-live-check-pull.log 2>&1
STATUS=$?
set -e
cat /tmp/ilokal-pull-live-check-pull.log

if [ "$STATUS" -ne 0 ]; then
  echo "✗ pull-live.sh FAILED (exit $STATUS) against the scratch stack — see above." >&2
  exit 1
fi

# ─────────────────────────── assert verification ────────────────────────────
# The regression this check exists to catch: pull-live.sh runs but the
# verification block does not pass (or passes on the wrong stack). Assert the
# exact success banner AND that it names the scratch container.
grep -F "✓ Live snapshot loaded into local 'supabase_db_${SCRATCH_PROJECT}'." \
  /tmp/ilokal-pull-live-check-pull.log >/dev/null \
  || { echo "✗ verification block did not pass — no success banner for the scratch stack." >&2; exit 1; }

# The verification block must also have COMPARED live counts (not skipped).
grep -F "public tables: identical to live" /tmp/ilokal-pull-live-check-pull.log >/dev/null \
  || { echo "✗ verification block did not compare live tables." >&2; exit 1; }

echo ""
echo "✓ pull-live-check PASSED — verification block asserted against the scratch stack."
echo "  (dev stack untouched; scratch stack torn down)"
