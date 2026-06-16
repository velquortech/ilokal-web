# Changelog

## 2026-06-16 — Dev accounts pinned to `ilokal@dev` across re-seeds (mvp)

> No schema migration. Seed/script/docs only. **Security note:** the 3 sanctioned
> dev accounts now intentionally keep the in-git `ilokal@dev` password on cloud —
> use a hand-set dashboard password for any preview that must not ship a known cred.

- **Root cause:** `cloud-lockdown.sql` step 3 rotated `admin@/owner@/testuser@ilokal.dev`
  to `$SEED_DEV_PASSWORD` when set, and `users.sql`'s `ON CONFLICT DO UPDATE` never
  reset `encrypted_password`/`banned_until` — so a re-seed silently left those three
  on the rotated (or any stale) password and `ilokal@dev` stopped working on cloud.
- **Fix:** `users.sql` upsert now restores `encrypted_password = crypt('ilokal@dev', …)`,
  clears `banned_until`, and re-confirms email for the three sanctioned IDs on every
  run — they are deterministically loginable with `ilokal@dev`. Removed the password-
  rotation block (step 3) from `cloud-lockdown.sql` and the `SEED_DEV_PASSWORD`
  forwarding from the `seed-cloud` Make target, `cloud-clean-replace.sh`, and README.
  The ~150 sample/follower accounts stay banned + password-nulled (unchanged).

## 2026-06-16 — Cloud-portable seeds + APK-preview deploy flow (mvp)

> No schema migration. Edits are to seed SQL, the storage seed script, and the
> Makefile. The **cloud login lockdown is a security control** — review before
> first cloud seed.

- **Cloud-portable image URLs:** the seed SQL (`users.sql`, `businesses.sql`,
  `products.sql`) stored hardcoded `http://127.0.0.1:54321/...` storage URLs, which
  `resolveStorageUrl()` returns verbatim → broken images in the APK against a cloud
  DB. Converted all 156 to **raw in-bucket paths** (e.g. `<id>/logo.jpg`), matching how
  real registrations store data, so the same seed resolves correctly local **and** cloud.
  Verified each column's bucket matches its read-route resolver (avatars / shop-logos /
  interior-images / product-images).
- **Storage seed → cloud:** `seed-storage.sh` now reads `SUPABASE_SERVICE_ROLE_KEY`
  (falls back to the well-known local dev JWT) and **refuses to upload to a non-local URL
  with the local key**.
- **Login lockdown (`supabase/seeds/cloud-lockdown.sql`, new):** the seeds ship ~150
  sample auth accounts (60 `@test.local` / `sample123`, 90 `follower%@ilokal.dev`) with
  passwords baked into git. On cloud only **admin@ / owner@ / testuser@ilokal.dev** may
  sign in — the rest get `banned_until = 2999` **and** `encrypted_password = NULL` (rows
  kept for FK integrity). Real sign-ups created after seeding are untouched. Optional
  `-v dev_password=…` rotates the 3 dev accounts off the in-git password. Idempotent;
  verified live in a rolled-back tx (150 locked, 3 kept loginable).
- **follows.sql fixture fix:** the 90 follower accounts claimed "login disabled" but
  actually had the `ilokal@dev` password → now created with `NULL` password, genuinely
  un-loginable everywhere (local too).
- **subscription_plans.sql idempotency:** was a plain `INSERT` with no `ON CONFLICT`;
  `name` has no UNIQUE constraint and `id` is random, so every re-run added 4 DUPLICATE
  plans (breaking plan selection + the promo-boost deals feed). Rewrote as
  `INSERT … SELECT … WHERE NOT EXISTS (… by name)` with an explicit `::plan_interval`
  cast. Now the only non-`ON CONFLICT` seed besides `view_counts.sql` (deterministic
  `UPDATE`s) — so the whole `seed-cloud` run is safe to repeat. Verified live: 0→4 on a
  fresh DB, 0 inserts on re-run.
- **Makefile cloud targets:** `migrate-cloud` (`supabase db push --db-url … --include-all
  --yes`), `seed-cloud` (seeds + lockdown + storage), and `deploy-cloud` (= migrate then
  seed). All guard required env vars and **refuse to run against a local URL**. Local
  `make seed` is unchanged — the 60 test logins stay usable locally for dashboard testing.

## 2026-06-10 — Coupon-redemption notifications (feat/business-document-page)

> **HIGH-risk schema migration** `20260610000000_coupon_redeemed_notification.sql`
> — applied locally via `make migrate-up` + `make generate-types`; needs human
> approval before merge.

