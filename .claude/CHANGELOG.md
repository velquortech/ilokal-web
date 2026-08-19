# Changelog

> **This file holds the 14 most recent entries (2026-08-07 → 2026-08-19).**
> Everything older lives in [`CHANGELOG-ARCHIVE.md`](CHANGELOG-ARCHIVE.md),
> moved **byte-for-byte** — nothing was summarised, merged or dropped. The
> index below covers **all 82 entries across both files**, so an archived
> entry is still findable from here: locate it in the index, then open the
> archive if it sits under "In the archive".
>
> **Why the split.** `CLAUDE.md` inlines this file into every session
> (`@.claude/CHANGELOG.md`, always-loaded list). At 381 KB — roughly 95k
> tokens — it was the single largest fixed cost in the context window, paid on
> every task whether or not any history was relevant to it. The live file is
> ~93 KB at the moment of the split (78 KB of entries + this header and index)
> against a 297 KB archive that is read on request — a saving of roughly 72k
> tokens per session. It grows again as entries land, which is exactly what the
> rotation rule below is for; treat that figure as the split-time measurement,
> not a live one.
>
> **🔴 Rotation rule — this is what stops the file regrowing to 381 KB.** When
> this file passes ~15 entries, cut the oldest ones and paste them at the
> **top** of the archive (whole entries, byte-for-byte, still newest-first
> there), then move their index lines from "In this file" to "In the archive".
> **Never rewrite, compress, or "correct" a past entry.** Several entries
> deliberately record that an earlier entry was wrong — the 2026-08-10 audit
> exists because a stale claim in `CLAUDE.md` cost real work — and that record
> is the asset. Summarising this file destroys it.

## Index — all 82 entries, newest first

### In this file

- 2026-08-19 — The changelog was the largest fixed cost in every session, and two entries were malformed (worktree-upload-rate-limit)
- 2026-08-19 — The upload routes were the app's most expensive endpoints and had no rate limit (worktree-upload-rate-limit)
- 2026-08-17 — Release: storage images, natural-ratio gallery, category clears, Manila dates, revalidate paths (release/2026-08-17)
- 2026-08-17 — Bookings removed from the web app, kept dormant in the database (remove/booking-feature)
- 2026-08-16 — Admin category management: a UI, and kind on create (admin-category-kind)
- 2026-08-16 — The Add Product category dropdown: scope it, edit it, kind it (fix/category-dropdown-mismatch)
- 2026-08-11 — Play Store blockers: hosted policy, a deletion URL, and a delete that could never have worked (feat/play-store-legal-pages)
- 2026-08-11 — The migration deploy has never run, and the check added to prove it did could not fail (chore/migration-ci-verified)
- 2026-08-10 — The migration queue was already applied, and the doc said otherwise (chore/cloud-migration-audit)
- 2026-08-09 — Mobile events API, and the column list that is the contract (feat/mobile-events-api)
- 2026-08-08 — Sentry, phases 2–5: actions, browser, and the decision not to record (feat/sentry-monitoring)
- 2026-08-08 — Sentry, phase 1: the server half (feat/sentry-monitoring)
- 2026-08-07 — A shop can no longer register with an empty menu (feat/registration-menu-required)
- 2026-08-07 — Pest control and water refilling get their own shop type (feat/registration-menu-required)

### In the archive — [`CHANGELOG-ARCHIVE.md`](CHANGELOG-ARCHIVE.md)

- 2026-08-06 — Menu follow-up, phase 5: the admin page (feat/menu-followup-email)
- 2026-08-06 — Menu follow-up, phase 4: the send actions (feat/menu-followup-email)
- 2026-08-06 — Menu follow-up, phase 2: the read side (feat/menu-followup-email)
- 2026-08-06 — The gallery's "See All" went nowhere, and saving it deleted photos (develop)
- 2026-08-05 — An auto supply shop fit nowhere in either taxonomy (feat/image-compression)
- 2026-08-05 — Two verticals had a one-option category picker (feat/image-compression)
- 2026-08-05 — Oversized photos are now resized, not rejected (feat/image-compression)
- 2026-08-05 — Second alignment pass: dangling doc links, and a debt log listing fixed work (chore/standards-debt)
- 2026-08-05 — Standards sweep: the docs had drifted, not the code (chore/standards-debt)
- 2026-08-05 — PR #29 review fixes (feat/how-to-register)
- 2026-08-05 — A public page for how to register, and the CTAs that led nowhere (feat/how-to-register)
- 2026-08-05 — "Go to dashboard" looked dead while it worked (feat/business-onboarding)
- 2026-08-05 — PR #27 review round 2 (feat/business-onboarding)
- 2026-08-05 — Leaflet was painting over the navigation bar (feat/business-onboarding)
- 2026-08-05 — PR #27 review hardening (feat/business-onboarding)
- 2026-08-05 — Tour step card was rendering outside the viewport (feat/business-onboarding)
- 2026-08-04 — Registration `QuotaExceededError`: picked files move to IndexedDB (feat/business-onboarding)
- 2026-08-04 — Onboarding phase 3: onboarding state moves off the device (feat/business-onboarding)
- 2026-08-04 — Onboarding phase 2: the post-registration guided tour (feat/business-onboarding)
- 2026-08-04 — Onboarding phase 1: the hand-off and a derived setup checklist (feat/business-onboarding)
- 2026-08-04 — Event tables join the dashboard, and admin staff picks (feat/events-festivals)
- 2026-08-02 — Events: proposals, review, and the /explore dateline (feat/events-festivals)
- 2026-08-02 — Product catalogue "Set Status" was writing values the DB rejects (feat/product-catalogue-status)
- 2026-08-02 — Product image upload 413: Server Action body limit (develop)
- 2026-08-01 — Product Catalogues: shop sections, and the taxonomy split (feat/rebranding)
- 2026-08-01 — Link previews: the share card that was missing (feat/rebranding)
- 2026-08-01 — Landing redesign: "the walk" (feat/rebranding)
- 2026-08-01 — Brand v1.0: the presented red/yellow identity, app-wide (feat/rebranding)
- 2026-07-27 — PR #18 review hardening (feat/dynamic-product-service-listing)
- 2026-07-27 — Explore: shop info (hours / contact / socials) + gallery lightbox (feat/dynamic-product-service-listing)
- 2026-07-27 — Offerings model phase 4: booking requests (feat/dynamic-product-service-listing)
- 2026-07-27 — Offerings model phase 3: service/rental attributes + quote pricing (feat/dynamic-product-service-listing)
- 2026-07-27 — Offerings model phase 2: type-driven vocabulary (feat/dynamic-product-service-listing)
- 2026-07-27 — Offerings model phase 1: product/service discriminators (feat/dynamic-product-service-listing)
- 2026-07-27 — Offerings model phase 0: unit-aware price display (feat/dynamic-product-service-listing)
- 2026-07-25 — Anonymous /explore now renders the LANDING's nav (feat/explore-public-nav)
- 2026-07-25 — Explore ⇄ landing navigation, phases 0–4 (feat/explore-public-nav)
- 2026-07-25 — Sign-in unification: one `/sign-in` door, role-routed (feat/signin-unification)
- 2026-07-25 — Customer portal: public /explore + protected /customer (feat/customer-portal)
- 2026-07-25 — Brand rollout: "Hablon Weave" logo across the app (fix/table-toolbar-pagination)
- 2026-07-25 — Forgot-password "Check your email" panel redesign + working resend (fix/table-toolbar-pagination)
- 2026-07-25 — Wrap-safe table toolbars + real product-catalogues pagination (main)
- 2026-07-24 — Logout redirect fix + per-page loading skeletons (feat/forgot-password)
- 2026-07-24 — Password reset: MFA (2FA) support + Resend diagnostics (feat/forgot-password)
- 2026-07-24 — Business forgot-password flow (Resend + token-hash) (chore/remove-unecessary-feature)
- 2026-07-24 — Functional, collapse-aware sidebar search (chore/remove-unecessary-feature)
- 2026-07-24 — Responsive modals + remove non-functional OAuth (chore/remove-unecessary-feature)
- 2026-07-23 — Registration gating flags + terms acceptance (feat/landing-real-dashboard)
- 2026-07-17 — Cloud deploy: all pending migrations applied to remote (perf/security-hardening)
- 2026-07-17 — Perf + security hardening, phase 4: SEC-4 + dead-surface removal (perf/security-hardening)
- 2026-07-17 — Perf + security hardening, phase 3: P9 + P13 (perf/security-hardening)
- 2026-07-17 — Perf + security hardening, phase 2 (perf/security-hardening)
- 2026-07-17 — Perf + security hardening, phase 1 (perf/security-hardening)
- 2026-07-16 — Fix production 413 on business registration (main)
- 2026-07-01 — Media & feed scaling: WebP pipeline, deals RPC, notification outbox (feat/account-management)
- 2026-06-24 — Mobile self-service account management endpoints (feat/account-management)
- 2026-06-16 — Dev accounts pinned to `ilokal@dev` across re-seeds (mvp)
- 2026-06-16 — Cloud-portable seeds + APK-preview deploy flow (mvp)
- 2026-06-10 — Coupon-redemption notifications (feat/business-document-page)
- 2026-06-09 — Business document review + notifications (feat/admin-rework)
- 2026-06-09 — Admin design-parity + `/admin/[adminId]` migration (feat/admin-rework)
- 2026-06-08 — Security audit remediation C1/C2/M1/M2 (feat/business-settings)
- 2026-05-27 — Next.js 16 proxy convention (refactor/api-layer-overhaul)
- 2026-05-27 — Protected-route audit phases 2 & 3 (refactor/api-layer-overhaul)
- 2026-05-27 — Mobile API audit + schema normalization fixes (refactor/api-layer-overhaul)
- 2026-05-27 — Middleware consolidation + route co-location (refactor/api-layer-overhaul)
- 2026-05-23 — Coupons & Deals feature (feat/ilokal-11)
- 2026-03-30 — API wrapper docs added

---

## 2026-08-19 — The changelog was the largest fixed cost in every session, and two entries were malformed (worktree-upload-rate-limit)

> **Docs only — no schema, API-contract, auth or runtime change.** One file
> split in two, byte-for-byte; three pointers repointed; one rotation rule
> written down. The only non-doc edit is a comment in an events contract test.

- **🔴 `CHANGELOG.md` was 381 KB and `CLAUDE.md` inlined it into every
  session.** It sits in the always-loaded list (`@.claude/CHANGELOG.md`), so
  roughly **95k tokens** of history was paid on every task — a schema question,
  a one-line fix, a lint run — whether or not any of it was relevant. Nothing
  about the file said it was auto-loaded, which is why it grew to 81 entries
  without anyone weighing the cost.
- **Split, not summarised.** The 68 entries older than 2026-08-07 moved to
  `.claude/CHANGELOG-ARCHIVE.md`; the 13 newest stayed. Live file 381 KB → 93 KB,
  a **~72k-token saving per session**. The tempting move on a file this size is
  to compress the prose, and it would have destroyed the asset: these entries
  are almost entirely *traps and reasoning*, and several deliberately record
  that an **earlier entry was wrong** (the 2026-08-10 audit exists because a
  stale claim cost real work). Rotation moves text; it never edits it.
