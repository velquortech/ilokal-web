# Protected Routes & Authorization

## Responsibilities

| Layer | File | Job |
|---|---|---|
| Middleware (page routes) | `proxy.ts` | Fast static-prefix checks; redirect unauthenticated users to `/login`. Keep matcher static. |
| Route constants | `config/routeConfig.ts` | Single source of truth for all route strings. Import everywhere; never use literals. |
| Policy helpers | `lib/utils/protectedRoutes.ts` | `isProtectedPath`, `roleAllowedForPath`, `PROTECTED_ROUTE_PREFIXES`, `API_PROTECTED_PREFIXES`. Keep deterministic. |
| API/Action guard | `lib/utils/assertAuthorized.ts` | Runtime auth for API handlers and Server Actions. Looks up user, checks role, returns 401/403. |

## Key principles

- Authorization is always enforced server-side. Middleware and client-side checks are conveniences, not the guardrail.
- Keep decision logic centralized in `lib/utils/protectedRoutes`; import from middleware, handlers, and actions.
- Middleware matchers must use static strings — no dynamic generation at runtime.

## Decision matrix

| Request origin | Guard |
|---|---|
| Browser → page (SSR) | Middleware `isProtectedPath()` + redirect |
| Client fetch / browser-initiated API | API route handler `assertAuthorized()` |
| Server Component → Server Action | `assertAuthorized()` inside the action |

## Usage

**Middleware:**
```ts
// proxy.ts
if (isProtectedPath(request.nextUrl.pathname)) {
  // redirect unauthenticated users to /login
}
```

**API handler / Server Action:**
```ts
const user = await assertAuthorized(request, { roles: ['admin'] });
// only reaches here if authorized
```

## Reviewer checklist

- Route strings imported from `config/routeConfig.ts` (no literals)?
- Runtime role checks in handlers, not just middleware?
- Policy helpers small and unit-tested?
- Integration tests assert 401 for unauthenticated calls to representative endpoints?

## Risks

- Over-broad middleware matcher may hit edge runtime/env limits — keep middleware for page-level blocking; use handler guards for `/api`.
- A missed API handler leaves data exposed — enforce via code review checklist and integration tests.
