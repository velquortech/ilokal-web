# Protected Route Strategy

Generated: 2026-03-25

Purpose

- Define a clear, reviewable strategy for protecting routes and server actions across the app.
- Provide an implementation checklist and recommended changes based on the current samples in `proxy.ts` and `config/routeConfig.ts`.

Goals

- Ensure all sensitive endpoints (UI pages, API routes, Server Actions) enforce authentication and authorization server-side.
- Centralize routing/role rules to reduce duplication and accidental exposure.
- Provide incremental, low-risk rollout steps with tests and monitoring.

## Recent changes (applied)

- `config/routeConfig.ts` now includes canonical `ROUTES.API.*` constants used across the codebase.
- `lib/utils/protectedRoutes.ts` implemented `isProtectedPath` and `roleAllowedForPath` helpers and is used by `proxy.ts`.
- `lib/utils/assertAuthorized.ts` implemented and wired into representative handlers (e.g., `users/me`, `admin/profiles`, `billing/invoices`).
- Added short developer reference: [lib/utils/PROTECTED_ROUTES.md](lib/utils/PROTECTED_ROUTES.md).
- Added convenience re-exports: [lib/utils/auth/index.ts](lib/utils/auth/index.ts).
- Created a remediation plan for replacing literal API route strings: [WORKFLOW/route-remediation-plan.md](WORKFLOW/route-remediation-plan.md).
- Ran lint and build; addressed reported lint errors and ensured build passes.

Key principles

- Always enforce final authorization on the server: middleware and client-side checks are conveniences, not the guardrail.
- Prefer server actions for internal mutations when invoked from Server Components; prefer API routes for client-only calls, third-party integrations, or long-running tasks.
- Keep decision logic centralized in `lib/utils/protectedRoutes` (or similar) and import it from middleware, API handlers, and Server Actions.
- Middleware matchers must use static strings; do not attempt dynamic matcher generation at runtime.

Decision matrix (quick)

- Page request from browser (Server Components/SSR): use middleware to block unauthenticated/unprivileged requests early.
- Client-only requests or browser-initiated fetches: use API routes and enforce auth inside handler.
- Server Component-invoked actions without external APIs: prefer Server Actions, but validate user and role inside the action.

Review of current samples

- `proxy.ts` (middleware)
  - Good: centralizes auth check, uses `isProtectedPath` and `roleAllowedForPath` helpers.
  - Recommendation: expand or document `isProtectedPath` to include `/api/*` namespaces you want middleware to protect (remember matcher must be static). Prefer protecting page routes (`/admin`, `/business`) in middleware and rely on handler guards for `/api` endpoints.
  - Env keys: middleware runs in edge runtime; using `NEXT_PUBLIC_*` keys is expected for edge, but verify whether `createServerClient` requires server-only credentials for some guards. Do not expose service-role keys in edge contexts.

- `config/routeConfig.ts`
  - Good: central route constants and `getDashboardRoute` helper.
  - Recommendation: add explicit `API` namespace constants for admin/business/billing subpaths (e.g., `API.ADMIN_BASE = '/api/admin'`) to avoid string duplication and to feed into `isProtectedPath` helpers.

Concrete recommendations

1. Centralize protected path prefixes
   - Implement/export `PROTECTED_PATH_PREFIXES = ['/', '/admin', '/business', '/api/admin', '/api/billing', '/api/payments', '/api/subscriptions', '/api/users']` in `lib/utils/protectedRoutes` or `config/routeConfig.ts`.
   - Keep middleware matcher limited to page prefixes (e.g., `/admin/:path*`, `/business/:path*`) because matcher must be static. Use handler guards for `/api`.

2. API route & Server Action guards (required)
   - Add a lightweight guard helper `assertAuthorized(requestOrCtx, { roles?: string[] })` that checks session and role and throws/responds 401/403.
   - Call `assertAuthorized` at the start of each sensitive API handler (`app/api/**/route.ts`) and at the start of server actions.

3. Test coverage
   - Unit tests for `isProtectedPath` and `roleAllowedForPath` logic.
   - Integration tests that assert 401 for unauthenticated calls to representative endpoints (admin, billing, uploads, users/me).

4. Logging & monitoring
   - Add structured logging for blocked attempts (include path, user id if available, reason). Ship to whatever observability you use.
   - Add alerting for repeated unauthorized access spikes.

5. Rollout checklist
   - Stage: add guards to a small set of APIs (e.g., `users/me`, `admin/profiles`) and run tests.
   - QA: smoke test UI flows for each role (admin, business_owner, app_user).
   - Canary: enable expanded middleware matcher if you decide to block `/api` namespaces at edge (ensure env key choices are safe for edge runtime).
   - Full: protect all sensitive APIs; add integration tests and update docs.

Implementation checklist (developer-ready)

- [x] Add `lib/utils/protectedRoutes.ts` with exported `isProtectedPath(pathname: string): boolean` and `roleAllowedForPath(role: string | null, pathname: string): boolean` implementations. Reuse existing helpers.
- [x] Add `lib/utils/assertAuthorized.ts` that returns `user` or throws/returns 401/403 response. Use in API route handlers and Server Actions.
- [x] Update representative API handlers to call `assertAuthorized` (start with `users/me`, `admin/profiles`, `billing/*`).
- [x] Add unit tests for `protectedRoutes` helpers and guarded routes (vitest).
- [x] Add integration tests to verify unauthenticated callers get 401 and unauthorized roles get 403.
- [x] Document strategy in `WORKFLOW/Protected_Route_strategy.md` (this file) and add a short developer note in `README` linking to it.

Acceptance criteria

- All critical APIs return 401 for unauthenticated requests.
- Admin-only APIs return 403 for authenticated users without `admin` role.
- Server Actions perform server-side authorization and do not trust client-provided role values.
- Tests cover helper logic and at least one API and one Server Action guard per role.

Risks & mitigations

- Risk: Over-broad middleware matcher may run into edge runtime/env limitations. Mitigation: keep middleware for page-level blocking only; protect APIs with handler guards.
- Risk: Missing a single API handler leaves data exposed. Mitigation: add tests and code review checklist; consider lint rule or codeowner review for `app/api` changes.

Appendix — Quick code examples

- Example guard usage in `app/api/admin/profiles/route.ts` (pseudocode):

  const user = await assertAuthorized(request, { roles: ['admin'] });
  // proceed with handler

Appendix — Next steps I can take for you

- Produce a reference-fill patch to add `lib/utils/assertAuthorized.ts` and wire it into a small set of API handlers (requiresApproval=true).
- Or, generate a PR-ready patch to expand middleware matcher to include static `'/api/admin/:path*'` and other API namespaces (I recommend pairing this with handler guards).
