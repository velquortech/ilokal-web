# CLAUDE.md — iLokal Web

## Commands

```bash
# Next.js
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run lint -- --fix  # ESLint with autofix
npm run test:run     # Vitest (single run)
npm run test         # Vitest (watch)
npm run db:types     # Regenerate Supabase types

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
- **Auth:** Supabase SSR with HTTP-only cookies (web) or `Authorization: Bearer <jwt>` (mobile).
- **Types:** `lib/types/` — re-export from `lib/types/index.ts`.
- **Validation:** Zod schemas in `lib/validation/`.
- **Error format:** `ApiResponse<T> = { success: boolean; data?: T; error?: { code: string; message: string } }`.
- **Path alias:** `@/*` maps to project root.

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
- `.claude/docs/protected-routes-strategy.md` — middleware and route guard strategy
- `.claude/docs/security.md` — headers, cookies, CSP, threat model
- `.claude/docs/server-actions.md` — when to use Server Actions vs API routes
- `.claude/docs/session-management.md` — role-based timeouts, activity detection
- `.claude/docs/rbac-model.md` — permission tiers, audit logging
- `.claude/docs/api-wrapper.md` — isomorphic service layer, client vs server imports
- `.claude/docs/api-strategy.md` — full endpoint implementation plan and status
- `.claude/docs/testing.md` — untested routes matrix, test templates