- **The split is proven, not eyeballed.** The two halves were re-concatenated
  and `diff`'d against the pre-split file: **byte-identical, zero prose
  changed**. Separately, the 81 `## ` headings were shown to appear exactly once
  each across the two files, in the original order. A line-range split of a
  5,449-line file is precisely where an off-by-one silently eats an entry's last
  bullet, and no reviewer scrolling the result would catch it.
- **An index of ALL 81 entries lives in the live file**, divided into "In this
  file" / "In the archive". Without it the split is lossy in practice — the
  archive would be technically present and effectively invisible. It costs
  ~10 KB, which is the reason the live file is 93 KB rather than 78 KB.
- **🔴 The archive is listed WITHOUT an `@`, and that is load-bearing.** The
  `@` prefix is what inlines a file into every session; putting one on the
  archive path restores the entire 381 KB cost with all the work still done and
  no visible symptom. Called out in `CLAUDE.md` beside the path itself, where
  someone tidying the list will actually read it.
- **Two malformed entries fixed.** `2026-08-11 (migration CI)` and
  `2026-07-27 (PR #18)` had their `## ` heading glued to the previous entry's
  last bullet with no blank line, so both rendered as body text rather than as
  entries. Fixed with an **idempotent** `awk` normalisation rather than two
  one-off patches, so the same command is now a re-runnable lint — and it is
  documented as one in `git-workflow.md`.
- **A rotation rule now exists, which is the difference between a cleanup and a
  fix.** `git-workflow.md` — which already said "update the CHANGELOG" and said
  nothing about size — now carries the budget: past ~15 entries, cut the oldest
  to the top of the archive, move their index lines, never rewrite an entry,
  never add an `@`. Without it the next agent regrows this to 381 KB and nobody
  knows it was ever trimmed.
- **Three cross-references repointed** so archiving broke no links: `CLAUDE.md`'s
  pointer to "the four 2026-07-17 entries", and the events contract test's
  pointer to the shop-gallery entry (both now name the archive). `tech-debt.md`,
  `permanent-rules.md` and `next.config.ts` reference the changelog generically
  or name a still-live entry, and were left alone.
- Verified: the re-join `diff` and the heading-set proof above, both structural
  checks clean on **each** file (blank-line-before-heading, strict
  newest-first), `grep '@.claude/CHANGELOG' CLAUDE.md` returning exactly one
  line, `yarn lint` clean, and the events contract suite green (20 tests).
- **Not done:** the ~15-entry rotation threshold is a written rule, not an
  enforced one — no test fails when the live file outgrows it. A contract test
  asserting the live file's size and the absence of an `@` on the archive path
  would close that, and belongs with the next changelog-touching change rather
  than on a branch about upload rate limits.

## 2026-08-19 — The upload routes were the app's most expensive endpoints and had no rate limit (worktree-upload-rate-limit)

> **No schema, API-contract or auth change.** One new helper, a one-line guard
> in each of the seven routes under `app/api/web/upload/`, and two test files.
> LOW risk: the guard is additive and every existing response shape is
> unchanged.

- **🔴 `/api/web` is absent from the proxy matcher, so every upload route was
  unthrottled.** The proxy rate-limits the whole mobile surface by IP before any
  auth or DB work, and `checkAuthRateLimit` covers login/signup/reset — but
  neither reaches `/api/web`. That left the seven upload endpoints as the most
  expensive unguarded surface in the app: each buffers a 2–4 MB body and then
  runs a sharp decode/re-encode (`uploadWebP`) before writing to storage. An
  authenticated owner — or a stolen session — could spend CPU and storage quota
  at will.
- **The gap was structural, not an oversight in any one file.** Nothing at
  review time says an `/api/web` route is unthrottled by default; the two
  registration routes that DO self-guard (`businesses/[id]/offerings`,
  `/deal`) are the tell. That is why the fix ships with a filesystem-driven
  contract sweep rather than seven careful diffs — the eighth route is the one
  that would be forgotten.
- **ONE shared bucket (`web-upload:${userId}`), not seven.** There are six POST
  doors plus the DELETE, and a per-route budget would let a caller multiply
  their allowance by rotating between them — **the exact defect the login door
  already fixed** by sharing `auth:login:*` between the API route and the
  Server Action. A test pretends three calls come from three different routes
  and asserts the third is refused.
- **Keyed on the verified session user, never a client-supplied id.**
  `avatar/route.ts` reads a `userId` form field for admin edits; keying on that
  would hand an attacker unlimited budget by rotating it. The sweep asserts
  every call site passes `auth.user.id` — proven by pointing one at the form
  field and watching it go red.
- **Placed after auth but BEFORE `request.formData()`, which is the whole
  point.** `formData()` buffers the entire multipart body and the sharp
  re-encode runs after it, so a guard placed later throttles the *response*
  without preventing the *cost*. Pinned by a sweep assertion that compares the
  two call offsets — also proven by moving one guard below `formData()` and
  watching that one test fail.
