# Tech Debt & Roadmap

Single source of truth for known debt, security findings, active refactors, and
planned work. Supersedes the old `roadmap.md` (merged in below).

## How to use this doc

- Every item has a stable **ID** (`TD-NNN`) — never reuse or renumber. Reference
  it in commits/PRs (`fix(TD-002): rate-limit auth routes`).
- Update **Status** in place when work lands; keep the row. Don't delete resolved
  items — flip them to `✅ Resolved` with the resolving commit/date so the history
  stays auditable.
- New findings append to the **next** free ID at the end of the relevant section.

**Severity:** 🔴 High · 🟠 Medium · 🟢 Low · ℹ️ Info/Nice-to-have
**Status:** 🔲 Open · 🟡 In progress · ✅ Resolved · ⏸️ Deferred

---

## Status board

> **Reconciled 2026-08-05.** Five rows below said 🔲 Open for work the CHANGELOG
> shows landed weeks ago — each was re-verified against the code before being
> closed here, not taken from the changelog on trust. A debt log that lists
> fixed items is read the same way a stale schema doc is: people stop believing
> the rows that are still true.

| ID     | Sev | Area         | Title                                            | Status |
| ------ | --- | ------------ | ------------------------------------------------ | ------ |
| TD-001 | 🔴  | Security     | Service-role key under `NEXT_PUBLIC_*` name      | ✅ Fixed 2026-06-08 |
| TD-002 | 🔴  | Security     | No rate limit on `/api/auth/*`                   | ✅ Fixed 2026-07-17 |
| TD-003 | 🟠  | Security     | Self-asserted `role` at public signup            | 🔲 Open |
| TD-004 | 🟠  | Security     | Backend error messages leak to web clients       | 🔲 Open |
| TD-005 | 🟠  | Security     | Taxonomy mutations rely on RLS alone (no handler authz) | ✅ Fixed 2026-06-08 |
| TD-006 | 🟢  | Security     | Signup account enumeration                       | 🔲 Open |
| TD-007 | 🟢  | Security     | Rate limiter per-instance + spoofable XFF        | ⏸️ Deferred |
| TD-008 | 🟢  | Validation   | `follows` POST lacks UUID validation             | 🔲 Open |
| TD-009 | 🟠  | Architecture | Two auth helpers (`assertAuthorized` vs `getCurrentUser`) | 🔲 Open |
| TD-010 | 🟠  | Architecture | Dual profile-creation paths (trigger + signup insert) | 🔲 Open |
| TD-011 | 🔴  | Architecture | Migration drift — 23 migrations never probed against cloud; probe covers 31 of 47 | 🔲 Open |
| TD-012 | 🟢  | Architecture | Stale empty `database.types.ts` at repo root     | 🔲 Open |
| TD-013 | 🟢  | Code quality | Response-envelope drift in web routes            | 🔲 Open |
| TD-014 | 🟠  | UI/UX        | No `loading.tsx` / streaming states              | ✅ Fixed 2026-07-24 |
| TD-015 | 🟢  | UI/UX        | Client-heavy bundle (64% `'use client'`)         | 🔲 Open |
| TD-016 | 🟢  | UI/UX        | Uneven accessibility coverage                    | 🔲 Open |
| TD-017 | 🔴  | Architecture | Web billing/subscription routes query non-existent `subscriptions` table | ✅ Resolved by removal 2026-07-17 |
| TD-018 | 🟠  | Security     | Mobile protected routes not status-gated (deactivate/archive enforced app-side only) | 🔲 Open |
| TD-019 | 🟢  | UX           | `safeNext` is customer-scoped — an owner is not returned to the wizard after signup | 🔲 Open |
| TD-020 | 🟢  | Verification | Surfaces shipped without a browser pass (auth-gated in CI, no headless browser) | 🔲 Open |
| TD-021 | 🔴  | Security     | `/api/web` + `/api/admin` absent from the proxy limiter — 33 mutating routes + 22 Server Action files unguarded | 🔲 Open (uploads fixed 2026-08-19) |

---

## Audit log — 2026-06-14 (full codebase + mobile REST API)

