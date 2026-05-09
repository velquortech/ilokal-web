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

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key (client-safe) |
| `NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY` | Service role key (server only — bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Base URL used to generate share links |
| `NEXT_PUBLIC_SUPABASE_TOKEN` | Used to name the auth cookie (`sb-<token>-auth-token`) |
| `NEXT_IMAGE_PUBLIC_URL` | Supabase Storage base URL for `next/image` |
| `NEXT_PUBLIC_SUPABASE_DB_URL` | Direct Postgres connection string |

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

| File | Client | When to use |
|---|---|---|
| `config/index.ts` | `createServerClient` (service role, cookie-based) | Server Components and web API routes |
| `config/client.ts` | `createBrowserClient` (anon key) | Client Components |
| `supabase/bearer.ts` | `createServerClient` (anon key, no cookies) | Public mobile routes (no session needed) |
| `app/api/helpers/mobile-auth.ts` | `createClient` with `Authorization` header | Protected mobile routes — passes user JWT so RLS applies correctly |

**Never** use the service-role client in mobile routes. Use `getMobileUser()` instead so Supabase RLS enforces row-level access automatically.

## Auth & middleware

The middleware stack (`proxy/stackMiddlewares.ts`) chains:
1. `protectedRoutesMiddlware` — refreshes the Supabase session cookie for web routes
2. `authMiddlware` — gates `/api/protected/**`; accepts either a session **cookie** (web) or an `Authorization: Bearer <jwt>` header (mobile)

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

| Param | Type | Required | Default |
|---|---|---|---|
| `lat` | float | yes | — |
| `lng` | float | yes | — |
| `radius` | int (metres) | no | 5000 |

**Response 200**
```json
{
  "businesses": [
    {
      "branch_id": "uuid", "branch_name": "string", "address": "string",
      "distance_meters": 123.4,
      "business_id": "uuid", "business_name": "string",
      "business_description": "string", "logo_url": "string",
      "interior_images": ["url"]
    }
  ]
}
```

### `GET /api/mobile/businesses/:businessId`

Business detail — includes `interior_images` and branch list.

**Response 200**
```json
{
  "business": {
    "id": "uuid", "shop_name": "string", "description": "string",
    "logo_url": "string", "interior_images": ["url"],
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
    { "id": "uuid", "name": "string", "description": "string",
      "price": 0.00, "image_url": "string", "is_available": true }
  ]
}
```

### `GET /api/mobile/businesses/:businessId/coupons`

Active deals and coupons (excludes expired).

**Response 200**
```json
{
  "coupons": [
    { "id": "uuid", "title": "string", "description": "string",
      "type": "discount|deal|voucher",
      "start_date": "iso", "end_date": "iso",
      "redeem_time_limit_minutes": 30 }
  ]
}
```

### `GET /api/mobile/businesses/:businessId/share`

Shareable content for social platforms.

**Response 200**
```json
{
  "share_url": "https://...", "title": "string", "description": "string", "image_url": "string",
  "platforms": {
    "facebook": "https://facebook.com/sharer/...",
    "twitter": "https://twitter.com/intent/...",
    "tiktok": "https://...",
    "instagram": "https://..."
  }
}
```

---

## Endpoints — Protected (requires `Authorization: Bearer <jwt>`)

### `GET /api/protected/mobile/subscriptions`

List all businesses the user follows.

**Response 200**
```json
{
  "subscriptions": [
    { "id": "uuid", "created_at": "iso",
      "businesses": { "id": "uuid", "shop_name": "string", "logo_url": "string" } }
  ]
}
```

### `POST /api/protected/mobile/subscriptions`

Subscribe (follow) a business. **Body:** `{ "business_id": "uuid" }` · **409** if already subscribed.

### `DELETE /api/protected/mobile/subscriptions/:businessId`

Unsubscribe. **Response 200:** `{ "message": "Unsubscribed successfully" }`

### `GET /api/protected/mobile/redemptions`

List coupon redemptions. **Query:** `filter=active|claimed|expired` (omit for all). `active` = not yet claimed and not expired.

**Response 200**
```json
{
  "redemptions": [
    { "id": "uuid", "redeemed_at": "iso", "expires_at": "iso", "is_claimed": false,
      "coupons": { "id": "uuid", "title": "string", "type": "discount",
        "redeem_time_limit_minutes": 30,
        "businesses": { "id": "uuid", "shop_name": "string", "logo_url": "string" } },
      "branches": { "id": "uuid", "name": "string", "address": "string" } }
  ]
}
```

### `POST /api/protected/mobile/redemptions`

Redeem a coupon. Sets `expires_at` from `redeem_time_limit_minutes`. **Body:** `{ "coupon_id": "uuid", "branch_id": "uuid" }`

### `GET /api/protected/mobile/itinerary`

Combines active redemptions + followed businesses for the in-app trip planner.

**Response 200:** `{ "active_redemptions": [...], "followed_businesses": [...] }`

---

## Adding a new mobile route

1. **Public route** → create `app/api/mobile/<resource>/route.ts`, use `createBearerClient()` from `supabase/bearer.ts`
2. **Protected route** → create `app/api/protected/mobile/<resource>/route.ts`, call `getMobileUser(req)` first and return `unauthorizedResponse()` if null
3. Use response helpers from `app/api/helpers/response.ts` — do not construct `NextResponse` manually
4. If the route needs PostGIS, add a Supabase RPC migration and call it via `supabase.rpc()`

---

## Key file locations

| Purpose | Path |
|---|---|
| Mobile auth helper | `app/api/helpers/mobile-auth.ts` |
| Response helpers | `app/api/helpers/response.ts` |
| Auth middleware | `proxy/auth-middleware/auth-middleware.ts` |
| Bearer Supabase client | `supabase/bearer.ts` |
| Server Supabase client | `config/index.ts` |
| Browser Supabase client | `config/client.ts` |
| DB types | `lib/types/database.ts` (auto-generated — run `make generate-types`) |
| Migrations | `supabase/migrations/` |
| Nearby businesses RPC | `supabase/migrations/20260508000000_nearby_businesses_fn.sql` |

---

## Schema gotchas

| Migration says | Actual DB column | Affected routes |
|---|---|---|
| `profiles.role = 'user'` | must be `'business_owner'` or `'admin'` — see profiles check constraint | signup, profile insert |

`products` and `coupons` had RLS enabled but no public SELECT policy — fixed in `supabase/migrations/20260508000002_products_coupons_rls.sql`.

## Local test seed data

Run after `make migrate-reset`:

```sql
INSERT INTO businesses (id, owner_id, name, description, logo_url, interior_images, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '<any profile id>', 'Test Cafe',
  'A cozy test cafe', 'https://picsum.photos/seed/testcafe/400/400',
  ARRAY['https://picsum.photos/seed/interior1/800/500'], 'verified');

INSERT INTO branches (id, business_id, name, address, location)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'Main Branch', '123 Ayala Ave, Makati', ST_MakePoint(120.9842, 14.5547)::geography);

INSERT INTO products (id, business_id, name, description, price, image_url, is_available)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'Flat White', 'Smooth espresso', 185, 'https://picsum.photos/seed/flatwhite/200/200', true);

INSERT INTO coupons (id, business_id, title, type, start_date, end_date, redeem_time_limit_minutes)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  '20% Off Any Drink', 'discount', NOW(), NOW() + INTERVAL '30 days', 30);
```