- **🔴 The 429 body is `{ error }`, NOT the `{ message }` of the shared
  `tooManyRequestsResponse` — and that was decided by reading the clients, not
  by preference.** `BannerUploader` does `json.error ?? 'Banner upload failed'`,
  so a `{ message }` body would render as a generic failure with no hint that
  the caller should wait — inviting the immediate retry that makes a flood
  worse. `{ error }` also satisfies the business routes' `{ success: false,
  error }` clients, since `json.success` is absent (falsy) on a 429.
- **A missing user id fails closed.** `verifyBusinessOwner`'s return type marks
  `user` optional even though every success path populates it; an authorized
  result carrying none returns 401 rather than falling through, so a future
  refactor of that helper cannot silently turn "no id" into "skip the limiter".
- **30 requests / 60s**, env-tunable via `WEB_UPLOAD_RATE_LIMIT` /
  `WEB_UPLOAD_RATE_WINDOW_MS`, matching the `BUSINESS_ACTION_RATE_LIMIT` family.
  The binding legitimate flow is a 10-image gallery edit and the registration
  burst (logo + banner + 4–6 interiors + 2 docs), both comfortably inside it.
- **Same per-instance limitation as everything else built on `rateLimit.ts`** —
  state is a module-level `Map`, so on serverless the effective ceiling is
  looser than configured. A baseline flood guard, not a distributed quota; the
  swap path (Upstash/KV behind the same `rateLimit()` signature) is named in the
  helper.
- **Tests (+40):** the helper (6 — budget exhaustion, `Retry-After`, the
  `{ error }` shape with `message` asserted absent, per-caller isolation, the
  shared-bucket property, and the window reaching the reported retry) and a
  contract sweep (34 — discovers routes from the filesystem, asserts each
  imports the helper, calls it, returns its 429, keys on the session user,
  guards before buffering, and fails closed on a missing id; plus an assertion
  that it found ≥7 routes, since a sweep matching nothing is the failure mode
  it exists to catch). Comments are stripped before every assertion — these
  routes name the trap they avoid in prose, and a sweep that passed on an
  explanation would teach people to delete the explanation.
- **Every guard was proven by breaking it**, five ways: guard call deleted
  (3 failures), guard moved below `formData()` (1), key switched to the
  client-supplied field (1), a new unguarded route dropped into the directory
  (7), and the fail-closed check deleted (1).
- **That last break caught a bug in the test rather than the code.** Scoping
  the fail-closed assertion by "calls `verifyBusinessOwner`" also matched the
  DELETE route — which gates on `assertAuthorized` (that helper narrows `user`,
  so the check is unnecessary there) and merely calls `verifyBusinessOwner`
  afterwards for per-bucket ownership. Re-scoped to the helper the route
  actually gates on; re-broken to confirm it now fails on exactly one file.
- **The pre-existing upload suites now run through the live limiter.**
  `phase2-uploads`, `businessid-verification` and `delete-path-guards` pass
  today because none makes 30+ requests as one user, but the counters are a
  module-level Map with no reset between tests — so a future loop test would
  fail with a 429 that looks unrelated. Noted in `phase2-uploads`' header with
  the fix (`vi.resetModules()` in a `beforeEach`).
- **🔴 The security doc described a system nobody built, and that is fixed
  here.** `security.md`'s "Rate Limiting & Abuse Protection" specified
  "10 req/min per IP", "100/day per account" and a "5 failed logins → 15-minute
  lockout with exponential backoff" — **none of which exists anywhere in this
  repo**. The real numbers are 30/60s per IP + 8/300s per account, and there is
  no lockout at all. A security doc that overstates coverage is worse than no
  doc: it is read as proof a surface is protected, so nobody checks. Rewritten
  to the enforced state, with a **coverage table** naming every guarded and
  unguarded surface, and aspirational items moved to an explicit "Not built"
  list.
- **Rate limiting is now a documented MERGE GATE.** New "Security Gate" checklist
  in `git-workflow.md` — run before any push or merge to `main`, and treated as a
  priority item in any audit or test pass. Nine boxes (guard present, keyed on a
  verified identity, placed between auth and work, handler-level authz, Zod
  validation, no driver text, no `NEXT_PUBLIC_` secret, RLS shape, and a contract
  test proven by breaking it). An unticked box must be stated explicitly in the
  PR with a TD- entry — silence reads as "checked and fine", which is how
  `/api/web` went unthrottled for months. `CLAUDE.md`'s standards section leads
  with the same rule and now names the `/api/web` + `/api/admin` blind spot
  instead of mentioning only auth routes.
- **`testing.md` gained a runnable abuse-control sweep** as a priority step ahead
  of its coverage matrix, because an endpoint can be fully tested and still be
  unthrottled — a different class of defect than the one coverage measures.
- **The counts in those docs were measured, not estimated:** 47 mutating API
  routes carry no guard, of which 14 are `/api/mobile*` and covered by the proxy,
  leaving **33 genuinely unguarded** (16 `/api/web`, 14 `/api/admin`, 3
  `/api/auth`) plus 22 Server Action files. An earlier draft of this entry said
  "~37" and "~22"; both were corrected against the sweep, since a doc whose whole
  point is that the previous one was fiction cannot itself ship guesses.
- **New TD-021** tracks the structural cause — `/api/web` is not in the proxy
  matcher and `/api/admin` never reaches the limiter block — with the durable fix
  (widen the proxy) paired with TD-007 (a distributed store), rather than an
  endless list of per-route guards.
- Verified: `yarn lint` clean + **3217** tests (258 files, 1 skipped) + a clean
  `yarn build` (`.next` removed first), plus both documented sweeps executed to
  confirm they run and return the numbers quoted.
- **Not done — the remaining `/api/web` gap is larger than this branch.**
  `app/api/web/businesses/[id]/files/route.ts` is a sibling upload endpoint
  (the registration per-file POST) and is still unguarded; it sits outside
  `upload/` so the sweep does not cover it. Beyond that, ~22 more mutating
  `/api/web` routes (payments, ratings, coupon redeem, notifications, users)
  and all 14 `/api/admin` mutating routes have no limit — `/api/admin` is in
  the proxy matcher but the limiter block only tests the two mobile prefixes.
  22 Server Action files are likewise unguarded. The durable fix for the whole
  class is a distributed store plus an `/api/web` entry in the proxy, not more
  per-route guards.

## 2026-08-17 — Release: storage images, natural-ratio gallery, category clears, Manila dates, revalidate paths (release/2026-08-17)

> **No migrations, no seeds, no env changes — the live database schema is untouched.** 81 files changed (+801/−2460). Full suite: 3,010 tests pass; typecheck, ESLint, Prettier clean; 88/88 contract guards green. Six change groups, summarized for the production deploy.

- **Bookings removed from the web app — schema stays dormant.** Booking isn't
  supported yet, so the web app no longer ships the flow: the customer request
  dialog and "My bookings" page, the owner's bookings inbox and actions, the
  `enable_bookings` flag (admin allowlist, Feature Flags card, both shells), the
  onboarding tour step, and the product editor's "How do customers book this?"
  picker are gone. **No migration** — `booking_requests`,
  `products.booking_mode`, and the `booking_*` notification types remain, and the
  mobile API still passes `booking_mode` through. Re-enabling later is a feature,
  not a migration.
- **Storage images now load directly (broken-image fix).** Every storage-backed
  image — shop banner/logo, avatars, lightbox, gallery, wallet,
  deal/business/coupon cards, following feed — renders through `next/image` with
  `unoptimized`, bypassing the optimizer that served stale or nonexistent WebP
  variants. Guarded by a source-scan contract test, so a future `next/image`
  without `unoptimized` fails CI.
- **Natural-ratio gallery.** New shared `NaturalRatioGallery`; interiors, masonry,
  and the shop gallery no longer hard-crop into fixed squares. Images
  auto-arrange at 1/2/3+ counts with a "+N more" overlay, preserving aspect ratio
  even with few images.
- **Optional category clear + divergence guard.** The Add Product, Update Product,
  and profile Category pickers now have a "No category" clear option (the
  sentinel pattern), so a misclicked category can be un-picked. A new
  `getCategoryDivergence` guard fails closed and shows a banner when a business's
  vertical and category scope diverge — a wrong business type can no longer
  silently mis-scope the Add Product picker.
- **Manila timezone pinning.** Dates across admin tables, branches, coupons,
  deals, coupon cards, promo/apply-sale `datetime-local` handling, and
  SecurityTab MFA dates are pinned to the shared `BUSINESS_TIME_ZONE` helpers —
  no more UTC-off-by-one renders.
- **Revalidate-path correctness.** Every business/admin action now revalidates
  through `routeConfig` helpers or the `/admin` layout instead of literal paths
  that named non-existent routes (`/business/coupons`, `/admin/businesses`).
  Contract-tested, so the class can't return silently.
- **Notes for the deploy:** two pre-existing bugs surfaced during testing but are
  *not* from this change — the wallet's BOGO redemption card renders "₱null off"
  (its inline `formatDiscount` doesn't handle `bogo`), and local snapshot data
  carries absolute cloud storage URLs that the local CSP blocks (these render
  fine in production, where host and CSP match).

## 2026-08-17 — Bookings removed from the web app, kept dormant in the database (remove/booking-feature)

> **No migration — the schema stays.** Booking is not supported yet, so the web
> app no longer ships the flow: the customer request dialog and "My bookings"
> page, the owner's bookings inbox and actions, the `enable_bookings` flag, and
> the product editor's "How do customers book this?" picker are gone. The
> database keeps `booking_requests`, the `products.booking_mode` column and the
> `booking_*` notification types so nothing is lost, and the mobile API still
> passes `booking_mode` through. Re-enabling later is a feature, not a
> migration.

- **Customer side removed** — the "Request booking" dialog on explore product
  cards, the "My bookings" page, and the header entry (which only appeared
  while the flag was on).
- **Owner side removed** — the Bookings inbox page, `bookingActions`, the
  sidebar entry, and the `nav-bookings` onboarding-tour step.
- **The flag is gone from the web surface** — `enable_bookings` is no longer an
  admin toggle (settings allowlist + Feature Flags card), neither customer shell
  reads it, and the layout's `flags` record no longer carries it. The
  `app_settings` row itself is untouched.
- **The product editor no longer asks "How do customers book this?"** —
  `booking_mode` was dropped from the create/update validation schemas, the
  service write path, the shared offering labels, and the add/update dialogs.
  New offerings fall to the DB default `'none'`; the mobile API and customer
  queries still read the column, so nothing downstream sees a shape change.
- **Docs that cited booking flows updated** — changelog-referenced lessons
  (`getBookingStats`, "unlike bookings", the tour copy) now speak of events
  only.
- **Future improvements (logged, not lost):** the dormant pieces are the
  re-enable plan — flip `enable_bookings` back on, restore the request dialog
  and inbox pages (the `request_booking` RPC and its triggers were never
  dropped), and bring back the per-vertical `default_booking_mode` vocabulary
  policy with the product-editor picker. The `booking_*` types in
  `notifications_type_check` are already accepted by the database, so the inbox
  can read them as soon as the pages exist.

## 2026-08-16 — Admin category management: a UI, and kind on create (admin-category-kind)

> **No migration.** Closes the follow-up left by the category-dropdown work:
> `categories.kind` existed, but the only way to set it was SQL. Now the admin
> dashboard has a Categories page whose create/edit dialogs carry a
> Product / Service / Either selector, and the write path persists it.

- **🔴 There was no admin path to add a category at all.**
  `app/admin/[adminId]/actions/categoryActions.ts` had zero callers — seeding
  was the only way in — and every action gated on `profile?.role ===
  'super_admin'`, a role the CHECK does not allow (`admin | business_owner |
  app_user | user`), so even a future UI would have been refused. The gate is
  now the real `admin` role, and the new `Categories` page
  (`/admin/<id>/categories`, sidebar entry under the main nav) calls the
  actions for create / edit / delete.
- **New categories were stuck at NULL kind.** `createCategory` ignored kind;
  the schema and request type now accept `product | service | null` (null =
  either, still the fail-open default), the insert persists it, and
  `updateCategory` writes it too — including an explicit null that clears a
  scoped kind back to "either" (the `!== undefined` spread, not truthy, so a
  clear is a real write).
- **The form helps, not hinders.** Slug auto-derives from the name while the
  field is untouched (tracked by a touched flag, so it follows the full name,
  not just the first keystroke) and an existing category's stored slug is
  never re-derived from a renamed display name — URLs and the mobile filter
  depend on slug stability. Delete is refused server-side for categories still
  attached to offerings; the dialog surfaces the reason.
- **Vertical pinning too — the dialog gained a Business Type selector**
  (Global or any vertical, fed from `businessService.getBusinessTypes()`),
  so a new category can be pinned the same way the seeds do it. The write
  path persists `business_type_id` with the same `!== undefined` clear rule
  (an explicit "Global" is a real null write), and the table shows the
  vertical (or Global) per row. Radix Select rejects an empty-string item
  value, which the render test caught — the Global sentinel is `'global'`,
  not `''`.
- **Coverage:** +2 service unit tests (kind + business type on insert with
  null defaults; write + null-clear on update) and +4 render tests
  (rows + scope badges, Add dialog fields + Global default, create submits a
  derived slug with NULL scope, edit prefills and never re-derives the stored
  slug). Live-verified end-to-end against the local stack: created a category
  as kind=Service (row landed `kind=service`), edited it to Either (row
  landed NULL), deleted it. Typecheck, lint, and the product-service + admin
  suites green.

## 2026-08-16 — The Add Product category dropdown: scope it, edit it, kind it (fix/category-dropdown-mismatch)

> **ONE migration (`20260816120000_categories_kind.sql`) — additive column
> (`categories.kind`, NULL = either) + slug-based backfill + index. No table,
> policy or RLS change; every existing row keeps today's behavior.** Fixes the
> category-dropdown mismatch in three layers: the server now enforces the same
> scope the picker shows, the category is editable after creation (it was
> add-only before), and a 'both' business adding a service is no longer offered
> product categories.

- **🔴 The category was set-and-forgotten.** The Add dialog offered
  "Category (Optional)" but the Update dialog had no Category field at all —
  pick wrong at add time and it was stuck forever, while the mobile menu's
  category filter (`business_product_categories`) kept showing chips the owner
  could neither see nor fix in the dashboard.
- **The server never re-checked the picker's scope.** `createProductService`
  verified the category merely EXISTS — a salon could attach "Meals & Rice
  Dishes" through `/api/web/products` or a forged action call. Now
  `resolveCategoryInScope` enforces both axes on create (and on update, when
  the category actually CHANGES): vertical ("this vertical OR global", matching
  `getCategoriesPaginated`) and kind (a kind-scoped category must match the
  offering's kind; NULL passes). A shop with no vertical stays fail-open, the
  same as its picker. A row that already carries a pre-scoping out-of-scope
  category stays editable — re-selecting its own value is not a change, so an
  unrelated edit can't be blocked by legacy data.
- **`categories.kind` — the picker's second axis.** Vertical scoping
  (20260727000000) stopped a salon seeing "Pastries", but a 'both' business
  (Entertainment & Events today, Tourism when its flow ships) still saw its
  vertical's product categories while adding a service. The new column mirrors
  `products.kind`: 'product' / 'service' / NULL = either. Backfilled by slug —
  goods (F&B, Retail, Gift Sets) → product; services (Services, Health,
  Education, Home, Tourism) → service; `health-beauty`, `other` and
  `entertainment-events` stay NULL as genuinely two-kind catch-alls.
- **The add form now ASKS a 'both' shop which kind** — the "form is expected to
  ask" gap `defaultKindForMode` documented. A "What is this?" select renders
  only when `allowedKinds.length > 1` (mode 'both'), seeds the new row's
  `kind`, carries across "Save and add another", and drives the category
  options (filtered client-side by kind; switching kind drops an out-of-scope
  pick). Single-mode shops see no toggle and behave byte-identically.
- **Update gets a Category picker** with the same vertical-scoped, kind-filtered
  list, an explicit "No category" state (NULL is a real value), and the row's
  current category kept selectable even if it sits outside today's scope — the
  same never-blank pattern Section already used. Prop chain:
  `product-catalogues-content` → `ProductTable` → `getColumns` → `ProductActions`
  → `UpdateProductDialog`.
- **Tests (+11):** `productService` — vertical mismatch, kind mismatch, global/
  either-kind acceptance, no-vertical fail-open, unchanged-category skips
  validation, changed-category validates. `offeringVocabulary` — `allowedKinds`
  per mode and in the default. `Category` carries `business_type_id`/`kind`
  (optional, so older payloads stay valid); `OfferingVocabulary.allowedKinds`
  resolved from the mode like `defaultKind`.
- Verified: `tsc --noEmit` clean (0 errors), targeted suites green (196 tests),
  lint clean.
- **Not done:** the admin categories UI doesn't expose `kind` yet — an admin
  creating a category gets NULL (either) until `createCategory` learns to take
  it, which is a small follow-up rather than a gap. Tourism categories are
  kind='service' even though the vertical is disabled; revisit when its booking
  flow ships.

## 2026-08-11 — Play Store blockers: hosted policy, a deletion URL, and a delete that could never have worked (feat/play-store-legal-pages)

> **ONE new migration (`20260811120000_purge_archived_profiles.sql`) — applied
> NOWHERE. Needs approval.** Two new public pages, one route-config block, one
> proxy-matcher entry, one footer link. Companion changes live in the
> **`ilokal-mobile`** repo (edge function + legal copy) and are listed at the
> bottom. Google Play rejects the App content step — closed testing
> included — without a hosted privacy policy URL; there was none.

- **🔴 The `delete-account` edge function was never deployed, and would not
  have worked if it had been.** `supabase functions list` against
  `ilokal-database` returns **zero** functions, so every in-app "Delete
  Account" tap failed while the Data Safety form claimed deletion worked. But
  the interesting half is the second one: the function called
  `admin.auth.admin.deleteUser()`, which CASCADEs `auth.users` → `profiles`,
  and **three tables reference `profiles` with ON DELETE NO ACTION** —
  `businesses.owner_id`, `follows.user_id`, `user_redemptions.user_id`. So the
  delete raised a foreign key violation for any user who owns a shop, follows
  a business, or has ever redeemed an offer. Measured against production:
  **21 of 58 profiles (36%) would have failed**, and that ratio only grows,
  because following and redeeming are the two things the app is for.
- **Rewritten as an archive, which is also what was asked for.** It now writes
  `archived_at` + `status='inactive'` and revokes every session — **mirroring
  `DELETE /api/protected/mobile/me` exactly**, because two surfaces that both
  say "delete my account" must not mean two different things. The app invokes
  it **by name** and only checks for an error, so this is a pure server-side
  behaviour change: **no client release, and the built AAB stays valid.**
- **Idempotency is load-bearing here in a way it was not on the web.** The
  `.is('archived_at', null)` guard preserves the ORIGINAL timestamp, and that
  timestamp is what the 90-day purge counts from — without it a double-tap
  silently restarts the retention clock.
- **Session revocation is non-fatal on purpose.** The archive is what the user
  asked for and it has already landed; failing the call would report "deletion
  failed" for an account that IS deleted, and the retry would then be a no-op
  against the guard, so the user could never get a success.
- **🔴 The policy said something the system does not do.** Section 11 read
  *"This permanently removes your account and the profile data tied to it."*
  Under an archive that is false, and under the FKs above it was never
  achievable. The hosted copy describes the archive, the 90-day recovery
  window and the purge. A contract test fails on any return of the phrase —
  **proven by putting it back and watching that one test go red.**
- **`/privacy` (new) — the URL Play asks for.** The wording already existed and
  was already finalized; it had no URL, living only in the mobile app's in-app
  reader and, on the web, inside a registration dialog **behind auth**. So this
  was a hosting problem, not a writing one.
- **Mirrored in the mobile repo's own `LegalSection[]` shape, deliberately.**
  Re-typing legal prose into a new format is how two copies of a policy start
  disagreeing; copying the structure makes syncing a **structural diff** rather
  than a proofread, and leaves exactly one intentional divergence (section 11)
  for a reviewer to find.
- **`/delete-account` (new) — the Data-deletion URL.** Play's requirement is
  that a user can REQUEST deletion **without installing the app**, and that the
  page says what is deleted, what is kept, and for how long. So the email route
  carries equal weight to the in-app steps, and the window is a number rather
  than "a period of time".
- **Deliberately no form and no sign-in on that page.** A form would be a new
  unauthenticated, side-effecting endpoint that mutates accounts by email
  address — an account-enumeration oracle at best — for a flow that is manual
  anyway, since identity has to be confirmed before archiving on someone's
  say-so.
- **Both served from a route GROUP (`app/(legal)/`)**, which adds no path
  segment. These two strings get typed into the Play Console and the store
  listing, where nothing in this repo can see them: a rename leaves a dead link
  in a submission nobody re-reads until the next review. The group can be
  reorganised without moving the URLs, and the paths are pinned by a test that
  hard-codes them as the record of what was submitted.
- **Added to the proxy matcher**, for the reason `/explore` and `/for-business`
  already are: both mount `PublicShell`, whose header reads the session, and
  unmatched, nothing refreshes an expiring token — a live session renders as
  signed-out. `isProtectedPath` is false for both, so anonymous readers take
  the refresh path only and are unaffected.
- **🔴 The purge migration was written wrong twice, and the schema caught it
  both times.** `profiles.email` is **NOT NULL**, so the first draft's
  `SET email = NULL` would have failed on **every** run — a purge job that
  silently never purges, which is the same silent-success class as the CI
  guard fixed the day before. It writes a per-id tombstone on the `.invalid`
  TLD (RFC 2606, can never resolve) instead. And keying idempotency on
  `full_name IS NOT NULL` would have **permanently skipped every user who never
  set a name**, since that column is nullable. Both pinned by tests.
- **The purge anonymises rather than deletes**, for the same FK reason as
  above: blanking name/phone/avatar/email keeps the rows those three NO ACTION
  constraints point at, while the person behind them stops being identifiable.
  Service-role only, pinned `search_path`, bounded per run with
  `FOR UPDATE SKIP LOCKED`, daily via pg_cron in the idiom
  `20260630000001_notification_outbox.sql` established.
- **⚠️ KNOWN GAP, stated in the migration:** it purges `public.profiles` only.
  The address also lives in `auth.users.email` and
  `auth.identities.identity_data`. Writing to the auth schema by hand can break
  GoTrue invariants, and the supported route — admin delete of the auth user —
  is exactly what the NO ACTION FKs refuse. Closing it properly means changing
  those three constraints to ON DELETE SET NULL / CASCADE so a real delete
  becomes possible. That is why the wording says personal fields are *purged*
  rather than that every trace is erased.
- **⚠️ PRECONDITION — the migration must be applied BEFORE the URLs go into the
  Play Console.** Both pages tell users their personal fields are purged after
  90 days. Until the job is applied and scheduled, that is a claim the system
  does not keep.
- **Tests (+14):** the two paths pinned as submitted, both unprotected, both in
  the matcher, footer link present, the two pages cross-linking, the retention
  window shared between the pages and the migration's default, a contact
  address on both, no empty section, and four on the purge job (never nulls
  the NOT NULL column, never keys on the nullable one, service-role only,
  pinned search_path).
- **Companion changes in `ilokal-mobile` (not this repo, left uncommitted —
  that checkout is on `main`):**
  `supabase/functions/delete-account/index.ts` rewritten to archive;
  `services/api/accountService.ts` docstring corrected (it said "Permanently
  delete"); section 11 of both `constants/legal.ts` and
  `legal/PRIVACY_POLICY.md` rewritten; `legal/README.md` records the hosted
  URLs as a fourth place to keep in sync; plus a new `e2e.local.mjs` beside the
  function.
- **✅ The rewritten function is VERIFIED against a real Supabase stack**, not
  merely typechecked. `deno check` is clean, and a 16-assertion end-to-end run
  (throwaway user → sign in → invoke with that user's own JWT) confirms: HTTP
  200, the profile row **still exists** (archive, not delete), `status`
  `inactive`, `archived_at` set, the caller's JWT refused afterwards (GoTrue
  answers 403 for a revoked session, not 401), and a replay reporting
  `already_archived` with the **timestamp unchanged** — the guard that protects
  the retention clock.
- **🔴 That run caught a real bug in the rewrite, and the bug was invisible
  from the outside.** `admin.signOut(jwt, scope)` takes a **JWT, not a user
  id** (`GoTrueAdminApi.signOut(jwt, …)`), so the first version's
  `signOut(user.id, 'global')` type-checked, compiled, and **failed at
  runtime** — while the call is non-fatal, so the function still answered
  `200 success`. Proven by reverting just that argument: `sessions_revoked`
  goes `false` and **the "deleted" user's old token still returns 200 from
  `/auth/v1/user`**. A user who deleted their account would have stayed signed
  in on a valid token, with nothing in the response saying so. Restored, and
  re-verified green.
- **Not done:** the function is **verified but not deployed** — the repo owner
  runs it (`supabase functions deploy delete-account --project-ref
  skvgasimllpyhyudpycu --use-api`; never `--prune`, which deletes functions
  absent locally). The migration is unapplied. `/terms` is **not** built: it is
  not one of the Play blockers and the copy exists, so it is a cheap follow-up
  rather than a transcription of 94 lines of legal prose into this branch. And
  **any AAB built before today still shows the old "permanently removes"
  sentence in-app**; the hosted copy is authoritative until the next build.
- **Not verified:** neither page has been opened in a browser. The function was
  proven against the LOCAL stack, not production — worth one throwaway account
  through `e2e.local.mjs` after the deploy, since the two databases can differ.
  And **the 90-day claim is enforced by prose, not by a test**: the suite pins
  that the pages and the migration quote the same number, but nothing fails if
  this merges, the Play URLs go live, and the migration is never applied.
- **🔴 The inherited contact address was not merely unread — its domain does
  not exist.** `privacy@ilokal.app` came from the mobile repo, and `ilokal.app`
  has **no A record and no NS: NXDOMAIN**. Mail to it hard-bounced. `ilokal.ph`
  turned out to be a test fixture only. `no-reply@` was proposed and rejected
  twice over: send-only by convention, and on that same non-existent domain.
  Every address in the legal copy pointed somewhere unreachable.
- **Now `support@ilokal.shop`** — the domain the app is actually served from.
  `support@` rather than `privacy@` so the two repos agree: the mobile repo's
  `legal/README.md` already names `support@` as its default, and one staffed
  inbox beats two aliases nobody watches. (A dedicated privacy alias is worth
  revisiting once a DPO is appointed and NPC registration lands — both open
  items there.) Every contact route is gated on one constant, so it is the
  single switch for the email route on both pages, the policy intro and the
  contact section. A test pins the domain and rejects `ilokal.app`, `ilokal.ph`
  and a `no-reply@` local-part, so a dead address cannot come back.
- **On `no-reply@`, since it was proposed twice:** the objection is direction,
  not the prefix. `noreply@anthropic.com` in a `Co-Authored-By:` trailer is an
  *identity* — send-only by design, and correct for that job. This address is
  an *inbound* request channel, and Play's clause is that a user can **request**
  deletion through it; an address announcing "we don't read this" defeats the
  one job it has. The test therefore rejects a `no-reply@` local-part here and
  nowhere else.
- **✅ MX now resolves — the merge precondition is cleared.** Verified
  2026-08-11 through two independent public resolvers (Google `8.8.8.8` and
  Cloudflare `1.1.1.1`), both returning `10 mx1.improvmx.com |
  20 mx2.improvmx.com`. It was a hard precondition while the zone had no MX at
  all, because a bouncing `mailto:` is worse than no channel — it looks like a
  working route and swallows the request. The suite cannot check DNS (it is
  offline by contract), so the test asserts the DOMAIN and the lookup is a
  deploy-time step: `node -e
  "require('dns').promises.resolveMx('ilokal.shop').then(console.log)"`.
- **The diagnosis on the way there is worth keeping.** The first "it's added"
  showed no MX on the apex, none on `support.`/`mail.` subdomains, and **zero
  TXT records anywhere** — and that last one is the tell: forwarders almost
  always want a verification TXT beside the MX, so nothing at all having landed
  meant the write never reached the zone. The alias had been created at the
  forwarder (a routing rule, invisible to DNS) without adding the two MX
  records at Vercel. Worth remembering that an MX record's Name field is the
  DOMAIN (`@`), never the mailbox — the mailbox is configured at the forwarder.
- **⚠️ Still unproven: that the mailbox ACCEPTS and someone reads it.** DNS
  proves routing, not delivery. An SMTP acceptance probe (`RCPT TO`, stopping
  before `DATA`) was attempted and could not run — port 25 is blocked outbound
  from this machine. **Send one real email to the address before the Play
  submission**; it is the single thing on `/delete-account` a reviewer might
  actually exercise.

## 2026-08-11 — The migration deploy has never run, and the check added to prove it did could not fail (chore/migration-ci-verified)

> **No schema, API-contract or auth change. One file:
> `.github/workflows/supabase-migration-workflow.yml`.** Nothing was applied to
> production by this branch — the only cloud access was the checked-in
> read-only inventory. **Still blocked on two repository secrets** (below), and
> on PR #48 merging (below). Continues the 2026-08-10 audit: that entry found
> the drift, this one finds the mechanism.

- **🔴 Every run of "Deploy Supabase Migrations" has FAILED — 8 of 8, each in
  11–16 seconds.** `supabase db push --db-url $SUPABASE_DB_URL` with
  `SUPABASE_DB_URL_PRODUCTION` never set, so the flag expanded to empty and the
  CLI answered with a usage dump. **No migration has ever reached the database
  through CI.** Invisible because the PR pipeline is a separate workflow and
  stayed green. That is the mechanism behind the drift the audit found, and the
  reason migrations were being applied by hand — which is how the repository
  and production diverged in the first place.
- **Switched to `--linked` + a personal access token rather than repairing the
  `--db-url` path.** No database password to store or rotate; no IPv4 problem
  (Supabase direct connections are IPv6-only without the paid add-on and
  GitHub-hosted runners are IPv4-only, so `--db-url` fails on the *network*
  before it fails on auth, and it also avoids the session-vs-transaction pooler
  trap); the token revokes independently of DB credentials. Trade-off recorded
  in the file: a PAT is **account-scoped**, so use a dedicated CI token.
- **🔴 The verification step added to prove the push worked could not itself
  fail.** It ran the object inventory and grepped for `'"status": *"MISSING"'`.
  On empty, truncated or reshaped output that pattern matches nothing and the
  step prints **"All declared objects present."** A guard that can only ever
  *find* a problem, never show that it *looked*, is the same class of defect as
  the workflow it guards — a check whose failure mode is silent success.
- **Fixed by asserting the check RAN before trusting it:** the expected row
  count is derived from the inventory file itself
  (`grep -cE "^  \('(function|index|trigger|policy|column)',"` → 98) and
  compared against `jq '.rows | length'`. Any mismatch fails, naming both
  numbers. Missing objects are then found by parsing, not by grepping a
  fragment.
- **Proven by breaking it, five ways, against real cloud output** (the guard
  text was extracted from the shipping YAML, not retyped, so the test cannot
  drift from what runs): healthy → exit 0 "All 98 declared objects present";
  one status flipped to MISSING → exit 1, names the object; **empty output →
  exit 1** (the old version's silent pass); 97 rows → exit 1 "returned 97 rows,
  expected 98"; a reshaped result with no `.rows` → jq exits non-zero and
  `set -e` ends the job.
- **🔴 `--output csv` and `--output table` are REJECTED by this command.** The
  global `--output` (`env|pretty|json|toml|yaml`) **shadows** the command's own
  (`table|json|csv`), and the help text prints both while saying nothing about
  which wins. `json` works only because it is in both sets — it is the sole
  value that can be passed explicitly. Verified against 2.101.0 by running all
  four variants. The step now passes it anyway: the default is undocumented,
  and a default that changes would silently reshape what is parsed.
- **`db push` gained `--yes`, which it did not have — on authority, not
  measurement, and the difference is stated in the file.** `CLAUDE.md`
  documents `--yes` as the required form and a runner has no TTY to answer a
  prompt with, so the flag is right either way; but a `--dry-run` here fails
  earlier on the version mismatch below, so the prompt was never reached and
  the claim is **inherited**. `link` by contrast **was** measured: it does not
  prompt for a database password with stdin closed (exit 0), which is what
  makes the passwordless PAT path viable. This file has twice had to walk back
  a confident sentence; a verified claim and a documented one are not the same
  thing and are labelled differently here.
- **CLI pinned to 2.101.0 instead of `latest`.** `latest` is already 2.113.0,
  so CI was running a version nobody here has, in a workflow nobody watches —
  the exact conditions under which a silent flag change becomes a silent
  non-deploy. 2.101.0 is what `package.json` installs and what every flag above
  was verified against, so a CI failure now reproduces locally.
- **Secrets move to `env:` rather than `${{ }}` inside `run:`.** `${{ }}`
  substitutes literal text *before* the shell parses it, so a value containing
  `$`, a backtick or a quote would be mangled or partially executed.
- **🔴 Cloud is ONE migration AHEAD of `main`, and it will fail the first real
  run.** The ledger holds **129** rows against **128** files on disk: version
  `20260811000000` (`nearby_is_new`) was applied to production while **PR #48
  is still open and unmerged**, and `nearby_businesses` on cloud already
  returns `is_new`. `db push` refuses outright — *"Remote migration versions
  not found in local migrations directory"* — and is right to. **Merge PR #48
  before or with this**, or the first push to `main` after the secrets are set
  goes red and this fix gets blamed for it. The failure mode is named in the
  workflow file so a log reader recognises it. It is also the same out-of-band
  manual apply that the broken CI caused — a second instance, four days after
  the audit.
- **Verified read-only against `ilokal-database`** (the documented
  re-derivation, no writes): **98/98** declared objects present, 0 missing;
  ledger tail `20260807120000, 20260807140000, 20260808090000, 20260811000000`.
  Plus YAML parse, both jobs and all six step names intact.
- **Not done — this cannot deploy anything yet.** Two repository secrets are
  still unset and only a repo admin can set them: `SUPABASE_ACCESS_TOKEN`
  (https://supabase.com/dashboard/account/tokens) and
  `SUPABASE_PROJECT_REF_PRODUCTION`. Until then the guard fails the job with a
  sentence naming them, instead of a usage dump nobody read.
- **🔴 Follow-up for whoever merges PR #48: its migration has ZERO coverage
  from the check this branch adds.** `cloud_object_inventory.sql` tests a
  function by `proname` only, and `nearby_is_new` changes a **return column**,
  not a function's existence — the exact class the 2026-08-10 audit proved is
  invisible, since a missing return column degrades silently while a missing
  table 42P01s on first call. It is why the drift probe checks
  `pg_get_function_result()`. So an in-place edit to `20260811000000` would
  pass this guard with `is_new` absent. The inventory needs a row asserting
  `is_new` in `nearby_businesses`'s signature; it belongs with #48, not here,
  because adding it now makes `main` fail against a migration `main` does not
  have.
- **Found, deliberately not fixed:** the `Production-preview` job runs
  `yarn install` **before** `actions/checkout@v4` — installing in an empty
  directory. It has never been reached, because it `needs: Deploy-migration`
  and that job has always failed. So the day the secrets land, a never-executed
  and plainly broken job runs for the first time. Left out of this change so
  the diff stays about the migration path; it is a one-line reorder and its own
  commit.

## 2026-08-10 — The migration queue was already applied, and the doc said otherwise (chore/cloud-migration-audit)

> **No code change. ONE migration applied to PRODUCTION**
> (`20260808090000_nearby_banner`, approved by the repo owner before the push),
> plus a `CLAUDE.md` correction and one new read-only report. The migration was
> already merged to `main` in `a47090c`; this only applied it to cloud.

- **🔴 `CLAUDE.md` claimed cloud was missing an 18–23 migration backlog. It was
  wrong: 23 of the 24 were already applied.** The banner told everyone that
  `events`, `product_sections`, `booking_requests`, the offering columns, both
  menu-follow-up RPCs and the 4-column `public_feature_flags()` did not exist on
  `ilokal-database` and that queries against them would 42P01 in production.
  Every one of them was live. The doc has been steering people away from tables
  that had been in production for weeks — **a stale "it isn't there" costs
  exactly as much as a stale "it is"**, and this is the second time this file's
  migration-state section has drifted (see 2026-08-05).
- **The count was wrong three ways in one file** — 18 in the header, 23 in the
  Schema state prose, 24 on disk. `20260808090000_nearby_banner` was in none of
  the lists; it shipped with the mobile `banner_url` work and was never added.
  The bullet now carries the re-derivation command instead of a hand-maintained
  number.
- **🔴 Why that one survived while 23 louder migrations landed: it fails
  silently.** It is a `DROP FUNCTION` + `CREATE` adding `banner_url` to
  `nearby_businesses`'s `RETURNS TABLE`. On cloud the function still existed and
  still SUCCEEDED — it just returned 18 columns instead of 19. Mobile's schemas
  are plain `z.object()`, so the absent key was dropped and the nearby cards
  fell back to `interior_images[0]`. No error, no failed request, no log line.
  **A missing table 42P01s on first call; a missing return column just
  degrades** — which is why the probe checks `pg_get_function_result()` and not
  merely `proname`.
- **`supabase/reports/cloud_drift_probe.sql` (new)** — one read-only SELECT,
  one verdict per migration. It exists because **the ledger cannot answer this
  question**: the Supabase MCP's `apply_migration` records its OWN timestamp as
  the version and the 2026-07-17 rollout hand-rewrote every row, so a
  `schema_migrations` row can exist without its DDL (and `db push` then silently
  SKIPS it) or DDL can exist under a different version string. The probe reports
  DDL presence and ledger presence **separately** and names the reconcile action
  for each mismatch.
- **The three data-only migrations get row probes, not object probes**
  (`20260805120000`, `20260805130000`, `20260807000000` — rows in `categories` /
  `business_categories`, no DDL). An object probe returns "present" for them
  unconditionally, i.e. it would report success without checking anything.
- **🔴 Object existence is not version existence, and that gap was nearly
  shipped as a conclusion.** PR #18 rewrote the seven `20260727*` files, PR #27
  rewrote `20260804233000` and PR #29 rewrote `20260805090000` — all **in
  place**, after cloud may have seen them. A pre-review draft satisfies every
  existence check. Section 2 of the probe asserts four things only the
  post-review file has; all four PASS. The load-bearing one: **`booking_requests`
  has exactly three policies and no non-admin UPDATE policy**, so cloud has PR
  #18's fix and not the draft whose `FOR UPDATE` policy lacked a `WITH CHECK`
  (Postgres reuses `USING`, so a direct PostgREST `PATCH` could rewrite
  `user_id`/`status`/`starts_at` or re-decide a settled booking).
- **Two probe rows were unsound and passed anyway** — caught in review, worth
  recording because both returned the right answer for the wrong reason. The
  enum check joined `pg_type` but never filtered `typname`, so any enum in the
  database carrying an `on_request` label satisfied it; and
  `categories.business_type_id IS NOT NULL` is satisfied by three *later*
  migrations that also pin categories, so it was not a discriminator for the one
  it was labelled with. Both now scoped, with the reason in a comment.
- **`supabase db query -f` returns only the LAST result set** — verified, not
  assumed. Splitting the version assertions into a second statement would have
  silently hidden all 24 migration verdicts. They are `UNION ALL`'d into one
  statement and the file says why.
- **Flag values recorded from the database rather than assumed:**
  `enable_events` **true** · `enable_bookings` false · `enable_onboarding_tour`
  true · `auto_verify_businesses` true · `require_business_documents` false.
  **Events are NOT dark on cloud** — the "ships dark" note described the seeded
  default, not the current value. Scoped deliberately: the flag was verified,
  not whether the deployed build carries the events code.
- **`db push` needs no ledger reconcile** — it records the FILE's version
  (confirmed on this apply). The reconcile ritual applies only to the MCP's
  `apply_migration`. Conflating them means hand-editing the ledger after every
  push, which is its own risk. Also used `db push --linked` over
  `make migrate-cloud`: that target demands a cloud `SUPABASE_DB_URL` with a DB
  password, which `.env` does not carry (it holds the LOCAL string only), while
  `--linked` goes through the Management API on a PAT.
- **Rollback artifact saved before the DROP** (`pg_get_functiondef`, 3020 B).
  Recorded in `CLAUDE.md` as a standing step for `DROP FUNCTION` migrations,
  alongside the PGRST202 window the `public_feature_flags` rollout documented.
- **Verified post-apply, not assumed:** 19-column signature carrying
  `banner_url`, `SECURITY DEFINER` and `search_path = public, postgis` intact,
  EXECUTE re-granted to `anon`/`authenticated`/`service_role` (ACL byte-identical
  to pre-apply), ledger row present at the correct version, and **a live call
  returning real `banner_url` values**. `supabase migration list --linked` now
  shows both columns populated for all 24.
- Verified: `yarn lint` (0 findings) + **2727** tests + a clean `yarn build`
  (`.next` removed first, no dev server running).
- **🔴 A second, deeper sweep found a REAL partial application — and it is the
  exact failure the first sweep documents as its own blind spot.**
  `supabase/reports/cloud_object_inventory.sql` (new) checks all **98** named
  objects the queued migrations declare (26 functions, 24 indexes, 16 policies,
  11 triggers, 21 columns) rather than one discriminator apiece.
  `idx_products_section_id` was **missing from cloud** while `20260801061117`
  read APPLIED — its sibling index `idx_products_business_section`, defined
  three lines above it in the same file, was present.
- **The cause generalises, which is why it is worth a report file rather than a
  one-off fix.** The index was added to the migration in a LATER commit
  (`ad680af`) than the one that created it (`b2c9a32`). Cloud had already
  applied the file and written its ledger row, so `db push` — which keys on the
  version — skipped it, and the added statement never landed. **Any migration
  edited in place after cloud applied it silently loses the edit**, and this
  repo edits migrations in place routinely: PR #18 rewrote seven, PR #21, #27
  and #29 rewrote one each. The 2026-07-27 entry's own framing ("edits the seven
  unmerged migrations in place") is only safe while *unmerged*.
- **Created on cloud, matching the file byte for byte**
  (`ON public.products USING btree (section_id) WHERE (section_id IS NOT
  NULL)`), on a 49-row/208 kB table, so the lock was negligible. Its absence had
  no measurable cost today; it would have, silently, as `products` grows —
  the archive trigger and the FK's RI check both scan on `section_id`.
- **All 16 RLS policies verified present.** That was the check worth running
  first: a missing *index* is a performance bug, a missing *policy* is a
  security one, and the same in-place-edit mechanism could drop either.
- **⚠️ OVERLAPS `origin/docs/migration-queue-accuracy` (`2c70564`), which is
  already pushed.** A parallel session corrected the same block from the other
  direction: it caught the 23-vs-24 count, added the `20260808090000` entry, and
  drew the same `db push`-vs-MCP reconcile distinction — but **without probing
  cloud**, so it preserved the false "Until they land, cloud has no events
  tables…" claim that this audit disproves. It also fixed a dangling reference
  this branch had missed (`ratings(user_id, product_id)` cited
  `20260528000000`, which is not a file; the migration is
  `20260528000006_ratings_unique_user_product`). **That fix is carried into this
  branch** — verified independently against `supabase/migrations/` — so merging
  this cannot regress it. The two branches WILL conflict on the Migration state
  bullet; take this one's body (it is the probed version) and keep that
  reference fix.
- **Not done:** the local Supabase stack was down for this work, so nothing was
  re-verified against local; and the nearby cards were not viewed in a browser —
  the RPC was proven to return `banner_url`, not that the mobile client renders
  it. The two overlapping branches are not reconciled here — that is a
  merge-order decision for a human.

## 2026-08-09 — Mobile events API, and the column list that is the contract (feat/mobile-events-api)

> **No schema migration, no auth change, no RLS change.** Three new public
> mobile routes, one new shared read contract, and one behaviour change on the
> existing web event surfaces (the promoted-offering gate). Ships **dark** with
> the rest of events, behind `app_settings.enable_events`.

- **`GET /api/mobile/events`, `/:id` and `/nearby`** — the endpoints behind the
  mobile app's `fetchEvents()` / `fetchEvent()` / `fetchNearbyEvents()`. Public
  (`createBearerClient`), kill-switch first, `.range()`d, `.eq('status',
  'approved').is('archived_at', null)` restated on every read.
- **🔴 The column list IS the security boundary, and `select('*')` was the
  leak.** RLS is ROW-level: the public policy on `events` decides which rows an
  anonymous caller may read and says nothing about which COLUMNS come back. A
  wildcard select therefore shipped `review_note` — **the admin's rejection text
  on an unpublished proposal** — plus `reviewed_by` (an `auth.users` id),
  `reviewed_at`, `priority` and the raw WKB `location`, to every unauthenticated
  device.
- **Nothing broke, which is what made it durable.** Mobile's schemas are plain
  `z.object()`, so unknown keys are **STRIPPED, not rejected** — the columns
  arrived, were dropped, and no parse error, render fault or log line ever
  appeared. Same reasoning that made `get_business_public_info` and
  `public_feature_flags` fixed-return-list functions: a column added to `events`
  later stays private by default. Unlike those, this one needed **no migration**
  — the gate is the projection.
- **🔴 `/nearby` returned a shape mobile cannot parse.** `events_nearby` is a
  flat 12-column projection with a `business_name` STRING; mobile's
  `eventsResponseSchema` (commented "also the nearby shape") wants the full
  `MobileEventWithRefs`, with `business`/`product` as OBJECTS and nine further
  keys as **required-nullable**. Nullable is not optional, so `parseOrThrow`
  would have thrown an `ApiError` and taken the screen down — not degraded.
- **Fixed WITHOUT widening the RPC, deliberately.** A `RETURNS TABLE` change
  needs DROP + CREATE rather than `CREATE OR REPLACE` — a HIGH-risk migration
  onto an already-deep cloud queue, plus a window where anon callers get
  PGRST202 (the hazard the `public_feature_flags` rollout recorded). It would
  also have spelled the mobile column list out a SECOND time, in SQL, where
  nothing keeps it in step. Instead the RPC keeps doing the one thing only
  PostGIS can — rank ids by distance — and the route hydrates that page of ids
  through the **same projection** the other two routes use. Nearby inherits the
  contract rather than restating it.
- **Two ordering traps in that merge, both asserted.** `.in()` answers in
  arbitrary order and distance ordering is the entire point, so the RPC's
  sequence drives the output. And `has_more` counts `ranked.length`, **not**
  `events.length` — a row archived between the two reads is dropped to keep
  every emitted row a complete document, and measuring the dropped-row case
  would make one archived event look like the end of the feed.
- **🔴 The promoted offering republished what the shop had taken down.**
  Products RLS (`20260526000007`) gates only `archived_at` and the shop being
  verified — **not `products.status`**. So an offering the owner later set to
  `unlisted` or `disabled` was still readable by anon, and embedding it
  unfiltered put it back on a public event. Every other public product read
  filters `status = 'active'` (`getPublicMenu`, the mobile products route); these
  did not.
- **Gated by AUDIENCE, not blanket** — `EventAudience = 'public' | 'internal'`.
  A blanket filter would have hidden a disabled offering from the **owner's own
  event table** and the **admin review queue**, destroying exactly the
  diagnostic signal those surfaces exist to show. `status` is selected so the
  normaliser can decide and **dropped before the response**: returning a field
  the mobile contract does not declare is how the next reader starts depending
  on it.
- **The heart button needed no API at all.** Checked before building: mobile
  bookmarking is device-local by design. The detail route is therefore
  deliberately **not** date-filtered, so a bookmarked or shared event keeps
  resolving after it finishes — the same reasoning that keeps the public event
  RLS policy undated.
- **`resolveEventMedia` de-forks the read.** Embed-unwrapping and storage
  resolution were verbatim copies in `eventQuery.ts` and `mobileEvent.ts`. The
  bucket names especially are the kind of literal that must exist once — a typo
  in one copy resolves to a 404 image on half the app. Mechanics are shared;
  **policy is not** (which rows, and which offering, differ per surface). The
  de-fork immediately made `resolveStorageUrl` an unused import in `eventQuery`,
  which is the signal it worked.
- **`catch {}` reported the wrong half.** All three routes funnelled an expected
  PostgREST `error` through `loggedServerError` while the outer catch swallowed
  the **unexpected** throws — a normaliser bug, a throwing storage helper —
  answering with a 500 no log stream or tracker could attribute. Backwards: the
  unanticipated failure is the one worth a name. Same blind spot #43 closed on
  the business routes.
- **That fix forced the merge, and the merge is the lesson.** #43 widened
  `loggedServerError`'s `error` param to `unknown` precisely so a `catch (error)`
  binding could reach the funnel without a cast. The two branches' file sets are
  **disjoint**, so git reported a clean merge while `tsc` reported three errors —
  the conflict was in a **signature, not a line**. Next 16 does not typecheck at
  build, so casting instead would have shipped silently.
- **Tests (+~50):** a projection contract (exact column list, private columns
  absent, a raw scan so an embed line cannot smuggle one back), a
  **schema-parity** suite that rebuilds mobile's Zod schemas and parses all three
  real responses — including a case asserting the OLD flat row fails on 11 named
  keys, so the regression stays legible — the nearby two-query ordering and
  dropped-row paths, and six audience-gate tests pinning both directions. The
  contract sweep **strips comments first**: these routes quote what they removed,
  and a sweep that fails on its own explanation teaches people to delete the
  explanation.
- **Every guard was proven by breaking it** — the bare catch reintroduced on one
  route, watched to fail on that route alone, and restored.
- Verified: `yarn lint` + **2714** tests + a clean `yarn build` + **0** `tsc`
  errors in the touched files (repo total unchanged at 59 pre-existing).
- **Not verified — needs a browser:** the web product gate is the only
  user-visible behaviour change here, and Supabase was not running in this
  environment, so it has not been clicked through on a seeded event with an
  `unlisted` offering. `/events/nearby` likewise.
- **Not done:** events remain dark on cloud — the flag is false *and* the events
  migrations are still in the unapplied queue, so these endpoints answer with the
  empty-but-valid payload in production until both land.

## 2026-08-08 — Sentry, phases 2–5: actions, browser, and the decision not to record (feat/sentry-monitoring)

> **No schema, API-contract or auth change.** Builds on the phase-1 entry below.
> Adds the browser and edge runtimes, the Server Action funnel, a root error
> boundary, and one new rate-limited path in `proxy.ts`.

- **🔴 Phase 2 closed the blind spot that automatic instrumentation cannot
  reach.** A Server Action catches its own error and RETURNS
  `{ success: false, error: { code } }` — by design, per `ApiResponse<T>` — so
  it never throws and Next's `onRequestError` never sees it. 75 catch sites
  across 16 files now call `logActionError`.
- **The log call was REPLACED, not supplemented.** Every site already read
  `console.error('[createProductAction]', error)` — the action name was
  already there. `logActionError('createProductAction', error)` logs
  **byte-identically** and reports, so the line people grep in a log stream is
  unchanged and existing console spies still pass. Inserting a second line at
  75 sites would have been the same work and left the log layer noisier.
- **`loggedServerError` was refactored onto the same helper** rather than
  keeping its own copy — the repo's own DRY rule, and it means the API and
  action funnels cannot drift on tag shape or on which errors get dropped.
- **A contract sweep now fails on any bare `console.error('[name]', err)` left
  in a `'use server'` file**, which is what a missed catch looks like.
- **🔴 Browser events go through a same-origin tunnel, and that was the
  security decision of this phase.** The alternative was widening the
  hand-maintained CSP with `https://*.ingest.sentry.io`. The tunnel means
  `connect-src` **does not change at all** — so there is no way to get it subtly
  wrong, and no way for a future CSP edit to silently break reporting. That
  failure mode is the dangerous one: a direct install appears to work in dev and
  sends nothing in production. It also survives ad-blockers, which block ingest
  hosts by name.
