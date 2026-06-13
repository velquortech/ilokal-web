# Security Audit — Findings Log

Persistent across runs. Stable `id` keeps a finding's identity over time.
Statuses: `open` · `fixed` · `regressed` · `new`. Secret values are redacted.

---

## Run history

- **2026-06-08** — scope: `auth, rls, api, injection` · stack: Next 16.1.6 / React 19.2.3 / @supabase/ssr 0.9.0 / yarn · trends: refreshed 2026-06-08. Dev server probed at `127.0.0.1:3000` + local PostgREST `127.0.0.1:54321`. First run (no prior log).
- **2026-06-08 (error-leakage sweep)** — audited all 19 mobile/protected route files for backend-error leakage. 4xx domain messages clean; found 23 `generalErrorResponse({ message: <supabaseError>.message })` sites (17 files) forwarding raw PostgREST/Postgres errors to clients (and not logging server-side). Added `loggedServerError(context, error)` helper (logs server-side, returns generic 500) and swept all 23 sites to it. Lint + build green; zero leaks remain.
- **2026-06-08 (`--fix` pass)** — all 4 findings remediated. Next upgraded 16.1.6 → **16.2.7**. `follows` broad read dropped + `get_follower_counts` SECURITY DEFINER RPC added (`20260608000001`); re-probe confirms anon row read now `[]`, counts still served. Product-search `.or()` sanitized; redemptions POST now Zod-validated. Lint clean; `make migrate-reset` clean. NOTE: `yarn build` is blocked by a **pre-existing, unrelated** type error (`add-coupon.tsx:140` — `branch_id` not on `CreateCouponRequest`; coupon↔branch WIP on the branch, not from this audit).
- **2026-06-08 (mobile full-surface — `--fix` applied)** — remediated 4 of this run's findings. **`auth-getmobileuser-header-trust` fixed:** `getMobileUser()` now always `getUser()`-verifies the token (header fast-path removed) — re-probe: spoofed `x-verified-user-id` + garbage token still 401, valid token 200. **`dos-no-rate-limit` fixed (baseline):** added in-memory limiter (`app/api/helpers/rateLimit.ts`) wired into `proxy.ts` for the whole mobile surface (`/api/mobile` added to the matcher); verified 200×N then 429 + `Retry-After` past the 200/60s/IP budget; per-instance caveat documented. **`deps-minimatch-redos` fixed:** eslint packages were miscategorized in `dependencies` → moved to `devDependencies`; gone from the prod tree. **`deps-dual-lockfile` fixed:** removed stray `package-lock.json` (yarn is canonical per CLAUDE.md). Bumped direct `postcss` 8.5.6→8.5.15. **`auth-next-unpatched` NOT fixable:** 16.2.7 is the latest *stable* Next — the patch exists only in `16.3.0-canary.x`; left at 16.2.7, now compensated by the getMobileUser hardening. `yarn lint` PASS. (Note: `next` still bundles `postcss@8.4.31` (moderate, advisory 1117015) — blocked on the same absent next release.)
- **2026-06-08 (mobile full-surface)** — scope: **all 8 areas, mobile attack surface** (mobile-facing API `app/api/mobile/**` + `app/api/protected/mobile/**`, plus the **mobile client `ilokal-mobile`** — first time the client itself was audited). Stack: Next **16.2.7** / React 19.2.3 / @supabase/ssr 0.9 / Zod 4 / yarn; mobile Expo 54 / RN 0.81. Trends cache fresh (2026-06-08). Probed `localhost:3000` + PostgREST `127.0.0.1:54321`. **Reconcile:** all 5 prior findings still **fixed** (re-probed: 401s hold, follows anon read `[]`, error 4xx clean, Zod rejects type-confusion). **New:** no rate limiting anywhere (`dos-no-rate-limit`), `getMobileUser` header-trust w/o token fallback (`auth-getmobileuser-header-trust`), CSP `unsafe-inline/eval` (`headers-csp-unsafe-inline`), dual lockfile (`deps-dual-lockfile`), web `minimatch` ReDoS (`deps-minimatch-redos`). **Regressed:** `auth-next-unpatched` — npm audit flags installed 16.2.7 with *new* middleware/proxy-bypass advisories (range ≤16.3.0-canary.5). Mobile client verified clean (SecureStore tokens, anon-key-only, no hardcoded secrets). Also recorded today's separate `redemptions` 400 root-cause fix (Zod 4 `.uuid()` → `z.guid()`) under `api-redemptions-no-zod`.

---

## Findings

