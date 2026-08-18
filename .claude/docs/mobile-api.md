# Mobile API Reference

Base path: `/api/`

## Local development

```bash
make setup-supabase   # First-time setup: start Supabase and auto-generate .env
make run-dev          # Daily dev (starts Supabase + Next.js)
make stop-db          # Stop Supabase DB only
make clean            # Full teardown (stops Supabase, deletes .env)
```

## Environment variables

| Variable                                  | Purpose                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    | Anon/publishable key (client-safe)                     |
| `SUPABASE_SERVICE_ROLE_KEY`               | Service role key — **server only, bypasses RLS. NEVER use a `NEXT_PUBLIC_` prefix (would inline into the client bundle).** |
| `NEXT_PUBLIC_APP_URL`                     | Base URL used to generate share links                  |
| `NEXT_PUBLIC_SUPABASE_TOKEN`              | Used to name the auth cookie (`sb-<token>-auth-token`) |
| `NEXT_IMAGE_PUBLIC_URL`                   | Supabase Storage base URL for `next/image`             |
| `SUPABASE_DB_URL`                         | Direct Postgres connection string (server only)        |
| `RESEND_API_KEY`                          | Resend API key for transactional email (password reset). **Server only.** Sandbox unless it's a real `re_…` key — any other value (placeholder/unset) logs the reset link to the console instead of sending. |
| `EMAIL_FROM`                              | From-address for reset emails; a Resend-verified sending domain (local-part need not be a real mailbox). Server only. Missing ⇒ log fallback. |

## Database migrations

```bash
make migrate-new name=<migration_name>   # create a new migration file
make migrate-up                          # apply pending migrations
make migrate-reset                       # reset and re-apply all migrations
make migrate-diff                        # diff local DB and write a migration file
make generate-types                      # regenerate lib/types/database.ts from local DB
```

Migrations live in `supabase/migrations/`. Apply them in timestamp order.

## Supabase clients

| File                                | Client                                                | When to use                                                        |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| `supabase/server.ts`                | `createServerSupabaseClient` (anon key + cookies, RLS)| Server Components, Server Actions, and web/admin API routes         |
| `config/client.ts`                  | `createBrowserClient` (anon key)                      | Client Components                                                  |
| `supabase/bearer.ts`                | `createServerClient` (anon key, no cookies)           | Public mobile routes (no session needed)                           |
| `app/api/helpers/mobile-request.ts` | `createClient` with `Authorization` header            | Protected mobile routes — passes user JWT so RLS applies correctly |