- **Schema:** widened the `notifications` type CHECK to add `'coupon_redeemed'` and
  added a SECURITY DEFINER RPC `notify_coupon_redemption(p_redemption_id)`. The RPC
  authorizes the caller as the **owner of the redemption row** (the existing
  `create_notification` RPC only allows admin/self, so it couldn't be reused —
  caller = customer, recipient = business owner), then inserts a notification for
  the `businesses.owner_id` naming the customer, the coupon (code/description), and
  the branch. Wrapped in `EXCEPTION WHEN OTHERS → RETURN NULL` so a notification
  failure can never roll back a redemption.
- **Mobile redeem route:** `POST /api/protected/mobile/redemptions` now calls the
  RPC after a successful insert + counter increment, non-fatal (logs on error) —
  matching the existing emit-after-mutation pattern.
- **Notification bell:** added `coupon_redeemed` to the icon/tone maps
  (`BadgePercent`/`text-primary`) and made those rows **deep-link** on click — mark
  read, then navigate to the business's Redeemed Coupons page
  (`businessRedeemedCouponsPath`, new helper in `config/routeConfig.ts`) via
  `notification.business_id`. (Per product decision: open the page, no pre-applied
  per-customer filter.)
- **Types/validation:** added `'coupon_redeemed'` to `NotificationType` +
  `NOTIFICATION_TYPES` + `notificationTypeSchema`, and the `redeemer_*`/`coupon_code`/
  `branch_*` keys to `NotificationMetadata`. Regenerated `lib/types/database.ts`.
- **Tests (+7):** redeem-route integration (RPC called with the new redemption id;
  non-fatal on RPC error), validation accepts `coupon_redeemed`,
  `businessRedeemedCouponsPath` shape, and `notificationHref` deep-link logic.
  Verified: lint + **1262** tests + build all green.

## 2026-06-09 — Business document review + notifications (feat/admin-rework)

> Plan in `.claude/DOCS_NOTIFICATIONS.md`. **`20260609000000_notifications.sql` is a
> pending HIGH-risk schema migration — needs `make migrate-up` + `make generate-types`
> + human approval before merge.** Built against manually-added `database.ts` entries
> that match what `generate-types` will produce.

- **Quick win:** commented out the non-functional **Ask (BETA)** button + **Messages**
  icon in `BusinessHeader` (kept the bell).
- **Schema:** new normalized `notifications` table — FKs to `auth.users` (recipient +
  `actor_id`) and `businesses`, `type` CHECK, title/body length CHECKs, object-CHECKed
  `metadata` JSONB, keyset index `(user_id, created_at DESC, id DESC)` + partial unread
  index, RLS (own select/update), and a `create_notification` SECURITY DEFINER RPC
  (authorizes caller as admin or recipient — authenticated users have no direct INSERT).
- **Foundation:** reconciled the pre-existing half-finished notification stub
  (`is_read`/offset) into the normalized `read_at`/keyset model. `lib/utils/cursor.ts`
  (opaque base64url `(created_at,id)` cursor), `lib/types/notification.ts`,
  `lib/validation/notification.ts`, and `lib/api/notifications/*` rewritten for keyset
  pagination + RPC emit + mark-read/all. Existing web routes (`/api/web/notifications`,
  `[id]`) updated to the new signatures.
- **Admin — document review:** `/admin/[adminId]/businesses` — searchable, status-filterable,
  paginated table matching the business-side table spec (URL-param search + filter popover +
  TanStack `manualPagination` + `DataTablePagination`). Row actions live in an `Ellipsis`
  kebab dropdown (View Documents / Approve / Disapprove), each opening a modal dialog
  (approve = optional remarks, disapprove = required; signed-URL document viewer via the
  private `verification-docs` bucket). `businessReviewActions.ts`: each decision flips
  business status (via `verifyBusiness`/`rejectBusiness`) **and** emits the matching
  notification to the owner (remarks in `metadata`; required on disapprove). Added a
  **Business Documents** sidebar entry. Fixed a latent bug: `getBusinessesPaginated`
  searched/sorted by the renamed-away `name` column → now `shop_name` (so admin search/sort work).
- **Business — notification bell:** `NotificationBell` (Popover dropdown, live unread
  badge, IntersectionObserver infinite scroll over the keyset cursor, mark-read on
  click + mark-all-read), wired into `BusinessHeader`. Backed by
  `notificationActions.ts` server actions.
- **Tests (+~35):** `cursor` round-trip/malformed, notification validation
  (decision/list/emit/type), keyset query (page slicing, `next_cursor`, `.or()` filter,
  RPC params, mark-read), admin review actions (status + correct notification type +
  remarks + auth/remarks guards), business notification actions (auth + delegation).
  Reconciled the pre-existing `notificationsService` test to the new API. Verified:
  lint + **1243** tests + build all green.

## 2026-06-09 — Admin design-parity + `/admin/[adminId]` migration (feat/admin-rework)

> **HIGH-risk (routing/auth) — needs human approval before merge.** Plan in
> `.claude/ADMIN_REWORK.md`; delete that file + its `CLAUDE.md` note **after** merge.

