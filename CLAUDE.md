# iLokal Web — Claude Reference

## Project overview

iLokal is a Next.js 16 web app that serves both a **web frontend** and a **REST API backend for the mobile app**. The backend uses Supabase (PostgreSQL + PostGIS + Auth) for all persistence and authentication.

**Tech stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase (SSR) · Tailwind CSS v4 · PostGIS

---

## Local development

```bash
# First-time setup: start Supabase and auto-generate .env
make setup-supabase

# Daily dev (starts Supabase + Next.js)
make run-dev

# Stop Supabase DB only
make stop-db

# Full teardown (stops Supabase, deletes .env)
make clean
```

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key (client-safe) |
| `NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY` | Service role key (server only — bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Base URL used to generate share links |
| `NEXT_PUBLIC_SUPABASE_TOKEN` | Used to name the auth cookie (`sb-<token>-auth-token`) |
| `NEXT_IMAGE_PUBLIC_URL` | Supabase Storage base URL for `next/image` |
| `NEXT_PUBLIC_SUPABASE_DB_URL` | Direct Postgres connection string |

---

## Database migrations

```bash
make migrate-new name=<migration_name>   # create a new migration file
make migrate-up                          # apply pending migrations
make migrate-reset                       # reset and re-apply all migrations
make migrate-diff                        # diff local DB and write a migration file
make generate-types                      # regenerate lib/types/database.ts from local DB
```

Migrations live in `supabase/migrations/`. Apply them in timestamp order.

---

## Supabase clients

| File | Client | When to use |
|---|---|---|
| `config/index.ts` | `createServerClient` (service role, cookie-based) | Server Components and web API routes |
| `config/client.ts` | `createBrowserClient` (anon key) | Client Components |
| `supabase/bearer.ts` | `createServerClient` (anon key, no cookies) | Public mobile routes (no session needed) |
| `app/api/helpers/mobile-auth.ts` | `createClient` with `Authorization` header | Protected mobile routes — passes user JWT so RLS applies correctly |

**Never** use the service-role client in mobile routes. Use `getMobileUser()` instead so Supabase RLS enforces row-level access automatically.

---

## Auth & middleware

The middleware stack (`proxy/stackMiddlewares.ts`) chains:
1. `protectedRoutesMiddlware` — refreshes the Supabase session cookie for web routes
2. `authMiddlware` — gates `/api/protected/**`; accepts either a session **cookie** (web) or an `Authorization: Bearer <jwt>` header (mobile)

Mobile clients obtain a JWT directly from the Supabase SDK (`supabase.auth.signInWithPassword` / OAuth) and include it in every protected request:
```
Authorization: Bearer <supabase_access_token>
```

Profile rows are created automatically by the `on_auth_user_created` DB trigger (see `supabase/migrations/20260508000001_auto_create_profile.sql`) — covers both email signup and OAuth.

---

## API reference — Mobile app

Base path: `/api/`

### Response helpers (`app/api/helpers/response.ts`)

`successResponse(data)` · `badRequestResponse(data)` · `unauthorizedResponse(data)` · `notFoundResponse(data)` · `conflictRequestResponse(data)` · `generalErrorResponse(data)`

---

### Auth

Auth is handled by the **Supabase SDK on the mobile client** — there are no `/api/mobile/auth/*` routes. The mobile app calls `supabase.auth.signUp/signInWithPassword/signInWithOAuth` directly. Profiles are auto-created by DB trigger.

---

### Businesses (public)

#### `GET /api/mobile/businesses/nearby`
Shops Near Me — returns verified branches ordered by distance. Backed by the `nearby_businesses` PostGIS RPC (see `supabase/migrations/20260508000000_nearby_businesses_fn.sql`).

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
      "interior_images": ["url", "..."]
    }
  ]
}
```

---

#### `GET /api/mobile/businesses/:businessId`
Business detail — includes `interior_images` (store snapshots) and branch list.

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

---

#### `GET /api/mobile/businesses/:businessId/products`
Products and menu items for a business (only `is_available = true`).

**Response 200**
```json
{
  "products": [
    { "id": "uuid", "name": "string", "description": "string",
      "price": 0.00, "image_url": "string", "is_available": true }
  ]
}
```

---

#### `GET /api/mobile/businesses/:businessId/coupons`
Active deals and coupons for a business (excludes expired ones).

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

---

#### `GET /api/mobile/businesses/:businessId/share`
Shareable content for social platforms (Facebook, Instagram, TikTok).

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

---

### Subscriptions — requires auth

#### `GET /api/protected/mobile/subscriptions`
List all businesses the user follows.

**Response 200**
```json
{
  "subscriptions": [
    {
      "id": "uuid", "created_at": "iso",
      "businesses": { "id": "uuid", "shop_name": "string", "logo_url": "string" }
    }
  ]
}
```

---

#### `POST /api/protected/mobile/subscriptions`
Subscribe (follow) a business.

**Body**
```json
{ "business_id": "uuid" }
```
**Response 200** — subscription record  
**Response 409** — already subscribed

---

#### `DELETE /api/protected/mobile/subscriptions/:businessId`
Unsubscribe from a business.

**Response 200**
```json
{ "message": "Unsubscribed successfully" }
```

---

### Redemptions — requires auth

#### `GET /api/protected/mobile/redemptions`
List the user's coupon redemptions.

**Query params**
| Param | Values | Description |
|---|---|---|
| `filter` | `active` / `claimed` / `expired` | Omit to return all |

`active` = not yet claimed and not expired (user must visit store to claim discount).

**Response 200**
```json
{
  "redemptions": [
    {
      "id": "uuid", "redeemed_at": "iso", "expires_at": "iso", "is_claimed": false,
      "coupons": {
        "id": "uuid", "title": "string", "type": "discount",
        "redeem_time_limit_minutes": 30,
        "businesses": { "id": "uuid", "shop_name": "string", "logo_url": "string" }
      },
      "branches": { "id": "uuid", "name": "string", "address": "string" }
    }
  ]
}
```

---

#### `POST /api/protected/mobile/redemptions`
Redeem a coupon. Sets `expires_at` based on `redeem_time_limit_minutes` on the coupon.

**Body**
```json
{ "coupon_id": "uuid", "branch_id": "uuid" }
```
**Response 200** — new redemption record

---

### Itinerary — requires auth

#### `GET /api/protected/mobile/itinerary`
Combines the user's **active redemptions** (places they must visit before expiry) with their **followed businesses** (places they want to revisit). Used to build the in-app itinerary/trip planner view.

**Response 200**
```json
{
  "active_redemptions": [ ... ],
  "followed_businesses": [ ... ]
}
```

---

## API test results

All endpoints tested locally against `http://localhost:3000` with a live Supabase instance.