### auth-next-unpatched — HIGH — `regressed`
- **area:** auth / deps
- **location:** `package.json` (`next ^16.2.6`), lockfile-resolved **16.2.7**
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** Was `fixed` by upgrading 16.1.6 → 16.2.7 (closed the May-2026 segment-prefetch bypass + CVE-2026-23870). **Now regressed:** `npm audit --omit=dev` flags the installed **16.2.7** HIGH, affected range `9.3.4 – 16.3.0-canary.5`, with *newer* advisories that still apply — notably **"Middleware/Proxy bypass via segment-prefetch routes — Incomplete Fix Follow-Up"**, **"Middleware/Proxy bypass through dynamic route parameter injection"**, plus image-API/Server-Component DoS, SSRF on WebSocket upgrades, and RSC cache-poisoning. Impact is amplified here exactly as before: `proxy.ts` performs *all* `/api/protected/**` gating and `getMobileUser()` trusts the proxy-set `x-verified-user-id` with no token-verify fallback (see `auth-getmobileuser-header-trust`). A proxy bypass + self-supplied header = impersonation by id — *partially* contained today because every mobile/protected handler queries through the **user-token** client (RLS rejects a bogus token) and no service-role client exists in these paths.
- **fix:** ⚠️ **Cannot patch yet** — `npm view next version` = **16.2.7 is the latest *stable*** release; the advisory's fix lands only in `16.3.0-canary.x` (unstable). Do **not** ship a canary. **Compensating control applied:** `getMobileUser()` now verifies the JWT itself (see `auth-getmobileuser-header-trust` → fixed), so a middleware bypass no longer yields impersonation. **Action:** watch for the next *stable* Next release that clears the advisory, then `yarn upgrade next` and re-run `yarn audit --groups dependencies`. (Also pulls in next's bundled `postcss@8.4.31`, moderate advisory 1117015 — same blocker.)

### rls-follows-public-read — MEDIUM — `fixed`
- **area:** rls
- **location:** `supabase/migrations/20260607000000_public_read_follows.sql:12-14` (`USING (true)`)
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** New SELECT policy `"Public follows are viewable by everyone" USING (true)` makes the **entire follow graph world-readable**. Confirmed by probe: anon role (public publishable key) returns `user_id ↔ business_id` pairs from `/rest/v1/follows`. Intent was only to allow follower COUNTs, but `USING(true)` leaks full rows, exposing which users follow which businesses (social-graph / privacy leak). Matches the 2026 trend warning on over-broad `using(true)` SELECT policies.
- **fix:** Drop the broad policy; expose counts via a `SECURITY DEFINER` RPC (e.g. `get_follower_counts(business_ids uuid[])`) returning aggregates only, and call it from the nearby/detail routes. Or restrict SELECT to `authenticated` + self (`auth.uid() = user_id`).

### injection-products-or-filter — MEDIUM — `fixed`
- **area:** injection
- **location:** `app/api/mobile/businesses/[businessId]/products/route.ts:51`
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** The `q` search param is interpolated directly into a PostgREST `.or()` filter string (`name.ilike.%${search}%,description.ilike.%${search}%`) **without stripping the `,()` delimiters**. The sibling `nearby` route explicitly sanitizes these (`nearby/route.ts:86`, `search.replace(/[,()]/g,' ')`). A crafted `q` can inject extra OR conditions or break query semantics (PostgREST filter injection). Reads already-public product data so confidentiality impact is limited, but it's a genuine injection-class gap and inconsistent with the hardened sibling.
- **fix:** Mirror the nearby route — sanitize before building the `.or()`: `const s = search.replace(/[,()]/g,' ').trim(); if (s) query = query.or(...)`.

### api-redemptions-no-zod — LOW — `fixed`
- **area:** api
- **location:** `app/api/protected/mobile/redemptions/route.ts:80-87`, `lib/validation/redemptions.ts`
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** POST body parsed manually with only a null check, not the project-standard Zod schema. Type-confused input (array/object) could surface as a 500 instead of a clean 400, and uuid shape wasn't enforced at the boundary. **Probe (this run):** `{"coupon_id":["arr"],"branch_id":{"x":1}}` → clean **400** (no 500/stack). Verified fixed.
- **fix:** Added `redeemCouponSchema` and parse at handler top. **Follow-up regression found & fixed today:** the original fix used `z.string().uuid()`, but **Zod 4's `.uuid()` enforces strict RFC 9562 variant bits** and rejected valid Postgres `uuid` values (incl. all seed ids), 400-ing *every* claim. Swept all id validators to lenient **`z.guid()`** (12 files, commit `813e69c`) — still rejects garbage/type-confusion, accepts real UUIDs. See `validation-uuid-zod4`.

