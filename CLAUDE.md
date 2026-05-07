# CLAUDE.md — Ilokal Web

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run lint -- --fix  # ESLint with autofix
npm run test:run     # Vitest (single run)
npm run test         # Vitest (watch)
npm run db:types     # Regenerate Supabase types
```

Soft test step: `npm run lint -- --fix && npm run build`

## Stack

Next.js 15+ (App Router) / React 19 / TypeScript strict / Supabase SSR / Zod / shadcn-ui + Radix UI / Tailwind CSS / Vitest

## Architecture

- **Routing:** App Router only. Server Actions for internal mutations, API routes for external integrations.
- **Auth:** Supabase SSR with HTTP-only cookies. No credentials on client.
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
