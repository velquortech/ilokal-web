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

| ID     | Sev | Area         | Title                                            | Status |
| ------ | --- | ------------ | ------------------------------------------------ | ------ |
| TD-001 | 🔴  | Security     | Service-role key under `NEXT_PUBLIC_*` name      | 🔲 Open |
| TD-002 | 🔴  | Security     | No rate limit on `/api/auth/*`                   | 🔲 Open |
| TD-003 | 🟠  | Security     | Self-asserted `role` at public signup            | 🔲 Open |
| TD-004 | 🟠  | Security     | Backend error messages leak to web clients       | 🔲 Open |
| TD-005 | 🟠  | Security     | Taxonomy mutations rely on RLS alone (no handler authz) | 🔲 Open |
| TD-006 | 🟢  | Security     | Signup account enumeration                       | 🔲 Open |
| TD-007 | 🟢  | Security     | Rate limiter per-instance + spoofable XFF        | ⏸️ Deferred |
| TD-008 | 🟢  | Validation   | `follows` POST lacks UUID validation             | 🔲 Open |
| TD-009 | 🟠  | Architecture | Two auth helpers (`assertAuthorized` vs `getCurrentUser`) | 🔲 Open |
| TD-010 | 🟠  | Architecture | Dual profile-creation paths (trigger + signup insert) | 🔲 Open |
| TD-011 | 🟠  | Architecture | Migration drift — code depends on un-applied migrations | 🔲 Open |
| TD-012 | 🟢  | Architecture | Stale empty `database.types.ts` at repo root     | 🔲 Open |
| TD-013 | 🟢  | Code quality | Response-envelope drift in web routes            | 🔲 Open |
| TD-014 | 🟠  | UI/UX        | No `loading.tsx` / streaming states              | 🔲 Open |
| TD-015 | 🟢  | UI/UX        | Client-heavy bundle (64% `'use client'`)         | 🔲 Open |
| TD-016 | 🟢  | UI/UX        | Uneven accessibility coverage                    | 🔲 Open |
| TD-017 | 🔴  | Architecture | Web billing/subscription routes query non-existent `subscriptions` table | 🔲 Open |

---

## Audit log — 2026-06-14 (full codebase + mobile REST API)

Scope: `feat/mobile-api-routes` · security, architecture, code principles, UI/UX,
against the MVP Supabase schema and the REST API surface. Items ordered by area
then severity.

### Security

#### TD-001 · 🔴 · Service-role key is named `NEXT_PUBLIC_*`

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

#### TD-002 · 🔴 · No rate limit on `/api/auth/*`

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

#### TD-005 · 🟠 · Taxonomy mutations rely on RLS alone

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

#### TD-011 · 🟠 · Migration drift

CLAUDE.md lists several "pending `migrate-up`" migrations that route code already
depends on (`requires_follow`, `increment_coupon_redemptions`, promo-boost).
Confirm prod has them applied or those routes 500.

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

#### TD-014 · 🟠 · No `loading.tsx` / streaming states

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

#### TD-017 · 🔴 · Web billing/subscription routes query a non-existent `subscriptions` table

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
