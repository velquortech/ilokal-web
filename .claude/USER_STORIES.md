# iLokal — User Stories & Story Points

> Reverse-engineered from the shipped codebase (`ilokal-web`, Next.js 16 App
> Router + Supabase). Every story below maps to code that exists in this repo —
> routes, Server Actions, migrations, or tests. Written to be read aloud or
> pasted into a video-introduction script.

**What iLokal is:** a hyperlocal discovery platform for Iloilo City. Shoppers
find verified local shops near them, claim coupons, and show a 6-character code
at the counter. Business owners run their shop, branches, menu, and deals from
one dashboard and watch the analytics. Admins verify businesses, review
documents, moderate, and flip platform-wide switches.

**Three roles, one database:** `app_user` (shopper), `business_owner`, `admin`
— enforced in Postgres RLS, in the proxy, and again in every route handler.

**Two clients, one API:** the Next.js web app, plus a mobile app that talks to
`/api/mobile` (public) and `/api/protected/mobile` (JWT-gated).

---

## Scale at a glance (video B-roll numbers)

| Metric | Value |
|---|---|
| Story points delivered | **565** |
| Epics | 16 |
| User stories | 84 |
| Database migrations | 100+ (`supabase/migrations/`) |
| API route handlers | ~90 across `web` / `mobile` / `protected` / `admin` / `auth` |
| Test files / tests | 112 files / **1339** passing |
| Core tables | `businesses`, `branches`, `products`, `coupons`, `user_redemptions`, `follows`, `ratings`, `notifications`, `payments`, `profiles`, … |

Point scale is Fibonacci: 1 = trivial, 3 = a day, 5 = a couple of days,
8 = a week-ish, 13 = a hard multi-surface feature.

---

## Epic 1 — Public Landing & Brand Surface — **13 pts**

The front door. Anonymous, fast, and the only page most people see first.

| ID | Story | Pts |
|---|---|---|
| E1-1 | **As a first-time visitor**, I want a landing page that explains iLokal in one scroll — hero, "Shops Near Me", exclusive deals, follow-your-favorites, trip planner, how-it-works for both shoppers and businesses, live deal previews and testimonials — so I can decide in 15 seconds whether this is for me. | 5 |
| E1-2 | **As a visitor**, I want the nav and footer to move me between marketing sections and real product surfaces without a full page reload, so browsing feels instant. *(Hash anchors render as `<a>`, route links as `<Link>` — enforced by test.)* | 3 |
| E1-3 | **As an anonymous shopper on `/explore`**, I want the same navigation I saw on the landing, so the public surfaces feel like one product instead of two designs. *(Session switch: no user → landing nav; user → app header.)* | 3 |
| E1-4 | **As any visitor**, I want a light/dark theme toggle that follows my system preference, so the app is comfortable at night. | 2 |

---

## Epic 2 — Accounts, Sign-In & Session Security — **44 pts**

One door, role-routed. Everything hardened at the DB layer too, not just in UI.

| ID | Story | Pts |
|---|---|---|
| E2-1 | **As any user**, I want a single `/sign-in` page — no "which portal are you?" question — where my account's role decides where I land: shopper → `/explore`, owner → their business dashboard, admin → `/admin`. | 8 |
| E2-2 | **As a new user**, I want to sign up as a shopper or as a business owner and be dropped into the right place afterward. | 5 |
| E2-3 | **As a returning user**, I want a deep link I clicked before logging in (`?next=`) to survive authentication, so I land where I was going — with the redirect target validated against open-redirect tricks (backslashes, control characters, protocol-relative URLs). | 3 |
| E2-4 | **As a user who forgot my password**, I want a reset email I actually receive, a clear "check your inbox" panel with a 60-second resend cooldown, and a reset form that tells me if the link expired. | 8 |
| E2-5 | **As a security-conscious user**, I want two-factor authentication (TOTP) with a scannable QR code — and I want it to be *enforced*, so abandoning the code step can't leave me signed in. | 8 |
| E2-6 | **As a user with 2FA enabled**, I want password reset to still work — stepping up to AAL2 with my authenticator code before the password changes. | 5 |
| E2-7 | **As the platform**, I want login, signup, and reset rate-limited per IP (30/60s) and per account (8/300s) so credential stuffing and reset spam are throttled before any database work happens. | 5 |
| E2-8 | **As anyone with an old bookmark**, I want `/login`, `/login/business`, and `/login/admin` to keep working (307 redirect, query string preserved). | 2 |

---

## Epic 3 — Shopper Discovery on the Web — **42 pts**

