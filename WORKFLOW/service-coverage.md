# Service Wrapper Coverage Report

Generated: 2026-03-30

Summary

- Total API route files scanned: ~79 (app/api/\*\*/route.ts)
- Total Server Action modules scanned: 15+ (app/\*_/actions/_.ts)
- Service wrappers added under `lib/services/`: auth, user, invoice, search, product, payment, subscription, review, rating, coupon, featuredDeal, branch, business, category, notification, upload, analytics, plus `client` and `index` barrel.

Coverage (by API group)

- Covered (wrapper exists):
  - /api/auth -> `authService`
  - /api/users, /api/users/me -> `userService`
  - /api/billing/invoices -> `invoiceService`
  - /api/search, /api/search/\* -> `searchService`
  - /api/products -> `productService`
  - /api/payments/\* (get, confirm, refund, analytics) -> `paymentService` (partial: checkout, history not explicit)
  - /api/subscriptions -> `subscriptionService`
  - /api/reviews, /api/reviews/\* -> `reviewService`
  - /api/ratings/\* -> `ratingService`
  - /api/coupons -> `couponService`
  - /api/featured-deals -> `featuredDealService`
  - /api/branches -> `branchService`
  - /api/businesses/\*/verification-status -> `businessService`
  - /api/categories -> `categoryService`
  - /api/notifications -> `notificationService`
  - /api/upload/\* -> `uploadService`
  - /api/analytics/\* -> `analyticsService`

- Partially covered / Needs extension in wrappers:
  - `/api/payments/checkout` and `/api/payments/history` — add `checkout()` and `history()` to `paymentService`.
  - `/api/invoices/[id]/send` — `invoiceService.sendInvoice` exists (covers).

- Not covered / Missing dedicated wrappers:
  - Admin endpoints (all under `/api/admin/*`) — suggest `adminService` with sub-areas: `analytics`, `businesses`, `profiles`, `moderation`.
  - `/api/trending`, `/api/search/suggestions` — consider adding to `searchService` or small `trendingService`.
  - `/api/payments/checkout` (see above) and `/api/payments/history` (paymentService extension)
  - Any feature-specific endpoints not listed above (e.g., some `admin/*` verbs) — see file list below.

Server Actions (app/\*\*/actions)

- Found action modules and coverage:
  - `app/(auth)/actions/authActions.ts` -> uses `authService` (covered)
  - `app/(auth)/actions/userActions.ts` -> uses `userService` (covered)
  - `app/(auth)/actions/searchActions.ts` -> uses `searchService` (covered)
  - `app/(auth)/actions/reviewActions.ts` -> uses `reviewService` (covered)
  - `app/business/actions/productActions.ts` -> `productService` (covered)
  - `app/business/actions/branchActions.ts` -> `branchService` (covered)
  - `app/business/actions/couponActions.ts` -> `couponService` (covered)
  - `app/business/actions/subscriptionActions.ts` -> `subscriptionService` (covered)
  - `app/business/actions/billingActions.ts` -> likely uses `paymentService` / `invoiceService` (partial)
  - `app/admin/actions/*` -> admin wrappers missing

File inventory (representative)

- API route files scanned (examples):
  - app/api/search/route.ts
  - app/api/products/route.ts
  - app/api/payments/checkout/route.ts
  - app/api/payments/[id]/route.ts
  - app/api/payments/[id]/confirm/route.ts
  - app/api/payments/[id]/refund/route.ts
  - app/api/payments/analytics/route.ts
  - app/api/subscriptions/route.ts
  - app/api/invoices/route.ts
  - app/api/invoices/[id]/send/route.ts
  - app/api/reviews/route.ts
  - app/api/upload/verification-docs/route.ts
  - app/api/notifications/route.ts
  - app/api/admin/\* (many files)

Recommendations & next steps

1. Create an `adminService` wrapper covering:
   - admin analytics (platform, businesses, revenue, users)
   - admin businesses (verify/reactivate/reject/suspend/delete)
   - admin profiles (list, get, update, delete)
   - admin moderation endpoints

2. Extend `paymentService` with `checkout()` and `history()` for `/api/payments/checkout` and `/api/payments/history`.

3. Add small wrappers for any remaining standalone routes (trending, search suggestions) or fold them into existing services.

4. Optionally: add a lint rule or CI check that flags any direct imports of `services/api/*` (legacy) so we can track migration progress.

5. Prioritize wrappers by impact: payments, products, subscriptions, admin analytics, uploads.

Progress tracking

- I can create `WORKFLOW/service-coverage.md` (this file) and a CSV of callers still importing legacy `services/api` for planned migration batches. Tell me if you want: CSV export, PR-ready patch, or automatic caller migration in batches.

End of report