### Schema gotchas (found during testing)

| Migration says | Actual DB column | Affected routes |
|---|---|---|
| `businesses.name` | `businesses.shop_name` | detail, share, subscriptions, redemptions, itinerary |
| `status = 'verified'` (enum) | same — but `is_verified` boolean also exists | use `status` to match RLS policy |
| `profiles.role = 'user'` | must be `'app_user'` (check constraint) | signup, profile insert |
| `profiles.status` | required, must be `'active'/'inactive'/'suspended'` | signup, profile insert |

### Missing RLS policies (added via migration)

`products` and `coupons` had RLS enabled but no public SELECT policy — queries returned empty arrays silently. Fixed in `supabase/migrations/20260508000002_products_coupons_rls.sql` (or applied directly in local DB).

```sql
CREATE POLICY "Public view products of verified businesses" ON public.products
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = products.business_id AND status = 'verified' AND archived_at IS NULL
  ));

CREATE POLICY "Public view coupons of verified businesses" ON public.coupons
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = coupons.business_id AND status = 'verified' AND archived_at IS NULL
  ));
```

### Endpoint results

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/mobile/businesses/nearby?lat=14.5547&lng=120.9842` | ✅ | Returns `business_name`, `distance_meters`, `interior_images` |
| `GET /api/mobile/businesses/:id` | ✅ | Returns `shop_name`, branches, interior images |
| `GET /api/mobile/businesses/:id/products` | ✅ | Returns 2 products |
| `GET /api/mobile/businesses/:id/coupons` | ✅ | Returns 2 coupons, excludes expired |
| `GET /api/mobile/businesses/:id/share` | ✅ | Returns Facebook, Twitter, TikTok, Instagram links |
| `POST /api/protected/mobile/subscriptions` | ✅ | 409 on duplicate |
| `GET /api/protected/mobile/subscriptions` | ✅ | Returns `shop_name` via nested join |
| `DELETE /api/protected/mobile/subscriptions/:id` | ✅ | 404 on missing subscription |
| `POST /api/protected/mobile/redemptions` | ✅ | Sets `expires_at` from `redeem_time_limit_minutes` |
| `GET /api/protected/mobile/redemptions` | ✅ | `filter=active/claimed/expired` all work |
| `GET /api/protected/mobile/itinerary` | ✅ | Returns active redemptions + followed businesses |
| Unauthenticated request to `/api/protected/*` | ✅ | 401 from middleware |

### Local test data

Seed data inserted manually for testing (re-run after `make migrate-reset`):

```sql
-- Verified business
INSERT INTO businesses (id, owner_id, shop_name, description, logo_url, interior_images, status, is_verified)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '<any profile id>', 'Test Cafe',
  'A cozy test cafe', 'https://picsum.photos/seed/testcafe/400/400',
  ARRAY['https://picsum.photos/seed/interior1/800/500'], 'verified', true);

-- Branch with Manila coords
INSERT INTO branches (id, business_id, name, address, location)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'Main Branch', '123 Ayala Ave, Makati', ST_MakePoint(120.9842, 14.5547)::geography);

-- Products
INSERT INTO products (id, business_id, name, description, price, image_url, is_available)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  'Flat White', 'Smooth espresso', 185, 'https://picsum.photos/seed/flatwhite/200/200', true);

-- Coupon
INSERT INTO coupons (id, business_id, title, type, start_date, end_date, redeem_time_limit_minutes)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  '20% Off Any Drink', 'discount', NOW(), NOW() + INTERVAL '30 days', 30);
```

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

## Adding a new mobile route

1. **Public route** → create `app/api/mobile/<resource>/route.ts`, use `createBearerClient()` from `supabase/bearer.ts`
2. **Protected route** → create `app/api/protected/mobile/<resource>/route.ts`, call `getMobileUser(req)` first and return `unauthorizedResponse()` if null
3. Use response helpers from `app/api/helpers/response.ts` — do not construct `NextResponse` manually
4. If the route needs PostGIS, add a Supabase RPC migration and call it via `supabase.rpc()`
