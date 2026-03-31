# API Wrapper — Front-end Developer Guide

**⚠️ Updated March 31, 2026** — Document corrected to match current `lib/services/index.ts` barrel status. See [WORKFLOW/INVENTORY_AUDIT_REPORT.md](WORKFLOW/INVENTORY_AUDIT_REPORT.md) for audit details.

## Purpose

This document explains how front-end developers should consume the repository's isomorphic API wrapper layer (`lib/services`) and why using the wrapper is preferable to calling API routes or server actions directly from client code.

## Goals

- Show import patterns and concrete examples for browser code.
- Explain differences between server vs browser behavior and how the wrapper protects bundling boundaries.
- Describe the benefits over calling routes/server actions manually.
- Provide troubleshooting, testing, and migration guidance.

## Quick Import Patterns

- Preferred (new or migrated code):

  import { userService } from 'lib/services'

- Temporary compatibility (during migration):

  import { userService } from '@/services'

## Why this wrapper is better than calling API routes or server actions directly

1. Safe bundling and clear boundaries
   - `lib/services` enforces a clean separation: server-only implementations are dynamically imported on the server, so client bundles never pull `next/headers`, Supabase server helpers, or other Node-only runtime code.
   - Manually importing server actions or server-only helpers in client components risks bundling server-only code and causing build/runtime failures.

2. Consistent types & shapes
   - Wrappers expose stable, typed method signatures (use types from `lib/types`), reducing repeated parsing/shape checks across UI components.
   - Calling raw routes often leads to inconsistent untyped payload handling and ad-hoc error parsing.

3. Centralized client behavior
   - In the browser the wrapper delegates to `services/api/apiClient.ts` (axios instance) so interceptors, auth redirects, and error formatting are applied consistently.
   - Direct fetch calls in many places lead to duplicated retry logic, inconsistent headers/cookies handling, and scattered error handling.

4. Easier testing & mocking
   - Small service functions are easier to mock in unit tests. You can replace `lib/services` methods or mock `lib/services/client.ts` instead of stubbing network internals or server actions.

5. Incremental migration path
   - The compatibility export `services/index.ts` lets you migrate imports gradually instead of refactoring everything at once.

## Examples

1. Browser — get paginated profiles

```ts
import { userService } from 'lib/services';

async function loadUsers() {
  try {
    const resp = await userService.getProfilesByRolePaginated('app_user', 1);
    // resp.data (array) and resp.pagination (meta) are available
    return resp;
  } catch (err) {
    // axios-based errors are thrown as Error with .status and .data
    if ((err as any)?.status === 401) {
      // show login CTA or redirect
    }
    throw err;
  }
}
```

2. Server action — call server implementation directly (server-only fast-path)

```ts
// Inside a server action or route handler (server runtime)
import invoiceService from '@/lib/services/invoiceService'; // server-only wrapper
import subscriptionService from '@/lib/services/subscriptionService'; // server-only wrapper

export async function someServerAction() {
  // Server-only wrappers will use the server implementation (invoiceService is not exported from public barrel)
  return await invoiceService.list();
}
```

## Recommended patterns for front-end devs

- Prefer importing from `lib/services` in components/hooks.
- Do not import `lib/api/*` server files into client code.
- Catch errors and check `err.status` before treating empty results as "no data".
- For optimistic UI updates, mutate local cache first (see `app/admin/users/tabs/*`) and then call the service; rollback on error.

## Server-only wrappers

The main `lib/services` barrel only exports services that are safe for browser import (no server-only helpers at module level):

### ✅ Safe to import from barrel (7 services)

```ts
import {
  userService,
  ratingService,
  featuredDealService,
  branchService,
  uploadService,
  trendingService,
  http,
} from '@/lib/services';
```

### ❌ Server-only — NOT exported from barrel (13 services)

Import these **only in server contexts** (API routes, server actions, Server Components):

```ts
// ✅ OK in API routes and server contexts:
import authService from '@/lib/services/authService';
import searchService from '@/lib/services/searchService';
import productService from '@/lib/services/productService';
import categoryService from '@/lib/services/categoryService';
import invoiceService from '@/lib/services/invoiceService';
import reviewService from '@/lib/services/reviewService';
import analyticsService from '@/lib/services/analyticsService';
import paymentService from '@/lib/services/paymentService';
import subscriptionService from '@/lib/services/subscriptionService';
import couponService from '@/lib/services/couponService';
import businessService from '@/lib/services/businessService';
import notificationService from '@/lib/services/notificationService';
import paymentsPublicService from '@/lib/services/paymentsPublicService';

// ❌ NEVER in client code — will cause Turbopack build error:
import authService from '@/lib/services/authService'; // ❌ Server-only
```

**Do NOT import server-only services in browser code.** The build will fail with a clear error message.

For browser operations that need server-backed flows (auth, DB access, business logic), use isomorphic public wrappers or call `/api/*` routes. See [lib/services/README.md](lib/services/README.md) for the pattern.

