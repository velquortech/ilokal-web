# CLAUDE.md — iLokal Web

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

Next.js 16 (App Router) · React 19 · TypeScript strict · Supabase SSR + PostGIS · Zod · shadcn-ui + Radix UI · Tailwind CSS v4 · Vitest

## Architecture

- **Routing:** App Router only. Server Actions for internal mutations, API routes for external/mobile integrations.
- **Server Actions:** Use static imports from `lib/api/*/Service` and `lib/api/*/Query` directly. Never call `lib/services/` HTTP wrappers from a Server Action — they make an unnecessary network round-trip. `lib/services/` is for the admin/axios pattern only.
- **API namespaces:** `app/api/web/` — web-facing routes; `app/api/mobile/` — public mobile; `app/api/protected/mobile/` — JWT-gated mobile; `app/api/admin/` — admin only; `app/api/auth/` — auth flows.
- **Proxy:** Single `proxy.ts` at repo root (Next.js 16 replaces `middleware.ts`) — refreshes session cookies for page routes and verifies JWTs for `/api/protected/**` via `supabase.auth.getUser()`. Sets `x-verified-user-id` header after verification (spoofing-safe); handlers reuse it to skip a redundant `getUser()` round-trip.
  - Protected mobile handlers: call `getMobileUser(req)` from `app/api/helpers/mobile-request.ts` — returns `{ user, token, supabase }` with RLS-scoped client.
  - Web/admin handlers: call `assertAuthorized(req)` from `lib/utils/auth/`.
- **Auth:** Supabase SSR with HTTP-only cookies (web) or `Authorization: Bearer <jwt>` (mobile).
- **Types:** `lib/types/` — re-export from `lib/types/index.ts`.
- **Validation:** Zod schemas in `lib/validation/`.
- **Error format:** `ApiResponse<T> = { success: boolean; data?: T; error?: { code: string; message: string } }`.
- **Path alias:** `@/*` maps to project root.

## Schema state

Key facts about the current normalized schema (as of 2026-05-30):

