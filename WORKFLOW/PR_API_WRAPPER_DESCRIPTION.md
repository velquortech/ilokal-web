# PR: feat(api): isomorphic Supabase API wrapper (server & client)

## Purpose

- Provide a single, isomorphic layer that creates and configures Supabase clients for server and client usage, centralizes auth cookie handling, and enforces safe defaults.

## Quickstart — How to use

- Server (server actions, API routes, edge-aware server code):

```ts
import { createServerSupabase } from '../../supabase/server';

const { supabaseAdmin, setAuthCookie } = createServerSupabase({ req, res });
// supabaseAdmin has admin capabilities (requires SUPABASE_SERVICE_ROLE_KEY)
```

- Client (browser code / React):

```ts
import { createClientSupabase } from '../../supabase/client';
const supabase = createClientSupabase(); // uses NEXT_PUBLIC_SUPABASE_ANON_KEY
```

- Cookie helpers:

```ts
// setAuthCookie(res, session)
// clearAuthCookie(res)
```

## API surface (high level)

- `createServerSupabase(opts)` → returns `{ supabaseAdmin, setAuthCookie, clearAuthCookie }`.
- `createClientSupabase()` → browser-safe client using `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Typed result unions for auth/lookup helpers (no `any`).

## Examples

- Server action that creates a protected resource:

```ts
const { supabaseAdmin } = createServerSupabase({ req, res });
await supabaseAdmin.from('items').insert({ name: 'x' });
```

- Client listing (reads only):

```ts
const client = createClientSupabase();
const { data } = await client.from('items').select('*');
```

## Benefits

- **Security:** Keeps service-role secrets on the server; no `NEXT_PUBLIC_` fallbacks.
- **Consistency:** Single place for cookie flags, error mapping, and auth flows.
- **Type Safety:** Forces typed result shapes and Zod validation integration, reducing runtime surprises.
- **Testability:** Easier to mock a single wrapper in unit/integration tests.
- **Operational:** Small migration path and clear rotation steps in `WORKFLOW/SECRET_ROTATION_STEPS.md`.

## Migration / usage notes

- Ensure `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` are set in CI/hosting (server-only).
- Update any local `.env` bootstraps to use the new names (Makefile was updated).
- Replace any direct `new SupabaseClient(...)` server-side usage with `createServerSupabase` where admin privileges are required.

## Reviewer checklist

- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` present in CI/hosting (server scope only).
- [ ] Search repo for accidental `NEXT_PUBLIC_` server secrets.
- [ ] Run `npm run ci:checks` and smoke-test admin endpoints.

---

If you want, I can add small code examples directly into the `supabase/` files as inline docs or update README snippets.
