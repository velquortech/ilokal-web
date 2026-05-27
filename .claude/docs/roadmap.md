# Project Roadmap

Tracks active refactors, near-term improvements, and long-term work items.

---

## In progress — `refactor/api-layer-overhaul`

### Middleware consolidation
Replaced the `proxy/` middleware stack (`stackMiddlewares.ts`, `auth-middleware.ts`, `protectedRoutes.ts`) with a single `middleware.ts` at the project root. `config/updateSession.ts` was deleted; session refresh is now handled inline. `lib/utils/protectedRoutes.ts` and `lib/utils/auth/index.ts` updated to match.

### Folder restructure: `app/business-registration/` → `app/business/registration/`
All business-registration pages, components, steps, hooks, and tests moved under `app/business/registration/` to co-locate them with the rest of `app/business/`. Import paths updated accordingly.

### API namespace cleanup
`config/routeConfig.ts` updated: stale `BILLING_BASE`, `PAYMENTS_BASE`, `SUBSCRIPTIONS_BASE`, `USERS_BASE` constants removed; dead `API_PROTECTED_PREFIXES` entries cleaned up.

---

## Protected Route Audit — Phase Status

Findings from the May 2026 audit of `middleware.ts`, `protectedRoutes.ts`, and the API handler guard layer.

### Phase 1 — Completed

1. **Redundant middleware matcher entries** — `/admin/settings/:path*` and `/business/settings/:path*` were already covered by their parent prefixes. Removed.
2. **Dead `API_PROTECTED_PREFIXES` constant** — listed four paths (`/api/billing`, `/api/payments`, `/api/subscriptions`, `/api/users`) that didn't exist. Removed.
3. **Stale `ROUTES.API` base constants** — `routeConfig.ts` cleaned up.
4. **Clarity comment on shallow token check** — `middleware.ts` comment added explaining that `/api/protected` block only checks token presence; full JWT verification happens in each handler via `getMobileUser()`.

### Phase 2 — Near-term (next sprint)

**Eliminate double DB query in middleware for page routes.**

Every protected page navigation triggers two round-trips: `supabase.auth.getUser()` + a `profiles` SELECT to fetch `role`/`status`. Fix: add a DB trigger that syncs `profiles.role` and `profiles.status` into `auth.users.raw_app_meta_data`, then read from the session's `app_metadata` in middleware instead.

```sql
CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    jsonb_build_object('role', NEW.role, 'status', NEW.status)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_change
  AFTER UPDATE OF role, status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_role_to_jwt();
```

**Risk:** Medium — requires migration + one-time backfill. Requires human approval before merge.
**Rollback:** Drop the trigger; middleware already has a fallback `if (user?.id)` guard.

### Phase 3 — Medium-term

**Strengthen the shallow token presence check for `/api/protected/*`.**

Current behaviour: middleware only checks that an `Authorization: Bearer ...` header or session cookie *exists*. An expired or forged token passes; rejection happens inside `getMobileUser()`.

- **Option A (recommended):** Call `supabase.auth.getUser()` in the `/api/protected` middleware branch. One extra round-trip; catches invalid tokens before handler code runs.
- **Option B:** Verify the JWT locally using `jose` + `SUPABASE_JWT_SECRET`. Zero round-trip but adds complexity.

### Phase 4 — Long-term

**Request-scoped auth deduplication.** `assertAuthorized()` in every web/admin handler re-runs `supabase.auth.getUser()` + a `profiles` SELECT. If Phase 2 lands (role in JWT), the profile SELECT disappears. A further optimisation is a request-scoped cache (`AsyncLocalStorage` or a `WeakMap` keyed on `NextRequest`) so calling `assertAuthorized()` twice in one request only hits the auth server once. Low priority until profiling shows it as a bottleneck.

---

## Enforcement map (post-Phase 1 / `refactor/api-layer-overhaul`)

| Path prefix | Middleware runs? | Guard mechanism |
|---|---|---|
| `/admin/*` | Yes — page route block | `isProtectedPath` + `roleAllowedForPath` → redirect |
| `/business/*` | Yes — page route block | `isProtectedPath` + `roleAllowedForPath` → redirect |
| `/api/protected/*` | Yes — shallow token check | `getMobileUser()` in each handler |
| `/api/admin/*` | No | `assertAuthorized({ roles: ['admin'] })` in each handler |
| `/api/web/*` | No | `assertAuthorized()` in each handler |
| `/api/auth/*` | No | Public — no guard |
| `/api/mobile/*` | No | Public — no guard |
