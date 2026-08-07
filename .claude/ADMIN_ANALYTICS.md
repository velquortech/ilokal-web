# Admin dashboard — real data instead of literals

> **The headline: the database is not the problem, and nothing about this
> touches production data.**
>
> The cloud project `ilokal-database` holds **real** rows — 41 profiles, 13
> businesses, 15 products, 2 coupons — and **zero** seeded sample accounts. The
> "mock data" on the admin dashboard is hardcoded in the page itself: four stat
> cards and both charts are literals with no data fetching anywhere in the file.
>
> So this is a **code-only change**. No migration, no backfill, no deletion, no
> row touched. "Don't affect the real users" is satisfied by construction.
>
> Branch: `feat/admin-real-analytics`, cut from `main`.

---

## 1. Facts, checked against the live cloud project

Each verified by query against `skvgasimllpyhyudpycu`, read-only.

| # | Fact | Consequence |
| --- | --- | --- |
| **F1** | **The cloud data is real.** 41 auth users / 41 profiles, 13 businesses (all `verified`, 0 pending, 0 archived), 15 products, 2 coupons, 13 branches | Nothing to clean up. The seeds were never run against cloud: `@test.local` = **0**, `follower%@ilokal.dev` = **0**. Only 1 dev account exists |
| **F2** | **The dashboard is `'use client'` with zero `await`s.** `app/admin/[adminId]/page.tsx` hardcodes `1,050` users, `620` businesses, `24` pending documents, `+18%` growth, and a 6-row `dashboardData` const feeding both charts | This is the entire bug. Every number an admin sees is a literal |
| **F3** | **The data layer already exists and is correct.** `getPlatformOverview`, `getUserMetrics`, `getRevenueMetrics`, `getBusinessMetrics` read the real tables, and the phantom `is_active`/`is_suspended` columns were fixed in the 2026-07-17 audit | Reuse it. Three API routes consume it — but **no page renders any of it** |
| **F4** | **The analytics-source tables are empty on cloud:** `user_redemptions` 0, `view_events` 0, `payments` 0, `follows` 0 | Real revenue and real traffic are genuinely **zero**. That is honest, but it means panels built on them will be blank, and the headline numbers drop from 1,050 → 41 and 620 → 13 |
| **F5** | Admin RLS policies exist on both `profiles` ("Admins have full access") and `businesses` ("Admins manage all businesses") | The ordinary RLS-scoped server client works under an admin session. **No service-role client is needed**, which keeps this off the RLS-bypassing path entirely |
| **F6** | **`auto_verify_businesses = true` and `require_business_documents = false` on cloud** | "Pending Documents" is structurally **always 0**: no documents are ever collected, and no business ever sits in `pending`. The card cannot become truthful by wiring it up — it has to change meaning or go |
| **F7** | No monthly-growth aggregate exists (no `analytics_*` RPC for platform growth) | The standing rule is "aggregations belong in SQL" because PostgREST caps at 1000 rows — but that cap applies to **returned rows**, not to `count: 'exact', head: true`. Bucketed head-only counts are exact and cap-free, so the growth chart needs **no migration**. That matters: cloud is 22 migrations behind |

---

## 2. Parity table

