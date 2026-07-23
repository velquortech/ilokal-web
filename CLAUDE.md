# CLAUDE.md — iLokal Web

<!-- TEMP: remove when admin rework is merged -->
> **Active work:** Admin design-parity + `/admin/[adminId]` migration — see
> [`.claude/ADMIN_REWORK.md`](.claude/ADMIN_REWORK.md) for parities, phased action
> items, and the testing plan. Delete that file and this note when finished.

<!-- TEMP: remove when registration gating is merged -->
> **Active work:** Registration gating flags (`app_settings`: docs on/off +
> auto-verify) — see [`.claude/REGISTRATION_GATING.md`](.claude/REGISTRATION_GATING.md).
> Migration `20260723000000` pending human approval + cloud apply. Delete that
> file and this note when finished.

## Commands

```bash
# Next.js
yarn dev             # Start dev server
yarn build           # Production build
yarn lint            # ESLint
yarn lint --fix      # ESLint with autofix
yarn test:run        # Vitest (single run)
yarn test            # Vitest (watch)

# Supabase / Make
make setup-supabase  # First-time setup
make run-dev         # Start Supabase + Next.js
make stop-db         # Stop Supabase DB
make clean           # Full teardown
make migrate-new name=<name>  # New migration file
make migrate-up      # Apply pending migrations
make migrate-reset   # Reset and re-apply all
make generate-types  # Regenerate lib/types/database.ts
```

Soft test step: `yarn lint --fix && yarn build` (or `make review` to include tests)

## Package manager

**yarn** — always use `yarn` instead of `npm`. Never run `npm install`, `npm run`, or `npx` (use `yarn dlx` instead).

## Stack

Next.js 16.2.7 (App Router; latest stable — open proxy-bypass advisories have no stable fix yet, compensated in the Proxy bullet) · React 19 · TypeScript strict · Supabase SSR + PostGIS · Zod 4 · shadcn-ui + Radix UI · Tailwind CSS v4 · Vitest

