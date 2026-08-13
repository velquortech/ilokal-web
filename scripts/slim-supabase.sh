#!/usr/bin/env bash
# Slim the local Supabase stack for day-to-day dev on a laptop.
#
# `yarn supabase start` brings up the full 11-container stack, including the
# observability and dashboard services (analytics/Logflare, studio, pg_meta,
# inbucket, vector) that burn ~900MB RAM + ~25% CPU for zero app-facing value.
# This script stops those dev-only services and pins memory caps (with swap
# disabled, so nothing thrashes) on the six containers the app actually talks
# to: db, kong, rest, auth, storage, realtime.
#
# The caps are runtime-only — `supabase start` recreates containers and drops
# them, so run this after every start. `make run-dev` does it automatically;
# `make slim-supabase` (or this script) re-applies it after a manual
# `yarn supabase start`.
#
# Idempotent and tolerant: missing containers are skipped, safe to re-run any
# time. The stack is discovered by name (supabase_db_*), so it works with any
# Supabase project id, not just ilokal-web.

set -euo pipefail

# ---- Discover the running stack's project suffix (e.g. "ilokal-web") ----
DB_CONTAINER="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -n1 || true)"
if [ -z "$DB_CONTAINER" ]; then
  echo "No running Supabase stack found (no supabase_db_* container)."
  echo "Run 'yarn supabase start' first — or 'make run-dev', which does both."
  exit 1
fi
SUFFIX="${DB_CONTAINER#supabase_db_}"
echo "Supabase stack: ${SUFFIX}"

# `supabase start --ignore-health-check` returns before containers are fully
# up; wait for the db container to be running before poking the stack.
for _ in $(seq 1 15); do
  if docker ps --filter "name=${DB_CONTAINER}" --format '{{.Status}}' | grep -q '^Up'; then
    break
  fi
  sleep 1
done

stop_if_running() {
  local name="$1"
  if docker ps -a --filter "name=${name}" --format '{{.Names}}' | grep -qx "${name}"; then
    echo "  stopping ${name}"
    docker stop "${name}" >/dev/null
  fi
}

cap_memory() {
  local name="$1" limit="$2"
  if docker ps --filter "name=${name}" --format '{{.Names}}' | grep -qx "${name}"; then
    echo "  capping ${name} -> ${limit}"
    docker update --memory "${limit}" --memory-swap "${limit}" "${name}" >/dev/null
  fi
}

echo "Stopping dev-only services (observability, dashboard, email catcher):"
stop_if_running "supabase_analytics_${SUFFIX}"
stop_if_running "supabase_studio_${SUFFIX}"
stop_if_running "supabase_pg_meta_${SUFFIX}"
stop_if_running "supabase_inbucket_${SUFFIX}"
stop_if_running "supabase_vector_${SUFFIX}"

echo "Capping memory on app-facing services (no swap):"
cap_memory "supabase_db_${SUFFIX}" 1g
cap_memory "supabase_realtime_${SUFFIX}" 512m
cap_memory "supabase_storage_${SUFFIX}" 512m
cap_memory "supabase_rest_${SUFFIX}" 256m
cap_memory "supabase_auth_${SUFFIX}" 256m
cap_memory "supabase_kong_${SUFFIX}" 128m

echo "Done — stack is slim."
