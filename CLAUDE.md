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

Key facts about the current normalized schema (as of 2026-05-27):

- **`coupons`** — fully normalized in `20260523000000`. Columns: `code` (NOT `title`), `discount` JSONB `{type:'percentage'|'fixed_amount', value:number}` (NOT `type` enum), `expiry_date` (NOT `end_date`), `status` (`draft|published`). `redeem_time_limit_minutes` is gone.
- **`products.status`** — `'active' | 'unlisted' | 'disabled'` (NOT `inactive|archived`). `is_available` is kept in sync by trigger; `status` is canonical.
- **Redemptions** — `user_redemptions` is the live table (has `expires_at`, `is_claimed`, `branch_id`). `coupon_redemptions` is a dead table — never insert into or query it; use `user_redemptions` for all redemption reads/writes (routes, analytics, service layer).
- **Coupon access invariant** — every route that fetches a coupon for display or redemption must filter `.eq('status', 'published').is('archived_at', null).lte('start_date', now)`. Omitting any of the three allows draft, archived, or not-yet-active coupons to be acted on.
- **`increment_coupon_redemptions(p_coupon_id uuid)`** — SECURITY DEFINER RPC (`20260527000001`). Call via `supabase.rpc('increment_coupon_redemptions', { p_coupon_id })` after inserting into `user_redemptions`. Returns `true` if incremented, `false` if global cap already hit. Must be SECURITY DEFINER — authenticated users have no UPDATE policy on `coupons`.
- **Pending migrations (need `make migrate-up`):**
  - `20260527000000_sync_role_to_jwt.sql` — syncs `profiles.role`/`status` into JWT `app_metadata` via trigger; proxy reads from JWT with profiles SELECT fallback.
  - `20260527000001_coupon_atomic_increment.sql` — creates `increment_coupon_redemptions` RPC.
- **Mobile response envelope** — `successResponse(data)` returns data flat (e.g. `{ businesses: [...] }`), NOT wrapped in `ApiResponse<T>`. The `success/error` wrapper applies to web routes only.
- **Migration timestamps must be unique** — `supabase_migrations.schema_migrations` uses version as PK. Two files sharing a timestamp will fail on the second insert.

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
- `.claude/docs/testing.md` — untested routes matrix, test templates
- `.claude/docs/analytics-dashboard.md` — analytics panel ideas, RFM segments, retention queries, automation nudges
- `.claude/docs/DESIGN.md` — color system, OKLCH tokens, visual language from globals.css
- `.claude/docs/caching-strategy.md` — Next.js App Router caching layers, Supabase data-fetching rules
- `.claude/docs/code-principles.md` — TypeScript rules, naming conventions, anti-patterns
- `.claude/docs/component-standards.md` — file structure, naming, shadcn/ui usage rules
- `.claude/docs/git-workflow.md` — conventional commits format, branch naming, PR process
- `.claude/docs/ui-standards.md` — approved UI toolset, responsive strategy, visual consistency rules