- **Phase 0 — scaffolding:** added `adminPath(adminId, ...segments)` + `adminUsersPath`/`adminBranchesPath`/`adminAccountStatusPath` to `config/routeConfig.ts` (mirrors `businessPath`). New `providers/AdminProvider.tsx` carries the `adminId` to the client shell (`useAdmin()`).
- **Phase 1 — route migration:** moved every admin page + co-located dir (`actions`, `components`, `config`, `schemas`, `constants`, `users`, `account-status`, `branches`) under `app/admin/[adminId]/` via `git mv`. New `app/admin/[adminId]/layout.tsx` does auth (`getAdminUserOrRedirect`) + segment guard (`adminId !== user.id` → `redirect(adminPath(user.id))`). `app/admin/page.tsx` is now a resolver; `app/admin/layout.tsx` is a thin auth wrapper. Updated all absolute `@/app/admin/*` imports (incl. external: `hooks/useAdminMutations.ts`, `hooks/useProfiles.ts`, `lib/types/forms.ts`). `userActions.ts` `revalidatePath('/admin')` → `revalidatePath('/admin', 'layout')` (×11) and dropped 4 stale `/admin/${id}` calls (targeted a non-existent per-user page). **No proxy change needed** (matcher already covers `/admin` + `/admin/:path+`).
- **Phase 2 — sidebar parity:** replaced the hand-rolled dark-gradient `Sidebar` with `AdminSidebar` on `@/components/ui/sidebar` + `@/components/custom/Nav` (`collapsible="icon"`, `SidebarRail`, `NavSection`/`NavSectionHeader`, footer `AdminUserMenu`). Migrated `sidebarConfig.ts` to the canonical `NavItem { title, href, icon }` + `SIDEBAR_SECTIONS` grouping with an `injectAdminId()` helper (base hrefs, segment injected at render).
- **Phase 3 — header + shell parity:** replaced `AdminLayoutClient` with `AdminLayout` on `SidebarProvider`/`SidebarInset` (`font-geist`, token bg). New `AdminHeader` mirrors `BusinessHeader` (`SidebarTrigger` + real `next-themes` `ThemeToggle`) — removed the inert fake toggle and the broken `/dashboard/*` links.
- **Phase 4 — polish:** dashboard + page headers now use design tokens (`text-muted-foreground`, `border-primary`, `tracking-tight`) instead of `gray-*`/`blue-*`; page roots use the business `flex flex-1 flex-col space-y-6` idiom (outer padding owned by the layout).
- **Phase 5 — cleanup:** deleted dead `AdminLayoutClient.tsx`, `shared/Sidebar.tsx`, `shared/Header.tsx`.
- **Tests (+20):** `config/__tests__/routeConfig.test.ts` (adminPath helpers), `app/admin/[adminId]/config/__tests__/sidebarConfig.test.ts` (`injectAdminId` + section shape), `app/admin/__tests__/resolver.test.tsx` (resolver redirect), `app/admin/[adminId]/__tests__/layout.test.tsx` (segment guard), `app/admin/[adminId]/actions/__tests__/userActions.revalidate.test.ts` (layout-scoped revalidation). Verified: lint + **1207** tests + build all green.

## 2026-06-08 — Security audit remediation C1/C2/M1/M2 (feat/business-settings)

- **C1 — secrets de-publicized:** renamed `NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_DB_URL` → `SUPABASE_DB_URL` (`.env`, `Makefile`, `supabase/server.ts`, docs). Removed the service-role key from the browser-inlined `env` block in `next.config.ts`. **Follow-up (manual): rotate the service-role key and update deploy env vars.**
- **C2 — dead RLS-bypassing client removed:** deleted `config/index.ts` (service-role "web API route" client, zero importers). `supabase/server.ts` is now the only server client; the service-role path (`createAnalyticsSupabaseClient`/`createServerAdminClient`) reads the server-only `SUPABASE_SERVICE_ROLE_KEY`.
- **M1 — handler guards on admin-only `/api/web` mutations:** added `assertAuthorized(undefined, { roles: ['admin'] })` to `business-types` POST + `[id]` PATCH/DELETE and `business-categories` POST + `[id]` PATCH/DELETE (previously relied on RLS only).
- **M2 — proxy gates `/api/admin/**`:** new admin branch verifies authenticated `role === 'admin'`, returns JSON `401`/`403`; added `/api/admin` + `/api/admin/:path+` to the matcher. Handlers keep their own checks (defense in depth).
- Verified: lint + 1187 tests + build all pass; service secret appears in 0 client bundle chunks.

## 2026-05-27 — Next.js 16 proxy convention (refactor/api-layer-overhaul)