- **🔴 The tunnel is an unauthenticated POST that forwards to Sentry**, i.e. a
  free way for anyone to spend the event quota — and a spent quota drops real
  errors too. Rate-limited by IP in `proxy.ts` (60/60s) before anything is
  forwarded, using the existing limiter.
- **It turned out to be a REWRITE, not a route handler** — `/monitoring(/?)` in
  `afterFiles`. Two consequences worth recording: the proxy runs before
  `afterFiles` rewrites, so the limit does apply; and the source matches the
  **trailing-slash form too**, so guarding only the exact path left an
  unlimited way in. Both forms are now matched, in the guard and the matcher.
- **`app/global-error.tsx` added** (SN3). An error in the root layout, or in
  `error.tsx` itself, is catchable nowhere else — `error.tsx` renders inside the
  layout it would need to replace. It replaces the whole document, so it brings
  its own `<html>`/`<body>` and is styled **inline** against the brand neutrals:
  no stylesheet, font or provider is guaranteed to have loaded at that point.
- **`app/error.tsx` finally does what it has always claimed.** It has told users
  "our team has been notified" since it was written while nothing notified
  anyone. It reports now, and shows the event id — a support conversation that
  starts with a reference is a search; one that starts with "a page broke" is an
  investigation.
- **Phase 4 — Session Replay is deliberately NOT shipped, and that is the
  outcome, not an omission.** It records the DOM of a real owner's dashboard:
  coupon codes, customer names, phone numbers. The unsubscribe-class question
  (plan §5 Q4) is unanswered, and this is a product and legal decision rather
  than a config default. A contract test asserts its absence so enabling it has
  to be deliberate.