### api-error-leakage — MEDIUM — `fixed`
- **area:** api
- **location:** 23 sites across 17 files in `app/api/mobile/**` + `app/api/protected/mobile/**` (e.g. `redemptions/route.ts:65,131,150,186`, `itinerary/route.ts:51,55`, `nearby/route.ts:110`)
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** 500 paths returned `generalErrorResponse({ message: <supabaseError>.message })`, forwarding raw PostgREST/Postgres error text (table/column/constraint names, RLS hints, SQL) to mobile clients — information disclosure, and the detail was sent to the client instead of the server log. 4xx domain messages were already curated/safe.
- **fix:** Added `loggedServerError(context, error)` in `app/api/helpers/response.ts` (console.error server-side + generic 500 body); swept all 23 sites. **Invariant:** never pass a backend `error.message` into a client response — use `loggedServerError(...)` on 500 paths; reserve message text for hand-written 4xx.

### dos-no-rate-limit — MEDIUM — `fixed`
- **area:** dos
- **location:** all of `app/api/mobile/**` + `app/api/protected/mobile/**`; `proxy.ts` (no limiter); `package.json` (no `@upstash/ratelimit` / `@vercel/kv` / equivalent)
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** **No rate limiting anywhere.** Public *unauthenticated* endpoints (`/mobile/businesses/nearby` — PostGIS `ST_DWithin` + rating aggregate joins, `/mobile/deals` — 500-row scan + per-request classification, `/mobile/businesses/:id/products`) each do real DB work and are open to unbounded request volume. **Probe:** 20 rapid requests to `nearby` → 20×200, zero 429. Pagination caps bound *per-request* cost (good — see `dos-pagination-caps`) but nothing bounds *request rate* per IP/user. Secondary: App Router route handlers reading `req.json()` have **no body-size cap** (Pages-router `bodyParser.sizeLimit` doesn't apply), so a large JSON POST is fully buffered before Zod rejects it.
- **fix:** ✅ Applied (baseline) — added `app/api/helpers/rateLimit.ts` (in-memory fixed-window) + `tooManyRequestsResponse()`; wired into `proxy.ts` at the top for `/api/mobile/**` + `/api/protected/mobile/**` (added `/api/mobile/:path+` to the matcher), keyed by client IP, **200 req / 60 s** (env-tunable `MOBILE_RATE_LIMIT` / `MOBILE_RATE_WINDOW_MS`). Verified: burst past 200 → 429 + `Retry-After: 30`; normal usage unaffected. **⚠️ LIMITATION:** state is per-runtime-instance (module Map) — on serverless/edge the global limit is looser than configured. Swap the store for Upstash Redis / Vercel KV behind the same `rateLimit()` signature for a precise distributed quota. **Still TODO:** per-user keying for protected routes, and a JSON body-size guard on mutation routes (not yet added).

### auth-getmobileuser-header-trust — MEDIUM — `fixed`
- **area:** auth / api
- **location:** `app/api/helpers/mobile-request.ts:31-41`
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** `getMobileUser()` returns a user built **solely from the `x-verified-user-id` request header** when present, *without* verifying the bearer token (`if (verifiedId) { return { user: {id: verifiedId}, ... } }`). This is safe **only** while `proxy.ts` runs for every `/api/protected/**` request (it strips client-supplied copies and sets the header from a real `getUser()`) — confirmed by probe (garbage token + spoofed header → 401). But it makes the proxy a **single point of failure**: any middleware/proxy bypass (see regressed `auth-next-unpatched`) lets a client supply the header itself. Worst case is currently contained because handlers query via the user-token client (RLS rejects the bogus token) and no service-role client exists in these paths — but that is incidental, not by design.
- **fix:** ✅ Applied — `mobile-request.ts` now always calls `supabase.auth.getUser()` to verify the JWT; the `x-verified-user-id` fast-path was deleted (header still set by proxy but no longer trusted for identity). A forged/garbage token is rejected here regardless of whether the proxy ran, so a single middleware bypass is no longer sufficient for impersonation. Trade-off: one auth round-trip per protected request (was skipped before); a local verify via `getClaims()` + asymmetric signing keys is a future optimization. Re-probed: spoofed header + garbage token → 401, valid → 200.

### headers-csp-unsafe-inline — LOW — `new`
- **area:** headers
- **location:** `next.config.ts:146` (CSP `script-src`)
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** CSP `script-src` includes `'unsafe-inline' 'unsafe-eval'`, which largely defeats CSP's XSS mitigation for the **web dashboard**. Not relevant to the mobile JSON API (RN doesn't execute the CSP), so out of this run's primary scope, but recorded for the shared config. Other headers are solid (verified on a live mobile API response: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, single-origin CORS; HSTS prod-only).
- **fix:** Move to nonce/hash-based `script-src` and drop `unsafe-inline`/`unsafe-eval` (a web-app hardening task; coordinate with the dashboard's inline-script usage).

### deps-minimatch-redos — LOW — `fixed`
- **area:** deps
- **location:** `ilokal-web` prod dependency tree (`minimatch <=3.1.3`, transitive)
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** `npm audit --omit=dev` reports `minimatch` HIGH (ReDoS via repeated wildcards / `matchOne()` backtracking / nested extglobs) in the production tree. Real exploitability depends on whether any request path feeds attacker-controlled strings into a `minimatch` glob — none found in the mobile routes — so practical risk is low, but it's a flagged prod-dep advisory.
- **fix:** ✅ Applied — root cause was `eslint-config-prettier`, `eslint-plugin-jsx-a11y`, `eslint-plugin-prettier` sitting in `dependencies`; moved them to `devDependencies`. `yarn audit --groups dependencies` no longer reports `minimatch` (dev-only now). Lint still PASS.

### deps-dual-lockfile — LOW — `fixed`
- **area:** deps
- **location:** `ilokal-web/` — both `package-lock.json` and `yarn.lock` committed
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** The web repo has **two lockfiles**. Installs resolve differently depending on which tool runs (npm vs yarn), so the audited/locked dependency set can drift from what actually ships — a supply-chain hygiene risk and a source of "works on my machine" version skew (and ambiguity for `npm audit` vs `yarn audit` results, which already differ).
- **fix:** ✅ Applied — `git rm package-lock.json` (web CLAUDE.md mandates yarn: "Never run `npm install`/`npm run`/`npx`"). `yarn.lock` is now the single source of truth. NOTE: `npm audit` no longer works here (needs a package-lock) — use `yarn audit --groups dependencies` for prod-dep scans going forward.

---

## Verified OK (no action) — recorded so regressions are visible

- **auth-proxy-getuser** — `proxy.ts:55-57` calls `supabase.auth.getUser()` for `/api/protected/**` (real verification, not presence-only). Probes: no token → 401, garbage token → 401.
- **auth-header-spoof-stripped** — `proxy.ts:63-65` deletes then sets `x-verified-user-id`. Probe: client-supplied header + no token → 401 (not trusted). *Caveat: depends on proxy always running — see `auth-next-unpatched`.*
- **rls-no-service-role-mobile** — no service-role / service-secret client in `app/api/mobile/**` or `app/api/protected/**`.
- **api-no-mass-assignment** — no `...body`/`...input` spread into `.insert()`/`.update()` in mobile/protected routes; `couponService` builds allowlisted fields.
- **rls-business-posts-scoped** — `business_posts` RLS: public read gated to verified+non-archived businesses; writes owner/admin only. No mobile write path. Updates route is `getMobileUser`-guarded, RLS-scoped, bounded scans, pagination capped at 50.
- **injection-chart-style** — `components/ui/chart.tsx:83` `dangerouslySetInnerHTML` is stock shadcn `ChartStyle` injecting theme CSS from developer config, not user input.
- **idor-redemptions-scoped** — `GET /protected/mobile/redemptions/:id` filters `.eq('user_id', auth.user.id).maybeSingle()`. Probe: own id → 200, foreign/synthetic id → 404. (Cross-user probe used a synthetic id — seed `owner` user holds no redemptions — but static scoping is unambiguous.)
- **dos-pagination-caps** — every paginated mobile route clamps `per_page` via `Math.min` and bounds scans with `.limit()` (`MAX_DEALS_SCAN=500`, `FEED_SCAN`, nearby limit, deals biz-match `.limit(200)`). No unbounded list fetch found. (Rate *volume* is the gap — see `dos-no-rate-limit`.)
- **upload-avatar-validated** — `protected/mobile/me/avatar`: 5 MB size cap, MIME allowlist (`image/jpeg|png|gif|webp`), filename sanitized (`replace(/[^a-zA-Z0-9._-]/g,'_')`), path scoped to `${user.id}/...` (storage-ownership RLS). No path traversal.
- **injection-mobile-or-filters** — all dynamic PostgREST `.or()`/`.ilike()` in mobile routes use either sanitized `search` (`/[,()]/`-stripped: products:54, nearby, deals:67) or a server-generated `now` ISO string (itinerary:33, redemptions:54). No raw SQL / `EXECUTE format()` in mobile routes.
- **mobile-secure-token-storage** — `ilokal-mobile/lib/supabase.ts`: session persisted in **expo-secure-store** (Keychain/Keystore) via `LargeSecureStore` chunker, `detectSessionInUrl:false` (no URL/deep-link session injection), autoRefresh gated on AppState. Not AsyncStorage.
- **mobile-anon-key-only** — mobile ships only `EXPO_PUBLIC_SUPABASE_ANON_KEY` (RLS-protected publishable key); no service-role key, no hardcoded JWT/secret literals in source (grep clean). `.env` git-ignored, not committed. Dev-host IP swap (`constants/env.ts`) is `__DEV__`-only and not user-controlled (no SSRF).
- **mobile-api-client-server-verifies** — `services/api/client.ts` attaches the bearer from `getSession()` and lets the **server** verify (proxy `getUser()`); 401 triggers one refresh-then-retry, else local sign-out. No trust placed in client-side token validity.
