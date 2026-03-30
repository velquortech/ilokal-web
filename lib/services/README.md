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