- **🔴 The measured client cost, which is the honest headline: +87.4 KB gz over
  the no-Sentry baseline** (1,490,783 → 1,578,194). Two separable parts —
  **+14.6 KB** of debug-ID injection that phase 1 already carried, and
  **+72.8 KB** for the browser SDK itself. That lands on `/home`, `/explore` and
  `/for-business`, the pages a stranger loads first, and it is exactly why
  phase 1 shipped server-only instead of installing everything at once.
- **Tests (+17, 2618 → 2635):** the capture helper (10 — no DSN means the SDK is
  never imported, the tag and level, extra only when given, and each dropped
  class, plus proof that `logActionError` still logs a redirect it will not
  report), and the contract sweep extended to all three runtimes, the tunnel's
  three-way lockstep (`tunnelRoute` / `SENTRY_TUNNEL_PATH` / matcher), both
  error boundaries, and the absence of Replay.
- Verified: `yarn lint` + **2635** tests + a clean `yarn build` with zero
  warnings, plus the tunnel rewrite confirmed present in `routes-manifest.json`.
- **Not done, and it is the one that matters:** no error has ever reached a real
  Sentry project from this code. Everything above is verified by tests, builds
  and manifests — **not** by an event arriving. The first deploy with a DSN must
  confirm five distinct issues with readable frames, and check that
  `SENTRY_AUTH_TOKEN` was actually set: a missing token fails **open**, so the
  build succeeds and every stack trace stays minified with no error anywhere.