- **`coupons`** — fully normalized in `20260523000000`. Columns: `code` (NOT `title`), `discount` JSONB `{type:'percentage'|'fixed_amount', value:number}` (NOT `type` enum), `expiry_date` (NOT `end_date`), `status` (`draft|published`). `redeem_time_limit_minutes` is gone. `promotion_type` (`'coupon' | 'deal'`, migration `20260523000001`) — the deals feed (`/api/mobile/deals`) filters `promotion_type = 'deal'`. Redemption caps live on the row: `max_redemptions_per_user`, `max_redemptions_global`, `current_redemptions`. `requires_subscription` (boolean, default false, `20260530000001`) — when true the redeem route requires the user to follow the business first.
- **`products.status`** — `'active' | 'unlisted' | 'disabled'` (NOT `inactive|archived`). `is_available` is kept in sync by trigger; `status` is canonical. Also has `sale_price` (nullable) and `category_id` → `categories(id, name, slug)` (the `categories` table, NOT `business_categories`).
- **Ratings** — two tables: `ratings` (product-level: `product_id`, `business_id`, `review_text`) and `business_ratings` (`comment`). Mobile rating routes `upsert` with `onConflict`, so each needs a matching UNIQUE: `ratings(user_id, product_id)` (`20260528000000`) and `business_ratings(user_id, business_id)` (`20260508000003`).
- **Redemptions** — `user_redemptions` is the live table (has `expires_at`, `is_claimed`, `branch_id`). `coupon_redemptions` is a dead table — never insert into or query it; use `user_redemptions` for all redemption reads/writes (routes, analytics, service layer). `user_redemptions.coupon_id` has an FK → `coupons(id)` (restored in `20260530000000`; the `20260523000000` normalization dropped it via CASCADE, which broke PostgREST nested `coupons(...)` selects until restored).
- **Coupon claim flow** — redeeming inserts a `user_redemptions` row (`is_claimed=false`); claiming flips it via `PATCH /api/protected/mobile/redemptions/[id]/claim` with an atomic `.eq('is_claimed', false)` guard. RLS `"Users manage own interactions"` (`FOR ALL USING auth.uid() = user_id`) lets the user's RLS-scoped client do both. The redeem route (POST) also enforces a subscription gate (`requires_subscription` → 403) and rejects a second unclaimed, unexpired redemption of the same coupon (active-dupe → 400). Full rule matrix in `.claude/docs/coupon-rules.md`.
- **Deals promotion** — the explore feed (`/api/mobile/deals`) sizes bento cards by `subscription_plans.features_promo_boost` (boolean, `20260530000002`), NOT by `price`. The anon feed reads promoted subs via the public SELECT policy in `20260530000003` (active subs on promo-boost plans only). Set the flag on new promoted plans, or they silently won't get boosted.
- **Coupon access invariant** — every route that fetches a coupon for display or redemption must filter `.eq('status', 'published').is('archived_at', null).lte('start_date', now)`. Omitting any of the three allows draft, archived, or not-yet-active coupons to be acted on.
- **`increment_coupon_redemptions(p_coupon_id uuid)`** — SECURITY DEFINER RPC (`20260527000001`). Call via `supabase.rpc('increment_coupon_redemptions', { p_coupon_id })` after inserting into `user_redemptions`. Returns `true` if incremented, `false` if global cap already hit. Must be SECURITY DEFINER — authenticated users have no UPDATE policy on `coupons`. Only the **global** cap is race-safe via this RPC; the per-user cap in the redeem route is a non-atomic count-then-insert (TOCTOU) — concurrent redeems by one user can slip past it.
- **Pending migrations (need `make migrate-up`):**
  - `20260527000000_sync_role_to_jwt.sql` — syncs `profiles.role`/`status` into JWT `app_metadata` via trigger; proxy reads from JWT with profiles SELECT fallback.
  - `20260527000001_coupon_atomic_increment.sql` — creates `increment_coupon_redemptions` RPC.
  - `20260528000000_ratings_unique_user_product.sql` — UNIQUE(user_id, product_id) on `ratings`; backs the product-rating upsert. `ADD CONSTRAINT` fails if duplicate pairs exist — dedupe before applying to a populated DB.
  - `20260530000000_restore_user_redemptions_coupon_fk.sql` — restores the `user_redemptions.coupon_id` → `coupons(id)` FK.
  - `20260530000001_coupons_requires_subscription.sql` — adds `coupons.requires_subscription`.
  - `20260530000002_subscription_plans_promo_boost.sql` — adds `subscription_plans.features_promo_boost`.
  - `20260530000003_public_read_promoted_subscriptions.sql` — public SELECT policy for active subs on promo-boost plans (anon deals feed).
- **Mobile response envelope** — `successResponse(data)` returns data flat (e.g. `{ businesses: [...] }`), NOT wrapped in `ApiResponse<T>`. The `success/error` wrapper applies to web routes only.
- **Migration timestamps must be unique** — `supabase_migrations.schema_migrations` uses version as PK. Two files sharing a timestamp will fail on the second insert.

## Mobile route conventions

- **Storage URLs:** any stored image field a mobile route returns must pass through `resolveStorageUrl(supabase, bucket, pathOrUrl)` (`app/api/helpers/storage.ts`). Seeds store full public URLs; real registrations store raw paths — returning the raw value yields a broken image.
- **Pagination:** PostgREST is capped at `max_rows = 1000` (`supabase/config.toml`). Fetch-all-then-paginate-in-memory silently truncates past 1000 rows — push filters and `.range()` into the query.
- **Soft deletes:** `business_types` and `business_categories` have `deleted_at`; filter `.is('deleted_at', null)` (top-level and on embedded relations) so deleted rows don't leak.

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
- `.claude/docs/roadmap.md` — active refactors, protected-route audit phases, and enforcement map
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
