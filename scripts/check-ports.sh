#!/usr/bin/env bash
#
# Preflight: is Windows holding the ports the local Supabase stack needs?
#
# 🔴 The failure this exists to translate. On WSL2, `yarn supabase start` dies
# with:
#
#   failed to start docker container "supabase_db_ilokal-web": Error response
#   from daemon: ports are not available: exposing port TCP 0.0.0.0:54322 ->
#   127.0.0.1:0: /forwards/expose returned unexpected status: 500
#
# Nothing in that message is actionable, and the two obvious readings are both
# wrong: the port is NOT in use (`netstat` shows no listener) and no container
# holds it (`docker ps` is empty). What actually happened is that WinNAT /
# Hyper-V RESERVED a ~100-port range at boot, and every port this stack needs
# fell inside it. The ranges are picked randomly each boot, which is why the
# same command worked yesterday and fails today.
#
# CONTRACT: this is a diagnostic, never a gate. It exits 0 — silently — unless
# it can positively name a blocked port. Not WSL, no interop, netsh missing or
# unparseable, config unreadable: all exit 0. A preflight that can produce a
# false "no" is worse than no preflight, because the next person works around
# it instead of reading it.

set -uo pipefail

CONFIG="${SUPABASE_CONFIG:-supabase/config.toml}"
# Overridable so the test suite can drive this against a stub instead of a real
# Windows host.
NETSH="${SUPABASE_PORTCHECK_NETSH:-/mnt/c/Windows/System32/netsh.exe}"

# --- Only meaningful on WSL against Docker Desktop -------------------------
if [ -z "${SUPABASE_PORTCHECK_NETSH:-}" ]; then
  grep -qi microsoft /proc/version 2>/dev/null || exit 0
fi
[ -x "$NETSH" ] || exit 0
[ -r "$CONFIG" ] || exit 0

# --- Ports the stack will actually try to bind ------------------------------
# Read from config.toml rather than hardcoded, so this stays true if a port
# moves. Commented-out lines are skipped: `# smtp_port = 54325` is not bound,
# and claiming it is would send someone reserving a port nothing wants.
ports=$(
  grep -E '^[[:space:]]*(port|shadow_port)[[:space:]]*=[[:space:]]*[0-9]+' "$CONFIG" |
    grep -oE '[0-9]+$' | sort -un
)
[ -n "$ports" ] || exit 0

# --- Windows' reserved TCP ranges ------------------------------------------
# `show` needs no elevation. Strip CR: this is Windows output crossing into a
# Linux pipeline, and a trailing \r makes every numeric comparison below fail
# open — which would turn this script into the false "no" its contract forbids.
ranges=$("$NETSH" interface ipv4 show excludedportrange protocol=tcp 2>/dev/null |
  tr -d '\r' | grep -E '^[[:space:]]*[0-9]+[[:space:]]+[0-9]+')
[ -n "$ranges" ] || exit 0

blocked=""
hit_ranges=""
while read -r start end _rest; do
  [ -n "${start:-}" ] && [ -n "${end:-}" ] || continue
  for port in $ports; do
    if [ "$port" -ge "$start" ] && [ "$port" -le "$end" ]; then
      blocked="$blocked $port"
      case " $hit_ranges " in
        *" $start-$end "*) ;;
        *) hit_ranges="$hit_ranges $start-$end" ;;
      esac
    fi
  done
done <<EOF
$ranges
EOF

[ -n "$blocked" ] || exit 0

# --- Report ----------------------------------------------------------------
# The span to reserve is computed from the config, not typed in, so a stack
# that grows a port gets the right command without anyone remembering to edit
# this file.
lo=$(printf '%s\n' $ports | head -1)
hi=$(printf '%s\n' $ports | tail -1)
count=$((hi - lo + 1))

cat >&2 <<MSG

Error: Windows has reserved the ports this Supabase stack needs.

  Blocked ports:   $(echo $blocked | tr ' ' ',')
  Reserved range:  $(echo $hit_ranges | tr ' ' ',')

Nothing is listening on them and no container holds them — WinNAT/Hyper-V
reserved the range at boot, so Docker Desktop cannot bind it. Without this
check, 'supabase start' fails with an unactionable
"/forwards/expose returned unexpected status: 500".

Fix, in an ADMINISTRATOR PowerShell on Windows. Claims the ports as an
administered exclusion so WinNAT has to pick elsewhere; survives reboot:

  net stop winnat
  netsh int ipv4 add excludedportrange protocol=tcp startport=$lo numberofports=$count store=persistent
  net start winnat

('net stop winnat' first is required — the add fails while WinNAT holds the
range.) Verify the new row is marked '*', then RESTART DOCKER DESKTOP (its
port-forwarder caches state) and re-run this command:

  netsh interface ipv4 show excludedportrange protocol=tcp

MSG
exit 1
