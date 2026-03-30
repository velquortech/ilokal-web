# lib/services — Isomorphic service layer

Overview

- `lib/services` provides an isomorphic HTTP client and lightweight service wrappers. On the server it uses the global `fetch` API; in the browser it delegates to the existing axios instance at `services/api/apiClient.ts` to preserve interceptors and client-side behavior.

Why this exists

- Keeps server bundles free of browser-only axios concerns.
- Enables a single import surface for both server and client code while allowing incremental migration.

Usage

- Import wrappers from the library:
  - `import { userService } from 'lib/services'`

- Example
  - Server (server actions, route handlers): uses `fetch` under the hood — no extra configuration.
  - Browser (components/hooks): behavior flows through existing axios instance (so redirects, auth interceptors remain).

Migration guidance (quick)

1. Add `lib/services/README.md` (this file).
2. Add compatibility export `services/index.ts` that re-exports from `lib/services` to allow safe, incremental changes.
3. Inventory current importers of `services/api/*` (hooks, server actions, top-level components).
4. Migrate in small batches; after each batch run `yarn lint` and `make build-app`.

Testing & CI

- Add unit tests focused on `lib/services/client.ts` behavior (server switch and error shaping).
- Add integration tests for auth-related flows that can surface 401/403 handling differences.

Notes

- Do not remove `services/api/*` until callers are migrated and CI is stable.
- Follow repository rules: avoid `any`, use explicit type guards for runtime-refined values.

Why use the isomorphic wrapper instead of importing API routes or calling server actions directly
-------------------------------------------------------------------------------------------

- Single Source Of Truth: `lib/services` centralizes HTTP/server-call behavior and types so front-end code relies on consistent signatures and response shapes rather than ad-hoc fetch calls across the app.
- Safe Bundling: The wrapper explicitly avoids importing server-only helpers in client bundles (dynamic imports for server-only code). This prevents accidental bundling of `next/headers`, server Supabase helpers, or other Node-only APIs into the browser build.
- Reuse of Client Interceptors: In-browser the wrapper delegates to the existing axios client (`services/api/apiClient.ts`) preserving auth interceptors, retry logic, and centralized error shaping.
- Easier Testing: Services are easy to mock in unit tests because they present small, well-typed functions. You can mock the `http` module or individual wrapper methods instead of stubbing route handlers or server actions.
- Incremental Migration: The compatibility re-export (`services/index.ts`) enables gradual migration from legacy browser-only wrappers to the isomorphic layer without refactoring entire call graphs.

When NOT to use the wrapper
---------------------------

- Low-level server-only operations (e.g., direct database migrations, private server RPCs, or functions that require server-only runtime context) should remain in server-only modules and be imported only from server callsites. The wrapper intentionally excludes server-only exports to avoid client leakage.

Quick checklist for front-end devs
---------------------------------

1. Prefer importing from `lib/services` for new code.
2. If you must use `@/services` compatibility export during migration, update the import to `lib/services` once all callers are migrated.
3. Handle errors by catching thrown `Error` objects — inspect `.status` and `.data` for server details.
4. For optimistic UI updates, follow the patterns in `app/admin/users/tabs/*` to mutate local cache and call `refetchTab` when needed.

Where to look for examples
--------------------------

- `app/admin/users/tabs/*` — optimistic update patterns and cache sync.  
- `lib/services/*` — wrapper implementations and how server/browser branches are handled.  
- `services/api/apiClient.ts` — axios interceptors, error shaping, and 401 redirect behavior.
