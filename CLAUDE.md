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

Soft test step: `npm run lint -- --fix && npm run build`

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

@.claude/docs/mobile-api.md
@.claude/docs/architecture.md
@.claude/docs/folder-structure.md
@.claude/docs/authentication.md
@.claude/docs/protected-routes.md
@.claude/docs/protected-routes-strategy.md
@.claude/docs/security.md
@.claude/docs/auth-rate-limits.md
@.claude/docs/api-strategy.md
@.claude/docs/api-wrapper.md
@.claude/docs/server-actions.md
@.claude/docs/session-management.md
@.claude/docs/rbac-model.md
@.claude/docs/testing.md
@.claude/docs/permanent-rules.md
@.claude/CHANGELOG.md
