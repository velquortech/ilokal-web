# WORKFLOW: Permanent Rules

Purpose: codify repository conventions, developer expectations, and non-negotiable rules.

Core conventions

- Routing: Use Next.js App Router (`app/`) for all new pages and layouts.
- Server actions: Use Server Actions for internal mutations where possible; use API routes for third-party integrations.

Types and validation

- Place TypeScript domain types under `lib/types` and re-export from `lib/types/index.ts`.
- Use Zod schemas in `lib/validation` for input validation. Prefer schema-first approach.

Supabase

- Use a single wrapper for Supabase interactions; prefer `lib/api/supabase.ts` or `supabase/*` helpers.
- Generate DB types with `npm run db:types` and check them into `lib/types/database.ts` as needed.
- Browser client: `supabase/client.ts` expects `NEXT_PUBLIC_SUPABASE_URL` and anon/publishable key.

Error handling

- API responses should follow `ApiResponse<T> = { success: boolean; data?: T; error?: { code: string; message: string } }`.

Scripts and CI

- Soft test step: `npm run lint -- --fix && npm run build` as a quick local validation.
- Include `npm run test` (vitest) in CI; prefer small focused unit tests for server logic.

Docs and change management

- All workflow/reference-fill artifacts must set `requiresApproval=true` and include acceptance criteria, risk level, and rollback steps.
- Update `WORKFLOW/CHANGELOG.md` and `WORKFLOW/retrospective.md` after major agent-driven changes.

Security

- Never commit server secrets. Use environment variables and ensure `NEXT_PUBLIC_` prefix only for browser-safe values.
- For DB migrations or schema changes, create a migration plan with rollback steps and require human approval.

Framework conventions

- **Before touching Next.js file-conventions** (`proxy.ts`, `layout.tsx`, `page.tsx`, `route.ts`, `error.tsx`, etc.), fetch `https://nextjs.org/docs/app/api-reference/file-conventions` to confirm the current convention for the installed major version. Next.js 16 renamed `middleware` → `proxy`; similar renames may follow.
- **Before touching Supabase auth/SSR helpers**, check the `@supabase/ssr` changelog for breaking changes in client API or cookie handling.
- When a deprecation warning appears at build/dev time, treat it as a blocker: look up the linked docs URL, verify the migration path, and apply it before continuing other work.

Formatting and linting

- Use Prettier + eslint-config-next. Run formatters before commits and CI runs lint/typecheck.

- Remove unused imports after changes: ensure `no-unused-vars` / TypeScript `noUnusedLocals` are enabled and run `npm run lint -- --fix` (or `eslint --fix`) to automatically remove unused imports. Add `lint-staged` pre-commit hooks and a CI lint step that runs autofix and fails if unused imports remain.

Tests and typing

- Do not use the `any` type in unit or integration tests. Tests must use concrete types imported from `lib/types` (or a dedicated `lib/types/test.ts` helper) to keep type contracts consistent with the application code.
- When mocking complex runtime objects (e.g., NextRequest or Supabase client), prefer small, focused test types exported from `lib/types/test.ts` and cast to the necessary framework types only at the callsite using `unknown as`.
