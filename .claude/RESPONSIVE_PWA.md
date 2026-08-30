# Responsive Dashboards + PWA Install — parity table & action items

> **Status: IN PROGRESS — phases 1 and 2 have LANDED (see §7).**
> Scope: every page under `app/admin/[adminId]/**` and `app/business/[businessId]/**`,
> plus a first-party PWA install path (manifest + service worker + install prompt)
> so both dashboards can be added to a phone home screen.
>
> **No schema, API-contract or auth change is proposed.** The service worker is
> the one piece with a real security surface — see PW7/PW8, which are the two
> items that must not be got wrong.
>
> **The stack is frozen.** `next-pwa` / `@ducanh2912/next-pwa` / `workbox-*` are
> NOT options. Everything below is built from Next 16 file conventions
> (`app/manifest.ts`), a hand-written `public/sw.js`, and `sharp` (already a
> live dependency — `lib/api/helpers/image.ts` imports it, resolvable at
> 0.34.5), so this needs no `yarn add`.

---

## 0. What is actually there today (measured, not assumed)

Run on 2026-08-29 against `main` @ `6b049c2`.

**Pages in scope — 24 route files.**

| Surface | Count | Files |
| --- | --- | --- |
| Admin | 11 | `page.tsx` under `[adminId]/` + `account-status`, `bida-of-the-day`, `branches`, `businesses`, `categories`, `events`, `menu-follow-up`, `settings`, `users`, `welcome-posts`, plus the `app/admin/page.tsx` resolver |
| Business | 13 | `[businessId]/page.tsx` + `branches` (list/create/[branchId]), `coupons`, `events`, `insights`, `product-catalogues`, `profile`, `redeemed-coupons`, `settings`, `shop`, `shop/gallery`, plus `app/business/page.tsx` and `app/business/registration/page.tsx` |

**Responsive posture is lopsided, and the number says it plainly:**
`grep -rno 'sm:grid-cols\|md:grid-cols\|lg:grid-cols'` returns **37** hits
across `app/business` and **8** across `app/admin`. The business dashboard has
had three rounds of mobile work (the 2026-07-24 modal pass, the 2026-07-25
toolbar pass, the `h-dvh` shell migration); **the admin dashboard has had
none of them.** Most of the real defects below are therefore admin-side, and
"make it all responsive" is mostly "bring admin up to where business already
is", not a greenfield pass.

**PWA: nothing exists.** No `manifest.*` anywhere in the repo, zero
`serviceWorker` references in `app`/`components`/`lib`/`config`/`public`, and
`public/` holds only `brand/`, `images/`, `leaflet/` and four stock SVGs.
`app/layout.tsx` exports a `viewport` carrying `themeColor` only — the
`width=device-width, initial-scale=1` meta is Next's default and IS present in
the built HTML (verified in `.next/server/app/index.html`), so that part needs
no change.

**Icons already exist and are the right sizes** (`public/brand/icon/`):
`app-icon-192.png`, `app-icon-512.png`, `app-icon-1024.png`,
`apple-touch-icon-180.png`, `favicon-16/32`, plus a reversed 1024. What is
missing is a **maskable** cut (PW3) — every one of these is the full-bleed
mark, which Android will crop into a circle straight through the artwork.

---

## 1. Parity table — Responsive (RD1–RD18)

Severity: 🔴 breaks or hides functionality on a phone · 🟠 usable but wrong ·
🟡 polish.

