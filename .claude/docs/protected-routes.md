# Protected routes and auth responsibilities

## Purpose

This document explains the responsibilities and quick usage examples for the route-protection utilities in `lib/utils`.

## Responsibilities

- `proxy.ts` (middleware): perform fast, static-match checks and redirects for page routes. Use only static prefixes (build-time matcher).
- `config/routeConfig.ts`: canonical route strings. Import this file everywhere — do not use literal strings.
- `lib/utils/protectedRoutes.ts`: policy helpers used by middleware and other code (`isProtectedPath`, `roleAllowedForPath`, `PROTECTED_ROUTE_PREFIXES`, `API_PROTECTED_PREFIXES`). Keep logic small and deterministic.
- `lib/utils/assertAuthorized.ts`: runtime authorization for API handlers and server actions. Performs user lookup, profile checks, and optional role enforcement.

## Usage examples

- Middleware (pages): use `isProtectedPath()` only for redirects and early rejects; rely on static matcher for performance.

  Example: in `proxy.ts`:
  - check `isProtectedPath(request.nextUrl.pathname)` and redirect unauthenticated users to `/login`.

- API handlers / Server Actions: call `assertAuthorized(request, { roles: ['admin'] })` at the top of the handler to enforce authentication and roles.

## Recommendations

- Single source of truth: import route strings from `config/routeConfig.ts` only.
- Expose a single `lib/utils/auth/index.ts` that re-exports `assertAuthorized` and `protectedRoutes` helpers for discoverability.
- Add unit tests for `isProtectedPath`, `roleAllowedForPath`, and `assertAuthorized`.
- Use code reviews or automated codemods to eliminate remaining literal route strings.

## Where to look

- Middleware: `/proxy.ts`
- API guard: `/lib/utils/assertAuthorized.ts`
- Policy helpers: `/lib/utils/protectedRoutes.ts`
- Route canonicalization: `/config/routeConfig.ts`

## Short checklist for reviewers

- Are route strings imported from `config/routeConfig.ts`?
- Are runtime role checks performed in handlers (not only middleware)?
- Are policy helpers small and unit-tested?