Scope: `feat/mobile-api-routes` · security, architecture, code principles, UI/UX,
against the MVP Supabase schema and the REST API surface. Items ordered by area
then severity.

### Security

#### TD-001 · 🔴 · Service-role key is named `NEXT_PUBLIC_*` · ✅ Fixed 2026-06-08

> **Resolved.** Renamed to the server-only `SUPABASE_SERVICE_ROLE_KEY` and
> `config/index.ts` was deleted outright (it was a dead RLS-bypassing client with
> zero importers). Re-verified: **0** occurrences of `NEXT_PUBLIC_SUPABASE_SERVICE`
> anywhere in `app`/`lib`/`config`/`supabase`/`proxy.ts`/`next.config.ts`, and no
> `config/index.ts` on disk. The description below is kept as the historical
> finding — **the file paths and line numbers in it no longer resolve.**

[.env](../../.env) defines `NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY` (full
RLS-bypass key), consumed by [config/index.ts:8](../../config/index.ts#L8) and
[supabase/server.ts:45](../../supabase/server.ts#L45).

- **Current state:** value is *not* in the built client bundle (`.next/static`
  grep = 0 matches) because both consumers are server-only (`next/headers`).
- **Risk:** Next.js inlines any `NEXT_PUBLIC_*` var into the browser the moment
  it is referenced from client-bundled code. The name invites exactly that and
  violates `permanent-rules.md` ("`NEXT_PUBLIC_` prefix only for browser-safe
  values"). One careless import = total data breach.
- **Fix:** rename to server-only `SUPABASE_SERVICE_ROLE_KEY`, update the two
  consumers, rotate the key. [supabase/server.ts:65](../../supabase/server.ts#L65)
  (`createServerAdminClient`) already follows the correct pattern.

#### TD-002 · 🔴 · No rate limit on `/api/auth/*` · ✅ Fixed 2026-07-17

> **Resolved by SEC-8.** `checkAuthRateLimit`
> (`app/api/helpers/auth-rate-limit.ts`) enforces per-IP 30/60s + per-account
> 8/300s with a 429 + `Retry-After`. Re-verified: **7** files under `app` call it.
> The proxy matcher was deliberately NOT widened — the guard lives in the
> handlers, so the description below overstates the fix's shape.

Proxy matcher ([proxy.ts:191](../../proxy.ts#L191)) covers `/api/mobile`,
`/api/protected`, `/admin`, `/business` — but not `/api/auth/login|signup|
reset-password`. Login/signup are open to brute-force and credential stuffing;
`auth-rate-limits.md` prescribes a guard that was never implemented.

- **Fix:** add `/api/auth/:path*` to the matcher and apply `rateLimit()` keyed by
  IP + email with a tight budget (e.g. 10/min).

#### TD-003 · 🟠 · Self-asserted `role` at public signup

[signup/route.ts:72](../../app/api/auth/signup/route.ts#L72) reads `role` from the
request body, validated only by an enum that includes `'admin'`
([auth.ts:61](../../lib/validation/auth.ts#L61)).

- **Mitigation in place:** the `handle_new_user` SECURITY DEFINER trigger
  hardcodes `'app_user'` with `ON CONFLICT DO NOTHING`
  ([20260508000001](../../supabase/migrations/20260508000001_auto_create_profile.sql)),
  so escalation is blocked — but the same conflict makes the route's manual
  `profiles` insert always collide (see TD-010).
- **Fix:** drop `role` from the public signup schema, force `app_user`, remove the
  manual insert. Keep self-assignable roles only in `serverSignupSchema` (admin).

#### TD-004 · 🟠 · Backend error messages leak to web clients

Mobile routes use `loggedServerError` correctly; web routes regressed:
[business-types/[id]/route.ts:15,25](../../app/api/web/business-types/[id]/route.ts#L15)
and [admin/subscriptions/plans/route.ts:50](../../app/api/admin/subscriptions/plans/route.ts#L50)
return raw `error.message`, exposing table/column/constraint names and RLS hints.

- **Fix:** route all 500s through `loggedServerError`.

#### TD-005 · 🟠 · Taxonomy mutations rely on RLS alone · ✅ Fixed 2026-06-08

> **Resolved.** `assertAuthorized(undefined, { roles: ['admin'] })` was added to
> the `business-types` and `business-categories` mutation handlers. Re-verified:
> `assertAuthorized` is present in `app/api/web/business-types/route.ts`.

[business-types/[id]](../../app/api/web/business-types/[id]/route.ts) and
`business-categories` PATCH/DELETE/POST have no auth check in the handler — saved
only by table RLS (`is_admin()`,
[20260526000000](../../supabase/migrations/20260526000000_rls_business_type_categories.sql)),
which is correct, so not currently exploitable. Defense-in-depth gap: non-admins
get a leaked DB error instead of 403, and any RLS slip becomes an open mutation.

- **Fix:** add `assertAuthorized(req, { roles: ['admin'] })` at the top.

#### TD-006 · 🟢 · Signup account enumeration

Signup returns explicit `409 "Email already registered"`
([signup:90](../../app/api/auth/signup/route.ts#L90)) plus an email-existence
pre-check, while login is correctly generic — inconsistent, enables enumeration.

#### TD-007 · 🟢 · Rate limiter per-instance + spoofable XFF · ⏸️ Deferred

[rateLimit.ts](../../app/api/helpers/rateLimit.ts) is in-memory per-runtime and
trusts the XFF first hop. Already documented as a baseline guard; acceptable for
self-hosted single-node. Swap for Upstash/KV before serverless deploy.

#### TD-008 · 🟢 · `follows` POST lacks validation

[follows/route.ts:42](../../app/api/protected/mobile/follows/route.ts#L42) takes
`business_id` with no Zod/`z.guid()` validation and no existence check, unlike the
rest of the codebase.

### Architecture

#### TD-009 · 🟠 · Two auth helpers

`assertAuthorized` (50 routes) vs `getCurrentUser` + hand-rolled role check (admin
routes) implement the same logic in two shapes. Consolidate on `assertAuthorized`.

#### TD-010 · 🟠 · Dual profile-creation paths

The `handle_new_user` trigger and the signup route's manual `profiles` insert both
create the profile row → guaranteed PK conflict → misleading 500 path and a
redundant write. Let the trigger own profile creation (ties to TD-003).

#### TD-011 · 🔴 · Migration drift — 23 migrations unprobed against cloud

> **🔴 CORRECTED 2026-08-18. The previous body of this entry was WRONG and had
> been wrong for two weeks.** It stated that cloud had no `events`,
> `booking_requests` or `product_sections` tables, no `products.kind` /
> `booking_mode` / offering columns, no `business_settings` onboarding columns
> and a 2-column `public_feature_flags()` — and that live code selecting from
> them was broken in production. The 2026-08-10 cloud audit
> (`chore/cloud-migration-audit`) **disproved every one of those claims by
> object existence**: all of it was already live, most of it for weeks. Reading
> that paragraph is what makes people avoid tables that are in production. It
> has been deleted rather than amended, because a wrong "it isn't there" costs
> exactly as much as a wrong "it is".

**What is actually known, and how it was established:**

- **Verified applied through `20260808090000`** (2026-08-10, by object
  existence + `supabase migration list --linked`, not by the ledger alone).
  The whole queue this entry used to list as pending was already on cloud.
- **One real partial application was found in that audit** and fixed:
  `idx_products_section_id` was absent while `20260801061117` read APPLIED,
  because the index was added to the migration file in a *later* commit than
  the one that created it. **Any migration edited in place after cloud has
  applied it silently loses the edit** — `db push` keys on the version and
  skips the file. This repo edits migrations in place routinely, so re-run
  `supabase/reports/cloud_object_inventory.sql` after any such edit.

**The open part of this item — the reason it is still 🔴:**

- `supabase/migrations/` now holds **47** migrations after `20260717082537`
  (max `20260819010000`; 151 files total). Only the first 24 were ever probed.
  **The state of the other 23 on cloud is UNKNOWN** — not "behind", not "in
  sync". Nothing in this repo can answer it without cloud credentials.
- **The probe that would answer it is itself incomplete:**
  `supabase/reports/cloud_drift_probe.sql` carries **31** version rows against
  those 47 migrations, so **20 have no row and produce no verdict**. A run
  looks clean and reports nothing about them — the same silent-success failure
  the probe exists to catch.

**Fix:**

1. Extend `cloud_drift_probe.sql`'s `VALUES` list to cover all 47 versions
   (data-only migrations need a *row* probe, not an object probe — an object
   probe reports "present" for them unconditionally, i.e. checks nothing).
2. `yarn supabase login --token <PAT>` → `yarn supabase link --project-ref
   skvgasimllpyhyudpycu` → `yarn supabase db query --linked -f
   supabase/reports/cloud_drift_probe.sql`, then the 98-object
   `cloud_object_inventory.sql` sweep.
3. Apply only what the probe reports missing, via
   `yarn supabase db push --linked --yes` (it records the FILE's version, so no
   ledger reconcile is needed — that ritual applies only to the Supabase MCP's
   `apply_migration`, which records its own timestamp).
4. Before any `DROP FUNCTION` + `CREATE` migration, save the current definition
   (`pg_get_functiondef`) as a rollback artifact and expect a brief PGRST202
   window for anon callers.

**Note the failure mode that hid the last gap:** `20260808090000` sat unapplied
while 23 louder migrations landed, because it only added a column to an RPC's
`RETURNS TABLE`. The function still succeeded, the mobile client's `z.object()`
dropped the absent key, and the cards silently fell back. **A missing table
42P01s on first call; a missing return column just degrades** — which is why
the probe checks `pg_get_function_result()` and not merely `proname`.

Related: TD-012 (stale root `database.types.ts`).

#### TD-012 · 🟢 · Stale `database.types.ts`

[database.types.ts](../../database.types.ts) at repo root is an empty dead file;
[lib/types/database.ts](../../lib/types/database.ts) is canonical. Delete it.

### Code principles

#### TD-013 · 🟢 · Response-envelope drift

[business-types/[id]](../../app/api/web/business-types/[id]/route.ts) returns bare
`{ error }` / `data` instead of the `ApiResponse<T>` envelope every other web route
uses. Standardize.

*Healthy baseline:* TS strict, ~0 `any` in app/lib (1 file), no raw `<img>`
(25 `next/image`), Zod-first validation, the `z.guid()` fix, good "why" comments.

### UI/UX

#### TD-014 · 🟠 · No `loading.tsx` / streaming states · ✅ Fixed 2026-07-24

> **Resolved.** Re-verified: **31** `loading.tsx` files under `app/`, backed by
> the shared skeleton set in `components/custom/skeletons.tsx`.

`0` `loading.tsx` across 22 pages; only 1 `error.tsx` / 1 `not-found.tsx`. App
Router Suspense/skeletons unused — every navigation blocks on data with no
feedback. Highest-impact UX fix.

#### TD-015 · 🟢 · Client-heavy bundle

148 of 231 components (64%) are `'use client'`. Many are likely static and could
be server components — TTI/bundle win.

#### TD-016 · 🟢 · Uneven accessibility coverage

`aria-*` in 38 files, `alt=` in 31. shadcn/Radix gives a floor; run an axe pass on
the business dashboard and registration flow.

---

## Active refactors — `refactor/api-layer-overhaul`

### Middleware consolidation ✅

Replaced the `proxy/` middleware stack (`stackMiddlewares.ts`, `auth-middleware.ts`,
`protectedRoutes.ts`) with a single `proxy.ts` at the project root.
`config/updateSession.ts` was deleted; session refresh is now inline.
`lib/utils/protectedRoutes.ts` and `lib/utils/auth/index.ts` updated to match.

### Folder restructure ✅

`app/business-registration/` → `app/business/registration/` — pages, components,
steps, hooks, and tests co-located under `app/business/`. Import paths updated.

### API namespace cleanup ✅

`config/routeConfig.ts`: stale `BILLING_BASE`, `PAYMENTS_BASE`,
`SUBSCRIPTIONS_BASE`, `USERS_BASE` removed; dead `API_PROTECTED_PREFIXES` cleaned.

---

## Protected-route audit — phase status

Findings from the May 2026 audit of `proxy.ts`, `protectedRoutes.ts`, and the API
handler guard layer.

### Phase 1 — Completed ✅

1. **Redundant matcher entries** — `/admin/settings/:path*` and
   `/business/settings/:path*` were already covered by parent prefixes. Removed.
2. **Dead `API_PROTECTED_PREFIXES`** — listed four non-existent paths. Removed.
3. **Stale `ROUTES.API` base constants** — `routeConfig.ts` cleaned up.
4. **Clarity comment** — `proxy.ts` notes the `/api/protected` block only checks
   token presence; full JWT verification happens per-handler via `getMobileUser()`.

### Phase 2 — Implemented (pending migration approval) 🟡

Eliminate the double DB query in middleware for page routes. Migration
`20260527000000_sync_role_to_jwt.sql` adds an `AFTER INSERT OR UPDATE` trigger on
`public.profiles` writing `role`/`status` into `auth.users.raw_app_meta_data`, plus
a one-time backfill. `proxy.ts` reads `user.app_metadata.role`/`status` first,
falling back to the profiles SELECT.

- **Risk:** Medium — schema + auth change. **Requires approval before `migrate-up`.**
- **Rollback:** `DROP TRIGGER on_profile_role_change ON public.profiles; DROP
  FUNCTION sync_role_to_jwt();` — middleware falls back to the profiles SELECT.

### Phase 3 — Completed ✅

Strengthen the token check for `/api/protected/*`. `proxy.ts` now calls
`supabase.auth.getUser()`; expired/forged tokens are rejected before handler code.
Uses `createServerClient` with `global.headers` for Bearer, cookies for web.

### Phase 4 — Long-term ⏸️

Request-scoped auth deduplication. `assertAuthorized()` re-runs
`supabase.auth.getUser()` + a `profiles` SELECT in every handler. If Phase 2 lands,
the profile SELECT disappears; a request-scoped cache (`AsyncLocalStorage` /
`WeakMap` on `NextRequest`) would collapse repeat calls to one auth round-trip. Low
priority until profiling shows a bottleneck.

---

## Audit log — 2026-06-16 (cloud-deploy readiness review, mvp→main merge)

### Architecture

#### TD-017 · 🔴 · Web billing/subscription routes query a non-existent `subscriptions` table · ✅ Resolved by removal 2026-07-17

> **Resolved by deleting the surface**, not by repointing it. Re-verified:
> `app/api/web/` contains no `subscriptions/` or `billing/` directory, and
> `lib/api/subscriptions/` is gone. **Ignore the "Fix" and "Blast radius"
> paragraphs below** — those routes no longer exist, so nothing is broken at
> runtime. `lib/types/subscription.ts` does still exist; the admin `plans`
> routes and `subscription_plans` reads were kept and are self-contained.

[lib/api/subscriptions/subscriptionQuery.ts](../../lib/api/subscriptions/subscriptionQuery.ts)
and [subscriptionService.ts](../../lib/api/subscriptions/subscriptionService.ts) call
`.from('subscriptions')` in 12 places, selecting/filtering **billing** columns
(`status`, `archived_at`, `plan_id`, `current_period_*`). No table with that shape
exists:

- `public.subscriptions` was only ever the **social follow** table
  (`20260217034537_interactions.sql`: `id, user_id, business_id, created_at`,
  `UNIQUE(user_id, business_id)` — "prevent duplicate follows"). It never had
  `status`/`archived_at`.
- It was renamed to **`follows`** in `20260605000000_rename_subscriptions_to_follows.sql`,
  so `.from('subscriptions')` now resolves to **no relation at all**.
- The actual billing table is **`business_subscriptions`**
  (`business_id, plan_id, status, current_period_start/end, cancel_at_period_end`) —
  and even it has **no `archived_at`** column.

- **Not a regression from the rename or the cloud-seed work.** The service was
  written against the wrong table from the start (commit `5cc3342` "implement
  subscription service with CRUD operations and payment methods"); the rename only
  changed the failure from *"column status does not exist"* to *"relation
  subscriptions does not exist."* These routes have never functioned.
- **Blast radius (all currently broken at runtime):** `/api/web/subscriptions/*`
  (route, plans, upgrade, downgrade) and `/api/web/billing/*` (invoices, usage,
  payment-method), plus the business dashboard's billing/subscription actions.
  Mobile/APK is **unaffected** — it reads `follows` via the protected mobile routes,
  not this code.
- **Fix:** repoint `lib/api/subscriptions/*` at `business_subscriptions`, drop/replace
  the `archived_at` filter (add the column via migration if soft-delete is wanted),
  and reconcile the `Subscription` type in [lib/types/subscription.ts](../../lib/types/subscription.ts)
  with the real schema. Add an integration test that hits the live table. Related:
  TD-011 (migration drift — code vs un-applied schema).

#### TD-018 · 🟠 · Mobile protected routes are not status-gated server-side

The self-service account endpoints
([app/api/protected/mobile/me/route.ts](../../app/api/protected/mobile/me/route.ts)
`DELETE`, `me/deactivate`, `me/reactivate`) flip `profiles.status` /
`archived_at`, but nothing on the mobile surface actually **blocks** a
deactivated or archived user:

- `proxy.ts` gates `/api/protected/mobile/**` on **JWT validity only** (`getUser()`),
  not status — unlike the page-route branch, which redirects any `status !== 'active'`
  user. So a deactivated user keeps full API access until their access token expires.
- Mobile login uses the **Supabase SDK directly** (`signInWithPassword`), bypassing
  `/api/auth/login` and its `archived_at` / `status` 403 gate (web-only).
- Today enforcement is **app-side**: the client signs out after a 200, the
  mobile re-login gate (`app/_layout.tsx`, 2026-08-11) reads `status`/`archived_at`
  from `GET /me` to prompt reactivation or sign out instead of silently
  continuing, and the **`delete-account` edge function** (deployed 2026-08-11)
  revokes every session on delete via `auth.admin.signOut` — validated live in
  `e2e.local.mjs` (old JWT refused 403 after delete). A crafted client with a
  still-valid token can still ignore deactivation, which is not revoked.
- **Fix options:** (a) gate `getMobileUser()` (or the proxy `/api/protected` branch)
  on `app_metadata.status` — it's already synced into the JWT by the
  `sync_role_to_jwt` trigger (`20260527000000`), so it's a free check, no extra
  query — while **exempting** `me/reactivate` so a deactivated user can still
  self-reactivate; and/or (b) revoke sessions server-side on **deactivate** too
  (the edge function already does it for delete). Deferred from the initial
  account-management endpoint PR to keep that change non-cross-cutting.

---

## Audit log — 2026-08-05 (standards sweep, onboarding + /for-business)

Scope: the 11 commits from the onboarding, registration-cache, leaflet and
`/for-business` work, swept against `CLAUDE.md`. **No standard is broken by the
code** — the findings were documentation drift (folded into TD-011 and fixed in
`CLAUDE.md` on `chore/standards-debt`) plus the two items below.

#### TD-019 · 🟢 · `safeNext` is customer-scoped

[safeNext](../../lib/utils/safeNext.ts) validates and returns a same-origin
`?next=`, but only the CUSTOMER paths honour it (`SignupForm` applies it when
`result.role === 'app_user'`). So an owner who arrives at `/for-business`,
presses "Create an account" and signs up lands on their dashboard rather than
back in the registration wizard they were reading about — the page's own CTA
loses its thread.

**Fix:** honour a validated `next` for `business_owner` too, and have
`/for-business` pass `?next=/business/registration` for anonymous visitors. The
guard already rejects off-origin, backslash and control-character paths, so the
work is plumbing, not validation.

#### TD-020 · 🟢 · Surfaces shipped without a browser pass

This environment has no login path and no headless browser, so several surfaces
are verified only by unit tests, a production build and (where public) a curl
smoke. Outstanding: the onboarding tour spotlight (its whole failure mode is
measurement, which happy-dom cannot model), the setup checklist and welcome
ring, the registration gallery step against a real storage quota, the leaflet
z-index containment, and `/for-business` at 320/768/1280 in both themes.

**Fix:** one manual pass per surface, or wire a headless browser into CI. Note
that a cached Playwright chromium turned out to be available during the landing
redesign (2026-08-01) — worth checking again before assuming it cannot be done
here.

---

#### TD-021 · 🔴 · `/api/web` and `/api/admin` are absent from the proxy rate limiter

**The defect is structural, not per-route.** `proxy.ts` rate-limits by IP before
any auth or DB work, but its limiter block tests only `/api/mobile` and
`/api/protected/mobile`. `/api/admin` is in the matcher (for the role gate) but
never reaches the limiter; `/api/web` is not in the matcher at all. So a mutating
route added under either prefix is **unthrottled by default, and nothing at
review time says so** — which is how this went unnoticed for months. Server
Action POSTs are a third path with the same property: they never enter the proxy.

**Still unguarded** (re-derive with
`grep -rLn "rateLimit\|checkAuthRateLimit\|checkUploadRateLimit"` over the
mutating handlers):

- `app/api/web/businesses/[id]/files/route.ts` — a sibling upload endpoint (the
  registration per-file POST). Same cost profile as the routes fixed below, but
  it sits outside `upload/` so the contract sweep does not reach it. **Closest
  to done; take this one first.**
- 15 other mutating `/api/web/**` routes — payments (`checkout`, `confirm`,
  `refund`), `ratings`, `coupons/[id]/redeem`, `invoices/[id]/send`,
  `notifications/[id]` + `preferences`, `users/[id]` + `users/me`,
  `businesses`, and the four taxonomy handlers.
- 14 mutating `/api/admin/**` routes — business verify/suspend/reject/delete,
  moderation, subscription plans.
- `/api/auth/logout`, `/refresh-token`, `/verify-email` — the three auth routes
  with no `checkAuthRateLimit`.
- 22 Server Action files — `couponActions`, `branchActions`, `profileActions`,
  `sectionActions`, `settingsActions`, and most of `app/admin/[adminId]/actions/`.

**Fixed so far:** the seven `/api/web/upload/**` routes (2026-08-19) via
`checkUploadRateLimit` — one shared bucket, keyed on the verified session user,
placed before `request.formData()`, pinned by a filesystem-driven contract sweep
so an eighth upload route fails until guarded.

**Fix — two halves, and the second is the durable one:**

1. Per-route guards for the surfaces above, following the upload pattern. Cheap,
   but it is the same forgettable manual step that created the gap.
2. **Add `/api/web` to the proxy matcher and widen the limiter block** so the
   prefix is guarded by default and a per-route guard becomes a tightening
   rather than the only thing standing there. Do this together with **TD-007**
   (a distributed store) — a proxy-level limit that resets per isolate is a
   weaker promise than it looks, and doing both at once means one change to the
   thing every request passes through, not two.

**Note:** most of these sit behind `assertAuthorized` / `verifyBusinessOwner`,
so they are *authenticated*-abuse surfaces, not anonymous ones. That bounds the
blast radius; it does not close it, since a single stolen session is enough and
several routes amplify into storage writes, emails, or payment calls.

---

## Enforcement map

| Path prefix        | Middleware runs?          | Guard mechanism                                          |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| `/admin/*`         | Yes — page route block    | `isProtectedPath` + `roleAllowedForPath` → redirect      |
| `/business/*`      | Yes — page route block    | `isProtectedPath` + `roleAllowedForPath` → redirect      |
| `/api/protected/*` | Yes — shallow token check | `getMobileUser()` in each handler                        |
| `/api/admin/*`     | No                        | `assertAuthorized({ roles: ['admin'] })` in each handler |
| `/api/web/*`       | No                        | `assertAuthorized()` in each handler                     |
| `/api/auth/*`      | No                        | Public — ⚠️ no guard, no rate limit (TD-002)             |
| `/api/mobile/*`    | No                        | Public — rate-limited in proxy                           |
</content>