The RLS-bypassing service-role client lives only in `supabase/server.ts` as `createAnalyticsSupabaseClient` / `createServerAdminClient` — it reads the **server-only** `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix). Use it only for aggregate analytics or `auth.admin.*`.

**Never** use the service-role client in mobile routes. Use `getMobileUser()` instead so Supabase RLS enforces row-level access automatically.

## Auth & middleware

A single `proxy.ts` at the repo root handles both concerns:

1. Page routes — refreshes the Supabase session cookie and enforces role-based redirects.
2. `/api/protected/**` — shallow credential check (cookie or Bearer token present); full JWT verification happens inside each handler via `getMobileUser()`.

Mobile clients obtain a JWT directly from the Supabase SDK (`supabase.auth.signInWithPassword` / OAuth) and include it in every protected request:

```
Authorization: Bearer <supabase_access_token>
```

Profile rows are created automatically by the `on_auth_user_created` DB trigger (`supabase/migrations/20260508000001_auto_create_profile.sql`) — covers both email signup and OAuth.

## Response helpers (`app/api/helpers/response.ts`)

`successResponse(data)` · `badRequestResponse(data)` · `unauthorizedResponse(data)` · `notFoundResponse(data)` · `conflictRequestResponse(data)` · `generalErrorResponse(data)`

---

## Endpoints — Public (no auth)

Auth is handled by the **Supabase SDK on the mobile client** — there are no `/api/mobile/auth/*` routes.

### `GET /api/mobile/businesses/nearby`

Shops Near Me — returns verified branches ordered by distance. Backed by the `nearby_businesses` PostGIS RPC (`supabase/migrations/20260508000000_nearby_businesses_fn.sql`).

**Query params**

| Param    | Type         | Required | Default |
| -------- | ------------ | -------- | ------- |
| `lat`    | float        | yes      | —       |
| `lng`    | float        | yes      | —       |
| `radius` | int (metres) | no       | 5000    |

**Response 200**

```json
{
  "businesses": [
    {
      "branch_id": "uuid",
      "branch_name": "string",
      "address": "string",
      "distance_meters": 123.4,
      "business_id": "uuid",
      "business_name": "string",
      "business_description": "string",
      "logo_url": "string",
      "interior_images": ["url"]
    }
  ],
  "category_counts": [
    {
      "business_type": "Food & Beverage",
      "category_name": "Café",
      "count": 3
    }
  ]
}
```

`category_counts` is the radius-wide availability aggregate for Explore's
category filters (per business type / sub-category, verified branches in the
radius). Computed by the `nearby_business_type_counts` RPC
(`supabase/migrations/20260812000000_nearby_business_type_counts.sql`) —
deliberately NOT filtered by the active `category`/`subcategory`/`q`, so the
filter dropdowns stay stable while browsing; the counts are returned in both
the paged and the legacy `limit` shapes.

### `GET /api/mobile/business-types`

Static reference list backing Explore's category filter — the business types
and their sub-categories. Filtered so a type/category only appears when it has
at least one **browseable** business (`status='verified'`, `archived_at IS
NULL`) — the same contract as the nearby feed — so the filter never advertises
a dead category. The DB read is cached for 5 min.

**Response 200**

```json
{
  "business_types": [
    {
      "id": "uuid",
      "name": "Food & Beverage",
      "description": "string",
      "icon": "Coffee",
      "business_categories": [
        { "id": "uuid", "name": "Café", "description": "string", "image_url": "string" }
      ]
    }
  ]
}
```

> **Shape note:** the filter is implemented as a PostgREST inner join on
> `businesses`, but the join's `businesses` id array is **stripped** before the
> payload is returned. Business ids are not part of this reference contract and
> are never exposed here — the endpoint carries only the shape above. (Business
> ids are, however, public via the browse/detail endpoints, where they are the
> resource identifier.)

### `GET /api/mobile/businesses/:businessId`

Business detail — includes `interior_images` and branch list.

**Response 200**

```json
{
  "business": {
    "id": "uuid",
    "shop_name": "string",
    "description": "string",
    "logo_url": "string",
    "interior_images": ["url"],
    "status": "verified",
    "branches": [{ "id": "uuid", "name": "string", "address": "string" }]
  }
}
```

### `GET /api/mobile/businesses/:businessId/products`

Products and menu items (only `is_available = true`).

**Response 200**

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "price": 0.0,
      "image_url": "string",
      "is_available": true
    }
  ]
}
```

### `GET /api/mobile/businesses/:businessId/coupons`

Active deals and coupons (excludes expired).

**Response 200**

```json
{
  "coupons": [
    {
      "id": "uuid",
      "code": "string",
      "description": "string",
      "discount": { "type": "percentage|fixed_amount", "value": 20 },
      "usage_scope": "string",
      "start_date": "iso",
      "expiry_date": "iso"
    }
  ]
}
```

### `GET /api/mobile/businesses/:businessId/share`

Shareable content for social platforms.

**Response 200**

```json
{
  "share_url": "https://...",
  "title": "string",
  "description": "string",
  "image_url": "string",
  "platforms": {
    "facebook": "https://facebook.com/sharer/...",
    "twitter": "https://twitter.com/intent/...",
    "tiktok": "https://...",
    "instagram": "https://..."
  }
}
```

### `GET /api/mobile/product-search`

Full-catalog product/business-name search for the Home search bar's as-you-type
suggestions (ilokal-mobile `hooks/useSearchSuggestions.ts`). Unlike
`/api/mobile/popular-products`, this ranks by **relevance** across EVERY
available product of every verified business — a long-tail product with a
handful of views is still findable. One product per business (a mega-menu shop
can't flood the results); name-prefix matches rank above substring hits, then
by weekly views / rating count. Backed by the `product_search` RPC
(`20260814170000_product_search.sql`).

**Query params**

| Param | Required | Description |
|---|---|---|
| `q` | yes | Search text (trimmed; matches product name or business name, ILIKE, LIKE metacharacters escaped) |
| `limit` | no | Max results, clamped to 1–20 (default 10) |

**Response 200** — same wire rows as `/api/mobile/popular-products`, so the
client's `mapWireToPopularProduct` works unchanged:

```json
{
  "products": [
    {
      "product_id": "uuid",
      "product_name": "string",
      "product_image_url": "string | null",
      "price": 0.0,
      "price_type": "fixed | from | per_hour | per_day | per_person | per_event",
      "price_unit": "string | null",
      "weekly_view_count": 0,
      "average_rating": 0.0,
      "rating_count": 0,
      "business_id": "uuid",
      "business_name": "string",
      "business_logo_url": "string | null",
      "business_banner_url": "string | null",
      "distance_meters": null,
      "is_new": false
    }
  ]
}
```

---

## Endpoints — Protected (requires `Authorization: Bearer <jwt>`)

> **⚠️ Renamed — the old `/subscriptions` paths 404.** The table was renamed
> `subscriptions` → `follows` in `20260605000000`, and the routes moved with
> it. This section documented `/api/protected/mobile/subscriptions` until
> 2026-08-18; there is no such route. The response key changed too
> (`subscriptions` → `follows`). `subscription_plans` / `business_subscriptions`
> are the unrelated **billing** tables and are not reachable here.

### `GET /api/protected/mobile/follows`

List all businesses the user follows.

**Response 200**

```json
{
  "follows": [
    {
      "id": "uuid",
      "created_at": "iso",
      "businesses": {
        "id": "uuid",
        "shop_name": "string",
        "logo_url": "string"
      }
    }
  ]
}
```

### `POST /api/protected/mobile/follows`

Follow a business. **Body:** `{ "business_id": "uuid" }` — missing/blank ⇒ **400**,
already following ⇒ **409**. **Response 200:** `{ "follow": { ... } }`

### `DELETE /api/protected/mobile/follows/:businessId`

Unfollow. **Response 200:** `{ "message": "Unfollowed successfully" }`

---

## Endpoints not yet detailed here

These routes exist under `app/api/` and are live, but have no full entry in this
file yet. **Read the handler before integrating** — do not assume a shape.

**Public (`app/api/mobile/`)**

| Route | Handler |
| --- | --- |
| `GET /api/mobile/deals` | `deals/route.ts` — the Deals feed, backed by the `mobile_deals` RPC |
| `GET /api/mobile/events` · `/events/[id]` · `/events/nearby` | the events surface; kill-switched on `enable_events` |
| `GET /api/mobile/popular-products` · `/popular-products/facets` | ranked-by-views feed + its filter facets |
| `GET /api/mobile/businesses/[businessId]/ratings` | public rating list for a shop |
| `POST /api/mobile/businesses/[businessId]/view` · `/products/[productId]/view` | view-event ingestion (feeds `view_events`) |

**Protected (`app/api/protected/mobile/`)**

| Route | Handler |
| --- | --- |
| `GET /api/protected/mobile/updates` | followed-business feed (posts + live coupons + new products) |
| `GET`/`PATCH` `/api/protected/mobile/notifications` · `/[id]` · `/read-all` | in-app inbox |
| `POST /api/protected/mobile/me/avatar` | avatar upload (WebP pipeline) |
| `GET /api/protected/mobile/redemptions/[id]` · `PATCH /[id]/claim` | single redemption + the atomic claim flip |
| `POST /api/protected/mobile/ratings/businesses/[businessId]` · `/ratings/products/[productId]` | rating writes — gated by SEC-4 (`has_redeemed_from_business`), 42501 maps to a friendly 403 |


### `GET /api/protected/mobile/redemptions`

List coupon redemptions. **Query:** `filter=active|claimed|expired` (omit for all). `active` = not yet claimed and not expired.

**Response 200**

```json
{
  "redemptions": [
    {
      "id": "uuid",
      "redeemed_at": "iso",
      "expires_at": "iso",
      "is_claimed": false,
      "coupons": {
        "id": "uuid",
        "code": "string",
        "description": "string",
        "discount": { "type": "percentage|fixed_amount", "value": 20 },
        "expiry_date": "iso",
        "businesses": {
          "id": "uuid",
          "shop_name": "string",
          "logo_url": "string"
        }
      },
      "branches": { "id": "uuid", "name": "string", "address": "string" }
    }
  ]
}
```

### `POST /api/protected/mobile/redemptions`

Redeem a coupon. Sets `expires_at` from `coupons.expiry_date`. **Body:** `{ "coupon_id": "uuid", "branch_id": "uuid" }`

### `GET /api/protected/mobile/itinerary`

Combines active redemptions + followed businesses for the in-app trip planner.

**Response 200:** `{ "active_redemptions": [...], "followed_businesses": [...] }`

### `GET` / `PATCH` / `DELETE /api/protected/mobile/me`

Current user's profile. `GET` returns `{ profile }` including `status` and `archived_at`
(so the app can tell a deactivated account from a deleted one). `PATCH` updates
`full_name` / `phone_number` / `avatar_url` only.

`DELETE` = **self-service account deletion, archive only** (soft delete). Marks the
profile `archived_at = now()` + `status = 'inactive'`; the row and the auth user are
kept (a hard delete stays admin-only — `DELETE /api/admin/profiles/[id]/delete`).
`status` has no `'archived'` value (CHECK is `active|inactive|suspended`), so
`archived_at` is the archive marker — matching the web login gate, which 403s any
profile with `archived_at` set. Idempotent (repeat calls preserve the first
timestamp). **Response 200:** `{ "profile": { "id", "status", "archived_at" }, "archived": true }`

### `POST /api/protected/mobile/me/deactivate`

Reversible self-service deactivation: `active → inactive`. **403** if the account is
archived or admin-`suspended`; already-`inactive` is a no-op 200. Reverse via
`/me/reactivate`. **Response 200:** `{ "profile": { "id", "status", "archived_at" } }`

### `POST /api/protected/mobile/me/reactivate`

Reverses a deactivation: `inactive → active`. Reachable while deactivated (mobile
protected routes gate on JWT validity, not status). **403** if archived or
`suspended` — users can't self-clear an admin action or un-delete. **Response 200:**
`{ "profile": { "id", "status", "archived_at" } }`

> **Enforcement note:** mobile sign-in uses the Supabase SDK directly and the proxy
> does **not** status-gate `/api/protected/mobile/**` (JWT-validity only), so these
> flags are enforced app-side: the app signs the client out locally on deactivate
> (`deactivateAccount` in `services/api/accountService.ts`, surfaced in the
> Account Settings Danger Zone) and on delete, and a **re-login gate** in
> `app/_layout.tsx` prompts a deactivated user to reactivate (`reactivateAccount`
> → `POST /me/reactivate`) or sign out — no silent continuation. A still-valid
> access token keeps working until it expires; server-side status gating remains
> the open follow-up (see `tech-debt.md` TD-018).

> **Email / password changes** are not API routes — the mobile app calls the
> Supabase SDK directly (`supabase.auth.updateUser({ email })` with OTP/`verifyOtp`,
> and `updateUser({ password, currentPassword })`).

---

## Adding a new mobile route

1. **Public route** → create `app/api/mobile/<resource>/route.ts`, use `createBearerClient()` from `supabase/bearer.ts`
2. **Protected route** → create `app/api/protected/mobile/<resource>/route.ts`, call `getMobileUser(req)` first and return `unauthorizedResponse()` if null
3. Use response helpers from `app/api/helpers/response.ts` — do not construct `NextResponse` manually
4. If the route needs PostGIS, add a Supabase RPC migration and call it via `supabase.rpc()`

---

## Key file locations

| Purpose                 | Path                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| Mobile auth helper      | `app/api/helpers/mobile-request.ts`                                  |
| Response helpers        | `app/api/helpers/response.ts`                                        |
| Proxy                   | `proxy.ts`                                                           |
| Bearer Supabase client  | `supabase/bearer.ts`                                                 |
| Server Supabase client  | `supabase/server.ts`                                                 |
| Browser Supabase client | `config/client.ts`                                                   |
| DB types                | `lib/types/database.ts` (auto-generated — run `make generate-types`) |
| Migrations              | `supabase/migrations/`                                               |
| Nearby businesses RPC   | `supabase/migrations/20260508000000_nearby_businesses_fn.sql`        |

---

## Schema gotchas

| Topic                 | Actual state                                                                                                                                                                                  | Affected routes        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `profiles.role`       | must be `'business_owner'` or `'admin'` — NOT `'user'`                                                                                                                                        | signup, profile insert |
| `coupons` columns     | normalized in `20260523000000`: `code` (not `title`), `discount` JSONB (not `type` enum), `expiry_date` (not `end_date`), `status` (`draft\|published`). `redeem_time_limit_minutes` removed. | all coupon routes      |
| `products.status`     | `'active' \| 'unlisted' \| 'disabled'` — NOT `inactive\|archived`. `is_available` synced by trigger; `status` is canonical.                                                                   | products routes        |
| Redemption tables     | `user_redemptions` is live (has `expires_at`, `is_claimed`, `branch_id`). `coupon_redemptions` exists but is unused by routes. Analytics reads from `user_redemptions`.                       | redemptions, analytics |
| Mobile response shape | `successResponse(data)` returns flat data — NOT wrapped in `ApiResponse<T>`. The `success/error` envelope applies to web routes only.                                                         | all mobile routes      |

## Local test seed data

Run after `make migrate-reset`:

```sql
INSERT INTO businesses (id, owner_id, name, description, logo_url, interior_images, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '<any profile id>', 'Test Cafe',
  'A cozy test cafe', 'https://picsum.photos/seed/testcafe/400/400',
  ARRAY['https://picsum.photos/seed/interior1/800/500'], 'verified');

INSERT INTO branches (id, business_id, name, address, location)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'Main Branch', 'Iznart St., City Proper, Iloilo City', ST_MakePoint(122.5649, 10.6973)::geography);

INSERT INTO products (id, business_id, name, description, price, image_url, is_available)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'Flat White', 'Smooth espresso', 185, 'https://picsum.photos/seed/flatwhite/200/200', true);

INSERT INTO coupons (id, business_id, code, description, discount, start_date, expiry_date, status)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'DRINK20', '20% off any drink', '{"type":"percentage","value":20}', NOW(), NOW() + INTERVAL '30 days', 'published');
```