- Ran `npx @next/codemod@canary middleware-to-proxy` — renamed `middleware.ts` → `proxy.ts`, exported function renamed `middleware` → `proxy`.
- Renamed `lib/types/middleware.ts` → `lib/types/proxy.ts`; `MiddlewareFactory` → `ProxyFactory`.
- Updated all doc references: `CLAUDE.md`, `mobile-api.md`, `protected-routes.md`, `roadmap.md`, `folder-structure.md`.

## 2026-05-27 — Protected-route audit phases 2 & 3 (refactor/api-layer-overhaul)

- **Phase 3 (middleware):** `/api/protected/*` branch now calls `supabase.auth.getUser()` instead of just checking token presence. Expired/forged tokens are rejected at middleware before any handler code runs.
- **Phase 2 (migration — awaiting approval):** Created `20260527000000_sync_role_to_jwt.sql` — trigger syncs `profiles.role`/`status` into `auth.users.raw_app_meta_data` on insert/update; one-time backfill for existing rows. Middleware updated to read from `user.app_metadata` with fallback to profiles SELECT.
- Fixed stale coupon/redemption response shapes in `mobile-api.md` (was showing pre-normalization `title`/`type`/`end_date`/`redeem_time_limit_minutes`; now reflects `code`/`discount` JSONB/`expiry_date`).
- Removed stale "broken imports" note from 2026-05-23 CHANGELOG entry — build passes cleanly, `lib/services/` was never deleted.

## 2026-05-27 — Mobile API audit + schema normalization fixes (refactor/api-layer-overhaul)

- Fixed duplicate migration timestamps (20260521000000 × 2, 20260521000001 × 2) that caused `make migrate-reset` to fail with PK violation.
- Created `20260526000012`: drops broad `product-images` upload/update/delete policies never revoked due to name mismatch with later ownership migration.
- Created `20260526000013`: fixes `products.status` constraint from `('active','inactive','archived')` → `('active','unlisted','disabled')` to match `lib/types/product.ts`.
- Rewrote `supabase/seeds/coupons.sql` for normalized coupons schema (`code`, `discount` JSONB, `expiry_date`).
- Ran `yarn db:types` to regenerate `lib/types/database.ts` against live DB.
- Mobile route fixes: expiry guard + per-user/global cap on POST redemptions; `status = 'active'` filter on products; `resolveStorageUrl` on share endpoint; nested coupon filtering in itinerary.
- Analytics in `couponQuery.ts` switched from `coupon_redemptions` → `user_redemptions`.
- Web redeem route updated: `end_date` → `expiry_date`, removed `redeem_time_limit_minutes`.

## 2026-05-27 — Middleware consolidation + route co-location (refactor/api-layer-overhaul)

- Replaced `proxy/stackMiddlewares.ts` stacked pattern (4 files: `stackMiddlewares`, `authMiddlware`, `protectedRoutesMiddlware`, `updateSession`) with a single Next.js-standard `middleware.ts` at the repo root.
- `middleware.ts`: shallow credential check for `/api/protected/**`, Supabase session refresh + role-based redirects for page routes.
- Moved `app/business-registration/` → `app/business/registration/`; updated `ROUTES.BUSINESS.registration` in `config/routeConfig.ts`.
- Removed `API_PROTECTED_PREFIXES` from `lib/utils/protectedRoutes.ts` — API auth is owned by handler-level `assertAuthorized`.

## 2026-05-23 — Coupons & Deals feature (feat/ilokal-11)

- Added `/business/[businessId]/coupons` page with full CRUD, table, stats, filter, and expandable rows.
- DB migration: `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft'))` on `coupons` table.
- Published/draft visibility system: filter Popover + RadioGroup (matching product-catalogue pattern), Visibility column, status toggle in Add/Edit dialogs.
- Expandable table rows show linked products using TanStack Table `getExpandedRowModel` + `React.Fragment`.
- Product picker in dialogs: searchable list with pure-CSS checkbox (no Radix inside form), `role="listbox"` container.
- Mobile API route updated: filters by `status = 'published'`, `start_date <= now`, and `expiry_date >= now`.
- Fixed: `updateFeaturedDealAction`/`deleteFeaturedDealAction` were calling `getCouponById` instead of `getFeaturedDealById`.
- Fixed: dynamic imports of query functions inside server actions replaced with static imports.
- Tests: 69 coupon-specific tests across `couponQuery`, `couponService`, `couponActions`, and mobile route integration.

## 2026-03-30 — API wrapper docs added

- Added `API_WRAPPER_FOR_FRONTEND.md` with guidance for front-end developers on using `lib/services` isomorphic wrappers, optimistic updates, and troubleshooting 401/undefined responses.
- Reason: Provide a single source of truth for front-end usage of the new isomorphic service layer and prevent accidental imports of server-only code into client bundles.
- Risk: Low. Acceptance criteria: file present at repo root and PR description references it.
