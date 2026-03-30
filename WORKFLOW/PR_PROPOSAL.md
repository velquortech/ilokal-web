# PR Proposal: Protect & Ownership Checks — feat/ticket-37-improve-and-add-protected-routes

Branch: feat/ticket-37-improve-and-add-protected-routes

Summary

- Centralize and enforce server-side guards using `assertAuthorized` and `verifyBusinessOwner`.
- Add service-level ownership checks for reviews/ratings and other sensitive flows.
- Add representative integration tests asserting 401/403 for protected endpoints.
- Add `WORKFLOW/tools/checkProtectedRoutes.js` and CI script to validate checklist coverage.
- Fix ESLint flat config and add an override for `WORKFLOW/tools` scripts.

Key changed files (representative)

- [WORKFLOW/analytics-auth-fixes.patch](WORKFLOW/analytics-auth-fixes.patch)
- [WORKFLOW/payments-confirm-auth-fix.patch](WORKFLOW/payments-confirm-auth-fix.patch)
- [WORKFLOW/next-batch-auth-fixes.patch](WORKFLOW/next-batch-auth-fixes.patch)
- [WORKFLOW/ratings-ownership-fix.patch](WORKFLOW/ratings-ownership-fix.patch)
- [WORKFLOW/tools/checkProtectedRoutes.js](WORKFLOW/tools/checkProtectedRoutes.js)
- [eslint.config.mjs](eslint.config.mjs)
- [package.json](package.json)
- Routes updated: examples in `app/api/*` (analytics, billing, payments, upload, ratings)
- Tests added/updated: `lib/__tests__/integration/protected.integration.test.ts` and related integration tests

Testing / How to validate locally

1. Install deps (if needed):

```bash
npm ci
```

2. Run CI checks (lint, protected check, tests):

```bash
npm run ci:checks
```

Expected results:

- `eslint` completes with no errors
- `node WORKFLOW/tools/checkProtectedRoutes.js` prints: "All protected files contain expected guards."
- `vitest run` passes (reported locally: 30 files, 514 tests passed)

Acceptance criteria

- All API handlers listed in `WORKFLOW/protected-route-checklist.csv` call `assertAuthorized` or use `verifyBusinessOwner` where appropriate.
- Service-level ownership checks prevent unauthorized updates/deletes for reviews/ratings/etc.
- Representative integration tests assert 401/403 for unauthenticated/unauthorized access.
- Linting passes and no `any` is introduced in TypeScript sources (tests follow the test-file override).

Risk & Rollback

- Risk: Minor change surface across many route handlers; regression risk is low because changes add guards and do not alter business logic.
- Rollback: Revert the feature branch (`git checkout main && git revert <commits>` or reset remote branch) and re-open tests to validate.

Notes for reviewers

- I added a temporary node checker in `WORKFLOW/tools/checkProtectedRoutes.js`. Consider replacing it with an ESLint rule for stricter CI enforcement (see `WORKFLOW/` notes).
- User preference: do not open the PR automatically. Please push the branch and create the PR manually when ready.

Suggested reviewers

- Backend lead, Security reviewer, and one frontend owner to validate auth UX (owners TBD).

Next steps I can do for you

- Squash/organize commits into a clean PR branch (if you want).
- Create a prepared patch bundle or attach the `WORKFLOW/*.patch` files to the PR description.
- Replace the node checker with an ESLint rule and CI step (recommended).

Prepared by: GitHub Copilot (assistant)
Date: 2026-03-25

---

Migration summary for the `lib/services` isomorphic client

- Added `lib/services/client.ts` (isomorphic `http` wrapper — uses `fetch` server-side, delegates to legacy `services/api/apiClient` in browser).
- Added `lib/services/*` wrappers for common API groups and exported them from `lib/services/index.ts` (compat barrel).
- Kept legacy `services/api/*` in place; created `services/index.ts` compatibility re-export to allow gradual caller migration.
- Added unit and integration tests to validate auth/ownership flows and the isomorphic client behavior.

Files added/updated (representative)

- `lib/services/client.ts`, `lib/services/index.ts`
- `lib/services/{user,auth,invoice,search,product,payment,subscription,review,rating,coupon,featuredDeal,branch,business,category,notification,upload,analytics}.ts`
- `lib/services/__tests__/*` (client and userService tests)
- `app/api/upload/verification-docs/route.ts` (fixed error handling to return 401/403)
- `WORKFLOW/` docs updated with migration notes

- Migrated `app/admin/actions/categoryActions.ts` to use `lib/services/productService` (replaced server-only product API calls with isomorphic service methods and adjusted return typing). Local build and TypeScript checks completed successfully (2026-03-30).
- Migrated `app/admin/actions/categoryActions.ts` to use `lib/services/categoryService` (added `lib/services/categoryService.ts` which delegates to server `lib/api/products/productService` on server, and uses the HTTP client in browser).
- Removed `categoryService` export from `lib/services/index.ts` to avoid bundling server-aware modules into client bundles; server-only callsites should import `lib/services/categoryService` directly.
- Migrated `app/business/actions/productActions.ts` and `app/business/actions/branchActions.ts` to use `lib/services` wrappers. Added `create/update/delete` methods to `lib/services/branchService.ts` and updated server action call sites to cast service responses to `ApiResponse` shapes where necessary.
- Migrated `app/business/actions/productActions.ts` and `app/business/actions/branchActions.ts` to use `lib/services` wrappers. Added `create/update/delete` methods to `lib/services/branchService.ts` and updated server action call sites to cast service responses to `ApiResponse` shapes where necessary.
- Added `lib/services/subscriptionService.ts` and `lib/services/couponService.ts` server-aware wrappers. Removed `subscriptionService` and `couponService` from the client-facing `lib/services/index.ts` barrel to prevent server-only modules from being bundled into client code.

Review checklist (minimal)

- [ ] Run `yarn lint --fix` then `make build-app` locally — build must succeed
- [ ] Run `yarn vitest run` — all tests should pass
- [ ] Spot-check a few migrated callers import `@/services` and keep runtime behavior unchanged
- [ ] Verify no `any` introduced in TypeScript sources (CI enforced)

Rollback plan

- If issues are found post-merge, revert the PR branch and re-run CI; optionally reintroduce changes per smaller batches (Batch 1, Batch 2, ...).

If you want, I will prepare a detailed PR description and a set of review notes that you can paste into GitHub when creating the PR.
