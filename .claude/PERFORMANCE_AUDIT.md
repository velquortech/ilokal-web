# PERFORMANCE AUDIT — DB + Server Side

> Investigation date: 2026-07-17. Static analysis of query layer (`lib/api/**`),
> API routes (`app/api/**`), and migrations (`supabase/migrations/**`). Schema
> items are HIGH-risk and need human approval + `make migrate-up` before merge.
>
> **IMPLEMENTATION STATUS (branch `perf/security-hardening`, 2026-07-17):**
> - ✅ **Done:** Phase 1 perf indexes (P2/P4/P5 — migration
>   `20260717000000`); P8 correctness (`is_active`→`status`, phantom `page_views`
>   → `view_events`); **SEC-1** privilege-escalation trigger (migration
>   `20260717000001`); **P1** RLS auth-wrapper (migration `20260717000002`);
>   SEC-5 error leakage on `business-types`/`business-categories`/`ratings`/
>   `signup`; **SEC-8** auth-route rate limiting
>   (`app/api/helpers/auth-rate-limit.ts`, wired into login/signup/reset);
>   **P3 (partial)** analytics RPCs (migration `20260717000003`) — coupon-stats +
>   traffic aggregation moved to SQL (`getCouponStats`/`getCouponPerformance`/
>   `getTrafficMetrics` rewired). 1305 tests + build green.
> - ⚠️ **`getProductPerformance` is NON-FUNCTIONAL** — selects `payments.product_id`
>   which doesn't exist (payments aren't product-linked); always returns []. Needs a
>   schema decision, flagged in code. Not an RPC-able fix.
> - ✅ **P7 done:** `getBusinessDashboard` + `getBusinessRevenue` independent reads
>   parallelized with `Promise.all`. **P11 resolved N/A** (PostgREST HTTP, no direct
>   `pg` — not a pooler problem).
> - ✅ **P3 COMPLETE (2026-07-17):** migration `20260717072717_analytics_engagement_rpcs.sql`
>   adds `analytics_retention_months` / `analytics_monthly_trend` /
>   `analytics_follower_funnel` / `analytics_customer_segments` /
>   `analytics_rating_summary` (all SECURITY DEFINER, pinned search_path,
>   service_role-only). `getRetentionData`/`getMonthlyTrend`/`getFollowerFunnel`/
>   `getCustomerSegments` rewired to RPCs; `getBusinessHealthIndicators` now uses
>   the trend + rating-summary RPCs instead of fetch-all follows/ratings (and its
>   active-deals count gained `head:true`). Applied + smoke-tested on local DB.
>   Only remaining JS aggregation: `getBusinessRevenue`'s monthly bucket (small
>   6-month window; fine) and `getProductPerformance` (blocked on schema decision).
> - ✅ **SEC-7 done (2026-07-17):** `upload/[bucket]/[id]` DELETE rejects
>   traversal-shaped / non-UUID-rooted paths (400) before any storage call.
>   Bonus authz fix found during it: the `avatars` bucket had NO ownership check —
>   any authenticated user could delete anyone's avatar by path; now owner-or-admin
>   only. Tests: `app/api/web/upload/__tests__/delete-path-guards.test.ts` (+6).
> - ✅ **Migrations applied + verified locally (2026-07-17):** `make migrate-up` +
>   `make generate-types` run; `pg_policies` shows 0 bare `auth.uid()`/`auth.role()`
>   (P1); SEC-1 red-teamed in SQL (non-admin self-`role='admin'`/`status` update is
>   a no-op, `full_name` update still works); perf indexes + analytics RPCs present;
>   only PostGIS internals lack pinned `search_path` (S4 confirmed clean).
> - ⚠️ **P3 (page_views index) dropped** — that table doesn't exist; the real
>   `view_events` is already indexed. No index needed once `getTrafficMetrics`
>   fix (done) lands.
> - ⚠️ **S4 (definer search_path) — mostly a false positive:** the live
>   `nearby_businesses` (migration `20260614`) already sets `search_path`; the
>   older defs it supersedes are dead. No migration written. Verify with
>   `get_advisors` after deploy.
> - ✅ **P1 done (written, not applied):** migration
>   `20260717000002_wrap_rls_auth_initplan.sql` — catalog-driven `DO` block wraps
>   every bare `auth.uid()`/`auth.role()` (106 + 20 occurrences) in `(select ...)`
>   across `public` + `storage` policies via `ALTER POLICY`. Idempotent,
>   per-policy exception-isolated. **Not verifiable in this env** (no docker /
>   Supabase CLI) — apply with `make migrate-up`, then confirm with
>   `get_advisors` (0 `auth_rls_initplan` warnings) + spot-check `pg_policies`.
> - ✅ **P9 done (2026-07-17):** audited all 69 `count:'exact'` sites. Fixed the
>   wasteful ones: `lib/api/admin/analyticsQuery.ts` count-only reads now
>   `head:true` + parallelized (`Promise.all`), dropped pointless `count:'exact'`
>   from its `sum()` reads, and admin `plans/[planId]` DELETE's active-subs check
>   is head-only. **Also fixed P8-class phantom columns there:**
>   `businesses.is_active`/`is_suspended` don't exist — active/suspended business
>   counts always returned 0; now `status='verified' AND archived_at IS NULL` /
>   `status='suspended'`. Kept `count:'exact'` (deliberately) on: paginated lists
>   (count piggybacks on the data query; sets are owner/user-scoped or
>   admin-small, and planned/estimated would break pagination totals),
>   update/delete row-count checks, and `has_more` on the nearby RPC (planned
>   stats don't apply to function scans).
> - ✅ **P13 done (2026-07-17):** migration `20260717075244_profiles_search_trgm.sql`
>   adds `gin_trgm_ops` on `profiles.full_name` + `profiles.email` — the admin
>   user search was the only remaining *global* leading-wildcard `ilike` without
>   an index. All other `ilike` sites are business-scoped behind an indexed
>   equality (tiny sets), filter the `nearby_businesses` RPC output (function
>   scan — table index can't apply), or already indexed (`shop_name`,
>   `coupons.description`).
> - 🔴 **MAJOR discovery (found during P9/P13, needs product/schema decisions):
>   three whole query modules target schema that doesn't exist** — every function
>   errors at runtime and returns empty results (same class as the `page_views`
>   bug). All flagged NON-FUNCTIONAL in code headers, left intact to preserve
>   response contracts:
>   - `lib/api/search/searchQuery.ts` — queries `profiles` with `role='business'`
>     (0 rows possible) + phantom columns (`name`/`category`/`average_rating`/…)
>     and a nonexistent `featured_deals` table. Kills `/api/web/search`,
>     `/api/web/trending`, `searchActions`.
>   - `lib/api/reviews/reviewQuery.ts` — queries a nonexistent `reviews` table
>     (real: `ratings`/`business_ratings`). Kills `/api/web/reviews/*`.
>   - `lib/api/subscriptions/subscriptionQuery.ts` — queries nonexistent
>     `subscriptions` (renamed to `follows`; billing = `business_subscriptions`),
>     `payment_methods`, `billing_invoices`, and `profiles.business_id`. Kills
>     `/api/web/billing/*`, `/api/web/subscriptions/*`, `billingActions`. Only
>     the `subscription_plans` reads work.
> - ⬜ **Still open:** SEC-4 (review-abuse gate — HIGH-risk write-path change,
>   needs human approval), `getProductPerformance` schema decision, and the three
>   NON-FUNCTIONAL modules above (rewrite against real schema or delete the
>   surfaces — product decision).

## TL;DR — why requests are slow

Four compounding root causes, roughly in impact order:

1. **RLS re-evaluates `auth.uid()` per row** — 102 of 138 policies call bare
   `auth.uid()` / `auth.role()`, **zero** use the `(select auth.uid())` wrapper.
   Postgres treats bare `auth.uid()` as volatile and re-runs it for **every row
   scanned**. On any authenticated query this multiplies cost by row count. This
   is Supabase's single most documented perf killer and it is unfixed across the
   whole schema.
2. **Missing indexes on hot filter/FK columns** — `payments`, `page_views`,
   `business_ratings`, and `user_redemptions.coupon_id`/`redeemed_at` have no
   supporting index. Postgres does **not** auto-index foreign keys. Every
   analytics query full-scans these tables, and RLS `EXISTS(... businesses ...)`
   subqueries scan `businesses` per row on top.
3. **Fetch-all-then-aggregate-in-JS across the entire analytics layer** — ~10
   functions pull whole tables into Node and reduce with `Map`/`Set`. Two
   failures at once: (a) PostgREST caps at `max_rows = 1000`, so every aggregate
   **silently truncates and returns wrong numbers** past 1000 rows; (b) it ships
   large row sets over the wire and burns function CPU/memory.
4. **Serialized round trips + no caching** — the dashboard does 5 sequential
   `await`s; other analytics endpoints each build their own service-role client
   and run queries serially. 30 routes are `force-dynamic` with no revalidate.

---

## PARITY TABLE — current vs. target

| # | Area | Current state | Target state | Risk | Effort |
|---|------|---------------|--------------|------|--------|
| P1 | RLS auth funcs | 102 bare `auth.uid()`/`auth.role()` calls, 0 wrapped | All wrapped `(select auth.uid())` so the planner runs them once (initPlan) | HIGH (auth) | M |
| P2 | `payments` indexes | none (only PK) | `(business_id, status, created_at)` composite + `(status)` | HIGH | S |
| P3 | `page_views` indexes | none | `(business_id, created_at DESC)`, `(business_id, visitor_id)` | HIGH | S |
| P4 | `user_redemptions` indexes | only `UNIQUE(code)` | `(coupon_id)`, `(coupon_id, redeemed_at)`, `(branch_id)` | HIGH | S |
| P5 | `business_ratings` index | none | `(business_id)` | HIGH | S |
| P6 | Analytics aggregation | fetch-all → JS reduce (10 fns), truncates at 1000 rows | SQL aggregate RPCs (SECURITY DEFINER), same pattern as `mobile_deals` | HIGH | L |
| P7 | Dashboard orchestration | 5 sequential awaits; per-fn client build | one RPC or `Promise.all`; reuse one client | MED | M |
| P8 | `getBusinessDashboard` correctness | filters `.eq('is_active', true)` — column does not exist on `products` (`status`/`is_available` only); `active_products` is always 0 and query is wasted | filter `.eq('status','active')`, or fold into RPC | LOW | S |
| P9 | `count: 'exact'` | 69 uses; exact count = full scan | `head: true` + `count: 'planned'`/`'estimated'` on large tables; keep exact only where small/needed | MED | M |
| P10 | Route caching | **DONE (public mobile reads).** `mobile/business-types` → `unstable_cache` 5min (error-safe); `mobile/businesses/[businessId]` → `revalidate` 120s; `.../coupons` → `revalidate` 60s. Skipped (correctly): web routes (cookie client forces dynamic), `searchParams` routes (categories/products/nearby/deals — dynamic, low hit rate), `share` (reads headers) | done | ✅ | — |
| P11 | Connection pooling | ~~verify transaction pooler~~ **RESOLVED — N/A.** All runtime clients use `@supabase/ssr` → the PostgREST HTTP API, not direct Postgres. Zero `pg`/`SUPABASE_DB_URL` use at runtime (only migrations/seeds). PostgREST owns its own server-side pool | no change needed | — | — |
| P12 | Nested-await `.in()` | `getCouponStats` awaits coupon-ids inside `.in()` (serial) | fold both into one RPC or parallel-fetch | LOW | S |
| P13 | Trigram search | `ilike('%..%')` on `shop_name` (trgm gin index exists ✓); confirm products/other search columns have gin_trgm too | every leading-wildcard `ilike` backed by `gin_trgm_ops` | LOW | S |

---

## ACTION ITEMS (prioritized)

### Phase 1 — Indexes (biggest win / lowest risk). One migration.
`make migrate-new name=perf_indexes`, build with `CREATE INDEX CONCURRENTLY` where
possible (note: `CONCURRENTLY` can't run in a txn/migration block — may need a
separate non-transactional migration or manual apply on cloud).

```sql
-- payments: analytics filters business_id + status + created_at range
CREATE INDEX IF NOT EXISTS idx_payments_business_status_created
  ON public.payments (business_id, status, created_at DESC);

-- page_views: traffic metrics filter business_id + created_at, count distinct visitor
CREATE INDEX IF NOT EXISTS idx_page_views_business_created
  ON public.page_views (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_business_visitor
  ON public.page_views (business_id, visitor_id);

-- user_redemptions: every analytics fn filters .in('coupon_id', ...) (FK, unindexed)
CREATE INDEX IF NOT EXISTS idx_user_redemptions_coupon_redeemed
  ON public.user_redemptions (coupon_id, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_user_redemptions_branch
  ON public.user_redemptions (branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_redemptions_user
  ON public.user_redemptions (user_id);

-- business_ratings: health indicators filter business_id
CREATE INDEX IF NOT EXISTS idx_business_ratings_business
  ON public.business_ratings (business_id);
```
Acceptance: `EXPLAIN ANALYZE` on each analytics query shows Index Scan, not Seq
Scan; p95 dashboard latency drops. **Rollback:** `DROP INDEX` (indexes are safe,
non-breaking; no data change).

### Phase 2 — Wrap `auth.uid()` in every policy. One migration.
Replace bare `auth.uid()` → `(select auth.uid())` (and `auth.role()` →
`(select auth.role())`) in all 138 policies. Postgres caches the result as an
initPlan and evaluates once per query instead of once per row.

- Do it by `DROP POLICY` + `CREATE POLICY` per policy in a single migration (or
  script the rewrite). Keep the USING/WITH CHECK logic byte-for-byte identical
  except the wrapper — **behaviour must not change, only the plan**.
- Also review the 12 `EXISTS(SELECT 1 FROM businesses WHERE owner_id = auth.uid())`
  ownership policies (e.g. `payments`): once P2 index lands the subquery is cheap,
  but the wrapper still matters.

Acceptance: `EXPLAIN` shows `InitPlan` for the auth call, no per-row re-eval;
Supabase `get_advisors` (performance lint) reports 0 `auth_rls_initplan`
warnings. **Rollback:** revert migration (policies restored verbatim). **Risk:**
HIGH — auth surface; test every role path (`yarn test:run` + manual RLS spot
checks) before merge. Human approval required.

**STATUS: DONE** — implemented catalog-driven (rewrites the live policy set, not
the historical files) in `20260717000002_wrap_rls_auth_initplan.sql`. Not yet
applied/verified (no local stack in the impl env). After `make migrate-up`:
verify `SELECT count(*) FROM pg_policies WHERE schemaname='public' AND qual ~*
'(?<!select\s)auth\.'` behaviour via `get_advisors`, and smoke-test admin + owner
+ mobile-user paths (nothing should 403 that didn't before).

### Phase 3 — Push analytics aggregation into SQL RPCs.
The whole `lib/api/analytics/businessAnalyticsQuery.ts` is fetch-all-then-reduce.
Rewrite as SECURITY DEFINER RPCs returning finished aggregates (precedent:
`mobile_deals`, `get_follower_counts`). Priority order by cost:

1. `getProductPerformance`, `getCouponStats`, `getCouponPerformance` — `GROUP BY`
   + `count`/`sum` in SQL, not `Map` in Node.
2. `getTrafficMetrics` — `count(*)` + `count(DISTINCT visitor_id)` in SQL (today
   it fetches every `visitor_id` row to `Set`-dedupe — truncates at 1000).
3. `getRetentionData`, `getMonthlyTrend`, `getFollowerFunnel`,
   `getCustomerSegments` — `date_trunc('month', ...)` bucketing + RFM logic in SQL.
4. `getBusinessRevenue` — `sum(amount) ... GROUP BY date_trunc('month')`.

Each RPC: `GRANT EXECUTE` to `authenticated`, authorize caller as business owner
(or admin) inside the function, filter `status='succeeded'`/`archived_at IS NULL`
as the JS did. Fixes both the **1000-row silent-truncation correctness bug** and
the latency. Acceptance: numbers match a hand-run SQL aggregate on seed data;
no client-side `Map`/`Set` reduction remains. **Risk:** HIGH (new SQL surface).

### Phase 4 — Orchestration + correctness quick wins.
- **P8:** fix `getBusinessDashboard` — `is_active` → `status = 'active'` (or fold
  into an RPC). Restores `active_products`. Ships today, no migration.
- **P7:** batch the dashboard's independent counts with `Promise.all`; build the
  service-role client **once** and pass it down instead of `await
  createAnalyticsSupabaseClient()` in every function.
- **P12:** `getCouponStats` — drop the nested-await `.in()`; use the RPC from P3.

### Phase 5 — count() + caching.
- **P9:** audit the 69 `count: 'exact'`. For pagination totals on large tables use
  `{ count: 'planned' }` or `{ count: 'estimated' }`; add `head: true` when only
  the count is needed (skips row payload). Keep exact only on small/owner-scoped
  sets.
- **P10: DONE for public mobile reads.** `mobile/business-types` wrapped in
  `unstable_cache` (5 min, throws-on-error so a transient DB failure is never
  cached); `mobile/businesses/[businessId]` (120s) and `.../coupons` (60s) use a
  route-level `revalidate` (on-demand ISR — dynamic segment, so no build-time
  prerender). **Not cached:** any route using the cookie-based
  `createServerSupabaseClient` (`cookies()` forces dynamic), `searchParams`-driven
  routes (categories/products/nearby/deals — dynamic + low cache-hit rate), and
  `share` (reads request headers via `resolveAppBaseUrl`). **Tag invalidation not
  wired** — Next 16's `revalidateTag(tag, profile)` requires a Cache-Components
  profile arg incompatible with the legacy `unstable_cache` tag flow; the short
  time-based windows make admin edits appear within ≤5 min without it. Analytics
  dashboard caching left for later (owner-scoped; needs per-business keying).

### Phase 6 — Infra: connection pooling. **RESOLVED — not the problem.**
- **P11:** Investigated `supabase/server.ts` + grepped the codebase. Every runtime
  Supabase client (session, analytics service-role, admin) is built with
  `@supabase/ssr` `createServerClient(NEXT_PUBLIC_SUPABASE_URL, key)` — it talks to
  Supabase over the **PostgREST HTTP API**, not a direct Postgres socket. There are
  **zero** `pg`/`postgres()`/`SUPABASE_DB_URL` uses at runtime (only migrations +
  seeds open a direct connection). PostgREST manages its own DB pool server-side, so
  there is no per-invocation Postgres handshake to pool away. **No change needed.**
- **What actually makes "every request slow"** (now that P11 is ruled out), in order:
  (1) the RLS per-row `auth.uid()` re-eval — **fixed (P1)**; (2) missing indexes on
  the analytics tables — **fixed (P2/P4/P5)**; (3) fetch-all-then-reduce shipping big
  rowsets — **partly fixed (P3)**; (4) the analytics *page* fans out to 5 separate
  HTTP endpoints (coupons/dashboard/products/revenue/traffic), each doing several
  PostgREST round trips — the remaining lever is **fewer round trips** (consolidate
  into RPCs / one endpoint) + **caching (P10)**, not connection pooling.

---

## How to measure (do this before + after each phase)

1. **Supabase advisors:** run the performance + security advisor (`get_advisors`
   via MCP, or dashboard → Advisors). It flags `auth_rls_initplan`,
   `unindexed_foreign_keys`, `multiple_permissive_policies` directly — it will
   confirm P1/P2/P4 automatically.
2. **`EXPLAIN (ANALYZE, BUFFERS)`** on the dashboard queries; watch Seq Scan →
   Index Scan and total time.
3. **`pg_stat_statements`** — sort by `total_exec_time` to find the real top-N
   slow queries in production (ground-truth over this static analysis).
4. Vercel function duration / p95 per route before vs. after.

## Notes / gotchas already in the codebase
- PostgREST `max_rows = 1000` (`supabase/config.toml`) is the truncation cap that
  makes the fetch-all analytics both slow **and wrong** — see `mobile-api.md`
  pagination rule.
- FK columns are **not** auto-indexed by Postgres — that's why P2/P4 exist despite
  the FKs being declared.
- Precedent for the RPC approach: `mobile_deals`, `increment_coupon_redemptions`,
  `get_follower_counts`, `nearby_businesses` — all SECURITY DEFINER aggregates.

---
---

# SECURITY AUDIT — DB + Request Surface

> Scan date: 2026-07-17. Static analysis of RLS policies, service-role usage,
> SECURITY DEFINER functions, storage buckets, auth surface, and error handling.
> Ordered by worst-case impact. Fixes here are correctness/authz — none degrades
> performance (S1 actually *improves* it, since it pairs with P1's `(select ...)`
> wrapper).

## TL;DR — worst-case issues

1. **Privilege escalation via `profiles` self-update (CRITICAL).** Any
   authenticated user can promote themselves to `admin`.
2. **`ratings` world-readable + write-open review spam vectors.**
3. **SECURITY DEFINER functions with no `search_path` (4)** — search_path
   hijack surface on definer-privilege functions.
4. **Raw Supabase `error.message` leaked to clients on ~20 routes** — exposes
   table/column/constraint names.
5. **Service-role client fan-out in the query layer** — 20+ call sites bypass
   RLS; blast radius if any is reachable without a prior ownership check.

---

## SECURITY PARITY TABLE

| # | Area | Current state | Target state | Severity | Effort |
|---|------|---------------|--------------|----------|--------|
| S1 | `profiles` UPDATE | `USING (auth.uid()=id) WITH CHECK (auth.uid()=id)` — **no column guard**. User can `update profiles set role='admin' where id=me` straight through PostgREST with anon key + own JWT | Block self-changes to `role`/`status`/`archived_at` via BEFORE UPDATE trigger (or column-level `REVOKE UPDATE (role,status,archived_at)` from `authenticated` + admin-only path) | **CRITICAL** | S |
| S2 | `ratings` SELECT | `USING (true)` — world-readable incl. anon (`20260401`) | Scope to what mobile actually needs; if reviews are public keep read but confirm no PII columns (user_id exposure) | HIGH | S |
| S3 | `ratings`/`business_ratings` INSERT | `FOR ALL USING own` — user can spam/forge reviews for products never purchased | Gate insert on a real interaction (redemption/purchase exists), or rate-limit + moderation | HIGH | M |
| S4 | SECURITY DEFINER `search_path` | 4 funcs missing `SET search_path` (`nearby_businesses*` ×3, `fix_admin_policy_consistency`) | Add `SET search_path = public, pg_temp` to every SECURITY DEFINER function | HIGH | S |
| S5 | Error leakage | ~20 routes return raw `error.message` (`business-categories`, `business-types`, `upload/*`, `ratings`, admin `businesses`) | Route 500s through `loggedServerError`; only hand-written 4xx get message text (CLAUDE.md rule already exists — unenforced here) | MED | M |
| S6 | Service-role blast radius | `createAnalyticsSupabaseClient`/`createServerAdminClient` used in 20+ query-layer sites (analytics, couponQuery, settingsActions, businessReviewActions) — all RLS-bypassing | Confirm **every** caller does an ownership/role check *before* the service-role query (analytics routes do; audit couponQuery + actions). Prefer RLS-scoped client where aggregate isn't needed | HIGH | M |
| S7 | Storage delete authz | `upload/[bucket]/[id]` DELETE trusts `filePath.split('/')[0]` as business id; ownership checked ✓ but leaks `deleteError.message` (S5) and no path-traversal guard on `decodeURIComponent(id)` | Validate first segment is a UUID; keep the ownership check; generic error | MED | S |
| S8 | Auth rate limiting | Mobile surface rate-limited in proxy ✓; **`/api/auth/*` (login/signup/reset) NOT rate-limited** — credential stuffing / reset spam | Add IP+account rate limit to auth routes (per `auth-rate-limits.md`, currently aspirational) | HIGH | M |
| S9 | RLS `auth.uid() IN (SELECT ... profiles)` recursion/cost | Some admin policies still use the subquery form vs the `is_admin()` helper | Standardize on `is_admin()` (SECURITY DEFINER, already exists) everywhere; wrap per S1/P1 | MED | S |
| S10 | Storage public buckets | `avatars`, `product-images`, `shop-logos`, `interior-images`, `shop-banners`, `business-logos/interior`, `branch-images` are **public read** | Confirm intentional (these are display assets — likely fine). Verify **no** doc bucket flipped public: `verification-docs`, `business-docs`, `branch-documents` all `false` ✓ | LOW | S |
| S11 | Auth callback redirect | `callback/route.ts` redirects by role to fixed `ROUTES.*` (no user-controlled `next` param) ✓ | No open-redirect. Keep it that way — never echo a `?next=`/`?redirect=` param without allowlisting | LOW (verify) | S |

---

## SECURITY ACTION ITEMS (prioritized)

### SEC-1 — Close the `profiles` privilege-escalation hole (S1). **Do first.**
The self-update policy has no column guard. Attacker with a normal account + the
public anon key can call PostgREST directly:
`PATCH /rest/v1/profiles?id=eq.<me>` body `{"role":"admin"}` — RLS `WITH CHECK
(auth.uid()=id)` passes, row updates, `sync_role_to_jwt` trigger then mints an
admin JWT on next refresh. Full account takeover of the admin surface.

Fix (one migration, HIGH-risk auth — human approval):
```sql
CREATE OR REPLACE FUNCTION public.prevent_profile_self_privilege()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF (select auth.uid()) = NEW.id AND NOT public.is_admin() THEN
    IF NEW.role       IS DISTINCT FROM OLD.role       THEN NEW.role       := OLD.role;       END IF;
    IF NEW.status     IS DISTINCT FROM OLD.status     THEN NEW.status     := OLD.status;     END IF;
    IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN NEW.archived_at := OLD.archived_at; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_prevent_profile_self_privilege
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_privilege();
```
(Silently reverts protected columns for non-admin self-updates; the mobile/web
`/me` PATCH paths only touch `full_name`/`phone`/`avatar`, so they're unaffected.
The archive/deactivate flows go through admin/service paths or need an explicit
allowance.) **Acceptance:** direct PostgREST `role='admin'` self-update is a no-op;
`/me` PATCH still works; account deactivate/reactivate still work. Add a test that
asserts a non-admin cannot elevate `role`.

### SEC-2 — Add `SET search_path` to the 4 definer functions (S4).
`nearby_businesses` (×3 variants) + `fix_admin_policy_consistency`. Without it, a
role that can create objects in a schema on the `search_path` could shadow a
function/table the definer calls and run code as the definer. One migration,
`CREATE OR REPLACE ... SET search_path = public, pg_temp`. Low risk (behaviour
identical), high value.

### SEC-3 — Stop leaking raw driver errors (S5, S7). **STATUS: DONE.**
Genericized every response that forwarded a Supabase/driver `error.message` and
added `console.error` server-side logging: `business-types`, `business-categories`,
`ratings` (both GET+POST), `signup`, `upload/[bucket]/[id]` (delete + catch),
`upload/verification-docs`, `admin/profiles`, `admin/subscriptions/plans` (GET+POST),
and the admin `businesses` catch-block family (list, `[id]` GET/PUT/DELETE, verify,
suspend, delete, reject). **Intentionally left** (verified safe): `ImageProcessingError`
messages (hand-thrown, user-facing 4xx in the upload routes + mobile avatar) and the
Zod validation branch in `admin/businesses/[id]` PUT (`Invalid input: …`). Raw
`error.message` in a client response now returns 0 outside those safe cases.

### SEC-4 — Review/redemption abuse gate (S3).
`ratings`/`business_ratings` accept inserts from any authenticated user for any
product/business. Add a WITH CHECK that a `user_redemptions`/interaction row
exists for that user+business, or move review creation behind a server action
that verifies it. Prevents review-bombing and fake-praise. HIGH-risk (changes
write path) — approval needed.

### SEC-5 — Auth-route rate limiting (S8). **STATUS: DONE.**
Implemented in `app/api/helpers/auth-rate-limit.ts` (`checkAuthRateLimit`) — per-IP
(30/60s) + per-account (8/300s) budgets, env-tunable, wired into
login/signup/reset. Original note below.

`auth-rate-limits.md` documents this as aspirational; it is **not implemented**
for `/api/auth/*`. Reuse `app/api/helpers/rateLimit.ts` (already powering the
mobile surface) keyed on IP + email for login/signup/reset. Note the in-memory
limiter is per-instance — fine as a baseline, swap for Upstash/KV for a real
distributed quota.

### SEC-6 — Audit service-role callers for a pre-check (S6). **STATUS: DONE — all gated.**
Enumerated every `createServerAdminClient`/`createAnalyticsSupabaseClient` caller;
each runs an ownership/role gate *before* the RLS-bypassing query, and the
business/coupon id passed in is **server-derived, not client-supplied**:
- Analytics routes → `getUserBusiness` + `business_id` match ✓.
- `couponQuery` (466/611) → callers `getRedeemedCouponsAction` /
  `getRedemptionSummaryStatsAction` gate `verifyBusinessOwner()` then pass
  `verify.business!.id` (own business) ✓.
- `getRedemptionStats(id)` route → `verifyBusinessOwner()` + explicit
  `coupon.business_id === verify.business!.id` 403 check before the call ✓.
- `settingsActions.ts` self-delete → `verifyBusinessOwner()` + password re-auth,
  deletes only `verify.user!.id` ✓.
- `businessReviewActions.ts` → `verifyCurrentUserIsAdmin()` before the client ✓.
No unguarded service-role path found. **Bonus:** this pass caught + fixed raw
driver-error leaks in the *server actions* (settingsActions, admin/business
branchActions, subscriptionPlanActions) that the earlier `app/api`-only SEC-5
sweep missed — GoTrue auth messages (password/email/MFA) intentionally kept
(user-facing, no DB-schema leak).

### SEC-7 — Path-traversal hardening on storage delete (S7). **STATUS: DONE.**
Implemented: the decoded path is rejected (400) if any segment is empty/`.`/`..`
or the first segment isn't a UUID, before any ownership/storage call. Storage
failures already returned a generic message (SEC-3). **Bonus fix:** the
`avatars` bucket had no ownership check at all — any authenticated user could
delete anyone's avatar; now the first path segment must equal the caller's user
id (or caller is admin). Covered by
`app/api/web/upload/__tests__/delete-path-guards.test.ts`.

---

## Security measurement / verification
- **Supabase `get_advisors` (security lint)** flags: `security_definer_*`,
  `function_search_path_mutable` (confirms S4), `rls_disabled_in_public`,
  `policy_exists_rls_disabled`. Run it — it auto-confirms S4 and any table with
  RLS off.
- **Manual RLS red-team:** with a normal user's JWT + the public anon key, hit
  PostgREST directly and attempt: self-`role='admin'` (S1), read other users'
  `profiles`, insert a rating without a redemption (S3). Each must fail.
- Grep gate in CI: fail the build if a new `route.ts` returns raw
  `error.message` on a 5xx (enforces S5 going forward).