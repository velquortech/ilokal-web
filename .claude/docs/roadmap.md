# Project Roadmap

Tracks active refactors, near-term improvements, and long-term work items.

---

## In progress — `refactor/api-layer-overhaul`

### Middleware consolidation

Replaced the `proxy/` middleware stack (`stackMiddlewares.ts`, `auth-middleware.ts`, `protectedRoutes.ts`) with a single `proxy.ts` at the project root. `config/updateSession.ts` was deleted; session refresh is now handled inline. `lib/utils/protectedRoutes.ts` and `lib/utils/auth/index.ts` updated to match.

### Folder restructure: `app/business-registration/` → `app/business/registration/`

All business-registration pages, components, steps, hooks, and tests moved under `app/business/registration/` to co-locate them with the rest of `app/business/`. Import paths updated accordingly.

### API namespace cleanup

`config/routeConfig.ts` updated: stale `BILLING_BASE`, `PAYMENTS_BASE`, `SUBSCRIPTIONS_BASE`, `USERS_BASE` constants removed; dead `API_PROTECTED_PREFIXES` entries cleaned up.

---

## Protected Route Audit — Phase Status

Findings from the May 2026 audit of `proxy.ts`, `protectedRoutes.ts`, and the API handler guard layer.

### Phase 1 — Completed

1. **Redundant middleware matcher entries** — `/admin/settings/:path*` and `/business/settings/:path*` were already covered by their parent prefixes. Removed.
2. **Dead `API_PROTECTED_PREFIXES` constant** — listed four paths (`/api/billing`, `/api/payments`, `/api/subscriptions`, `/api/users`) that didn't exist. Removed.
3. **Stale `ROUTES.API` base constants** — `routeConfig.ts` cleaned up.
4. **Clarity comment on shallow token check** — `proxy.ts` comment added explaining that `/api/protected` block only checks token presence; full JWT verification happens in each handler via `getMobileUser()`.

### Phase 2 — Implemented (pending migration approval)

**Eliminate double DB query in middleware for page routes.**

Migration `20260527000000_sync_role_to_jwt.sql` created. Adds a `AFTER INSERT OR UPDATE` trigger on `public.profiles` that writes `role`/`status` into `auth.users.raw_app_meta_data`, plus a one-time backfill for existing rows.

`proxy.ts` updated to read from `user.app_metadata.role`/`status` first; falls back to the profiles SELECT if the fields are not yet populated (safe before and after migration).

**Risk:** Medium — schema + auth change. **Requires human approval before `make migrate-up`.**
**Rollback:** `DROP TRIGGER on_profile_role_change ON public.profiles; DROP FUNCTION sync_role_to_jwt();` — middleware falls back to the profiles SELECT automatically.

### Phase 3 — Completed

**Strengthen the token check for `/api/protected/*`.**

`proxy.ts` updated: the `/api/protected` branch now calls `supabase.auth.getUser()` (Option A). Expired or forged tokens are rejected here before handler code runs. Uses `createServerClient` with `global.headers` for Bearer tokens, cookies for web sessions.

### Phase 4 — Long-term

**Request-scoped auth deduplication.** `assertAuthorized()` in every web/admin handler re-runs `supabase.auth.getUser()` + a `profiles` SELECT. If Phase 2 lands (role in JWT), the profile SELECT disappears. A further optimisation is a request-scoped cache (`AsyncLocalStorage` or a `WeakMap` keyed on `NextRequest`) so calling `assertAuthorized()` twice in one request only hits the auth server once. Low priority until profiling shows it as a bottleneck.

---

## Enforcement map (post-Phase 1 / `refactor/api-layer-overhaul`)

| Path prefix        | Middleware runs?          | Guard mechanism                                          |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| `/admin/*`         | Yes — page route block    | `isProtectedPath` + `roleAllowedForPath` → redirect      |
| `/business/*`      | Yes — page route block    | `isProtectedPath` + `roleAllowedForPath` → redirect      |
| `/api/protected/*` | Yes — shallow token check | `getMobileUser()` in each handler                        |
| `/api/admin/*`     | No                        | `assertAuthorized({ roles: ['admin'] })` in each handler |
| `/api/web/*`       | No                        | `assertAuthorized()` in each handler                     |
| `/api/auth/*`      | No                        | Public — no guard                                        |
| `/api/mobile/*`    | No                        | Public — no guard                                        |