- **Still deferred:** `Sentry.setUser` (SN15) — see the plan; setting it without
  verified per-request isolation risks attributing one user's id to another
  user's event.

## 2026-08-08 — Sentry, phase 1: the server half (feat/sentry-monitoring)

> **No schema, API-contract or auth change.** One new dependency
> (`@sentry/nextjs@10.69.0`, approved — the stack is otherwise frozen), two new
> root file-convention files, and one edit to the API 500 funnel. Plan, parity
> table (SN1–SN20) and the remaining phases:
> [`.claude/SENTRY_MONITORING.md`](.claude/SENTRY_MONITORING.md) (local, not
> committed). The standing reference is
> [`.claude/docs/monitoring.md`](.claude/docs/monitoring.md).

- **`app/error.tsx` has been telling users "our team has been notified" since it
  was written, and nothing in the repo notified anyone.** Zero occurrences of
  `sentry` anywhere. That sentence is the reason this is phase 1 and not a
  nice-to-have: the app was making a promise it had no mechanism to keep.
- **Server-only, deliberately.** No `instrumentation-client.ts`, no
  `sentry.edge.config.ts`. It captures every API 500 and every server render
  crash while costing the public pages (`/home`, `/explore`, `/for-business`)
  effectively nothing, and needs **no CSP change** — a server→Sentry request is
  not subject to browser CSP. Client monitoring is phase 3 and needs its own
  approval, because that is where the bundle cost and the `connect-src` work
  actually land.
