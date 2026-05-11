# Caching Strategy — iLokal Web

Covers Next.js App Router caching layers, Supabase data fetching patterns, and rules for when to opt in or out of each layer.

---

## Next.js Caching Layers (App Router)

Next.js 16 stacks four caches. Understand all four before adding or removing caching from any route.

| Layer | Where | Duration | Invalidated by |
|---|---|---|---|
| **Request Memoization** | In-memory, per request | One render tree | Automatic — new request |
| **Data Cache** | Persistent, server-side | Indefinite (opt-out with `no-store`) | `revalidatePath`, `revalidateTag`, `time-based revalidate` |
| **Full Route Cache** | Persistent, server-side | Until rebuild or revalidation | Same as Data Cache |
| **Router Cache** | Client-side, in-memory | 30 s (dynamic) / 5 min (static) | `router.refresh()`, `revalidatePath` from Server Action |

---

## Current Patterns in the Codebase

### `force-dynamic` routes

The following routes opt out of all server-side caching — they are re-rendered on every request. This is correct because they depend on session cookies or real-time DB state:

- `app/admin/layout.tsx` — reads user session from cookies
- `app/api/analytics/**` — per-user, live aggregations
- `app/api/admin/analytics/**` — same
- `app/api/trending/route.ts` — partially: `force-dynamic` **and** `revalidate = 300` (5 min ISR)

### `revalidatePath` after Server Actions

Admin and business mutations call `revalidatePath` to purge the Full Route Cache:

```ts
// app/admin/actions/businessActions.ts
revalidatePath('/admin/businesses');
revalidatePath(`/admin/businesses/${businessId}`);
```

This is the correct pattern — call it at the end of every Server Action that mutates data.

### Static pages (build output `○`)

At build time these pages are fully static and served from CDN:
- `/home` — landing page (no user data)
- `/login`, `/signup` — public auth pages

---

## Rules by Route Type

### Public API routes (`/api/mobile/**`)

These are called by the mobile app and unauthenticated browsers.

| Route | Strategy | Why |
|---|---|---|
| `/api/mobile/businesses/nearby` | `force-dynamic` | Location-based, lat/lng params vary |
| `/api/mobile/businesses/:id` | `revalidate = 60` (1 min ISR) | Business data changes infrequently; tolerate 1-min stale |
| `/api/mobile/businesses/:id/products` | `revalidate = 60` | Same |
| `/api/mobile/businesses/:id/coupons` | `revalidate = 30` | Coupon expiry is time-sensitive |
| `/api/mobile/businesses/:id/share` | `revalidate = 300` | Share URL is stable |

> **Note:** ISR values above are targets — not all are currently implemented. Add `export const revalidate = N;` to the route file to activate.

### Protected API routes (`/api/protected/**`)

Always `force-dynamic`. These routes read a user-scoped JWT; caching would leak data across users.

```ts
export const dynamic = 'force-dynamic';
```

Never remove this from protected routes.

### Server Actions (mutations)

Always call `revalidatePath` or `revalidateTag` at the end:

```ts
import { revalidatePath } from 'next/cache';

// After updating a business
revalidatePath('/admin/businesses');
revalidatePath(`/admin/businesses/${businessId}`);
revalidatePath('/business');  // also invalidate business dashboard
```

Use `revalidateTag` when you need fine-grained control:

```ts
import { revalidateTag } from 'next/cache';
// Tag data at fetch time:
fetch(url, { next: { tags: ['business', `business-${id}`] } });
// Invalidate:
revalidateTag(`business-${id}`);
```

### Admin pages

- All admin layouts: `export const dynamic = 'force-dynamic'` — admin panels read session roles on every request.
- Admin analytics routes: `force-dynamic` — live aggregations, no stale tolerance.

### Business dashboard pages

- Role-gated, session-dependent — use `force-dynamic` on layouts.
- Individual data fetches (products, coupons, stats) can use short-lived ISR (`revalidate = 30`) if the route is already `force-dynamic` at the layout level.

---

## Supabase-Specific Notes

### Server Components

```ts
// Correct — server client, no fetch cache layer
const supabase = await createServerSupabaseClient();
const { data } = await supabase.from('businesses').select('*');
```

Supabase queries bypass the Next.js Data Cache by default (they use the Node.js fetch under the hood without a `cache` option). This means **all Supabase reads in Server Components are live unless you explicitly wrap them**.

To cache a Supabase query, use `unstable_cache`:

```ts
import { unstable_cache } from 'next/cache';

const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createBearerClient();
    const { data } = await supabase.from('business_types').select('*');
    return data;
  },
  ['business-types'],
  { revalidate: 3600, tags: ['business-types'] },
);
```

Only use `unstable_cache` for **reference data** (categories, business types, subscription plans) that rarely changes.

### RLS implications

Never cache queries that use Row Level Security across different users. If the query returns user-specific rows (filtered by `auth.uid()`), the cache entry belongs only to one user — but Next.js does not scope the Data Cache per user automatically. Use `force-dynamic` for all user-scoped queries.

---

## Form / Client-Side Caching

### Multi-step registration form

The business registration form (`app/business-registration/`) uses React context (`MultiStepFormProvider`) as the ephemeral client-side cache. All form state lives in the context for the duration of the session.

- Do **not** persist partial registration to `localStorage` — the form is short enough to complete in one session.
- On successful submission the context is discarded and the user is redirected.

### Zustand stores

Zustand stores act as an in-memory client-side cache for UI state (filters, selected branch, open panels). They reset on page refresh — this is intentional.

- Do not persist Zustand state to `localStorage` unless the feature explicitly requires offline-capable state (none currently do).

---

## What NOT to Cache

| Scenario | Why |
|---|---|
| Protected routes / RLS queries | Risk of cross-user data leakage |
| Auth session checks (`getUser`, `getSession`) | Must be fresh on every request |
| Admin analytics | Needs real-time accuracy |
| Coupon redemption / expiry checks | Time-critical, must reflect DB truth |
| Any query that reads `cookies()` or `headers()` | Opts the route into dynamic rendering automatically |

---

## Adding ISR to a New Route

1. Add `export const revalidate = N;` at the top of the route file (seconds).
2. Ensure the route does **not** call `cookies()` or `headers()` (that disables ISR silently).
3. If the route returns user-specific data, use `force-dynamic` instead.
4. Add a Server Action that calls `revalidatePath` or `revalidateTag` when the underlying data changes.
5. Verify in `npm run build` output — the route should change from `ƒ` (dynamic) to `○` (static) or include an ISR interval marker.
