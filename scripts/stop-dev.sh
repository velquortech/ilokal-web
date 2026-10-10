#!/usr/bin/env bash
# Stop the local Next.js dev server (`yarn dev`) — the counterpart of
# `make run-dev`. Safe to run from a HOST terminal or, via the delegation in
# the Makefile, from inside a Flatpak sandbox (where the Makefile routes it
# through flatpak-spawn).
#
# How it kills: by the PID that actually owns port 3000 (via `ss -ltnp`), not
# by process-name patterns — name matching either misses (`next-server (v16…)`
# has a parenthesis that breaks pkill's ERE) or over-matches (every other
# project's `yarn dev` on the host would die too). Killing the port owner takes
# the `yarn dev` → `sh -c next dev` → `next-server` tree with it, and nothing
# else. When :3000 is free it reports that and exits 0, so it is idempotent.
#
# Exit codes:
#   0  port free — whether or not we killed something
#   1  the port is still held after the kill (not ours, or kill lacked perms)
#   2  no process could be identified for a listening :3000

set -uo pipefail

PORT="${1:-3000}"

port_pids() {
  # `ss -ltnp` "users:(("next-server",pid=49873,fd=38))" — pull every pid=N.
  ss -ltnp "sport = :$PORT" 2>/dev/null \
    | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u
}

pids="$(port_pids)"

if [ -z "$pids" ]; then
  echo "Nothing is listening on :$PORT — dev server already stopped."
  exit 0
fi

echo "Stopping dev server on :$PORT (pid(s): $(echo "$pids" | tr '\n' ' '))"
# shellcheck disable=SC2086
kill $pids 2>/dev/null || true

# Give the process a moment to exit, then escalate once.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  [ -z "$(port_pids)" ] && break
  sleep 0.5
done

pids="$(port_pids)"
if [ -n "$pids" ]; then
  echo "Still running — sending SIGKILL to: $(echo "$pids" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  kill -9 $pids 2>/dev/null || true
  sleep 1
fi

if [ -n "$(port_pids)" ]; then
  echo "Port :$PORT is STILL held after SIGKILL — the process is not ours or we lack permission." >&2
  exit 1
fi

echo "Port :$PORT is free."
exit 0
