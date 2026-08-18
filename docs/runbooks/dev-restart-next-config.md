# Runbook — restart & smoke-test a dev instance after `next.config.ts` changes

**When to use:** after ANY edit to `next.config.ts` (or `.env.local` / `.env.cloud`)
on a running dev instance. These files are read at startup only — **hot-reload
does NOT pick them up**, so the running server keeps its old behavior until
restarted.

**The failure this prevents:** the CSP/headers your config declares are served
from the old header set. The exact incident: the place-search feature's CSP
(`connect-src` + `https://nominatim.openstreetmap.org`) was committed, but the
running dev server kept the old CSP — search silently returned no results, with
no error on the page. Only a restart fixed it.

## 1. Restart the server

```bash
# Find the running server (3002 is this repo's usual dev port; adjust if yours differs)
ss -tlnp | grep :3002

# Stop it — the listener's pid is the `next-server` process
kill <pid>
# wait for the port to free:
while ss -tlnp | grep -q :3002; do sleep 1; done

# Relaunch DETACHED. Processes started from a tool/shell session are reaped
# when that shell exits, so use setsid to start an independent session:
{ setsid yarn dev -p 3002 > /tmp/ilokal-dev.log 2>&1 < /dev/null & echo "pid=$!"; disown; }

# Confirm it survived the shell and answers:
ps -p <pid>                       # still alive after ~5s
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/   # expect 3xx
```

Notes:
- **First requests are slow** — Next.js compiles routes on demand (observed up
  to ~25 s for an uncached route, plus a filesystem-cache compaction). A slow
  first response is normal; don't kill the server over it.
- **Port taken?** pick a free one and pass `-p <port>`; the app doesn't care.
- **Env changes** (`.env.local` / `.env.cloud`) need the same restart.

## 2. Smoke test

```bash
# a) CSP actually updated — the header must name the new source.
#    NOTE: `curl -sI /` alone is a 308-redirect response whose headers carry
#    NO CSP — always follow the redirect with -L, or hit a route that returns
#    200 (e.g. /business/<id>). Otherwise this reports a false "STALE CSP".
curl -sIL http://localhost:3002/ | grep -i 'content-security-policy' \
  | grep -o 'nominatim\.openstreetmap\.org' || echo 'STALE CSP — restart did not take'

# b) App renders its own HTML
curl -sL http://localhost:3002/ | grep -qi 'iLokal' && echo 'page renders'
```

Functional check (do this once per config change that touches network/CSP):
1. Open a wizard with a map step (e.g. `…/branches/create` → Location).
2. Type a place name in the search box above the map — results must appear
   (this is the nominatim fetch the CSP governs).
3. DevTools console must show **no CSP violations** (Network tab: no red
   `connect-src` failures).

## 3. Done criteria

- `curl -sI` shows the new CSP (the exact string you changed is present).
- Place search returns results; console is free of CSP errors.
- If either fails, the config change did not take — kill and relaunch again
  (step 1), then re-run step 2.

## Related

- Deploy side: fresh Vercel builds pick config up automatically; only
  dev/hot-patched instances need this. See the deploy checklist in
  `docs/release-notes/2026-08-18-mobile-map-drafts-reliability.md` (the CI
  workflow now smoke-tests the CSP on every deploy).
- Freebuff worktrees: env-file reproduction + detach recipe live in
  `.freebuff/run.md`.