**See [WORKFLOW/api-wrapper-inventory.md](WORKFLOW/api-wrapper-inventory.md) for the complete, authoritative list and per-route classifications.**

## Migration checklist (small batches)

Before starting: See [WORKFLOW/api-wrapper-inventory.md](WORKFLOW/api-wrapper-inventory.md) for which services are safe to import from the barrel (✅) vs server-only (❌).

1. Replace one import at a time from `services/api/*` -> `lib/services` barrel.
   - **Only import from barrel**: `userService`, `ratingService`, `featuredDealService`, `branchService`, `uploadService`, `trendingService`
   - **For server-only services**: import directly from `@/lib/services/[serviceName]` (in server contexts only)

2. Run `yarn lint --fix` and `yarn test` after each small batch to catch type errors.

3. Run `yarn build` (production build) to catch bundling violations (Turbopack will fail if server-only code is pulled into browser bundle).
   - Build error: `"You're importing a module that depends on 'next/headers'..."`
   - **Solution**: That service is server-only; import it directly only in API routes/server actions, not from the barrel.

4. If a build error indicates server-only code in client bundle:
   - Check [lib/services/index.ts](lib/services/index.ts) to confirm the service is NOT exported
   - Import the service directly only in server callsites: `import service from '@/lib/services/[serviceName]'`
   - Never re-export it from the barrel

For detailed status of each route and service, refer to [WORKFLOW/api-wrapper-inventory.md](WORKFLOW/api-wrapper-inventory.md).

## Error handling & auth notes

- `services/api/apiClient.ts` transforms axios responses and rejects with an Error that includes `.status` and `.data` when available. Expect thrown errors rather than raw HTTP responses.
- 401 responses during local development usually mean the request lacked a dev session cookie — sign in via the UI or `POST /api/auth/login` to generate session cookies before calling protected admin APIs.

## Testing guidance

- Unit tests: mock `lib/services/client.ts` or the axios instance at `services/api/apiClient.ts` to control returned shapes and thrown errors.
- Integration tests: exercise the server implementation (server-only) directly under test harnesses; verify wrapper routes and 401/403 behavior in e2e tests.

## Troubleshooting

- "Undefined response body": check whether the axios interceptor returns `response.data` and avoid double-unwrapping `.data` in your callers.

- "Turbopack bundling error: server-only helper in client bundle": you've imported a server-only service (or a service that imports server modules) in browser code.
  - **Root cause**: A service with server-only dependencies was imported in server context (should be fine) but got pulled into client bundle.
  - **Fix**: Check the import trace and either:
    - Remove the import from client code and import in server callsites only, OR
    - Create a browser-safe wrapper with an HTTP fallback (see [lib/services/README.md](lib/services/README.md) for the pattern)
  - **Verify**: Use [WORKFLOW/api-wrapper-inventory.md](WORKFLOW/api-wrapper-inventory.md) to confirm which services can be safely imported from the barrel (✅) vs which are server-only (❌).

## Build enforcement

The build (`yarn build` / Turbopack) enforces these rules automatically:

- If a service with server-only imports is included in `lib/services/index.ts` barrel and imported by client code, the build will fail
- Error message: `"You're importing a module that depends on 'next/headers'. This API is only available in Server Components..."`
- Fix: remove the service from the barrel export OR create a browser-safe wrapper with HTTP fallback

## FAQ

Q: Can I still call `/api/...` routes with `fetch` in the browser? A: Yes — but prefer the wrapper so you get consistent interceptors, error shapes and typed responses.

Q: Why not call server actions directly from the client? A: Server actions run on the server runtime and are meant to be invoked from server-callers or server components. Calling them from client code (or importing server-only modules they use) risks bundling server code and breaking the build.

## Where to look for examples

- [lib/services/index.ts](lib/services/index.ts) — barrel exports and comments explaining what's safe for client
- `lib/services/*` — wrapper implementations
- [lib/services/README.md](lib/services/README.md) — technical patterns and isomorphic wrapper pattern
- `app/admin/users/tabs/*` — optimistic updates and cache mutation patterns
- `services/api/apiClient.ts` — axios interceptors, error shaping, 401 redirect behavior

## Reference Documentation

- **[WORKFLOW/api-wrapper-inventory.md](WORKFLOW/api-wrapper-inventory.md)** — Authoritative list of API routes and whether they're safe for client import (✅) or server-only (❌)
- **[WORKFLOW/INVENTORY_AUDIT_REPORT.md](WORKFLOW/INVENTORY_AUDIT_REPORT.md)** — Audit report showing what was corrected in the inventory (March 31, 2026)
- **[lib/services/index.ts](lib/services/index.ts)** — Current barrel exports (source of truth)

## Contact

If you find a service that should be exported from the barrel but isn't, or want a short example added to a component, check [WORKFLOW/api-wrapper-inventory.md](WORKFLOW/api-wrapper-inventory.md) first to understand the design decision. Then open an issue or comment on PR #46.
