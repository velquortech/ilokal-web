#!/usr/bin/env bash
# =============================================================================
# check-seed-freshness.sh — freshness invariant regression check.
#
# Runs the FULL configured seed flow against a SCRATCH local Supabase stack
# (own project_id, offset ports — same pattern as check-pull-live.sh) and
# asserts the freshness invariant PR #88 established:
#
#   After a fresh `db reset` with the configured [db.seed] path list,
#   ZERO published coupons in the seed families (44444444…, f2000000…)
#   may have expiry_date <= now(). A failure names the offending rows, so the
#   fix is obvious from CI output alone.
#
# Why a scratch stack and not the dev stack: `db reset` DESTROYS the target
# DB. Pointing this at the dev stack would wipe the developer's working data
# on every CI run. Scratch = ports 5532x (dev holds 5432x) and containers
# named supabase_*_ilokal-web-seedcheck, so it coexists with a running dev
# stack. Unlike pull-live-check this needs NO live credentials — the invariant
# lives entirely in the repo's own migrations + seeds.
#
# Usage:
#   make seed-freshness-check
#   bash supabase/scripts/check-seed-freshness.sh
#
# Exit codes:
#   0 — invariant holds (all seeded, published seed-family coupons in future)
#   1 — invariant violated, scratch/driver failed, or docker unavailable
#   The script never soft-skips: locally docker exists wherever the dev stack
#   runs; in CI the job gates on docker itself (see workflow).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# ─────────────────────────────── guards ─────────────────────────────────────
if ! command -v docker >/dev/null 2>&1 || ! docker ps >/dev/null 2>&1; then
  echo "error: docker is not available — seed-freshness-check needs a local stack." >&2
  exit 1
fi

# CLI resolution: `yarn supabase` requires node_modules with the supabase CLI.
# Worktrees / CI checkouts may not have them. Fall back to a sibling checkout
# of the same repo (worktree pattern) so the check runs anywhere docker does.
SUPABASE_CLI=(yarn --silent supabase)
if ! yarn --silent supabase --version >/dev/null 2>&1; then
  # Fallbacks in order: this checkout's node_modules, then the main checkout's
  # (this dir may itself be a linked worktree — git-common-dir* points there).
  CANDIDATES=("$REPO_ROOT/node_modules/.bin/supabase")
  MAIN_GITDIR="$(git -C "$REPO_ROOT" rev-parse --git-common-dir 2>/dev/null || true)"
  if [ -n "$MAIN_GITDIR" ] && [ "$MAIN_GITDIR" != "$REPO_ROOT/.git" ]; then
    MAIN_ROOT="$(cd "$MAIN_GITDIR/.." 2>/dev/null && pwd)"
    CANDIDATES+=("$MAIN_ROOT/node_modules/.bin/supabase")
  fi
  SIBLING_CLI=""
  for p in "${CANDIDATES[@]}"; do
    if [ -x "$p" ]; then SIBLING_CLI="$p"; break; fi
  done
  if [ -z "$SIBLING_CLI" ]; then
    echo "error: supabase CLI not found — run yarn install in the repo (or a sibling checkout)." >&2
    exit 1
  fi
  SUPABASE_CLI=("$SIBLING_CLI")
fi

SCRATCH_PROJECT="ilokal-web-seedcheck"
BASE=5432
OFFSET=5532

SCRATCH="$(mktemp -d /tmp/ilokal-seedcheck.XXXXXX)"
trap 'teardown' EXIT

teardown() {
  if [ -d "$SCRATCH/supabase" ]; then
    "${SUPABASE_CLI[@]:-yarn --silent supabase}" --workdir "$SCRATCH" stop >/dev/null 2>&1 || true
  fi
  rm -rf "$SCRATCH"
}

mkdir -p "$SCRATCH/supabase"
# Rewrite the repo config: distinct project_id (→ distinct container names)
# and every local port bumped +1000 so the scratch stack never collides with a
# running dev stack. The seed path list in [db.seed] comes along verbatim —
# that list IS the thing under test.
sed \
  -e "s/^project_id = \"ilokal-web\"/project_id = \"${SCRATCH_PROJECT}\"/" \
  -e "s/${BASE}\([0-9]\)/${OFFSET}\1/g" \
  supabase/config.toml > "$SCRATCH/supabase/config.toml"
# Repo migrations + seeds are shared read-only — no copies to go stale.
ln -s "$REPO_ROOT/supabase/migrations" "$SCRATCH/supabase/migrations"
ln -s "$REPO_ROOT/supabase/seeds" "$SCRATCH/supabase/seeds"

echo "→ Starting scratch stack (ports ${OFFSET}1x, containers supabase_*_${SCRATCH_PROJECT})…"
"${SUPABASE_CLI[@]}" --workdir "$SCRATCH" start >/tmp/ilokal-seedcheck-start.log 2>&1 \
  || { echo "error: scratch stack failed to start — see /tmp/ilokal-seedcheck-start.log" >&2; exit 1; }

echo "→ Running db reset with the configured seed list…"
"${SUPABASE_CLI[@]}" --workdir "$SCRATCH" db reset > /tmp/ilokal-seedcheck-reset.log 2>&1 \
  || { echo "error: db reset FAILED — see /tmp/ilokal-seedcheck-reset.log" >&2; tail -30 /tmp/ilokal-seedcheck-reset.log >&2; exit 1; }
tail -5 /tmp/ilokal-seedcheck-reset.log

# ─────────────────────────── assert the invariant ───────────────────────────
# The seeded families the freshness pass owns. If a NEW seed id family appears
# later, add its prefix here AND to refresh_freshness.sql so both stay in sync
# (that pairing is also pinned by the contract test).
RULE="id::text LIKE '44444444%' OR id::text LIKE 'f2000000%'"
VIOLATIONS="$(docker exec "supabase_db_${SCRATCH_PROJECT}" psql -U postgres -d postgres -tAc \
  "SELECT code || ' | ' || expiry_date::timestamp(0) || ' | ' || id
     FROM coupons
    WHERE status = 'published'
      AND expiry_date <= NOW()
      AND (${RULE})
    ORDER BY expiry_date;")"

if [ -n "$VIOLATIONS" ]; then
  echo "" >&2
  echo "✗ seed-freshness invariant VIOLATED — published seed-family coupons with an expired window after a fresh seed:" >&2
  printf '%s\n' "$VIOLATIONS" >&2
  echo "  (refresh_freshness.sql did not re-date these, or a seed inserted an expired row it never re-dates)" >&2
  exit 1
fi

# Sanity: the invariant should not pass VACUOUSLY. If no seed-family published
# coupons exist at all, the seeds failed to populate and the invariant is
# meaningless — fail loudly instead.
TOTAL="$(docker exec "supabase_db_${SCRATCH_PROJECT}" psql -U postgres -d postgres -tAc \
  "SELECT count(*) FROM coupons WHERE status='published' AND (${RULE});")"
if [ "${TOTAL:-0}" -eq 0 ]; then
  echo "✗ vacuous invariant: no published seed-family coupons after seeding — seed list is broken." >&2
  exit 1
fi

echo ""
echo "✓ seed-freshness-check PASSED — ${TOTAL} published seed-family coupons, all within their windows."
echo "  (dev stack untouched; scratch stack torn down)"