The public shop directory. No account required to browse.

| ID | Story | Pts |
|---|---|---|
| E3-1 | **As a shopper**, I want to browse every verified shop with trigram-powered search, category filters, follower counts, and shareable paginated URLs, so I can find and send someone a link to page 3 of "Cafés". | 8 |
| E3-2 | **As a shopper**, I want a shop's profile page: menu with prices, live coupons, star-rating summary, follower count, interior photo gallery, branch list — plus proper SEO metadata so the page shows up in search and previews well when shared. | 8 |
| E3-3 | **As a shopper on the go**, I want "Shops Near Me" — a geolocated, distance-sorted list backed by PostGIS with an adjustable radius, falling back to Iloilo City Proper if I deny location. | 8 |
| E3-4 | **As a deal hunter**, I want a `/explore/deals` feed with a featured pick, flash deals, category filter, and pagination — with promoted businesses surfacing bigger cards. | 5 |
| E3-5 | **As a shopper**, I want a live branch map with pins for every branch and a straight-line route plus distance from wherever I am — and I want the location prompt to be button-triggered, never sprung on me. | 8 |
| E3-6 | **As a shopper**, I want a one-tap share button that produces a clean public link (`/s/[businessId]`) with Facebook/X/Instagram/TikTok targets. | 3 |
| E3-7 | **As a shopper on a flaky connection**, I want "couldn't load" to look different from "nothing here", so I know to retry instead of assuming the shop is empty. | 2 |

---

## Epic 4 — Coupons, Claiming & the Wallet — **29 pts**

The core transaction loop: claim online, redeem at the counter.

| ID | Story | Pts |
|---|---|---|
| E4-1 | **As a shopper**, I want to claim a coupon and have every rule enforced fairly: the coupon must be published, inside its date window, under its global cap and my per-user cap; if it's follower-only I must follow the shop first; I can't hold two active claims of the same coupon; and a branch-scoped coupon only redeems at its branch. | 13 |
| E4-2 | **As a shopper**, I want a wallet with Active / Claimed / Expired tabs, paginated, so I can find the deal I saved last week. | 8 |
| E4-3 | **As a shopper at the counter**, I want a 6-character code generated by the server (never by my phone) that the cashier can verify and mark claimed, atomically, so the same code can't be burned twice. | 3 |
| E4-4 | **As a shopper**, I want a live countdown on each claim that turns urgent inside 24 hours, so I don't lose a deal I forgot about. | 2 |
| E4-5 | **As an anonymous visitor who taps "Redeem"**, I want a friendly sign-up/sign-in prompt that returns me to the exact coupon afterward — not a dead end. | 3 |

---

## Epic 5 — Follow & Updates Feed — **19 pts**