| ID | Item | Why it matters | Risk |
| --- | --- | --- | --- |
| **AD1** | The dashboard renders four fabricated numbers | An admin surface that invents its own figures is worse than one that shows nothing: it is used to make decisions. This is the whole task | 🔴 |
| **AD2** | **"Growth Rate +18%" has no definition anywhere** | There is no formula, no period and no source. It cannot be "wired up" because there is nothing to wire it to. Either define it (month-over-month new signups) or remove it — inventing a plausible formula to keep the card is how a made-up number becomes a real one | 🔴 |
| **AD3** | **"Pending Documents: 24" cannot ever be true** (F6) | With `require_business_documents=false` nothing is uploaded, and with `auto_verify_businesses=true` nothing waits in `pending`. Wiring it honestly yields a permanent 0. It should read the real review queue and be **absent** when the flags make it meaningless — the same rule the wizard's Documents step already follows | 🟠 |
| **AD4** | A failed read must not render a confident `0` | This repo has had to fix outage-vs-empty on the setup checklist, the event stats, the booking stats and the follow-up page. Four zeros and a database outage look identical, and on an admin dashboard that is a decision made on bad information | 🔴 |
| **AD5** | The page must become a server component, but the charts cannot | `recharts` needs the client. Converting the whole file would pull the data fetch into the browser; leaving it client would keep the literals. Split: server page reads, client chart renders | 🟠 |
| **AD6** | Monthly buckets must not be fetch-then-group (F7) | `select('created_at')` then grouping in Node silently truncates at 1000 rows — the exact defect the analytics RPCs exist to prevent. Use one head-only `count` per bucket, which is exact at any size | 🔴 |
| **AD7** | Month boundaries must be pinned to `Asia/Manila` | The server is UTC. An unpinned month boundary puts 8 hours of signups in the wrong bucket, and the repo already pins this for shop hours, events and deal cards | 🟡 |
| **AD8** | Revenue is real but always zero (F4) | `payments` is empty and there is **no billing surface in this app** — the billing routes were deleted as dead in the 2026-07-17 audit. A "Total Revenue ₱0" card advertises a feature that does not exist, which is what `ProCard` was removed for | 🟠 |
| **AD9** | Reuse `analyticsQuery`, do not write a second copy | `getPlatformOverview` and `getBusinessMetrics` already return exactly what the top cards need, already head-only, already parallel, already carrying the 2026-07-17 fixes. A fresh query would re-introduce the phantom-column bug | 🟠 |
| **AD10** | A server component must call `lib/api` directly, never the HTTP route | `/api/admin/analytics/*` exists, but calling it from an RSC is a network round-trip to ourselves. The standing rule: Server Actions and RSCs use `lib/api/*`; `lib/services/` is the admin/axios pattern | 🟠 |
| **AD11** | **Do not touch cloud rows** | Explicit non-goal. There are real signups and real businesses. Nothing in this change deletes, updates or seeds anything — and the plan needs no migration either | 🔴 |
| **AD12** | The numbers will visibly shrink (F1/F4) | 1,050 → 41 and 620 → 13. Correct, and the point — but it will read as a regression to anyone who saw the old page. Worth saying out loud in the PR rather than letting someone discover it | 🟡 |
| **AD13** | `loading.tsx` already exists for the admin root | Adding `await`s makes it matter for the first time. Verify it renders something dashboard-shaped rather than a table skeleton | 🟡 |
| **AD14** | `users/page.tsx` and `account-status/page.tsx` are also `'use client'` with no awaits | They fetch client-side, so their `loading.tsx` only covers the RSC hop. **Out of scope here** — they show real data, just fetched late — but they are the next thing to look at | ⚪ |

---

## 3. Decisions

**Show the real numbers even though they are small.** 41 users and 13
businesses is what the platform has. A dashboard that says 1,050 is not a
nicer version of the truth, it is a wrong one.

**Delete the two cards that cannot be made true**, rather than wiring them to
a plausible-looking substitute:

- *Growth Rate* has no definition (AD2). Replaced with **new signups in the
  last 30 days**, which is a real number with a real period — not a percentage
  invented to fill the same box.
- *Pending Documents* is structurally 0 (AD3). Replaced with **shops awaiting
  review**, and hidden entirely while `auto_verify_businesses` is on, because a
  permanent 0 on an admin dashboard trains people to ignore the card.

**No revenue card** (AD8). There is no billing in this app. Adding "₱0" would
advertise a feature that does not exist — the `ProCard` mistake.

**No migration.** Head-only bucket counts make the growth chart exact without
one (F7), and cloud is already 22 migrations behind. Adding a 23rd for a chart
would be the wrong trade.

---

## 4. Action items

- [ ] **AD9/AD10** — new `getPlatformGrowth(months)` in `lib/api/admin/analyticsQuery.ts`: one head-only `count` per month per entity, `Asia/Manila` boundaries (**AD6/AD7**)
- [ ] **AD4** — every reader reports `failed` separately from `0`; the cards render an em dash on failure, never a zero
- [ ] **AD5** — `page.tsx` becomes a server component; the recharts pieces move to a `'use client'` child that takes data as props
- [ ] **AD1** — the four stat cards read real values: total users, total businesses, verified businesses, new signups (30d)
- [ ] **AD2/AD3** — drop *Growth Rate* and *Pending Documents* as written; the review-queue card is conditional on `auto_verify_businesses`
- [ ] **AD8** — no revenue card
- [ ] **AD13** — check the admin `loading.tsx` matches the new shape
- [ ] Tests: bucket boundaries at a Manila month edge, outage renders no zeros, counts are head-only, the review card hides on the flag

## 5. Explicitly not doing

- Deleting, updating or seeding any cloud row (**AD11**).
- Any migration.
- `users/page.tsx` / `account-status/page.tsx` client fetching (**AD14**).
- Traffic or redemption panels — `view_events` and `user_redemptions` are
  empty, so they would be honest but blank. Worth revisiting once the mobile
  app is producing events.