- **🔴 The client-bundle claim was measured, not assumed — and the first
  measurement was wrong.** A naive before/after showed **+15.7 KB gzipped** and
  no `sentry` string anywhere in the client output, which does not add up. Two
  bad hypotheses were tested and discarded (`CI=1`, then `disableLogger`) before
  an A/B with the wrap bypassed isolated it, and stripping the artifacts proved
  it exactly: **100% of the delta is Sentry's debug-ID injection** — a ~290-byte
  prelude plus a `//# debugId=` comment on each of 97 chunks, **157 B gz per
  chunk, 1.02% overall**. Strip them and the bundle lands within 635 B of the
  no-Sentry baseline. Kept: it is what makes an uploaded source map resolve, and
  a page loads a subset of the 98 chunks rather than all of them.
- **`sourcemaps.assets` does NOT stop that injection** — it scopes the upload,
  not the stamping. Tried, measured, reverted rather than left in as config that
  looks like it does something.
- **🔴 `disableLogger: true` was removed after the build itself objected.** It is
  deprecated, its replacement is webpack-only, and the build prints
  *"Not supported with Turbopack"* — which is what this repo builds with. It was
  a no-op that added a warning to every build. A contract test now forbids it.
- **SN2 (the branch's biggest risk) is largely answered: Sentry does not use the
  webpack plugin here.** It runs through Next 16's `runAfterProductionCompile`
  hook, which is Turbopack-native — `✓ Completed runAfterProductionCompile in
  929ms` on a clean build. Source-map upload was declined only for the expected
  reason (no auth token). **Still unproven end-to-end:** that an uploaded map
  actually resolves a production frame. That needs a DSN, an org and a deploy.
- **One edit instruments 60 call sites.** `loggedServerError(context, error)` is
  the single funnel for API 500s, and it already receives a context string —
  which becomes the Sentry tag, so events group by the call site that raised
  them rather than by driver text.
- **The SDK is imported dynamically, and only when `SENTRY_DSN` is set.** A
  static import would pull it into every API-route test; the suite is 2618 tests
  and must stay offline. This makes that guarantee structural rather than
  something a mock has to keep remembering.
- **No DSN ⇒ `enabled: false`**, so dev and CI are silent by construction rather
  than by queuing events nobody receives.
- **The DSN is `SENTRY_DSN`, never `NEXT_PUBLIC_SENTRY_DSN`.** Nothing in the
  browser needs it while this is server-only, and the prefix would inline it
  into every visitor's bundle — the rule that governs the Supabase service-role
  key. A contract test forbids the public name.
- **Redaction is by key SEGMENT, and its tests earned their keep immediately:**
  the first regex matched only the last segment, so `phone_number` and
  `token_hash` both walked straight through. Segment matching also covers
  camelCase, which the TypeScript side of this codebase uses throughout.
- **`code` is matched on key AND value shape, and that compromise is the point.**
  Blanket-redacting `code` would strip `42P01` and `VALIDATION_ERROR` out of
  every event — the single most useful field, leaving the tool to report that
  something failed without saying what. Cashier codes are 6–7 characters from an
  alphabet that **excludes `0`, `1`, `I`, `L`, `O`**, so a SQLSTATE cannot
  collide with one. **In a URL the rule is stricter and unconditional**, because
  `?code=` there is the PKCE authorization code.
- **Request bodies and cookies are deleted outright**, and breadcrumb URLs are
  scrubbed — every Supabase call carries an Authorization header and a PostgREST
  query string full of column filters (`?email=eq.…`).
- **`beforeSend` drops control-flow throws** (`redirect()`, both `notFound()`
  digest spellings, `AbortError`). Unfiltered these are the majority of events:
  every `redirect()` in the app throws one and the proxy redirects on each
  unauthenticated navigation. `isRedirectError` was reused rather than forked.
- **Tests (+43, 2575 → 2618):** the redaction and drop rules (26, as pure
  functions — a helper only reachable through an SDK's `beforeSend` is a helper
  nobody tests), plus a 17-test contract sweep pinning that the wrap did not eat
  `outputFileTracingIncludes` (the welcome-post brand fonts, which fail
  **silently and only in production**, and had no test before this) or
  `bodySizeLimit`, that no client config file exists, that no `NEXT_PUBLIC_`
  DSN is read, and that the SDK import stays lazy. The sweep strips comments
  first — these files name the traps they forbid.
- **`.env.example` created**, with a `!.env.example` exception added to
  `.gitignore`, which was swallowing it via `.env*`. It documents which three
  vars are **build-time only** — a missing `SENTRY_AUTH_TOKEN` fails **open**:
  the build succeeds and simply uploads nothing, so every production stack trace
  stays minified with no error anywhere.
- Verified: `yarn lint` + **2618** tests + a clean `yarn build` (`.next` removed
  first, no dev server running) with **zero** warnings.
- **Not done:** **SN15** (`setUser({ id })`) is deliberately deferred, not
  forgotten — see the plan's "Still open" for why shipping it unverified risks
  attributing one user's id to another request's event, which is a worse defect
  than the missing field. Phase 2 (Server Actions — the real blind spot: 34
  files that catch and return an error code rather than throwing, so automatic
  instrumentation sees none of them), phase 3 (client + CSP), phase 4 (replay).
- **Found on the way, unrelated:** `app/error.tsx` imports `framer-motion`,
  which is **not** in `package.json` — it resolves only because `motion@12`
  depends on it. One line, own branch.

## 2026-08-07 — A shop can no longer register with an empty menu (feat/registration-menu-required)

> **No schema migration.** Two new wizard steps, two new API routes, and the
> friction removals that make the required one cheap to finish on a phone.
> MED risk: it touches the registration submit path, which is the one flow
> where a failure loses an owner. Plan (RM1–RM20):
> [`.claude/REGISTRATION_MENU.md`](.claude/REGISTRATION_MENU.md).

- **🔴 Registration's definition of "done" excluded the menu.** The wizard was
  category → information → gallery → (documents) → review. A shop submitted,
  was auto-verified (`auto_verify_businesses` is seeded true), and went public
  with **zero offerings** — a shop page showing nothing. An owner who never
  added a menu was following the product exactly as designed, which means the
  setup checklist and the whole menu-follow-up feature were both chasing
  someone who had already left.
- **Now: a required "What You Offer" step, one item minimum, name and price.**
  Three was considered — it matches the "3 samples" idea this started from —
  and rejected: it triples the phone typing at the point where abandonment is
  highest, and a shop with two real offerings could not finish registering.
  Items two onward are the dashboard's job.
- **🔴 The step cannot write as the owner types, and that shapes everything.**
  The `businesses` row is created inside `performSubmission` at FINAL submit,
  so there is no `business_id` to attach items to while the step is on screen.
  Items are form state, POSTed after `registerBusiness` returns an id, in the
  same phased flow as the files. Any design that assumes "create the shop,
  then add items" is describing a different wizard.
- **Written `status='active'`, with `kind` sent explicitly.** Both halves are
  load-bearing. The setup checklist and `admin_businesses_missing_menu` count
  only `active`, so an `unlisted` item would satisfy the step, leave the public
  page empty, **and still earn the owner a "you have no menu" email**. And the
  DB defaults `kind` to `'product'` and cannot tell an omitted field from a
  deliberate one, so a services business would otherwise type its own service
  menu as products — the offerings phase-1 decay, one surface earlier.
- **`offeringModeForVerticalName` mirrors `sync_business_type_id`** and says so
  in its docstring. It exists only because the wizard must resolve the shop's
  mode and vocabulary before the row exists; every other surface still reads
  `businesses.offering_mode`. Keyed on the vertical NAME because the trigger
  is, so a rename breaks both together rather than silently diverging.
- **A retry cannot double the menu.** `performSubmission` replays wholesale on
  a 404 and can be re-submitted after a mid-flight failure. Guarded twice: the
  client's `uploadedRef` (same lifecycle as the file uploads, so a 404 replay
  correctly rewrites against the NEW draft) and the server, which skips any
  name the business already has. Neither is load-bearing alone.