| ID | Story | Pts |
|---|---|---|
| E5-1 | **As a shopper**, I want to follow a shop with one tap (idempotent — double-tap can't break it) and unfollow just as easily. | 3 |
| E5-2 | **As a shopper**, I want a "Following" page listing my shops, that shows a real error state instead of silently claiming I follow nobody when the query fails. | 5 |
| E5-3 | **As a follower**, I want an Updates feed merging the shops' posts, their new live coupons, and their newly added products into one chronological stream. | 8 |
| E5-4 | **As a shopper**, I want to see how many people follow a shop — while the platform keeps the actual follower list private (counts come from a `SECURITY DEFINER` RPC; the follow graph is never publicly readable). | 3 |

---

## Epic 6 — Business Onboarding & Verification — **40 pts**

| ID | Story | Pts |
|---|---|---|
| E6-1 | **As a shop owner**, I want a guided multi-step registration wizard — shop details, category, location, photos, documents, review — that caches my progress so a refresh doesn't wipe the form. | 13 |
| E6-2 | **As a shop owner**, I want to upload my logo, banner, interior photos, business license, and tax certificate — and if one upload fails mid-flow, I want to resume, not start over and not create a duplicate business. *(Fixed a real production 413: one 16 MB multipart POST split into a JSON draft + per-file uploads.)* | 8 |
| E6-3 | **As a shop owner**, I want to read the Terms and Privacy Policy in-flow and explicitly accept before submitting. | 3 |
| E6-4 | **As an admin**, I want platform switches for whether documents are required at registration and whether new businesses auto-verify — enforced by a database trigger, so a crafted API call can't self-award "verified". | 5 |
| E6-5 | **As a shop owner**, I want to see my verification status and what's still outstanding. | 3 |
| E6-6 | **As a shop owner**, I want onboarding cards and a guided tour on my dashboard until setup is complete, reflecting only the steps that actually apply to me. | 8 |

---

## Epic 7 — Shop Page & Product Catalogue — **32 pts**

| ID | Story | Pts |
|---|---|---|
| E7-1 | **As a shop owner**, I want full product CRUD — name, description, peso price, sale price, category, branch, photo — from a modal that fits on a laptop screen without clipping the save button. | 8 |
| E7-2 | **As a shop owner with hundreds of items**, I want a server-side paginated table with working search, category chips, status filter, branch filter, and a rows-per-page control that actually changes the page size. | 8 |
| E7-3 | **As a shop owner**, I want every image I upload automatically downscaled and converted to WebP at write time, so my storefront loads fast without me knowing what WebP is. | 5 |
| E7-4 | **As a shop owner**, I want my own product categories so my menu is organized my way. | 3 |
| E7-5 | **As a shop owner**, I want an `active / unlisted / disabled` lifecycle so I can hide a seasonal item without deleting its history. | 3 |
| E7-6 | **As a shop owner**, I want a preview of my public storefront — banner, gallery, items, legitimacy badges, customer love — so I can see what shoppers see. | 5 |

---

## Epic 8 — Coupons & Deals Management — **30 pts**

| ID | Story | Pts |
|---|---|---|
| E8-1 | **As a shop owner**, I want to create percentage or fixed-amount coupons with a code, description, start/expiry window, and linked products. | 8 |
| E8-2 | **As a shop owner**, I want to draft a coupon and publish it later, so nothing goes live before I'm ready. | 3 |
| E8-3 | **As a multi-branch owner**, I want to scope a coupon to one branch or to all branches. | 3 |
| E8-4 | **As a shop owner**, I want redemption caps — per customer and total — with the global cap incremented atomically so a rush can't blow past it. | 5 |
| E8-5 | **As a shop owner**, I want a "must follow us first" option so deals grow my audience. | 3 |
| E8-6 | **As a shop owner**, I want a Redeemed Coupons table showing who claimed what, when, and at which branch. | 5 |
| E8-7 | **As a shop owner**, I want featured deals that get bigger placement in the shopper-facing deals feed. | 3 |

---

## Epic 9 — Multi-Branch Management — **26 pts**

| ID | Story | Pts |
|---|---|---|
| E9-1 | **As a growing business**, I want a step-by-step branch creation flow with address, map coordinates, contact details, photos, and documents. | 8 |
| E9-2 | **As an owner**, I want to list, open, and edit every branch from one dashboard. | 5 |
| E9-3 | **As the platform**, I want branch coordinates stored as PostGIS geography so "nearby" search is a real spatial query, not a bounding-box guess. | 5 |
| E9-4 | **As an admin**, I want new branches to go through an approval flow before they appear publicly. | 3 |
| E9-5 | **As an owner**, I want branch photos and branch-specific documents. | 3 |
| E9-6 | **As a shopper**, I want each branch's phone and hours, so I can call before I go. | 2 |

---

## Epic 10 — Business Analytics Dashboard — **40 pts**

Every aggregate computed in SQL, not in Node — because PostgREST caps at 1000
rows and JavaScript `reduce` over a truncated page returns confidently wrong
numbers.

| ID | Story | Pts |
|---|---|---|
| E10-1 | **As an owner**, I want an at-a-glance dashboard: active products, live deals, redemptions, revenue. | 5 |
| E10-2 | **As an owner**, I want per-coupon performance — redemption count and average days-to-redeem — so I know which offer actually works. | 5 |
| E10-3 | **As an owner**, I want a retention chart showing which months' customers came back. | 5 |
| E10-4 | **As an owner**, I want a monthly trend line for redemptions and followers. | 3 |
| E10-5 | **As an owner**, I want a follower funnel — views → follows → redemptions. | 3 |
| E10-6 | **As an owner**, I want customer segments (new / repeat / lapsed / champions) so I know who to win back. | 5 |
| E10-7 | **As an owner**, I want a single business health score summarizing growth, ratings, and activity. | 5 |
| E10-8 | **As an owner**, I want traffic metrics — views and unique visitors — from real view events. | 3 |
| E10-9 | **As an owner**, I want automated suggestions ("your Tuesday redemptions dropped — try a flash deal") so the dashboard tells me what to *do*. | 3 |
| E10-10 | **As an owner**, I want revenue reporting over a rolling window. | 3 |

---

## Epic 11 — Notifications — **33 pts**

| ID | Story | Pts |
|---|---|---|
| E11-1 | **As the platform**, I want a normalized notifications table with typed payloads, RLS so you only ever read your own, and a `SECURITY DEFINER` emit RPC — because authenticated users must never hold a direct INSERT grant. | 8 |
| E11-2 | **As an owner**, I want a notification bell with a live unread badge and infinite scroll over a keyset cursor (no offset drift when new items arrive mid-scroll). | 8 |
| E11-3 | **As an owner**, I want tapping "coupon redeemed" to take me straight to the Redeemed Coupons page — marking it read on the way. | 3 |
| E11-4 | **As a user**, I want to choose which notifications I receive. | 3 |
| E11-5 | **As a business with 50,000 followers**, I want announcements to fan out through a `pg_cron` outbox worker — batched, `SKIP LOCKED`, poison-message isolation, auto-pruned — so publishing a post never times out. Small audiences (≤500) still fan out inline. | 8 |
| E11-6 | **As an owner**, I want a notification the moment a customer redeems one of my coupons, naming the customer, coupon, and branch — and a failure to notify must never roll back the redemption. | 3 |

---

## Epic 12 — Business Settings & Account Security — **27 pts**

| ID | Story | Pts |
|---|---|---|
| E12-1 | **As an owner**, I want to change my email with verification. | 3 |
| E12-2 | **As an owner**, I want to change my password from inside the app. | 3 |
| E12-3 | **As an owner**, I want to enroll and remove TOTP 2FA with a working QR code and a factor list that reflects reality. | 8 |
| E12-4 | **As an owner**, I want per-channel notification preferences. | 2 |
| E12-5 | **As an owner**, I want to publish my operating hours. | 3 |
| E12-6 | **As an owner**, I want to link my social profiles. | 2 |
| E12-7 | **As an owner**, I want a Danger Zone to deactivate or delete my account, with confirmation. | 3 |
| E12-8 | **As an owner**, I want business-level preferences separate from my personal account settings. | 3 |

---

## Epic 13 — Admin Console — **39 pts**

| ID | Story | Pts |
|---|---|---|
| E13-1 | **As an admin**, I want my console scoped to my own id (`/admin/[adminId]`) with a server-side segment guard, so one admin's URL can't be used by another. | 5 |
| E13-2 | **As an admin**, I want the same collapsible sidebar, header, theme toggle, and design tokens as the business dashboard — one design system, not two. | 5 |
| E13-3 | **As an admin**, I want user management split into Admin / Business Owner / Consumer tabs with search, filters, and pagination. | 8 |
| E13-4 | **As an admin**, I want to activate, deactivate, or suspend an account — and I want the database to enforce that a user can never self-clear a suspension. | 5 |
| E13-5 | **As an admin**, I want to review submitted business documents in a signed-URL viewer and approve or reject with remarks, with the owner notified either way (remarks required on rejection). | 8 |
| E13-6 | **As an admin**, I want oversight of every branch across the platform. | 3 |
| E13-7 | **As an admin**, I want platform settings switches (document requirement, auto-verify) with optimistic UI and an audit trail of who changed what. | 5 |

---

## Epic 14 — Admin Analytics & Moderation — **22 pts**

| ID | Story | Pts |
|---|---|---|
| E14-1 | **As an admin**, I want platform-wide analytics: users, businesses, activity. | 5 |
| E14-2 | **As an admin**, I want revenue analytics across subscription plans. | 3 |
| E14-3 | **As an admin**, I want user growth and segmentation numbers. | 3 |
| E14-4 | **As an admin**, I want per-business analytics when I'm investigating one account. | 3 |
| E14-5 | **As an admin**, I want a moderation queue — reports, flagged content, warn / suspend / resolve — so abuse has a workflow, not an inbox. | 8 |

---

## Epic 15 — Mobile API Surface — **59 pts**

The same database, a second client. Bearer-JWT auth, RLS-scoped queries, flat
response envelope.

| ID | Story | Pts |
|---|---|---|
| E15-1 | **As the mobile app**, I want public endpoints for shop detail, products, coupons, business types, and share content — no login required to browse. | 8 |
| E15-2 | **As the mobile app**, I want `businesses/nearby` returning verified branches sorted by real spatial distance with a radius parameter. | 5 |
| E15-3 | **As the mobile app**, I want the deals feed computed entirely in SQL — featured pick, flash split, category filter, promoted-first ordering, deterministic pagination — in one round trip. | 8 |
| E15-4 | **As a mobile user**, I want self-service account management: view and edit my profile, upload an avatar, deactivate reversibly, or archive my account — with guards so I can't self-clear an admin suspension or un-delete myself. | 5 |
| E15-5 | **As a mobile user**, I want to follow and unfollow shops. | 3 |
| E15-6 | **As a mobile user**, I want to redeem coupons and mark them claimed at the counter, filtered by active / claimed / expired. | 8 |
| E15-7 | **As a mobile user**, I want to rate a business or a product — and the database only lets me review a shop I've actually redeemed from, so reviews can't be farmed. | 5 |
| E15-8 | **As a mobile user**, I want a trip planner that bundles my active claims and followed shops into one day plan. | 3 |
| E15-9 | **As a mobile user**, I want an in-app notification list with read and read-all. | 3 |
| E15-10 | **As a mobile user**, I want an updates feed from the shops I follow. | 5 |
| E15-11 | **As the mobile app**, I want every image field to come back as a working URL whether it was seeded as a full URL or stored as a raw bucket path. | 3 |
| E15-12 | **As the platform**, I want the entire mobile surface IP rate-limited (200 req / 60s, `429` + `Retry-After`) before any auth or database work. | 3 |

---

## Epic 16 — Platform Hardening, Performance & Quality — **70 pts**

The unglamorous half. Worth a slide in the video: this is what "production" means.

| ID | Story | Pts |
|---|---|---|
| E16-1 | **As the platform**, I want every RLS policy to wrap `auth.uid()` as `(select auth.uid())` so it evaluates once per query instead of once per scanned row — 126 policies rewritten by a catalog-driven migration; the Supabase advisor's `auth_rls_initplan` count is held at zero. | 13 |
| E16-2 | **As the platform**, I want privilege escalation closed at the database: a trigger silently reverts any non-admin attempt to change their own `role`, escape a `suspended` status, or clear their own archive flag — red-teamed in SQL by impersonating a user through PostgREST. | 8 |
| E16-3 | **As the platform**, I want review abuse blocked by a RESTRICTIVE policy, not by a UI check, and the resulting `42501` mapped to a friendly 403. | 5 |
| E16-4 | **As the platform**, I want rate limits on every auth route and every Server Action that mutates on behalf of a user. | 5 |
| E16-5 | **As a shopper**, I want public reads cached (business types 5 min, business detail 120s, coupons 60s) with cache-on-error explicitly prevented, so the feed is fast but never serves a cached failure. | 5 |
| E16-6 | **As the platform**, I want indexes on every hot foreign key and search column (Postgres doesn't auto-index FKs), trigram indexes for wildcard search, and heavy aggregations pushed into `SECURITY DEFINER` RPCs — after an audit found analytics silently truncating at 1000 rows and four whole modules querying tables that never existed. | 8 |
| E16-7 | **As the platform**, I want a write-time image pipeline (sharp → downscale → WebP q80) because the hosting plan has no on-the-fly transforms. | 5 |
| E16-8 | **As the team**, I want 1339 tests across 112 files — unit, integration, SQL, and DOM-render tests built on `react-dom/client` + happy-dom rather than adding a dependency to a deliberately frozen stack. | 13 |
| E16-9 | **As the team**, I want migrations versioned, applied in order, type-generated into the repo, and ledger-reconciled between local and cloud so a push never re-applies history. | 5 |
| E16-10 | **As the platform**, I want raw driver errors never returned to a client — table, column, and constraint names stay server-side; clients get a generic message and a code. | 3 |

---

## Video narration skeleton

Four beats, roughly 90 seconds:

1. **The problem (0:00–0:15).** Local shops in Iloilo are invisible online.
   Shoppers can't find them; owners have no channel and no data.
2. **The shopper loop (0:15–0:45).** Open the app → allow location → verified
   shops sorted by distance on a live map → claim a deal → show a 6-character
   code at the counter. Follow your favorites and get their updates. *(Epics
   3, 4, 5.)*
3. **The business loop (0:45–1:15).** Register, upload documents, get verified.
   Publish products with peso pricing, run coupons with real caps and follower
   gates, manage every branch from one dashboard — then read retention,
   segments, funnel, and a health score computed in SQL. *(Epics 6–10.)*
4. **The engineering (1:15–1:30).** Three roles enforced in Postgres RLS, the
   proxy, and every handler. One database, two clients. Privilege escalation
   closed at the trigger level. 1339 tests. *(Epics 2, 15, 16.)*

**Closing line:** *565 story points. 16 epics. One platform that makes a
neighborhood shop as findable as a chain.*
