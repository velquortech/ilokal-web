#!/usr/bin/env bash
# Bring the Docker daemon up — or explain precisely why it cannot be reached.
#
# Every local target in this repo needs Docker: `make setup-supabase`,
# `make run-dev`, and all the migrate/seed targets shell out to the Supabase
# CLI, which talks to the Docker daemon socket directly. When the daemon is
# down those commands fail with an error that names Supabase rather than
# Docker, which sends people looking in the wrong place. This script is the one
# spot that checks Docker itself and says what to do about it.
#
# What it handles:
#   - daemon already up                -> prints one line, exits 0
#   - daemon installed but stopped     -> starts it (systemd, Docker Desktop,
#                                         colima) and waits for it to answer
#   - running inside a Flatpak sandbox -> starts the HOST daemon, then explains
#                                         why the CLI still can't reach it here
#   - Docker not installed             -> says so, with the install link
#
# Exit codes:
#   0  the daemon is reachable FROM THIS SHELL — Supabase commands will work
#   1  it is not, and the reason has been printed
#
# Idempotent and side-effect free when the daemon is already running, so
# `make run-dev` calls it on every start.

set -euo pipefail

WAIT_SECONDS=60

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# True when a docker client in THIS shell can reach a daemon. `docker info`
# is the honest probe: `docker --version` answers from the client binary alone
# and reports success with the daemon stopped.
daemon_reachable() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# Poll until the daemon answers, so we don't hand control back to the Supabase
# CLI while the socket is still coming up.
wait_for_daemon() {
  local waited=0
  while [ "$waited" -lt "$WAIT_SECONDS" ]; do
    if daemon_reachable; then
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
    printf '.'
  done
  printf '\n'
  return 1
}

# Are we inside a Flatpak sandbox (e.g. the Flatpak build of VS Code)? The
# sandbox has its own filesystem and does NOT get /var/run/docker.sock, so
# Docker is invisible here even when it is running fine on the host.
in_flatpak() {
  [ -f /.flatpak-info ] || [ -n "${FLATPAK_ID:-}" ]
}

host() { flatpak-spawn --host "$@"; }

# ---------------------------------------------------------------------------
# 1. Already good?
# ---------------------------------------------------------------------------

if daemon_reachable; then
  echo "Docker is running (server $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '?'))."
  exit 0
fi

# ---------------------------------------------------------------------------
# 2. Flatpak sandbox: the daemon can be started, but not reached from in here
# ---------------------------------------------------------------------------
#
# Worth separating from "Docker is missing", because the two look identical
# from inside the sandbox and the fixes are nothing alike.

if in_flatpak && command -v flatpak-spawn >/dev/null 2>&1; then
  echo "Running inside a Flatpak sandbox — checking Docker on the host..."

  if ! host docker info >/dev/null 2>&1; then
    echo "  Host daemon is not responding; trying to start it..."
    if host systemctl is-enabled docker >/dev/null 2>&1 || host systemctl list-unit-files docker.service >/dev/null 2>&1; then
      # Non-interactive sudo only: a password prompt would hang a `make` run
      # with no visible reason.
      if ! host sudo -n systemctl start docker >/dev/null 2>&1; then
        echo "  Could not start it without a password. Run this on the host, then retry:" >&2
        echo "      sudo systemctl start docker" >&2
        exit 1
      fi
    else
      echo "  Docker does not appear to be installed on the host." >&2
      echo "  Install it: https://docs.docker.com/engine/install/" >&2
      exit 1
    fi
  fi

  echo "  Host Docker is up (server $(host docker version --format '{{.Server.Version}}' 2>/dev/null || echo '?'))."
  cat >&2 <<'MSG'

  ...but this shell still cannot use it.

  The Supabase CLI opens the Docker socket directly, and a Flatpak sandbox
  never receives /var/run/docker.sock — so `make run-dev` cannot work from
  this terminal no matter what is on PATH. A `docker` shim would not help:
  nothing here shells out to the docker binary.

  Two ways forward:

    1. Run the make targets from a HOST terminal (not the Flatpak app's
       integrated terminal). This is the simple one.

    2. Or drive the host from here, one command at a time:
         flatpak-spawn --host bash -lc 'cd "$PWD" && make run-dev'

  To check what is running on the host from in here:
    flatpak-spawn --host docker ps
MSG
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Docker not installed at all
# ---------------------------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed (no 'docker' on PATH)." >&2
  echo "Install Docker Engine or Docker Desktop: https://docs.docker.com/get-started/get-docker/" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Installed but stopped — start it
# ---------------------------------------------------------------------------

echo "Docker is installed but the daemon is not responding. Starting it..."

started=""

case "$(uname -s)" in
  Darwin)
    # Docker Desktop, then colima, whichever is present.
    if [ -d /Applications/Docker.app ]; then
      open -a Docker && started="Docker Desktop"
    elif command -v colima >/dev/null 2>&1; then
      colima start && started="colima"
    fi
    ;;
  Linux)
    # Rootless installs run as a user unit; the packaged one is a system unit
    # needing root. Try the user unit first — it needs no password.
    if command -v systemctl >/dev/null 2>&1; then
      if systemctl --user list-unit-files docker.service >/dev/null 2>&1 \
         && systemctl --user start docker >/dev/null 2>&1; then
        started="systemd (rootless)"
      elif sudo -n systemctl start docker >/dev/null 2>&1; then
        started="systemd"
      fi
    elif command -v service >/dev/null 2>&1; then
      sudo -n service docker start >/dev/null 2>&1 && started="service"
    fi
    ;;
esac

if [ -z "$started" ]; then
  echo "Could not start the daemon automatically." >&2
  case "$(uname -s)" in
    Darwin) echo "  Open Docker Desktop, or run: colima start" >&2 ;;
    *)      echo "  Run: sudo systemctl start docker" >&2 ;;
  esac
  exit 1
fi

printf 'Started via %s — waiting for it to accept connections' "$started"
if wait_for_daemon; then
  printf '\n'
  echo "Docker is running (server $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '?'))."
  exit 0
fi

echo "Docker did not become reachable within ${WAIT_SECONDS}s." >&2
echo "  Check its status, then retry: docker info" >&2
exit 1