- **The step uses the shop's own noun**, resolved from the step-1 category
  through the same pure resolver every other surface uses, degrading per field
  for a custom category or a malformed profile. Watched, not read once — going
  back and changing category updates the wording.
- **An optional launch deal follows it, saved as a DRAFT.** 🔴 This is the one
  step that can cost real money: a `published` coupon inside its window enters
  `mobile_deals` — the app's Deals front page — and is immediately
  **redeemable**, meaning a real `user_redemptions` row, a real six-character
  cashier code and a real owner notification, for a discount a first-time owner
  may have clicked past. Publishing is one unticked checkbox, phrased as what
  it does rather than as a status name, and `publish` is **required** in the
  schema, the route body and the write path — an absent flag is rejected, never
  defaulted, because the direction a default fails in is a live discount nobody
  chose.
- **Optional means optional.** `deal: null` is a complete, valid answer and
  never gates Submit. A half-filled deal is rejected rather than written — a
  code with no discount is an abandoned step, not a skipped one. It sits AFTER
  the menu because a shop with nothing to sell has nothing to discount, and
  that ordering is asserted rather than left to the file.
- **The friction removals shipped first, and stand alone.** The add-product
  form required **three** fields where the schema requires one: category was
  mandatory in the form only — a 9-to-20 option select, twenty of them for the
  water refilling station added the same day. Now optional, because an owner
  forced to pick one picks whatever clears the form, and a WRONG category
  misleads the explore filter in a way NULL does not. Four `grid-cols-2` had no
  breakpoint prefix, so Price sat beside Price Type at 320px. **"Save and add
  another"** keeps the dialog open for the 20-dish carinderia case — bound into
  the submit handler rather than a ref flag, because a rejected submit leaves a
  flag set and the next press of the real Save button then silently behaves as
  "add another".
- **The three "add your first one" surfaces open the form directly** (`?add=1`
  — the checklist row, the dashboard empty state, the empty catalogue). Hunting
  for the button is a step between declaring intent and acting. Marker seeded
  into state so the dialog is there on the first client render, consumed once,
  ref-guarded, and stripped keeping search/filters/page/branch.
- **Verified that the new step and the follow-up feature agree.** Against the
  live database, and pinned as block 12 of `menu_followup.test.sql`: a shop
  registering with a menu is **not** listed by
  `admin_businesses_missing_menu` and is refused by the send-time re-check,
  while a shop with no offerings still is — so the backstop keeps covering
  everyone who registered before this shipped. Proven to fail by writing the
  item `unlisted`, which is exactly the RM4 hazard.
- **Tests (+73, 2350 → 2423)** plus the SQL block. The step-count assertions
  moved twice, as designed — `getStepFieldGroups` parity is what stops a step
  existing that `nextStep()` never validates. Every risky guard was verified by
  breaking it: the bare grid, the `active` status, the name dedupe, and the
  draft default.
- Verified: `yarn lint` + **2423** tests + a clean `yarn build` + the menu
  follow-up SQL suite green.
- **Not verified — needs a browser:** registration is behind auth and this
  environment has no login path, so neither new step has been clicked through.
- **Not done:** templates (RM9) — the plan claimed they needed no migration,
  which was wrong: they would be a new key on every seeded `offering_profile`
  row, so they are a seed change and are deferred rather than half-built. And
  **RM18 (funnel measurement) is blocked on a schema decision** —
  `view_events` provably cannot hold it (its CHECK demands a business or
  product id, and a wizard step has neither), so it needs a new table, i.e.
  approval. Without it, "some owners don't add a menu" still cannot distinguish
  *quit at Gallery* from *quit at the menu step*.
- **Still open (plan §5):** whether `draft` is the right default for the deal
  step, and whether the required menu should have an escape hatch for a shop
  with genuinely no fixed list.

## 2026-08-07 — Pest control and water refilling get their own shop type (feat/registration-menu-required)

> **ONE migration (`20260807000000_service_trades.sql`) — data-only: 2 rows into
> `categories`, 2 into `business_categories`, 2 pin `UPDATE`s. No table, column,
> policy or index change.** Applied on LOCAL only. ⚠️ **Needs human approval
> before merge, then `make migrate-cloud` + a ledger reconcile.** It queues
> behind the existing 20 unapplied migrations.

- **Same gap as `20260805130000`, two more trades.** Neither a pest control
  operator nor a water refilling station existed in either taxonomy: Services
  had 4 shop types (Salon, Spa, Fitness, **Repair Services** — which is what a
  pest control operator had to register as, and how the explore filter grouped
  it), and nothing in Retail's 16 offering categories covered drinking water.
- **2 shop types** — `Pest Control Service` (Services 4 → 5),
  `Water Refilling Station` (Retail 10 → 11). **2 offering categories** —
  `Pest Control & Sanitation` pinned to Services (picker 9 → 10),
  `Drinking Water & Refills` pinned to Retail (20).
- **The verticals differ, and that is the load-bearing decision — not a filing
  preference.** `sync_business_type_id` seeds `businesses.offering_mode` from the
  vertical NAME on INSERT, and **there is no owner-facing control to change it
  afterwards**. So the vertical picks the whole shape of the dashboard:
  - Pest control → **Services** → mode `services`, catalogue reads "Service
    Menu", the offering form renders duration / lead time / service location, and
    `default_booking_mode` is `request` — which is what a quoted site visit is.
  - Water refilling → **Retail** → mode `products`, "Product Catalogue". It is a
    "station" performing a refill, but what the owner actually lists is priced
    **goods** ("5-Gallon Round — ₱30", "Slim — ₱35"). Filing it under Services
    would hand a counter-sale business a service menu, a booking flow and
    per-hour pricing. Delivery, where they offer it, is one more priced line; it
    does not make the shop a service business.
  - **Proven, not assumed:** two rolled-back inserts through the real trigger
    return `services`/"Service Menu" and `products`/"Product Catalogue".
- **Rows are inserted global then pinned**, so a vertical that fails to resolve
  leaves the category visible everywhere rather than nowhere — the fail-open
  shape `20260801064656` established.
- **The seed mirror is a THIRD block, not an append.** `business_types` are
  created by the seed (which runs *after* migrations), so the migration's
  `WHERE bt.name = …` matches zero rows on a fresh database. And the seed's
  per-vertical shop-type blocks are wrapped in
  `IF NOT EXISTS (… WHERE business_type_id = <vertical>)`, so appending to the
  Services or Retail block is a **no-op on every database that has ever been
  seeded** — the trap `20260805130000` documented. Own unguarded per-row
  `WHERE NOT EXISTS` block instead (`business_categories.name` has no UNIQUE, so
  `ON CONFLICT` is unavailable).
- **Both images carry the four constraints the retail tiles paid for.** Non-NULL
  (`ShopCategoryStep.tsx` renders `<Image src={item.imageURL} />` with no
  fallback and types it `string` — a NULL crashes the step), on
  `images.unsplash.com` (allowlisted *and* serving 200 with no redirect hop for
  CSP to re-check), and `h=1200` to force a 4:3 crop, because the card
  top-crops with no `object-cover`.
- **Chosen by eye at card size, and the obvious search results were rejected for
  a specific reason.** The best-composed row of blue 5-gallon jugs has a legible
  **"OASIS"** carton in frame and the next has **"co-op"** across the label — a
  named business on a category tile implies an affiliation that does not exist.
  Final: a technician fogging a living room (reads as fumigation in a home, not
  the janitorial mopping the other candidates showed), and a frame of bulk water
  containers with no brand legible.
- **Verified:** migration applied; re-running it inside a rolled-back
  transaction reports `INSERT 0 0` / `UPDATE 0` twice (idempotent); deleting both
  shop types and nulling both pins, then running the seed, restores all four rows
  with **0** duplicate names — inside a rolled-back transaction, so the dev
  database was never touched; `category_scoping.test.sql` green ("ALL CATEGORY
  SCOPING TESTS PASSED"), which is what covers the new rows' NULL-image,
  duplicate-name and CSP-host assertions without needing a new test; and both
  image URLs fetched **as stored in the row** — 200, `redirects=0`,
  `image/jpeg`.
- No TypeScript or schema changed, so `make generate-types` produces no diff and
  there is nothing new to lint or build.
- **Not done:** cloud apply (needs approval); a browser pass on the registration
  category step (behind auth, no login path in this environment).