| # | Sev | Finding | Where | Fix |
| --- | --- | --- | --- | --- |
| **RD1** | 🔴 | **Admin shell is `h-screen overflow-hidden`.** On a phone `100vh` is taller than the visible viewport while the URL bar is showing, so the bottom of the content column sits behind the browser chrome — unreachable in webviews whose bar never collapses. The business shell already migrated away from this and says why in a comment. | `app/admin/[adminId]/components/AdminLayout.tsx:21` | `h-dvh`, matching `BusinessLayout.tsx:50`. One word. |
| **RD2** | 🔴 | **Admin sidebar trigger is a 36px touch target** (`h-9 w-9`) — the only way to reach navigation on mobile, since the sidebar is a `Sheet` below 768px. Business already ships `h-11 md:h-9` (44px on touch, 36px on desktop). | `app/admin/[adminId]/components/AdminHeader.tsx` | Copy the business rule verbatim. |
| **RD3** | 🟠 | **7 of 11 admin pages hand-roll their heading** (`text-3xl font-bold tracking-tight`) instead of `PageHeader`. `PageHeader` sizes with `clamp(1.75rem,2.4vw,2.25rem)` and wraps its action row; a raw `text-3xl` does not shrink and its sibling action button does not wrap, so the header row overflows at 320–375px. | `admin/{page,events,users,categories,settings,account-status,branches,menu-follow-up,businesses}` — see §0 for the list; `bida-of-the-day` and `welcome-posts` already use it | Adopt `components/custom/PageHeader.tsx`. Also fixes the Pally/Inter split — those pages currently read as a different product. |
| **RD4** | 🟠 | **Same gap on the business side, 4 pages**: `[businessId]/page.tsx`, `insights`, `branches`, `coupons`, `redeemed-coupons`, `product-catalogues`, `events` hand-roll headings. `insights/page.tsx` uses `font-display text-2xl` inline. | as listed | Same fix. Lower priority than RD3 — business headings are at least `text-2xl` with `flex-wrap` around them in most cases. |
| **RD5** | ~~🟠~~ | **WITHDRAWN — the finding was an artefact of the grep, and the code was already right.** The original scan flagged 10 stat rows as "`grid-cols-2` with no breakpoint prefix". Every one of them carries a step (`grid-cols-2 gap-4 sm:grid-cols-3`, `md:grid-cols-4`) and several carry a `col-span-2 sm:col-span-1` on the last card so an odd count leaves no orphan — with a comment saying so. 2-up at 320px is the *deliberate* choice for a tile holding an icon, a short label and a number, and stacking them would have made every stats row a full screen of scrolling. **A `grep -v` for `sm:grid-cols` on the same LINE cannot see a step written elsewhere in the class string.** The replacement scan (§4) parses the class literal, which is what turned 25 raw hits into 6 real ones. |
| **RD6** | ~~🟠~~ | **WITHDRAWN, same cause.** Both are already `grid-cols-3 gap-2 sm:grid-cols-4`, and the skeleton matches the real grid exactly — so the layout does not jump on load either. Nothing to do. |
| **RD7** | ~~🟠~~ | **WITHDRAWN — every one was a substring match inside `max-w-`.** `w-[320px]` was `w-full max-w-[320px]`; both `w-5xl` hits were `w-full max-w-5xl`; `TourDialog` is `max-w-[calc(100%-2rem)] sm:max-w-5xl`, i.e. already the most careful of the four. **A width grep must anchor on a word boundary that excludes `max-`**, or it reports the fix as the bug. |
| **RD7b** | 🟠 | **REPLACES RD7, and this one is real: oversized padding that never steps.** `p-20` is 160px of horizontal inset. At 320px the shell has already spent 32px, so the business dashboard's empty state had **128px** left for an icon stack, a heading and two buttons — the buttons wrapped to one word per line. Two more at `p-12`. Found by scanning for `p-{12..29}` with no `sm:`/`md:` step, which is the check nobody had written because the eye goes to grids. | `business/home/components/EmptyState.tsx`, `admin/components/shared/UsersTable.tsx` (×2), `business/shop/components/customer-love.tsx` | **DONE** — `p-8 sm:p-12 lg:p-20` / `p-6 sm:p-12`. Pinned by the padding block in §4. |
| **RD8** | 🟠 | **The admin `UsersTable` is a second table implementation.** `admin/[adminId]/components/shared/UsersTable{,Header,Body,Pagination,ColumnVisibility}.tsx` is a hand-rolled TanStack stack, not `components/custom/data-table/DataTable`. So every responsive fix made to the shared table (the wrap-safe pagination from 2026-07-25, the `emptyState` prop, the selection-line rule) has to be made twice, and one copy will be forgotten. | `admin/[adminId]/components/shared/*` | Port `users` + `account-status` onto the shared `DataTable`. This is the largest single item here and deserves its own commit. |
| **RD9** | 🟡 | **No mobile presentation for wide tables.** `components/ui/table.tsx` wraps every table in `overflow-x-auto`, so nothing is *hidden* — but a 7-column business table on a 375px screen is a scroll-within-scroll that most people never discover. | all table pages, both dashboards | Two options; pick one and apply it uniformly. (a) Column priority: `hidden md:table-cell` on secondary columns (cheap, keeps one code path). (b) A card list below `md`. **(a) is the recommendation** — (b) doubles the render surface for every table, which is how the two admin/business copies diverged in the first place. |
| **RD10** | 🟡 | **The admin header carries no identity block on mobile.** With the sidebar sheet closed by default, an admin on a phone sees a hamburger, a bell and a theme toggle — no brand mark, no indication of which product they are in. The business header solves exactly this with a `state === 'collapsed' ? 'md:flex' : 'md:hidden'` pair. | `AdminHeader.tsx` | Mount `BrandMark` under the same rule. |
| **RD11** | 🟡 | **Admin `SidebarProvider defaultOpen={false}` is hardcoded**, while business seeds it from the `sidebar_state` cookie server-side. Not a responsive bug (mobile uses the sheet either way), but it means an admin's collapse choice never survives a reload — the exact defect the business side fixed on 2026-08-06. | `AdminLayout.tsx:26` | Read `SIDEBAR_COOKIE_NAME` in `app/admin/[adminId]/layout.tsx` via `sidebarDefaultOpen()` and pass it down. Shares the existing `config/sidebarCookie.ts`. |
| **RD12** | 🟡 | **Charts are only partly responsive.** `ui-standards.md` mandates `ResponsiveContainer width="100%" height={300}` but there is exactly **one** `ResponsiveContainer` in the whole dashboard tree (`insights/components/BidaAnalyticsDashboard.tsx:89`); the admin `GrowthChart` and its `h-96` skeleton need auditing against it. | `admin/[adminId]/components/GrowthChart.tsx`, `insights/components/*` | Audit every recharts mount; height may stay fixed, width must not. |
| **RD13** | 🟠 | **Narrowed from 10 suspects to ONE real defect, and it is a good one.** Of the flagged field grids, `add-product.tsx` was already `grid-cols-1 sm:grid-cols-2` (the scan had matched the *comment* explaining that), `edit-branch`/`step-branch-images`/`ShopCategoryStep` all carry steps, and the BOGO Buy/Get pairs and the two radio-card pairs are correct at 2-up. What was left: **the coupon dialog's Start Date / Expiry Date pair — two `datetime-local` inputs side by side.** That control renders `MM/DD/YYYY, --:-- --` natively; inside a dialog at 320px each cell is ~120px, so the value is truncated to nothing usable. The same pair in `apply-sale.tsx` and `EventFormDialog.tsx` **already stacks, each with a comment saying why** — the coupon dialog was the last one that did not. | `business/[businessId]/coupons/components/promo-form-dialog.tsx` | **DONE** — `grid-cols-1 sm:grid-cols-2`, matching its two siblings. The remaining 6 are on an explicit allowlist in §4, each with the reason it is fine. |
| **RD14** | 🟡 | **Long headings and toolbars need a 320px pass.** The 2026-07-25 pass fixed `SearchBar`'s `min-w-sm` and made four toolbars `flex-wrap`, but only on the pages it touched (`product-catalogues`, `coupons`, `redeemed-coupons`, admin `businesses`). The other 17 pages were never checked. | remaining pages | Re-run the same sweep; the contract test at `__test__/.../table-toolbar.contract.test.ts` already fails on a reintroduced `inline-flex h-10` row and can be widened. |
| **RD15** | ~~🟡~~ | **WITHDRAWN — admin settings has no tabs.** It is two stacked cards (`FeatureFlagsCard`, `RegistrationSettingsCard`) under a hand-rolled heading. The heading is real and is covered by RD3; there is no tab strip to overflow. |
| **RD16** | 🟡 | **`h-96` skeletons and other fixed heights** are fine at width but should be verified not to force scroll-within-scroll inside the `overflow-auto` content column on a short landscape phone. | `admin/[adminId]/page.tsx` `GrowthSkeleton`, `components/custom/skeletons.tsx` | Audit only; likely no change. |
| **RD17** | 🟠 | **Nothing prevents any of this coming back.** Every responsive fix this repo has shipped that stuck was pinned by a contract sweep (the toolbar sweep, the dialog sweep, the brand-green sweep). | new | New `__test__/config/responsive.contract.test.ts` — see §4. |
| **RD18** | 🟡 | **No viewport sweep has been run on either dashboard.** Every dashboard entry in the CHANGELOG since 2026-08-04 carries the same line: *"Not verified — needs a browser: these surfaces are behind auth and this environment has no login path."* `puppeteer` and `puppeteer-core` are both live dependencies. | — | See §5. This is the item that finds the defects the greps above cannot. |

