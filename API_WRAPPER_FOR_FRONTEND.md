# API Wrapper — Front-end Developer Guide

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
import subscriptionService from '@/lib/services/subscriptionService'; // uses server API directly

export async function someServerAction() {
  // The service will dynamically import the server implementation and run
  return await subscriptionService.createSubscription(businessId, payload);
}
```

## Recommended patterns for front-end devs

- Prefer importing from `lib/services` in components/hooks.
- Do not import `lib/api/*` server files into client code.
- Catch errors and check `err.status` before treating empty results as "no data".
- For optimistic UI updates, mutate local cache first (see `app/admin/users/tabs/*`) and then call the service; rollback on error.

## Server-only wrappers

- Some wrappers in `lib/services` are server-aware (for example `notificationService`, `invoiceService` or `adminService`) and are intentionally not exported from the client-facing barrel (`lib/services/index.ts`).
- Do not import those server-only wrappers into browser code; import them directly inside server actions or other server-only callsites (for example `import invoiceService from '@/lib/services/invoiceService'` inside a server action).

## Migration checklist (small batches)

1. Replace one import at a time from `services/api/*` -> `lib/services`.
2. Run `yarn lint --fix` and `yarn test` after each small batch.
3. Run `yarn build` (production build) to catch server-only import leaks (Turbopack/Next will fail if server-only code is pulled into browser bundle).
4. If a build error indicates server-only code in client bundle, remove that export from `lib/services/index.ts` and import the server-only file directly at server-only callsites.

## Error handling & auth notes

- `services/api/apiClient.ts` transforms axios responses and rejects with an Error that includes `.status` and `.data` when available. Expect thrown errors rather than raw HTTP responses.
- 401 responses during local development usually mean the request lacked a dev session cookie — sign in via the UI or `POST /api/auth/login` to generate session cookies before calling protected admin APIs.

## Testing guidance

- Unit tests: mock `lib/services/client.ts` or the axios instance at `services/api/apiClient.ts` to control returned shapes and thrown errors.
- Integration tests: exercise the server implementation (server-only) directly under test harnesses; verify wrapper routes and 401/403 behavior in e2e tests.

## Troubleshooting

- "Undefined response body": check whether the axios interceptor returns `response.data` and avoid double-unwrapping `.data` in your callers.
- "Turbopack/webpack bundling error referencing server-only code": find the import chain from your client code into the server file. Ensure `lib/services/index.ts` does not re-export that server-only module.

## FAQ

Q: Can I still call `/api/...` routes with `fetch` in the browser? A: Yes — but prefer the wrapper so you get consistent interceptors, error shapes and typed responses.

Q: Why not call server actions directly from the client? A: Server actions run on the server runtime and are meant to be invoked from server-callers or server components. Calling them from client code (or importing server-only modules they use) risks bundling server code and breaking the build.

## Where to look for examples

- `lib/services/*` — wrapper implementations
- `app/admin/users/tabs/*` — optimistic updates and cache mutation patterns
- `services/api/apiClient.ts` — axios interceptors, error shaping, 401 redirect behavior

## Contact

If you want a short example added to a component or a PR note for frontend reviewers, tell me which component and I’ll add a tailored snippet.
