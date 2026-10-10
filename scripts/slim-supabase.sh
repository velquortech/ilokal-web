#!/usr/bin/env bash
# Slim the local Supabase stack for day-to-day dev on a laptop.
#
# `yarn supabase start` brings up the full 11-container stack, including the
# observability and dashboard services (analytics/Logflare, studio, pg_meta,
# inbucket, vector) that burn ~900MB RAM + ~25% CPU for zero app-facing value.
# This script stops those dev-only services and pins memory caps (with swap
# disabled, so nothing thrashes) AND CPU ceilings on the six containers the app
# actually talks to: db, kong, rest, auth, storage, realtime.
#
# The CPU ceilings matter as much as the memory ones on a laptop. Without
# --cpus a single container is free to saturate every core: a seed script or a
# migration turns into a 12-core Postgres burst that stalls the editor and the
# Metro/Gradle builds running alongside it. The values below are ceilings, not
# reservations, so an idle stack still costs nothing; they only bite under load.
# They total well under the core count on purpose, leaving headroom for the
# native Android build, which is the real CPU hog in this workflow.
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

cap_resources() {
  local name="$1" limit="$2" cpus="$3"
  if docker ps --filter "name=${name}" --format '{{.Names}}' | grep -qx "${name}"; then
    echo "  capping ${name} -> ${limit} RAM, ${cpus} CPU"
    docker update \
      --memory "${limit}" --memory-swap "${limit}" \
      --cpus "${cpus}" \
      "${name}" >/dev/null
  fi
}

echo "Stopping dev-only services (observability, dashboard, email catcher):"
stop_if_running "supabase_analytics_${SUFFIX}"
stop_if_running "supabase_studio_${SUFFIX}"
stop_if_running "supabase_pg_meta_${SUFFIX}"
stop_if_running "supabase_inbucket_${SUFFIX}"
stop_if_running "supabase_vector_${SUFFIX}"

# Postgres gets the largest share: it is the only one that does real work
# under a migration or a seed. The rest are I/O-bound proxies that never need
# a full core, so a fractional ceiling costs them nothing in practice.
echo "Capping memory (no swap) and CPU on app-facing services:"
cap_resources "supabase_db_${SUFFIX}"       1g    2
cap_resources "supabase_realtime_${SUFFIX}" 512m  1
cap_resources "supabase_storage_${SUFFIX}"  512m  0.5
cap_resources "supabase_rest_${SUFFIX}"     256m  1
cap_resources "supabase_auth_${SUFFIX}"     256m  0.5
cap_resources "supabase_kong_${SUFFIX}"     128m  0.5

echo "Done — stack is slim."