---

## 2. Parity table — PWA install (PW1–PW14)

| # | Sev | Item | Decision / trap |
| --- | --- | --- | --- |
| **PW1** | — | **`app/manifest.ts`** (Next 16 file convention, typed `MetadataRoute.Manifest`). Serves `/manifest.webmanifest` and Next emits the `<link rel="manifest">` itself. | A hand-written `public/manifest.json` would need its own `<link>` in the root layout and would not be typed. Use the convention. CSP needs no change: `manifest-src` is unset, so it falls back to `default-src 'self'`, and the file is same-origin. |
| **PW2** | 🔴 | **`start_url` must NOT be `/`.** `next.config.ts` redirects `/` → `NEXT_PUBLIC_DESTINATION` with **`permanent: true`** (a 308, which browsers cache aggressively). A PWA launching into a 308 is a visible stutter on every cold start, and if the env var is ever empty the redirect target is the empty string. | Set `start_url: '/home'` explicitly (or a dedicated `/launch` resolver — see PW5). Pin it in the contract test against the redirect list so the two cannot drift. |
| **PW3** | 🔴 | **Maskable icon is missing.** All seven existing icons are full-bleed. Android applies a circular/squircle mask with a **40% safe zone**; a full-bleed mark gets its edges cut off, which on this brand means slicing the submark. | Generate `app-icon-maskable-512.png` with `sharp` — the existing 512 composited onto a Brick Ember (`#D70005`) square at 60% scale, centred — and declare it `"purpose": "maskable"` **as a separate entry** from the `"any"` one. One icon declared as both is masked *and* used unmasked, and looks wrong in one of the two places. |
| **PW4** | 🟠 | **iOS needs its own metadata.** iOS ignores most of the manifest: it reads `apple-touch-icon` (already present at `app/apple-icon.png`), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` and `apple-mobile-web-app-title`. | Add `appleWebApp: { capable: true, title: 'iLokal', statusBarStyle: 'default' }` to the root `metadata`. Next emits all three tags. |
| **PW5** | 🟠 | **`start_url` is role-dependent and cannot be.** A manifest has exactly one start URL, but this app has three homes: `/admin/<id>`, `/business/<id>` and `/explore`. Both dashboard ids are in the path, so neither can be baked in. | Launch at `/home` and let the existing `getCurrentUser` → `redirectByRole` path route the session. This already works — it is what `/business` and `/admin` do as resolvers. Do **not** invent a fourth resolver. |
| **PW6** | 🟠 | **`scope`.** Leaving it at `/` means every route, including `/monitoring` (the Sentry tunnel) and `/api/**`, is inside the SW's control. | `scope: '/'` is still correct — it must cover both dashboards and `/explore` — but the *service worker* must then be explicit about what it declines to touch (PW7). Scope is not the safety mechanism; the fetch handler is. |
| **PW7** | 🔴 | **The service worker must never cache an authenticated response.** Every dashboard page is `dynamic = 'force-dynamic'`, cookie-scoped and RLS-scoped. A cached `/business/<id>` HTML or RSC payload served to a second account on a shared phone is a data leak, and a cached one served to the *same* account after a sign-out shows a dashboard the session no longer has. | The fetch handler must **bail unconditionally** — no `respondWith` at all — for: any method other than `GET`; any cross-origin request; and any same-origin path matching `/api/`, `/admin`, `/business`, `/customer`, `/monitoring`, or carrying an `RSC` / `Next-Router-*` request header. What is left to cache is precompiled static output and public assets, which is the entire legitimate win. |
| **PW8** | 🔴 | **Server Actions are POSTs and must not be intercepted.** Every mutation in both dashboards is a Server Action. A SW that touches POST — even to pass it through with a `fetch()` of a consumed body — breaks writes in a way that only reproduces once installed, i.e. after the user has added it to their home screen. | Covered by the method bail in PW7, but pin it with its own test: the handler must not call `respondWith` for a POST. Break it deliberately and watch that test fail before trusting it. |
| **PW9** | 🟠 | **Precache list and the update path.** A stale SW serving a stale shell is the classic PWA failure — users pinned to a build from weeks ago with no way to know. | Version the cache name with the build id, `self.skipWaiting()` + `clients.claim()` on activate, and delete every non-current cache in `activate`. Serve `/sw.js` with `Cache-Control: no-store` via a `headers()` entry, or the browser will cache the *worker itself* for 24h and updates land a day late. |
| **PW10** | 🟠 | **Offline fallback page** (`app/~offline/page.tsx`, precached). Only reached for a navigation the network refused. It must NOT imply the dashboard works offline — nothing here does, since every read is a cookie-scoped RSC. Copy should say the connection dropped and offer a retry. | Distinguishing "offline" from "we broke" is the same outage-vs-empty rule this repo applies on every other surface. |
| **PW11** | 🟠 | **Install prompt UI.** Chrome/Android fires `beforeinstallprompt`, which must be captured and re-fired from a real user gesture. iOS Safari fires nothing at all and needs written Share → Add to Home Screen instructions. | A small `InstallPrompt` client component: capture the event, show a dismissible bar, `prompt()` on click, remember the dismissal in `localStorage`, and render the iOS instructions when `navigator.standalone === false` on an iOS UA. Never show it when already installed (`display-mode: standalone` media query). |
| **PW12** | 🟡 | **`display: 'standalone'`** (not `fullscreen` — that hides the status bar, which owners need for time and battery), `orientation: 'portrait'` is **wrong** here: the dashboard tables are the reason someone would rotate. Leave orientation unset. `background_color: '#FBFAF6'` (Porcelain), `theme_color: '#D70005'` (Brick Ember) to match the existing `viewport.themeColor`. | Dark-mode `theme_color` cannot be expressed in a manifest — the existing per-scheme `viewport.themeColor` already handles the browser chrome and stays as-is. |
| **PW13** | 🟡 | **Manifest `shortcuts`** — long-press the home-screen icon for direct entry. Same constraint as PW5: no ids in a static manifest, so shortcuts can only point at resolvers (`/business`, `/admin`) or public paths (`/explore`, `/explore/deals`). | Nice-to-have; ship after PW1–PW11 are proven. |
| **PW14** | 🟡 | **`screenshots`** in the manifest unlock the richer Chrome install dialog (needs one `form_factor: 'wide'` and one narrow). | Blocked on RD18 — the screenshots should be of the *fixed* dashboards, so this lands last. |

---

## 3. Phasing

Each phase is independently mergeable and independently revertable.

| Phase | Contents | Risk |
| --- | --- | --- |
| **1 — Admin shell parity** | RD1, RD2, RD10, RD11 | LOW. Four small edits to two files plus a cookie read. Fixes the two 🔴s for the cheapest possible diff. |
| **2 — Layout sweep** | RD5, RD6, RD7, RD13, RD15 | LOW. Class-only. Introduce the shared `StatGrid` here so RD5 is one file, not ten. |
| **3 — Heading + toolbar parity** | RD3, RD4, RD14 | LOW–MED. Touches 11 page files; visual regression risk is real but confined to headers. |
| **4 — Table strategy** | RD8, RD9, RD12 | MED. The `UsersTable` port is the biggest item in this document and should not ride with anything else. |
| **5 — PWA core** | PW1–PW6, PW9, PW10, PW12 | MED. The manifest is harmless; the service worker is the part that needs review. |
| **6 — Install UX** | PW11, PW13, PW14 | LOW. |
| **7 — Guardrails + verification** | RD17, RD18, PW7/PW8 tests | LOW, and non-optional — this is what stops phases 1–6 decaying. |

---

## 4. Guardrails (RD17 + the PWA tests)

New `__test__/config/responsive.contract.test.ts`, in the shape the repo
already uses — read the source, strip comments first (these files quote the
traps they avoid, and a sweep that fails on its own explanation teaches people
to delete the explanation), and fail on the pattern:

1. No `h-screen` in either dashboard shell (`h-dvh` only).
2. No unprefixed `grid-cols-{2..12}` under `app/admin` or `app/business`.
3. No `w-[NNNpx]` or bare `w-{4,5,6,7}xl` in either dashboard.
4. Every `page.tsx` in both dashboards imports `PageHeader` (allowlist the
   resolvers, which render nothing).
5. Sidebar triggers are ≥44px below `md`.
6. The sweep found ≥24 pages — **a sweep matching nothing is the failure mode
   the sweep exists to catch**, which is the lesson from the upload rate-limit
   contract test.

New `__test__/config/pwa.contract.test.ts`:

7. `manifest.start_url` is not `/`, and is not a `source` in `next.config.ts`'s
   `redirects()`.
8. Exactly one `"purpose": "maskable"` icon, and it is a different file from
   the `"any"` icon.
9. `public/sw.js` contains no `respondWith` reachable for a non-GET — assert
   the method guard is the first statement in the fetch handler.
10. The auth-path denylist in `sw.js` covers `/api`, `/admin`, `/business`,
    `/customer`, `/monitoring` — asserted against the literal prefix list, so
    adding a protected prefix to `protectedRoutes.ts` without adding it here
    fails.
11. `sw.js` is served `Cache-Control: no-store` (assert the `headers()` entry).

**Every one of these must be proven by breaking it** — delete the guard, watch
the specific test go red, restore. That is the repo's standing bar, and it is
what caught the mis-scoped fail-closed assertion in the upload sweep.

---

## 5. Verification (RD18 — the item that finds what greps cannot)

`puppeteer` **and** `puppeteer-core` are already dependencies, and a cached
chromium turned out to exist on this machine during the landing redesign — the
"needs a human" caveat on every dashboard entry since 2026-08-04 may be false.
Check before assuming it cannot be done.

The sweep, once there is a login path (a seeded `owner@ilokal.dev` /
`admin@ilokal.dev` against the local stack, both `ilokal@dev` per the
2026-06-16 seed work):

- **Viewports:** 320 (the floor), 375, 390, 768, 1024, 1280.
- **Themes:** light + dark (both dashboards read `next-themes`).
- **Roles:** admin, business owner with a verified shop, business owner with a
  pending shop (the pending banner adds a row to the shell).
- **Per page, assert:** `document.documentElement.scrollWidth <=
  window.innerWidth` — a horizontal document scroll is the single check that
  catches RD7 and most of RD5/RD13 at once, mechanically, without a human
  looking.
- **Installed mode:** relaunch from the home screen on a real Android device
  and a real iPhone. `display-mode: standalone` changes the safe-area insets,
  and `env(safe-area-inset-bottom)` is not something a desktop browser at 390px
  will ever reproduce. **This one genuinely needs a physical device.**

---

## 6. Still open — decide before building

1. **RD9's table strategy** — column priority (a) or card list (b). Recommend
   (a); (b) is defensible for `redeemed-coupons`, which is genuinely read on a
   phone at a counter, and if it is chosen it should be chosen for that page
   only and said out loud.
2. **Does the admin dashboard actually need to be installable?** The user asked
   for both. Worth noting that the security cost (PW7) is identical either way,
   so this is a product question, not a technical one — the SW must decline to
   cache authenticated routes regardless.
3. **Offline scope.** This plan deliberately proposes *no* offline data. Making
   any dashboard read work offline means caching RLS-scoped payloads on the
   device, which reopens PW7 completely. If it is wanted later it should be a
   separate document with its own threat model.
4. **RD8's blast radius** — porting `UsersTable` changes the admin users and
   account-status pages, which have client-side data fetching
   (`hooks/useProfiles.ts`) rather than the server-side `searchParams` pattern
   every other table uses. That mismatch is the real work, not the markup.

---

## 7. Progress

### Phase 1 — admin shell parity — **LANDED**

Both 🔴s closed, for a four-file diff.

- **RD1** — `AdminLayout` sizes with `h-dvh`, not `h-screen`. The shell is
  `overflow-hidden`, so on a phone the bottom of the content column was sitting
  behind the browser's URL bar. `BusinessLayout` made this migration already and
  carries the reasoning; the admin shell now carries it too rather than pointing
  at the other file.
- **RD2** — the sidebar trigger is `h-11 w-11 md:h-9 md:w-9`. Below `md` the
  sidebar is a `Sheet` that starts closed, so this button is the **only** route
  to navigation and it was a 36px target.
- **RD10** — `AdminHeader` gained a `BrandMark` + "Admin" identity block under
  the same `state === 'collapsed' ? 'md:flex' : 'md:hidden'` rule the business
  header uses, so exactly one `md:` display utility is present at a time and
  there is no cascade to fight.
- **RD11** — the admin sidebar's collapse now survives a reload.
  `SidebarProvider` has always WRITTEN `sidebar_state`; nothing on the admin
  side read it. The server layout seeds `defaultOpen` from the cookie through a
  new `sidebarDefaultOpenClosedFirst`, which sits beside the existing
  `sidebarDefaultOpen` in `config/sidebarCookie.ts`.
  **The two shells disagree on the default deliberately** — business defaults
  open, admin defaults closed (wide tables want the room, and that is what it
  has always shipped). Encoded as two named functions rather than a `fallback`
  argument each caller could pass backwards, so neither shell can inherit the
  other's default by accident, and an absent cookie cannot change what an admin
  who has never touched the rail sees.

**Tests +3** in `app/admin/[adminId]/__tests__/layout.test.tsx` (absent cookie
⇒ closed; `'true'` ⇒ open; `'false'` ⇒ closed). Proven by inverting the helper
to the business direction — exactly the absent-cookie test went red.

### Phase 2 — layout sweep — **LANDED, and most of it was withdrawn**

The scoping greps in §1 were run again properly, and **four of the six findings
did not exist**: RD5, RD6, RD7 and RD15 are struck through above with the reason
each was a false positive. That is the substance of this phase — the plan
proposed editing ~20 files and the measurement said 2.

What actually shipped:

- **RD13** — the coupon dialog's `datetime-local` pair now stacks below `sm`,
  matching `apply-sale.tsx` and `EventFormDialog.tsx`, which already did.
- **RD7b** — three oversized paddings now step (`p-8 sm:p-12 lg:p-20`,
  `p-6 sm:p-12` ×3).

**Tests +8** — `__test__/config/responsive.contract.test.ts`, which is RD17
started early because phases 1 and 2 had nothing else to hold them in place.

### What the sweep cost to get right — worth reading before extending it

Three wrong versions, each of which PASSED while the bug was present:

1. **Scanning before stripping comments.** These files name the class they avoid
   in prose, inside backticks — *"An unprefixed `grid-cols-2` puts Price beside
   Price Type at 320px"* — so the scan reported the explanation as the defect
   and `add-product.tsx` was flagged for the comment describing its own fix.
2. **Keying the allowlist on the class string.** Two cells of the same form
   produce the same literal: the coupon dialog's `grid grid-cols-2 gap-4`
   appears on both the BOGO pair (fine) and the date pair (the actual bug), so
   the exception written for the first silently covered the second. Reverting
   the fix left the suite green.
3. **Keying on the line of the stripped source.** Line numbers no longer
   addressed the file a human opens, and identical literals collapsed onto one
   line anyway.

The version in the tree blanks comments **in place** — every removed character
becomes a space, every newline kept — so offsets still address the real file and
identical literals get distinct keys. Every block was then proven by reverting
its fix and watching that one test, and only that one, go red.

### Verified after phases 1–2

`yarn lint` clean · **3302** tests across **264** files, all passing · the
responsive sweep proven to fail on each of the three regressions it guards.

### Phase 3 — heading + toolbar parity — **LANDED**

- **RD3** — all **8** admin pages that hand-rolled `text-3xl font-bold
  tracking-tight` now use `PageHeader`: dashboard, users, account-status,
  branches, businesses, categories, menu-follow-up, settings. That recipe stays
  30px at 320px and leaves whatever action sat beside it in a flex row with
  nothing telling it to wrap; `PageHeader` clamps the title to
  `clamp(1.75rem, 2.4vw, 2.25rem)` and wraps its action slot. It is also where
  the display face is applied, which is why the admin dashboard read as a
  different product from the rest of the app.
- **RD4** — narrower than written: the business pages that appeared to be
  missing `PageHeader` **delegate to content components that already use it**
  (`branches-content`, `coupons-content`, `product-catalogues-content`,
  `redeemed-coupons-content`, `events-content`). Only `insights` hand-rolled
  one; it now uses `PageHeader` with its back-to-dashboard link in the `action`
  slot instead of a second hand-rolled flex row.
- **RD14** — **already clean, 0 offenders.** The 2026-07-25 sweep is repo-wide,
  not per-page, so the `inline-flex h-10` row cannot come back anywhere. A scan
  for non-wrapping flex rows holding three or more controls returned one hit
  (`branch-card`'s footer), which is `flex-1` plus two 32px icon buttons and
  cannot overflow.

**Tests +1** — the sweep now fails on any dashboard file reintroducing the
page-title recipe, scoped to that exact three-class combination rather than "any
`<h1>`" (a card or a detail pane can legitimately own a smaller heading — the
two `text-xl font-semibold` branch headings are exactly that). Proven by
reverting the users page.

### Phase 5 — PWA core — **LANDED**

Built with no new dependency, per the frozen stack.

- **PW1/PW12** — `app/manifest.ts` (Next file convention, so it also emits the
  `<link rel="manifest">`). `standalone`, Porcelain background, Brick Ember
  theme, `en-PH`. **Orientation deliberately unset** — the one surface people
  rotate for is the dashboard tables.
- **PW2/PW5** — `start_url: '/home'`, never `/`. `/` is a `permanent: true`
  redirect (a 308, cached hard), so a start URL of `/` eats a redirect on every
  cold launch and resolves to the empty string if `NEXT_PUBLIC_DESTINATION` is
  ever unset. `/home` is also the only entry every role can take: a manifest has
  one start URL and this app has three homes, two carrying an id in the path.
- **PW3** — `scripts/build-maskable-icon.mjs` + a committed
  `app-icon-maskable-512.png`. Android masks the home-screen icon and guarantees
  only the middle 80%; all seven existing icons are full-bleed and would be
  sliced. **The trim step is the part worth knowing:** the source is a square
  brick tile whose mark is a wide lockup (799×391 of 1024²), so scaling the
  *tile* to 60% would have shrunk the mark to ~47% of the canvas and stacked
  padding on padding. Trimmed to the mark's own box first, the final mark is
  307×150 centred at (103,181) — comfortably inside the 51–461 safe zone,
  verified by reading the pixels back.
- **PW4** — `appleWebApp: { capable, title, statusBarStyle }` in the root
  metadata. iOS reads almost none of the manifest; without these, Add to Home
  Screen produces a bookmark that opens in Safari with full chrome.
- **PW6/PW7/PW8** — `public/sw.js`. Scope is `/` and **scope is not the safety
  mechanism** — the fetch handler is. Four refusals before anything can be
  answered: non-GET (Server Actions are POSTs, and a broken write would only
  reproduce *after* install), cross-origin, the five authenticated/data prefixes,
  and anything carrying an RSC header or `?_rsc`. What is left to cache is
  content-hashed build output and static brand assets, which is the whole
  legitimate win.
- **PW9** — versioned cache name, `skipWaiting` + `clients.claim`, non-current
  caches deleted on activate, and `/sw.js` served `no-store` from
  `next.config.ts` **above** the catch-all header block. Without that header the
  update check goes through the HTTP cache and a worker fix lands up to 24 hours
  late, which is indistinguishable from the fix not working.
- **PW10** — `app/offline/page.tsx`, precached, no client JavaScript (the one
  page that must render without a network should not wait on a bundle). It
  deliberately does **not** claim the app works offline, because nothing in it
  does.
- **PW11** — `InstallPrompt`, one instance in the root layout for the same
  reason there is one `<Toaster>`: two would race for the single-use
  `beforeinstallprompt` event. Chromium path captures and re-fires the event from
  a real gesture; iOS gets written Share → Add to Home Screen instructions,
  because it exposes no API at all. Dismissal is remembered, storage access is
  wrapped, and the bar clears itself on `appinstalled`.
- **PW13** — three shortcuts, all resolvers or public paths (no ids available to
  a static manifest).

**Tests +14** — `__test__/config/pwa.contract.test.ts`.

### The two guards that nearly shipped unproven

The first attempt to break the two security guards produced **two false
all-green runs**, and both were faults in the break, not the test:

1. The method guard was moved — but only as far as the branch above the first
   `respondWith`, so it was still doing its job. Re-broken by moving it *below*
   the navigation branch: the test failed, naming the position.
2. `/business` was removed from `NEVER_HANDLE` with a `sed` that silently
   matched nothing, because Prettier had reformatted the array across lines.
   Re-broken with a real edit: the test failed.

Both now proven, along with `start_url` and the `no-store` header. **A break
that does not turn the suite red has to be checked before the test is blamed** —
here it would have left two data-exposure guards believed-tested and untested.

### Verified after phases 3 and 5

`yarn lint` clean · `tsc --noEmit` clean · **3317** tests across **265** files,
all passing · each of the six new guards proven by reverting its fix.

**⚠️ `yarn build` NOT run.** A `next dev` server is live in this workspace (pid
1880), and both write to `.next/` — the 2026-08-01 entry records a corrupted
Turbopack cache from exactly that, which took a while to diagnose because it
presents as an unstyled page rather than an error. Run
`rm -rf .next && yarn build` with the dev server stopped before merging. The
manifest route and the offline page are plain server components and typecheck
clean, so the risk is low, but it is unverified.

### Phase 4 — tables — **LANDED except the last fork**

- **RD12** — **WITHDRAWN.** Every chart in both dashboards goes through
  `ChartContainer`, which wraps recharts' `ResponsiveContainer` internally, and
  every call site passes `w-full`. The single raw `ResponsiveContainer`
  (`BidaAnalyticsDashboard`) is `width="100%"`. The original finding — "only one
  `ResponsiveContainer` in the whole tree" — was counting the wrong thing.
- **RD8, three of four forks ported.** `business-documents-table` (admin),
  `branches-table` (business) and, with it, the last hand-rolled
  `<Table>`/`useReactTable` pairs outside the shared composite except one.
  Each was ~230 lines of duplicated header/body/pagination markup that every
  responsive fix to `DataTable` had to be re-applied to by hand, and was not.
- **RD9 — the mechanism already existed; the gap was adoption.** `DataTable`
  has had `renderMobile` (one TanStack instance, two renderers, cells reused
  through `flexRender`) and `responsiveColumnClass` for a while, and **four
  business tables used it while every admin table did not.** Both layers now
  ship on every dashboard table:
  - Layer 1 — `meta.responsiveClassName` on secondary columns, so they leave
    the table below a breakpoint instead of pushing the actions column off the
    right edge.
  - Layer 2 — a card list below `md`. Four new ones: admin business review,
    admin event review (nine columns, the widest in either dashboard), admin
    menu follow-up, admin categories, plus business branches.
  - The rule each card follows: **the actions cell comes first, not last.**
    `components/ui/table.tsx` wraps every table in `overflow-x-auto`, so a wide
    table hides nothing — but the button that approves a shop, sends a reminder
    or deletes a branch is in the final column, i.e. the one behind a scroll
    most people never discover.
- **Tests +2**, both proven by breaking them: every `<DataTable` mount supplies
  a `renderMobile`, and no dashboard file builds its own TanStack instance.

### The one item deliberately left open

`app/admin/[adminId]/components/shared/UsersTable.tsx` — 654 lines across five
files, behind the admin users and account-status pages.

It is pinned by the fork test as an **exact list**, not a maximum: porting it
FAILS that test until the entry is deleted, so the list can only shrink, and a
second fork fails immediately. That is the opposite of an allowlist that quietly
becomes permanent.

Why it is harder than the three already done, stated so the next session does
not rediscover it: it uses a column-visibility menu and **client-side** sorting,
and `DataTable` is `manualSorting: true` because every other table is
server-paged. Both callers also fetch client-side and carry
`{ currentPage, totalPages, totalItems }` rather than a `PaginationState`. So
the port needs `DataTable` widened with an optional column-visibility hook and
an opt-out of manual sorting — a change to the composite every other table
depends on, which is its own commit with its own review.

### Verified after phase 4

`yarn lint` clean · `tsc --noEmit` clean · **3323** tests across 265 files ·
every new guard proven by reverting the fix it protects.

### Phase 4, completed — the last fork is gone

`UsersTable` is now the shared composite. All four forks removed; the fork test
asserts an **empty** list.

Doing it needed the composite widened first, which is why it went last:

- `columnVisibility?: { state, onChange }` — the visibility menu it already had.
- `manualSorting?: boolean` (default true). Every other table is server-paged,
  where sorting the ten rows the server returned is not sorting the data. This
  table has always sorted the page it was handed; that is preserved rather than
  quietly changed, because it is a product decision and not part of removing a
  fork.
- `toolbar` now also accepts a **render function**, because the visibility menu
  needs the table instance and `DataTable` is what creates it. A plain node
  stays valid, so no existing caller changed.
- `pageSizeSelect?: boolean`. This table's page size is fixed by its caller's
  fetch (`useProfiles`' `limit`), so a rows-per-page control could not change
  what is fetched — the exact "Rows per page does nothing" defect the
  2026-07-25 pass had to fix. It is switched off rather than wired to nothing.

Its mobile renderer is a new **generic** `MobileFieldCardList`, not a bespoke
card: these columns are supplied by the CALLER and differ across all six mounts
(three user tabs, three account-status tabs), so there is no fixed layout to
hand-write. Every non-primary column renders as a label/value pair, with the
label from the column's own header — falling back to a humanised column id,
because a header is often a render function (a sort button, an `sr-only` span)
that cannot be given a cell's context and makes no sense as a `<dt>` anyway.

`UsersTableHeader`, `UsersTableBody` and `UsersTablePagination` deleted (`git
rm`), barrel exports removed. All six callers untouched — the props are
identical.

---

## 8. Live verification, and the two defects only it could find

The tests could not have caught either of these, because both are about what the
**server actually sends** rather than what the source declares.

- **🔴 `Cache-Control: no-store` on `/sw.js` never applied.** The header block
  in `next.config.ts` *does* match — `Service-Worker-Allowed` and `Content-Type`
  both arrive — but Next's static handler for `public/` overrides that one key
  with its own `public, max-age=0`. So the config said one thing and the
  response said another, and the contract test was passing on the declaration.
  Fixed at the level that is actually enforced: the registration now passes
  `updateViaCache: 'none'`, which the browser honours whatever the server sends.
  The header stays as defence in depth, and **the test now asserts the
  registration option**, with the header as a secondary check.
- **🔴 `apple-mobile-web-app-capable` was not being emitted.** Next 16 renders
  `appleWebApp.capable` as the modern `mobile-web-app-capable` only. Apple's own
  guidance still names the `apple-` prefixed tag, so relying on the alias is a
  bet on Safari honouring something Apple never documented — and the cost of
  losing that bet is that Add to Home Screen produces a Safari bookmark with
  full chrome instead of a standalone window. Added explicitly via
  `metadata.other`; both tags now confirmed in the served `<head>`.

**What was verified live**, against the running dev server:

| Check | Result |
| --- | --- |
| `/manifest.webmanifest` | 200, `application/manifest+json`, all fields as authored |
| `<link rel="manifest">`, `viewport` | present on `/home`, `/explore`, `/for-business`, `/sign-in`, `/offline`, `/privacy` — all 200 |
| `theme-color` (both schemes), `apple-touch-icon` | present |
| both `*-web-app-capable` tags | present after the fix |
| all three manifest icons incl. maskable | 200, `image/png` |
| `/sw.js` | 200, `application/javascript`, `Service-Worker-Allowed: /` |
| `/offline` | 200 |

---

## 8b. RD19 — touch targets (new finding, not in the original table)

Found by auditing what the card lists actually made load-bearing, and it only
became a real problem BECAUSE of them: while every action lived in a table's
last column, its size barely mattered on a phone, since it was off-screen
anyway. Now the kebab that approves a shop, sends a reminder or deletes a
branch is a **primary control on a card**, and **24 of them were 28–36px**.

- New `size="icon-touch"` on the shared `Button`: `size-11 md:size-9` — 44px on
  touch, 36px from `md`. Applied to **20 sites** across both dashboards
  (the admin review and event kebabs, the categories row actions, branch
  card/grid/table/detail actions, the two cover-image controls at **28px**, the
  document remove buttons, the carousel arrows and `ActionButton`).
- **A named size, not a change to `icon` itself, and that distinction is the
  finding.** Four of the 24 are corner badges absolutely positioned over the
  thumbnail they remove; at 44px the circle covers a visible share of the image
  it is attached to, and the tile is already the large target. Bigger is
  genuinely worse there. They stay `icon`, each with the reason written at the
  call site and allowlisted by path in the sweep.
- **Matching on the size classes, not on `size="icon"`, is what made this
  work.** Every one of these sites carried its own `h-8 w-8` / `size-7`
  override, and `tailwind-merge` lets a className win over the variant — so
  changing the variant alone would have fixed *none* of them while looking like
  it fixed all of them.

**Tests +2**, proven by reverting the admin kebab to `h-8 w-8`.

---

## 9. What is left, and why it cannot be done here

Two items, both blocked by the same thing.

- **RD18 — the viewport sweep.** `puppeteer` 25.6.0 is installed and its cache
  directories exist, but **both are empty**: the browser download never
  completed, and re-running it fails with *"All providers failed for
  chrome-headless-shell"* — this sandbox has no egress to the Chrome for Testing
  CDN. So `document.documentElement.scrollWidth <= window.innerWidth` — the one
  check that catches a horizontal document scroll mechanically, across every
  page, without a human looking — has not been run.
- **PW14 — manifest screenshots.** Needs a browser for the same reason, and was
  always sequenced after RD18 so the screenshots would be of the fixed pages.

Neither is a code gap; both are one `yarn puppeteer browsers install chrome`
away on a machine with network access. The sweep to run is in §5.

**Also still outstanding: `yarn build` has not been run** (see §7). A `next dev`
server has been live in this workspace throughout, and both write to `.next/`.

**And the installed-mode pass genuinely needs a device.** `display-mode:
standalone` changes the safe-area insets, and `env(safe-area-inset-bottom)` —
which the install bar and the offline page both rely on — is not something a
desktop browser at 390px reproduces.
