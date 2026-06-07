# Security Audit — Findings Log

Persistent across runs. Stable `id` keeps a finding's identity over time.
Statuses: `open` · `fixed` · `regressed` · `new`. Secret values are redacted.

---

## Run history

- **2026-06-08** — scope: `auth, rls, api, injection` · stack: Next 16.1.6 / React 19.2.3 / @supabase/ssr 0.9.0 / yarn · trends: refreshed 2026-06-08. Dev server probed at `127.0.0.1:3000` + local PostgREST `127.0.0.1:54321`. First run (no prior log).
- **2026-06-08 (`--fix` pass)** — all 4 findings remediated. Next upgraded 16.1.6 → **16.2.7**. `follows` broad read dropped + `get_follower_counts` SECURITY DEFINER RPC added (`20260608000001`); re-probe confirms anon row read now `[]`, counts still served. Product-search `.or()` sanitized; redemptions POST now Zod-validated. Lint clean; `make migrate-reset` clean. NOTE: `yarn build` is blocked by a **pre-existing, unrelated** type error (`add-coupon.tsx:140` — `branch_id` not on `CreateCouponRequest`; coupon↔branch WIP on the branch, not from this audit).

---

## Findings

### auth-next-unpatched — HIGH — `fixed`
- **area:** auth / deps
- **location:** `package.json` (`next ^16.1.6`), lockfile-resolved **16.1.6**
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** Installed Next.js 16.1.6 predates the **May 2026 security release** (patched in 16.2.6), which fixes a HIGH **App Router proxy/middleware auth-bypass via segment-prefetch URL** and a DoS (CVE-2026-23870). Impact is amplified here because `proxy.ts` performs *all* `/api/protected/**` gating and `getMobileUser()` trusts the proxy-set `x-verified-user-id` header — a proxy bypass could let a client supply that header itself and impersonate any user by id.
- **fix:** `yarn upgrade next@^16.2.6` (and confirm React/RSC patched for CVE-2025-55182 / CVE-2025-66478); re-run build. Defense-in-depth: have `getMobileUser()` fall back to `getUser()` instead of blindly trusting `x-verified-user-id`.

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
- **location:** `app/api/protected/mobile/redemptions/route.ts:76-77`
- **first_seen:** 2026-06-08 · **last_seen:** 2026-06-08
- **desc:** POST body parsed manually (`const { coupon_id, branch_id } = body`) with only a null check, not the project-standard Zod schema. Not SQL-injectable (Supabase parameterizes), but type-confused input (array/object) can surface as a 500 instead of a clean 400, and uuid shape isn't enforced at the boundary.
- **fix:** Add a Zod schema with `z.string().uuid()` for both fields and parse at the top of the handler.

---

## Verified OK (no action) — recorded so regressions are visible

- **auth-proxy-getuser** — `proxy.ts:55-57` calls `supabase.auth.getUser()` for `/api/protected/**` (real verification, not presence-only). Probes: no token → 401, garbage token → 401.
- **auth-header-spoof-stripped** — `proxy.ts:63-65` deletes then sets `x-verified-user-id`. Probe: client-supplied header + no token → 401 (not trusted). *Caveat: depends on proxy always running — see `auth-next-unpatched`.*
- **rls-no-service-role-mobile** — no service-role / service-secret client in `app/api/mobile/**` or `app/api/protected/**`.
- **api-no-mass-assignment** — no `...body`/`...input` spread into `.insert()`/`.update()` in mobile/protected routes; `couponService` builds allowlisted fields.
- **rls-business-posts-scoped** — `business_posts` RLS: public read gated to verified+non-archived businesses; writes owner/admin only. No mobile write path. Updates route is `getMobileUser`-guarded, RLS-scoped, bounded scans, pagination capped at 50.
- **injection-chart-style** — `components/ui/chart.tsx:83` `dangerouslySetInnerHTML` is stock shadcn `ChartStyle` injecting theme CSS from developer config, not user input.