**Stack is frozen — no new dependencies without explicit approval.** Do not
`yarn add` any package (runtime or dev) unless the user explicitly asks for it
or approves it first. Solve problems with what's already installed: React/Next
built-ins, `react-dom/server` for static component tests, existing shadcn/Radix
components, sharp, motion, axios, sonner, etc. If a task genuinely needs a new
package, stop and propose it (name, why existing deps can't do it, size/risk) —
don't install speculatively. Same rule for new external services, CDNs, fonts,
or APIs.

## Architecture

- **Routing:** App Router only. Server Actions for internal mutations, API routes for external/mobile integrations.
- **Server Actions:** Use static imports from `lib/api/*/Service` and `lib/api/*/Query` directly. Never call `lib/services/` HTTP wrappers from a Server Action — they make an unnecessary network round-trip. `lib/services/` is for the admin/axios pattern only.
- **Supabase must never appear in components.** Components (`.tsx` files) must never import from `@supabase/ssr`, `@supabase/supabase-js`, `config/client.ts`, or call `createBrowserClient` / `createServerClient` directly. All Supabase queries and auth calls belong in Server Actions (`'use server'`) under `app/**/actions/` or `lib/api/`. Components call the exported action function — they never touch the Supabase client. This keeps auth logic, RLS scoping, and DB access in one auditable layer and prevents credential leakage into client bundles.
- **API namespaces:** `app/api/web/` — web-facing routes; `app/api/mobile/` — public mobile; `app/api/protected/mobile/` — JWT-gated mobile; `app/api/admin/` — admin only; `app/api/auth/` — auth flows.
- **Proxy:** Single `proxy.ts` at repo root (Next.js 16 replaces `middleware.ts`). (1) **Rate-limits** the whole mobile surface (`/api/mobile` + `/api/protected/mobile`) by client IP before any auth/DB work — 200 req / 60s default (env `MOBILE_RATE_LIMIT` / `MOBILE_RATE_WINDOW_MS`), returns 429 + `Retry-After`. In-memory/per-instance (`app/api/helpers/rateLimit.ts`) — a baseline flood guard, not a distributed quota (swap for Upstash/KV for that). (2) Refreshes session cookies for page routes. (3) Verifies JWTs for `/api/protected/**` via `supabase.auth.getUser()` and forwards `x-verified-user-id`. That header is **defense-in-depth only** — `getMobileUser()` always re-verifies the JWT itself and does NOT trust the header to skip `getUser()`, so a proxy bypass can't yield impersonation (compensating control for the open Next ≤16.3.0-canary proxy-bypass advisories).
  - Protected mobile handlers: call `getMobileUser(req)` from `app/api/helpers/mobile-request.ts` — **always verifies the JWT via `getUser()`**, returns `{ user, token, supabase }` with an RLS-scoped client.
  - Web/admin handlers: call `assertAuthorized(req)` from `lib/utils/auth/`.
- **Auth:** Supabase SSR with HTTP-only cookies (web) or `Authorization: Bearer <jwt>` (mobile).
- **Types:** `lib/types/` — re-export from `lib/types/index.ts`.
- **Validation:** Zod schemas in `lib/validation/`. For UUID ids use `z.guid()`, NOT `z.uuid()`/`z.string().uuid()` — Zod 4's `z.uuid()` is strict RFC-9562 and rejects this app's Postgres/seed UUIDs (silently 400s every request that validates an id).
- **Error format:** `ApiResponse<T> = { success: boolean; data?: T; error?: { code: string; message: string } }`.
- **Error leakage:** never pass a backend/Supabase `error.message` into a client response. On 500 paths use `loggedServerError(context, error)` (`app/api/helpers/response.ts`) — logs server-side, returns a generic body. Raw driver errors leak table/column/constraint names; reserve message text for hand-written 4xx.
- **Path alias:** `@/*` maps to project root.

## Schema state

Key facts about the current normalized schema (as of 2026-06-08):

- **`coupons`** — fully normalized in `20260523000000`. Columns: `code` (NOT `title`), `discount` JSONB `{type:'percentage'|'fixed_amount', value:number}` (NOT `type` enum), `expiry_date` (NOT `end_date`), `status` (`draft|published`). `redeem_time_limit_minutes` is gone. `promotion_type` (`'coupon' | 'deal'`, migration `20260523000001`) — the deals feed (`/api/mobile/deals`) filters `promotion_type = 'deal'`. Redemption caps live on the row: `max_redemptions_per_user`, `max_redemptions_global`, `current_redemptions`. `requires_follow` (boolean, default false; renamed from `requires_subscription` in `20260605000004`) — when true the redeem route requires the user to follow the business first. `branch_id` (nullable FK → `branches`, `20260528000001`; `null` = all branches) scopes a coupon to one branch — carried through `CreateCouponRequest`, `createCouponSchema`/`updateCouponSchema`, and `couponService`.
- **`products.status`** — `'active' | 'unlisted' | 'disabled'` (NOT `inactive|archived`). `is_available` is kept in sync by trigger; `status` is canonical. Also has `sale_price` (nullable) and `category_id` → `categories(id, name, slug)` (the `categories` table, NOT `business_categories`).
- **Ratings** — two tables: `ratings` (product-level: `product_id`, `business_id`, `review_text`) and `business_ratings` (`comment`). Mobile rating routes `upsert` with `onConflict`, so each needs a matching UNIQUE: `ratings(user_id, product_id)` (`20260528000000`) and `business_ratings(user_id, business_id)` (`20260508000003`).
- **Redemptions** — `user_redemptions` is the live table (has `expires_at`, `is_claimed`, `branch_id`). `coupon_redemptions` is a dead table — never insert into or query it; use `user_redemptions` for all redemption reads/writes (routes, analytics, service layer). `user_redemptions.coupon_id` has an FK → `coupons(id)` (restored in `20260530000000`; the `20260523000000` normalization dropped it via CASCADE, which broke PostgREST nested `coupons(...)` selects until restored).
- **Coupon claim flow** — redeeming inserts a `user_redemptions` row (`is_claimed=false`); claiming flips it via `PATCH /api/protected/mobile/redemptions/[id]/claim` with an atomic `.eq('is_claimed', false)` guard. RLS `"Users manage own interactions"` (`FOR ALL USING auth.uid() = user_id`) lets the user's RLS-scoped client do both. The redeem route (POST) also enforces a follow gate (`requires_follow` → 403) and rejects a second unclaimed, unexpired redemption of the same coupon (active-dupe → 400). Full rule matrix in `.claude/docs/coupon-rules.md`.
- **`follows`** — social follow table, renamed from `subscriptions` in `20260605000000` (distinct from the billing tables `subscription_plans`/`business_subscriptions`). Policies are self (`"Users manage own follows"`) + admin only — **never publicly readable**. A `USING(true)` public read (`20260607000000`) leaked the whole follow graph to anon and was dropped in `20260608000001`. Follower counts (nearby/detail badges) come from `get_follower_counts(p_business_ids uuid[])`, a SECURITY DEFINER RPC (granted anon/authenticated) returning counts only — never `user_id`. Don't re-add a broad SELECT on `follows`.
- **`business_posts`** (`20260605000003`) — content behind `GET /api/protected/mobile/updates` (merges posts + live coupons + new products from followed businesses). RLS: public read for posts of verified, non-archived businesses; writes owner/admin only (no mobile write path).
- **`user_redemptions.code`** (`20260608000002`) — 6-char display code shown to the cashier, **server-generated** by the `trg_set_redemption_code` BEFORE INSERT trigger (single source of truth — no client/dashboard hashing). The trigger is `ENABLE ALWAYS` so it still fires under `session_replication_role = replica` (see seed-trigger gotcha below).
- **Deals promotion** — the explore feed (`/api/mobile/deals`) sizes bento cards by `subscription_plans.features_promo_boost` (boolean, `20260530000002`), NOT by `price`. The anon feed reads promoted subs via the public SELECT policy in `20260530000003` (active subs on promo-boost plans only). Set the flag on new promoted plans, or they silently won't get boosted.
- **Coupon access invariant** — every route that fetches a coupon for display or redemption must filter `.eq('status', 'published').is('archived_at', null).lte('start_date', now)`. Omitting any of the three allows draft, archived, or not-yet-active coupons to be acted on.
- **`increment_coupon_redemptions(p_coupon_id uuid)`** — SECURITY DEFINER RPC (`20260527000001`). Call via `supabase.rpc('increment_coupon_redemptions', { p_coupon_id })` after inserting into `user_redemptions`. Returns `true` if incremented, `false` if global cap already hit. Must be SECURITY DEFINER — authenticated users have no UPDATE policy on `coupons`. Only the **global** cap is race-safe via this RPC; the per-user cap in the redeem route is a non-atomic count-then-insert (TOCTOU) — concurrent redeems by one user can slip past it.
- **Migration state (2026-07-17):** local and cloud (`ilokal-database`) are fully in
  sync through `20260717082537` — no pending migrations. Notable recent DB facts:
  `sync_role_to_jwt` trigger (role/status → JWT `app_metadata`),
  `increment_coupon_redemptions` RPC, `UNIQUE ratings(user_id, product_id)`,
  the `20260717*` hardening set (see "API security & performance standards"
  below), and pg_cron jobs `process-notification-outbox` (every minute) +
  `prune-notification-outbox` (daily).
- **`ratings`/`business_ratings` INSERT gate (SEC-4, `20260717080351`)** — a
  non-admin can only create a rating for a business they have redeemed a coupon
  from (RESTRICTIVE RLS policy via `has_redeemed_from_business()`). Rating
  routes map the 42501 denial to a friendly 403 — new rating write paths must do
  the same. Editing own rating (UPDATE), admin, and service-role paths are
  ungated.
- **`profiles` privileged columns (SEC-1, `20260717000001`)** — a BEFORE UPDATE
  trigger silently reverts non-admin self-changes to `role` (always),
  `status` (only active↔inactive allowed; never leaves `suspended`), and
  `archived_at` (settable, never clearable). Don't rely on route guards alone —
  the DB enforces this against direct PostgREST calls.
- **Mobile response envelope** — `successResponse(data)` returns data flat (e.g. `{ businesses: [...] }`), NOT wrapped in `ApiResponse<T>`. The `success/error` wrapper applies to web routes only.
- **Migration timestamps must be unique** — `supabase_migrations.schema_migrations` uses version as PK. Two files sharing a timestamp will fail on the second insert.
- **Seed triggers under replica mode** — seed files set `session_replication_role = replica` to bypass the `auth.users` FK, which **skips normal (`O`-enabled) triggers**. A `BEFORE INSERT` trigger that must populate a `NOT NULL` column during seeding needs `ENABLE ALWAYS` (e.g. `trg_set_redemption_code`), or `migrate-reset` fails on the seed insert.

## Mobile route conventions

- **Storage URLs:** any stored image field a mobile route returns must pass through `resolveStorageUrl(supabase, bucket, pathOrUrl)` (`app/api/helpers/storage.ts`). Seeds store full public URLs; real registrations store raw paths — returning the raw value yields a broken image.
- **Pagination:** PostgREST is capped at `max_rows = 1000` (`supabase/config.toml`). Fetch-all-then-paginate-in-memory silently truncates past 1000 rows — push filters and `.range()` into the query.
- **Soft deletes:** `business_types` and `business_categories` have `deleted_at`; filter `.is('deleted_at', null)` (top-level and on embedded relations) so deleted rows don't leak.

## API security & performance standards

Standards established by the 2026-07-17 perf/security audit (branch
`perf/security-hardening`, full log in `.claude/PERFORMANCE_AUDIT.md`). All new
code must follow these:

- **RLS policies: always wrap auth functions** — write `(select auth.uid())` /
  `(select auth.role())`, never bare `auth.uid()`. Bare calls re-evaluate per
  row scanned (Supabase's #1 RLS perf killer). Migration `20260717000002`
  wrapped the entire live policy set; don't reintroduce bare calls. Verify with
  the Supabase performance advisor (`auth_rls_initplan` must stay 0).
- **Aggregations belong in SQL, not Node** — never fetch-all-then-reduce with
  `Map`/`Set`: PostgREST caps at 1000 rows (`max_rows`), so JS aggregates
  silently return WRONG numbers past that. Write a SECURITY DEFINER RPC
  returning the finished aggregate (precedent: `analytics_*`, `mobile_deals`,
  `get_follower_counts`). Analytics RPCs are `GRANT EXECUTE TO service_role`
  only, and the caller must verify business ownership BEFORE the RLS-bypassing
  call.
- **SECURITY DEFINER functions** — always `SET search_path = public, pg_temp`
  and explicit `REVOKE ... FROM PUBLIC, anon, authenticated` + targeted
  `GRANT`. Trigger helpers get a pinned search_path too (advisor lint).
- **Counts** — count-only reads use `select('id', { count: 'exact', head:
  true })` (no row payload). Paginated lists keep `count: 'exact'` piggybacked
  on the data query. Never attach `count` to a `sum()`/aggregate read.
- **Indexes** — Postgres does NOT auto-index FKs: any new FK or hot filter
  column used by queries needs an explicit index in the same migration. Any
  *global* (not business-scoped) leading-wildcard `ilike` search column needs a
  `gin_trgm_ops` index (`shop_name`, `coupons.description`,
  `profiles.full_name`/`email` already have one).
- **Verify schema before writing queries** — the audit found four whole modules
  querying tables/columns that never existed (`reviews`, `subscriptions`,
  `payment_methods`, `page_views`, `products.is_active`, …) — every call
  errored and returned empty for months. Check `lib/types/database.ts` (or the
  live DB) for every table/column a new query touches; don't scaffold against
  an imagined schema. Deleted dead surfaces: `/api/web/{search,trending,
  reviews,subscriptions,billing}`, `/api/web/ratings/[id]`,
  `/api/web/analytics/products`. `getUserBusiness` lives in
  `lib/api/getUserBusiness.ts`.
- **Auth-route rate limiting** — any new `/api/auth/*` route must call
  `checkAuthRateLimit` (`app/api/helpers/auth-rate-limit.ts`): per-IP 30/60s +
  per-account 8/300s, 429 + Retry-After.
- **Storage delete paths** — `upload/[bucket]/[id]` rejects traversal-shaped /
  non-UUID-rooted paths (400) and enforces ownership per bucket (business
  buckets → `verifyBusinessOwner`; `avatars` → first segment must equal the
  caller's user id unless admin). Keep this pattern for new storage routes.
- **Caching (public mobile reads)** — cacheable public GETs use `unstable_cache`
  (error-safe: throw on DB error so failures aren't cached) or route-level
  `revalidate` (`business-types` 5min, business detail 120s, coupons 60s).
  Routes using the cookie client, `searchParams`-heavy routes, and
  header-reading routes stay dynamic. Tag invalidation not wired (Next 16
  `revalidateTag` profile-arg conflict) — keep windows short instead.
- **Cloud migrations via Supabase MCP** — `apply_migration` records its OWN
  timestamp as the version; after applying, UPDATE
  `supabase_migrations.schema_migrations` to the local file's version or the
  next `db push` re-applies everything.
- **One `<Toaster>` only** — sonner renders every toast in every mounted
  Toaster; the single instance lives in `app/layout.tsx` (top-right). Never
  mount another. Pending-action toasts use a stable id
  (`toast.loading(msg, { id })`) and dismiss on settle.

## Workflow

- Break work into a prioritized TODO checklist with acceptance criteria and risk level.
- High-risk changes (schema, API, auth) require human approval before merge.
- After each phase update `.claude/CHANGELOG.md`.
- Detect breaking changes (schema/API/type/perf) early — propose phased migration and rollback steps.

## Docs

Always loaded:
@.claude/docs/permanent-rules.md
@.claude/docs/mobile-api.md
@.claude/docs/protected-routes.md
@.claude/docs/auth-rate-limits.md
@.claude/CHANGELOG.md
@.claude/skill.md

Load on request (read when topic is relevant):
- `.claude/docs/architecture.md` — system design, auth flow diagrams
- `.claude/docs/folder-structure.md` — where to put new files
- `.claude/docs/authentication.md` — auth flows, signup/login/session detail
- `.claude/docs/protected-routes-strategy.md` — proxy and route guard strategy
- `.claude/docs/security.md` — headers, cookies, CSP, threat model
- `.claude/docs/frontend-patterns.md` — **start here** for data fetching and mutation patterns (Server Components, Server Actions, lib/api vs lib/services)
- `.claude/docs/server-actions.md` — when to use Server Actions vs API routes
- `.claude/docs/session-management.md` — role-based timeouts, activity detection
- `.claude/docs/rbac-model.md` — permission tiers, audit logging
- `.claude/docs/api-wrapper.md` — isomorphic service layer, client vs server imports
- `.claude/docs/tech-debt.md` — universal debt/roadmap doc: audit findings log (TD-NNN), active refactors, protected-route audit phases, and enforcement map
- `.claude/docs/api-strategy.md` — full endpoint implementation plan and status
- `.claude/docs/coupon-rules.md` — coupon claim rules, redeem gates, error codes
- `.claude/docs/testing.md` — untested routes matrix, test templates
- `.claude/docs/analytics-dashboard.md` — analytics panel ideas, RFM segments, retention queries, automation nudges
- `.claude/docs/DESIGN.md` — color system, OKLCH tokens, visual language from globals.css
- `.claude/docs/caching-strategy.md` — Next.js App Router caching layers, Supabase data-fetching rules
- `.claude/docs/code-principles.md` — TypeScript rules, naming conventions, anti-patterns
- `.claude/docs/component-standards.md` — file structure, naming, shadcn/ui usage rules
- `.claude/docs/git-workflow.md` — conventional commits format, branch naming, PR process
- `.claude/docs/ui-standards.md` — approved UI toolset, responsive strategy, visual consistency rules
