# Changelog

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
- Known pre-existing issue: 11 files in `app/admin/` and `app/business/registration/` import from deleted `services/` directory — causes build failure unrelated to this feature.
- Tests: 69 coupon-specific tests across `couponQuery`, `couponService`, `couponActions`, and mobile route integration.

## 2026-03-30 — API wrapper docs added

- Added `API_WRAPPER_FOR_FRONTEND.md` with guidance for front-end developers on using `lib/services` isomorphic wrappers, optimistic updates, and troubleshooting 401/undefined responses.
- Reason: Provide a single source of truth for front-end usage of the new isomorphic service layer and prevent accidental imports of server-only code into client bundles.
- Risk: Low. Acceptance criteria: file present at repo root and PR description references it.
