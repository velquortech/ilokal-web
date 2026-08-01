# Changelog

## 2026-08-01 — Landing redesign: "the walk" (feat/rebranding)

> Presentational. **No schema, API, or auth change.** Built against
> `.claude/skills/front-end`. (Design plan, parity table and motion budget
> kept local, not committed.)

- **The brand rollout made the landing a red template.** Repainting the tokens
  did not change the fact that the page was a textbook B2B2C marketplace
  layout: hero + phone mock → stats strip → 4 feature cards → business split →
  dashboard showcase → **two** mirrored 3-step columns → deals grid →
  testimonials → gradient CTA. It read "we are a platform"; the identity reads
  "go outside and eat."
- **The page is now a walk.** Content sits on one ambient gradient sky
  (`GradientField`) that warms as you descend — Cornsilk and Jasmine at the
  hero, Petal Frost through the middle, Brick Ember pooling at the bottom —
  broken twice by a solid Brick section so the rhythm lands. The sky is a
  single fixed layer of four `radial-gradient` blooms with scroll-linked drift;
  deliberately **not** `filter: blur()`, which would repaint the viewport every
  frame. A grain overlay does real work: four wide flats on near-white band
  visibly on 8-bit displays.
- **Signature: the craving switcher.** The hero pill types a real Iloilo
  craving — *batchoy, kape, pan de sal, pasalubong, sunset spot* — and the
  spread beneath re-deals, like laying a new hand on a table. It is search,
  demonstrated at page scale, in the first viewport. Shop names are invented
  (the file's established pattern) but the districts are real, which is what
  makes it read as a place rather than filler. Clicking a chip stops the
  carousel: once someone has taken control, a page that keeps moving is
  fighting them.
- **The risk taken: the phone mockup is gone.** Every local-discovery landing
  has one and it owned the right half of the hero. The deck's own mockups are,
  four times over, *a search pill and a result* — and a phone in a hero asks
  for an app install, while the button we want pressed is `/explore`, on the
  web, now.
- **Cut, with reasons.** The stats strip (counted invented numbers, and
  "big-number + small-label + gradient accent" is the template answer), the
  4-feature icon row (the two claims worth keeping became sections with real
  weight), the fake dashboard showcase (~90 lines aimed at an audience that
  isn't this page's job), and the shopper 3-step. **Numbering now appears
  exactly once**, in the business block, because register → verify → post is a
  real sequence where order is information; the shopper "steps" were a
  description wearing a sequence's clothes.
- **New: the counter moment.** The one dark beat, and the one place iLokal is
  not a website — you are standing in a shop showing six characters to a
  person. A ticket stub with perforation notches; the code settles on scroll,
  once. That interaction is the whole difference from a delivery app and the
  old page never showed it.
- **Copy now comes from the deck** instead of placeholder marketing: "The best
  spots aren't always on Google", "Skip the chains. Explore local.", "The city
  tastes better local.", "Less searching. More eating.", "Local businesses
  deserve the spotlight."
- **Motion budget — six moments, all gated on `prefers-reduced-motion`:** hero
  load sequence, ambient sky drift, the craving switcher, in-view reveals
  (reusing the existing `fadeUp`/`staggerContainer`), card straighten-on-hover
  **and on keyboard focus**, and the claim-code settle. Explicitly not doing:
  parallax, cursor followers, magnetic buttons, count-ups, or a second
  typewriter on the headline.
- **Three defects the brand sweep couldn't see, fixed:**
  - **Five green shadows survived the rebrand** — `rgba(101,163,13,…)`. They
    are `rgba()`, so the hex sweep never matched them. One was on
    `components/customer/PublicNav.tsx`, i.e. on `/explore`, not the landing.
  - **`landing.css` blanket rules beat Tailwind.** `[data-ilokal-root] a` and
    `… button` are specificity (0,1,1) against a utility class's (0,1,0), so
    every new section would have got red links and background-stripped buttons
    that no class could override. Both are now scoped to the chrome.
  - **Nav and footer set the wordmark as the literal text "iLokal"** — the
    exact thing the brand README forbids, since the wordmark is drawn
    lettering. Both now use `BrandWordmark`.
- **Landing dark mode is real.** It ran on page-local `useState`: it didn't
  persist, ignored the OS preference, and the nav toggle repainted nothing
  outside `[data-ilokal-root]`. Now driven by `next-themes`, so one toggle
  moves both the custom properties the shared chrome reads and the `.dark`
  class the new sections read. `tokens.ts` has flagged this as debt since the
  original port.
- **`LandingPage.tsx`: 1020 lines of inline style strings → 68 lines of
  composition.** Seven section files plus `GradientField`, `CravingSwitcher`,
  `ShopCard` and `primitives`. Deleted with the sections that used them:
  `useCountUp.ts`, two thirds of `icons.tsx` (220 → 93 lines), and the
  `features` / `shopperSteps` / `avatarStack` / `COUNTER_TARGETS` /
  `dealBadgeLabel` fixtures.
- **Section ids renamed to match the page** (`#shoppers` → `#near-you`,
  `#about` → `#voices`, `#how` deleted with its section), and nav order now
  equals scroll order — both asserted, because a jump link that scrolls
  nowhere is the failure mode this work exists to prevent.
- **Two testability changes that improved the code.** `filterDeals(category)`
  moved out of `DealsWall` into `data.ts` (the rule is now unit-testable
  without rendering through `AnimatePresence`, which keeps exiting cards
  mounted until a frame that never arrives under happy-dom); and `EASE` moved
  into `motion.ts` — an inline `[0.22, 1, 0.36, 1]` widens to `number[]`,
  which motion's `Easing` union rejects, so five call sites were each one
  `as const` from a build error.
- **Tests (+24, 1528 → 1552):** `landing/__tests__/sections.test.tsx` — every
  jump-nav target resolves, nav order equals page order, the business block is
  the only `<ol>` on the page, the claim code announces once rather than six
  times, the category filter keeps every chip reachable, cards straighten on
  keyboard focus and not only hover. Everything renders under `MotionConfig
  reducedMotion="always"`, so the suite doubles as the reduced-motion check.
- Verified: `yarn lint` + **1552** tests + `yarn build` green. Production
  smoke — `/home` `/explore` `/sign-in` 200, the five anchors render in DOM
  order, the gradient field and grain overlay are in the document, **zero**
  `opacity:0` in the server HTML, and zero retired green.
- **Then it was screenshotted, and most of the real work started.** A cached
  Playwright chromium turned out to be on this machine, so the "needs a human"
  browser sweep happened here. The very first capture showed the nav and the
  gradient and **nothing else**:
  - **🔴 The page rendered blank without JS.** Motion writes `initial` into the
    SERVER HTML, so every `whileInView` element shipped `style="opacity:0"` and
    only appeared once JS hydrated and IntersectionObserver fired. Headline,
    stats block, half the business list. Reveals are CSS view-timeline
    animations now (`.il-reveal` / `.il-rise`): no JS, off the compositor, and
    browsers without `animation-timeline` skip the `@supports` block and get
    the content immediately. Five of seven sections went back to being server
    components; `fadeUp`/`staggerContainer`/`inViewOnce` are gone. The two
    places that still need JS gate their enter animation behind `mounted`, so
    the first render is never hidden. A test renders each section with
    `renderToStaticMarkup` and fails on `opacity:0`.
  - **🔴 `/explore` had three dead nav links.** It mounts the same
    `LandingNav`, and `PublicNav` still pointed at `#shoppers`, `#how` and
    `#about` — two renamed, one deleted. `LandingSection` in `routeConfig.ts`
    exists to prevent exactly this and hadn't been updated; correcting it
    turned the dead links into build errors. `PublicNav` now mirrors the
    landing's list exactly, and a test asserts every `/explore` hash resolves.
  - **🔴 The logo overlapped the first nav link on `/explore`.** The wordmark
    is a drawn asset now, wider than the text it replaced, and `/explore`
    carries an extra action. Lockup got a `flex:0 0 auto` guard; hamburger
    breakpoint 1100 → 1180px.
  - **Gradient defects only a render shows:** washed out (opacities too low,
    paper-lift overlay too strong); a hard circular edge (`transparent` as the
    final stop interpolates toward transparent-**black**, ringing a saturated
    bloom in grey — now eases to the same colour at zero alpha); **hard
    vertical seams at 390px** (default `farthest-corner` sizing pushed the
    gradient past its box, which then clipped it — now `ellipse closest-side`);
    and too hot in dark mode, where the red mass cost body copy its contrast
    (dark runs at 45%).
  - Beta banner was pale-on-pale over the gradient and read as a rendering
    fault (now Charcoal/Cornsilk); the final CTA used the Porcelain wordmark
    where the deck's primary lockup on Brick Ember is **Jasmine**; the eyebrow's
    dark red sat on the yellow bloom at marginal contrast (now Jasmine).
- **Swept in the browser:** 390 / 768 / 1280 × light + dark, plus `/explore` at
  1200 and 1280. **Caveat:** Chromium only. Safari and Firefox have no
  `animation-timeline: view()` yet, so they get the content with no reveal
  animation — the intended fallback, and still strictly better than a blank
  page, but the animated experience is Chromium-only for now.
- **Follow-up after a report that the page rendered completely unstyled.** Not
  a code fault: the running `next dev` server was serving a **corrupted
  Turbopack cache** — the chunk labelled `globals.css` contained the *old*
  `landing.css` (rules deleted hours earlier) and Tailwind emitted **zero**
  utilities (10 KB, no `--tw-*`). Cause was `yarn build` being run repeatedly
  while `next dev` was live; both write under `.next/`. Cleared `.next` and
  restarted: same chunk is now 229 KB with the full utility set. **Don't run a
  production build against a live dev server** — it is the second time this
  session that concurrent writes to `.next/` produced a misleading result.
- **Above-the-fold lockups are `priority` now.** The dev log flagged the nav
  wordmark as the LCP element while lazily loaded. `BrandMark` / `BrandWordmark`
  / `BrandLogo` take an `eager` prop, set on `LandingNav`, `CustomerHeader` and
  the auth header.
- **Hero entrance capped at 5 stagger steps.** `animation-fill-mode: both`
  holds the from-state through the delay, so every step is time the content is
  invisible; an un-capped 90ms step put the craving switcher — the thing the
  page exists for — 1.2s from being readable. Now 70ms, capped, 0.55s duration.
- **People in the hero.** At >=1024px the right half was empty — a page whose
  argument is "go outside and eat with people" showed none. Two frames from
  the deck's own photography (the cover shot, and a phone in a hand running
  the app), tilted against each other, `hidden lg:block`, `alt=""` since the
  headline and the search demo already say what the section is. The wrapper
  carries the `hidden` too: an always-rendered wrapper is still a grid cell,
  and below lg it added the grid's gap as dead space. The headline needed a
  second size ramp at lg — the wrap caps at 1200px so the column stops
  growing while `8.5vw` does not, which at 1440 pushed "The best spots" onto
  two lines. NearYou's heading moved to the deck's other proximity line; the
  phone carries "…probably 5 minutes away" on its screen and running it twice
  on one page reads as an accident.
  **⚠️ These are the deck's stock photographs — confirm the licence covers
  production web use before this ships publicly.**
- **Still deferred:** a scrolled state for the nav.

## 2026-08-01 — Brand v1.0: the presented red/yellow identity, app-wide (feat/rebranding)

> Presentational + design tokens. **No schema, API, or auth change.** Plan,
> (Parity table and measured contrast ledger kept local, not committed; the
> palette, contrast ledger and type system live in `.claude/docs/DESIGN.md`.)

- **This was a rebrand, not a palette tweak.** The app shipped the v0.2
  "Hablon Weave" identity — lime `#65A30D`, a woven-strip tile mark, a Geist
  800 wordmark. The presented deck replaces every part of it: **Brick Ember
  `#D70005`** primary, Jasmine/Cornsilk/Petal Frost/Porcelain/Charcoal, a
  drawn `ilokal` wordmark with the two-people `ilo` ligature, and **two new
  typefaces**. Nothing green survives as brand.
- **Assets built from the supplied raster.** The identity arrived as PNG only,
  so both marks were matted out (flat two-colour art projected onto the
  background→foreground colour line, giving true antialiased alpha) and
  re-tinted per colourway — not screenshot-cropped. Wordmark 1128×244, submark
  1036×507, plus a square app mark (rounded tile + `ilo`), the store icon set,
  and regenerated `app/icon.png` / `apple-icon.png` / `favicon.ico`. The green
  `public/brand/{svg,png}` and `app/icon.svg` are deleted. **No vector source
  exists** — 1128px covers every web use (~9× headroom in the nav) but not
  large print; the Illustrator/Figma file is still needed.
- **Typography is now two faces.** Pally (display) + Inter (body), per the
  deck. Pally is not on Google Fonts, so the three `.woff2` were pulled once
  from Fontshare (free personal + commercial licence) into `public/fonts` and
  wired through `next/font/local` — **no runtime third-party font request**,
  and Next still emits the preload + `size-adjust` fallback metrics. `h1`–`h6`
  pick up Pally from `@layer base` rather than a ~200-file sweep, which is
  also the only way Radix's own titles (DialogTitle, AlertDialogTitle) get it.
- **Three tokens the deck does not specify, derived and flagged for designer
  sign-off:**
  - **Dark-mode primary.** Brick Ember on Charcoal measures **3.23:1** and
    fails AA. Lifted to `oklch(0.58 0.215 28.8)` (`#DD2920`): label 4.56:1,
    fill-vs-background 3.66:1. `--brand` switches under `.dark`, and
    `BrandMark`/`BrandWordmark` ship a matching "flame" tile + Porcelain
    wordmark rather than reusing the light cuts.
  - **Destructive.** The brand red *is* `--primary` now, so the stock red
    destructive would make Delete look like Save. Deepened to `#8E0B14`
    (light) and hue-shifted to crimson `#BD3855` (dark).
  - **Chart ramp.** Jasmine and Petal Frost at native lightness are ~1.8:1 on
    white and unusable as data marks; the ramp keeps the hue and drops the
    lightness.
- **Contrast measured, not assumed.** White/Porcelain on Brick Ember 5.40:1 ✅,
  Brick on Porcelain 5.17:1 ✅, Charcoal on Jasmine 14.12:1 ✅. **Jasmine on
  Brick Ember is 4.38:1 — large text only**; that covers the logo lockup, and
  it is called out in `DESIGN.md` and the brand README so nobody sets body
  copy in it.
- **Green kept where it means success, not brand.** `StatusBadge`,
  verification badges, active pills, trend-up indicators (25 files) were
  reviewed and deliberately left green — success-green beside brand-red is the
  signal. Same for the macOS traffic-light dots in the landing's browser mock
  and the third-party Google Play mark.
- **Two latent bugs fixed on the way through.** (1) `--font-display` was
  initially both the Tailwind theme token and the `next/font` variable name, a
  **self-reference** that is invalid at computed-value time on `:root` — it
  only worked because `<body>` shadowed it. The font binding is now
  `--font-pally`. (2) `font-geist` (2 call sites) and `font-font-giest-mono`
  (1) never matched a declared token and silently resolved to nothing; the
  aliases are declared and the typo fixed.
- **Metadata.** Root layout gained a `title.template`, a real description, OG
  fields, and per-scheme `themeColor` (`#D70005` / `#1A1A1A`); the 14 page
  titles that carried their own "- iLokal" suffix were stripped so it isn't
  rendered twice.
- **Tests (+20, 1508 → 1528):** `BrandLogo.test.tsx`
  reworked to the asset-based lockup (8 — palette pinning, the em-scaled
  wordmark, single accessible name across the auto pair), plus a new
  `brand.contract.test.ts` (17) that sweeps `app`/`components`/`lib`/`config`
  for any reintroduced v0.2 green, pins the asset + font-file surface
  `BrandLogo` references by literal path, asserts destructive ≠ primary in
  both modes, and fails on a self-referential `--font-display`.
- Verified: `yarn lint` + **1528** tests + `yarn build` green; production
  server smoke — `/home` `/sign-in` `/signup` `/forgot-password` all 200,
  brand PNGs 200 both direct and through `/_next/image`, favicons 200, Pally
  preloaded, and `/home` renders 14× `#D70005` with zero brand-green left.
- **Not verified — needs a human:** the browser sweep (320/768/1280 × light +
  dark × landing/explore/auth/business/admin; no headless browser in this env
  and the stack is frozen), designer sign-off on the three derived tokens
  above, and the vector logo source.
## 2026-07-27 — PR #18 review hardening (feat/dynamic-product-service-listing)

> Fixes from the react-doctor + api-doctor review. **Edits the seven unmerged
> migrations in place** (none is on cloud) and re-verified with a full
> `make migrate-reset` — so what reviewers read is what will apply.
> **All seven still need human approval + `make migrate-cloud` + ledger
> reconcile before merge.**

- **🔴 Owner `UPDATE` policy on `booking_requests` removed.** It had no
  `WITH CHECK`, so Postgres reused its `USING` clause — which only proved
  business ownership. A direct PostgREST `PATCH` could rewrite `user_id` /
  `product_id` / `starts_at`, or reset a decided booking to `pending` for a
  second decision. The customer "may cancel" policy went too: it let a
  `completed`/`no_show` row be flipped to `cancelled` (erasing a no-show) and
  `quoted_amount`/`decision_note` rewritten in the same statement. **All
  non-admin writes now go through the SECURITY DEFINER RPCs**, which bypass
  RLS anyway — matching the INSERT side, which never had a policy.
- **🔴 `inventory_count` was bypassable.** The availability check was skipped
  when `ends_at` resolved to NULL, so an offering with stock but no
  `duration_minutes` could be overbooked by simply omitting the end date — and
  those NULL-end rows stored an EMPTY `tstzrange` that never overlapped
  anything, so they never counted against the cap either. `v_end` now falls
  back to a one-hour window whenever `inventory_count` is set, on both the
  insert and the overlap scan.
- **Active-dupe guard on `request_booking`.** The RPC is granted straight to
  `authenticated`, so `/rest/v1/rpc/request_booking` bypassed the Server
  Action's per-user rate limit entirely — unbounded pending rows, one owner
  notification each.
- **Private SQLSTATE class for RPC errors.** `22023` is raised by built-ins
  too (`make_interval` on an out-of-range value), so forwarding its message
  could leak Postgres internals. The RPCs now raise `IL001`/`IL002`; anything
  else gets generic copy.
- **`ENABLE ALWAYS` on `trg_businesses_sync_business_type`.** Seeds run under
  `session_replication_role = replica`, which skips normal triggers — so
  after `migrate-reset` every seeded business had `business_type_id = NULL`
  and silently fell back to retail vocabulary. Same gotcha as
  `trg_set_redemption_code`.
- **`offering_mode` now has a write path.** It was set only by the one-time
  backfill, so every business registered after the migration would have been
  stuck on `'products'` forever. The trigger seeds it from the vertical **on
  INSERT only** — changing category later must not overwrite an owner's
  choice.
- **The quote CHECK can no longer abort a cloud apply.** `products.price` has
  always been nullable and "0 NULL rows" was verified on local only; the
  migration now reclassifies any NULL-price row to `on_request` before adding
  the constraint.
- **Found by the clean reset, not by review:** migration `20260727000001`
  seeds `offering_profile` with `UPDATE … WHERE name = …`, but
  `business_types` rows are created by the *seed*, which runs **after**
  migrations — so on a fresh database it matched zero rows and every vertical
  fell back to retail copy. The profiles are now seeded in
  `business_categories.sql` too (COALESCE, so an admin edit survives).
- **App-layer:** booking times pinned to `Asia/Manila` (they rendered in UTC
  during SSR and the device zone after hydration — a mismatch on every row);
  a **branch picker** in the booking dialog (bookings were pinned to
  `branches[0]`, wrong for multi-branch shops and a hard RPC failure for
  branch-scoped offerings); `booking_mode` and `price_type` are now editable
  in the update dialog (an offering could never leave `on_request`, and a
  salon's shampoo was stuck showing "Request booking"); the owner's decline
  note + quote amount are wired to the inputs the customer page already
  rendered; `catch` on all three booking handlers (a rejected Server Action
  left the loading toast spinning forever); real `PaginationBar` on both
  booking lists; `sticky bottom-0` on the registration nav; `shopLocalDayKey`
  for the "today" hours highlight; `loading.tsx` for both new routes;
  `safeExternalUrl` accepts `unknown` (a non-string JSONB social link crashed
  the server-rendered public page); `getBookingStats` reports failure instead
  of showing four confident zeros.
- **Not taken:** wrapping `getBookingsEnabled` in `React.cache` — the module
  is `'use server'`, where every export must be a plain async function;
  wrapping it collapsed inference at the call sites.
- **Tests 1505 → 1508**, plus new SQL regressions for the duplicate guard, the
  no-`ends_at` inventory bypass, and "no non-admin UPDATE policy". One test
  was itself wrong and was rewritten: it asserted every product of a Services
  business is `kind='service'`, but that flip is a point-in-time backfill, not
  an invariant — a salon must still be able to list shampoo. Verified after a
  full `make migrate-reset`: `yarn lint` + **1508** tests + `yarn build` green
  + all three SQL suites passing.

## 2026-07-27 — Explore: shop info (hours / contact / socials) + gallery lightbox (feat/dynamic-product-service-listing)

> **One schema migration** (`20260727000006_business_public_info_rpc.sql`) —
> **HIGH risk by nature: it opens four columns of an owner-only table to
> anon.** Applied + red-teamed on LOCAL only. Plan kept local (not committed).

- **`business_settings` was invisible to the public page.** Its only policy is
  owner-scoped `FOR ALL`, so the explore page read *nothing* — and it would
  have failed silently, rendering empty sections that look like "this shop has
  no hours".
- **Opened via an RPC, not a public SELECT policy.** The table also holds
  `allow_reviews` and `coupon_default_expiry_days` — internal config. A broad
  `USING (true)` read is exactly what leaked the whole follow graph
  (`20260607000000`, dropped in `20260608000001`). With
  `get_business_public_info` the **returned column list is the contract**: it
  cannot over-expose, and a future column on the table stays private by
  default. Gated on `status='verified' AND archived_at IS NULL`, so an
  unverified or soft-deleted shop's phone number isn't reachable by id.
- **🔴 Fixed a latent stored-XSS vector before rendering these columns.**
  `urlOrEmpty` was `z.string().url()`, and Zod's `url()` is backed by
  `new URL()` — which **accepts `javascript:alert(1)`** as a valid URL. It was
  inert only because nothing rendered the links. Now: an http(s) scheme
  allowlist in the schema **and** a render-side `safeExternalUrl()` guard
  (rows written before the schema change, and admin edits, bypass Zod
  entirely). Plus `safeTelHref()` — `contact_phone_public` is free text and
  can't go into a `tel:` href raw — and `rel="noopener noreferrer"` on every
  external link.
- **New `BusinessInfoPanel`** on the shop page: 7-day opening hours with today
  emphasized, an **Open now / Closed** badge, phone + website, and Facebook /
  Instagram / TikTok links. Each block hides itself and the whole panel
  disappears when all three are empty — a settings row only exists once the
  owner saves, so most shops currently have nothing. `contact_website` wins
  over `social_links.website` (the two columns hold the same idea).
- **`lib/utils/operatingHours.ts`** — pure, and deliberately explicit about
  two traps: **timezone** (pinned to `Asia/Manila`; the server is UTC and a
  visiting tourist could be anywhere, so ambient zone is always wrong) and
  **overnight spans** (`22:00–02:00` closes the *next* day — a naive
  `open <= now < close` reports it closed all evening). `isOpenNow` returns
  `null` for unusable hours so the UI renders no badge rather than claiming
  "Closed".
- **"Inside the shop" images now open.** Extracted `ImageLightbox` from
  `Masonry` and refactored `Masonry` onto it, so there is one dialog rather
  than two. `Masonry` itself was unusable here — it hard-returns *"Minimum 4
  images required."* and shops routinely have 1–3 interiors. The new
  `InteriorGallery` keeps the 4-tile grid and adds a **"+N more"** overlay that
  opens at the first *hidden* image, so extra photos are no longer silently
  dropped by `.slice(0, 4)`. Tiles are `<button>`s with
  "Open photo N of M" labels; Radix restores focus on close.
- **Tests (+59 vitest, +1 SQL suite):** URL/phone guards (27 — `javascript:`,
  `data:`, `vbscript:`, tab/CR/LF-embedded schemes, protocol-relative, plus
  the schema-level rejection), operating hours (19 — overnight, Sunday→Monday
  spill, malformed times, UTC-vs-Manila boundary), gallery render (8 — opens
  at the clicked index, overlay jumps to the first hidden image, <4 images,
  a11y labels), profile info block (5 — degrades to `null` when the RPC
  fails). SQL suite asserts the RPC exposes **exactly 4 columns**, returns
  nothing for hidden businesses, and that `business_settings` gained no
  anon-readable policy. Verified: `yarn lint` + **1505** tests +
  `yarn build` green; "ALL PUBLIC INFO TESTS PASSED".
- **Not done:** mobile business-detail parity for the info block (additive
  follow-up), per-branch hours, holiday exceptions.

## 2026-07-27 — Offerings model phase 4: booking requests (feat/dynamic-product-service-listing)

> **One schema migration** (`20260727000005_booking_requests.sql`) — **HIGH
> risk: new table + RLS + three SECURITY DEFINER RPCs + a widened
> notifications CHECK.** Applied, red-teamed, and concurrency-proven on LOCAL
> only. **Ships DARK** behind `app_settings.enable_bookings` (default false),
> so it can reach cloud without changing user-visible behavior. Plan kept local (not committed).

- **Request-based bookings, deliberately not slot-based:** the customer
  proposes a time (or a date range for rentals), the owner confirms or
  declines. No calendar UI, no staff scheduling, no availability engine. This
  is what makes a **coupon-less services business viable** — their dashboard
  was otherwise all zeros, which is churn (plan doc §5).
- **🔴 The availability check is genuinely atomic.** `request_booking` takes a
  transaction-scoped advisory lock on the product before counting overlapping
  `pending`/`confirmed` rows against `inventory_count`. **Proven under real
  concurrency**: two sessions raced for the last unit of a 1-unit rental — the
  second blocked on the lock, then failed with "no availability", and exactly
  one row was booked. Deliberately stronger than the per-user coupon cap's
  known TOCTOU: overbooking a physical asset is a real-world failure, not a
  counter drifting.
- **The table has NO INSERT policy.** `request_booking()` is the only insert
  path, so a direct PostgREST write fails closed instead of skipping the gate
  matrix. Asserted in the SQL suite, along with "every policy wraps its
  `auth.uid()`" (perf standard P1).
- **Three RPCs, each authorizing its own caller:** `request_booking`
  (customer), `decide_booking` (owner/admin — re-derives ownership from the
  booking's business, so a forged id can't reach another shop),
  `cancel_booking` (the row's own user). State machine enforced server-side: a
  cancelled booking can't be confirmed out from under the customer, a decided
  one can't be re-decided, and only a confirmed one can be closed out.
- **Notifications are emitted inside the RPCs** — the existing
  `create_notification` authorizes admin-or-self only, and here the actor is
  the customer while the recipient is the owner (the same reason
  `notify_coupon_redemption` exists). Wrapped in `EXCEPTION WHEN OTHERS` so a
  notification failure can never roll back a booking. Four new notification
  types added to the CHECK.
- **Gate matrix red-teamed in SQL** (`supabase/tests/booking_requests.test.sql`,
  17 assertions): flag off, `booking_mode='none'`, past start, inverted range,
  party > capacity, cross-business branch, double-booking, customer deciding
  their own, stranger cancelling, re-deciding, confirming a cancelled booking,
  and cancellation freeing the slot.
- **App layer:** `bookingService` (RPC boundary — maps SQLSTATE to hand-written
  copy; a raw driver message never reaches the client), `bookingQuery`
  (`.range()`d lists with piggybacked exact counts, head-only stat counts —
  never fetch-all-then-reduce), customer actions on the existing
  `requireCustomer` guard (role + account state + per-user rate limit), and an
  owner decide action behind `verifyBusinessOwner`.
- **UI:** owner inbox at `/business/[id]/bookings` (status filter, confirm /
  decline / mark-completed, distinct "couldn't load" vs "none yet"), customer
  request dialog on the public shop page (hidden for anon/owners/admins,
  matching FollowButton), and `/customer/bookings` with cancel. The flag hides
  the nav entry and 404s both routes when off.
- **Tests (+17 vitest, +1 SQL suite):** SQLSTATE mapping incl. constraint-name
  non-leakage, RPC parameter mapping, never-throws behavior, and the kill
  switch failing closed on missing row / query error / throwing client /
  truthy-but-not-boolean value. Verified: `yarn lint` + **1446** tests +
  `yarn build` green; "ALL BOOKING TESTS PASSED".
- **Still open:** folding the booking counters into the business **home**
  dashboard (OF9 — the page has them, the dashboard doesn't yet), mobile
  booking routes, and a `user_redemptions.booking_id` link.

## 2026-07-27 — Offerings model phase 3: service/rental attributes + quote pricing (feat/dynamic-product-service-listing)

> **Three schema migrations** (`20260727000002` enum, `20260727000003` columns
> + profile policy, `20260727000004` RPC) — **MED risk**, applied + red-teamed
> on LOCAL only. Needs human approval + cloud apply with phases 1–2. Mobile
> contract stays additive; no auth/RLS change. Plan kept local (not committed).

- **Van rental is now expressible.** Nine columns on `products`:
  `booking_mode`, `duration_minutes`, `lead_time_minutes`, `inventory_count`,
  `capacity`, `deposit_amount`, `min_duration_units`, `max_duration_units`,
  `service_location`. All nullable/defaulted — every existing row and query is
  unaffected.
- **`booking_mode` is a SECOND AXIS, not more `kind` values**
  (`none|inquiry|request|timeslot|date_range`). A haircut and a van hire are
  both `kind='service'`; their availability math is not the same. Keeping the
  axes apart is what stops `kind` sprawling into
  `product|service|rental|room|tour|…`. Van rental = `kind:'service'` +
  `booking_mode:'date_range'` + `inventory_count:3` + `capacity:12`.
  `inventory_count` (concurrently bookable units) is deliberately distinct
  from `capacity` (people per unit) — phase 4 counts overlaps against the
  former. Nothing schedules anything yet.
- **Quote-based pricing (`price_type: 'on_request'`)** — shipped as its own
  migration file because Postgres forbids USING a new enum value in the
  transaction that adds it, and the CHECK references it. Guarded at three
  layers, each for a different caller: Zod (readable form message),
  `createProduct`/`applySale` (Server-Action path), and the DB CHECK
  `price_type = 'on_request' OR price IS NOT NULL` (direct PostgREST).
- **`on_request` beats a stale price.** The CHECK only *requires* a price for
  non-quote types, so switching an offering to quote-based leaves the old
  figure on the row. `formatOfferingPrice` short-circuits on the type — the UI
  can never quote a price the business withdrew — and the update dialog omits
  `price` entirely for those rows.
- **Sales are impossible on quote-priced offerings** (a percentage off an
  unknown number): the menu action is hidden, the dialog self-guards (it is
  exported and reachable from anywhere), `applySale` rejects with a friendly
  message, and `formatOfferingPricePair` returns `sale: null` so it can't
  render "Price on request" struck through beside "Price on request".
- **🔴 The phase-1 decay is CLOSED.** The resolved vocabulary now carries
  `defaultKind`, derived from `offering_mode` — **not** from the profile — and
  the add form sends `kind` explicitly on every create. A services business
  now mints services instead of silently reverting to the DB's `'product'`
  default.
- **Profile gained a field policy** (`fields`, `allowed_price_types`,
  `default_booking_mode`) so the form renders only what a vertical needs:
  Services → duration/notice/location, Tourism → capacity/inventory/deposit/
  duration bounds, Retail & F&B → none (byte-identical to the pre-phase-3
  form). Unrecognized field names and an all-invalid price-type list fall back
  rather than producing an empty picker.
- **`price` is `number | null` end-to-end** (`Product`, `PublicProduct`, form
  state). The type change surfaced every remaining raw
  `price.toLocaleString()` — coupon table, product picker, both cards — all now
  route through `formatOfferingPrice`.
- **Mobile:** `business_products` RPC projects all ten offering columns and the
  route returns them; `price` and every pre-existing key keep their exact name,
  type, and meaning (D6). Documented why `nullsFirst: false` now matters in
  BOTH sort directions — Postgres defaults to NULLS FIRST on DESC, which would
  have put every "price on request" item at the top of a price-high sort.
- **Tests (+31 vitest, +5 SQL):** quote-pricing + attribute suite (24 — Zod
  create/update branches, service-layer guards incl. "omits keys it wasn't
  given so DB defaults hold", `applySale` refusal), field-policy resolution (7
  — `defaultKind` from mode not profile, unknown-field dropping, empty-picker
  fallback), formatter quote cases (4), plus SQL assertions for the NULL-price
  CHECK, the duration-range CHECK, `booking_mode`, a van-rental round-trip, and
  the column count. Verified: `yarn lint` + **1429** tests + `yarn build`
  green; SQL suite "ALL SQL TESTS PASSED".

## 2026-07-27 — Offerings model phase 2: type-driven vocabulary (feat/dynamic-product-service-listing)

> **One schema migration** (`20260727000001_business_type_offering_profile.sql`)
> — additive column + seed data, **LOW risk**, applied to LOCAL only. Needs
> human approval + cloud apply with the phase-1 migration. No API-contract,
> auth, or RLS change; presentation only. Plan kept local (not committed).

- **Fixed: a salon owner read "Product Catalogue / Add Product".** The words
  were hardcoded to retail across ~9 surfaces. They now come from
  `business_types.offering_profile`, keyed by the business's `offering_mode`.
- **The profile is keyed BY MODE**, not one flat noun set —
  `{ products: {singular,plural,catalogue}, services: {...}, both: {...},
  icon }`. A single set would have forced a concatenation guess for `'both'`
  businesses; each mode states its own wording and the resolver never invents
  copy. Seeded: F&B → "Menu Item / Menu", Retail → "Product / Product
  Catalogue", Services → "Service / **Service Menu**", Tourism → "Package /
  Packages" (mode `both` → "Offerings").
- **Derived labels are computed, not stored** (`addLabel`, `saveLabel`,
  `updateLabel`, `emptyLabel`, `totalLabel`, `imageLabel`,
  `nameRequiredLabel`) — a vertical can't half-define itself into "Add
  Service" + "Update Product", and the JSON stays small.
- **Fallback contract is the point of the pure resolver**
  (`lib/utils/offeringVocabulary.ts`): `offering_profile` is admin-editable
  JSONB, so a Studio typo reaches production. NULL / non-object / partial /
  blank / wrong-typed input degrades **per field** to exactly the pre-phase-2
  retail copy. It can never render `undefined` or blank a heading. Unknown
  `offering_mode` reads as `products` (the pre-phase-1 behavior).
- **Plumbing:** `getOfferingVocabulary(businessId)` (`React.cache`d, one join,
  **never throws** — a failed read is not worth 500ing a dashboard over) is
  resolved in the business layout and handed to
  `OfferingVocabularyProvider` → `useOfferingVocabulary()`. No client fetch,
  no flash of "Product" before "Service". Reading the hook outside a provider
  returns the retail default instead of throwing, so shared
  `components/custom/*` stay usable from admin/landing surfaces. Also
  normalizes the array-shaped PostgREST to-one embed — reading
  `.offering_profile` off the array would have silently given every service
  business retail copy.
- **Swept:** sidebar nav entry, catalogue header/subtitle/Add button, stats
  card, add + update dialogs (title, description, name label, required
  message, placeholder, image label, save button, failure toasts), the view
  dialog's screen-reader label, `/business/[id]/shop` heading + both empty
  states, and the public `/explore/[businessId]` menu heading + empty/error
  copy. Route path `/product-catalogues` deliberately unchanged (renaming
  needs redirects — separate change).
- **Versatility check:** onboarding the van-rental partner as a new
  "Transport & Rental" type is a single row edit — `{services: {singular:
  "Vehicle", plural: "Fleet", catalogue: "Our Fleet"}}` yields "Our Fleet",
  "Add Vehicle", "Total Fleet" with no deploy. Asserted in the test suite.
- **Tests (+23 vitest, +2 SQL):** resolver suite (17 — mode selection, the
  unknown-vertical case, and every fallback branch incl. a property-style
  sweep asserting no label is ever empty for any junk input), query suite (7 —
  array-embed normalization, no-id short circuit, DB error / missing row /
  throwing client / profile-less type all degrading), plus SQL assertions that
  every seeded vertical defines all 3 modes × 3 nouns and that Services reads
  "Service Menu". Verified: `yarn lint` + **1398** tests + `yarn build` green;
  SQL suite "ALL SQL TESTS PASSED".

## 2026-07-27 — Offerings model phase 1: product/service discriminators (feat/dynamic-product-service-listing)

> **One schema migration** (`20260727000000_offerings_discriminators.sql`) —
> **HIGH risk by policy (schema), applied + red-teamed on LOCAL only. Needs
> human approval before merge, then `make migrate-cloud` + ledger reconcile.**
> Fully additive and defaulted: no RLS change, no API-contract change, every
> existing query returns identical results. Plan kept local (not committed).

- **The model, in three layers** (each a distinct job — do not collapse them):
  `business_types.offering_profile` = vertical template (phase 2) →
  `businesses.offering_mode` (`products|services|both`) = declared intent,
  drives UI vocabulary and the explore filter → `products.kind`
  (`product|service`) = ground truth per row, what queries filter on.
  `'both'` is not an edge case — a salon sells shampoo, a café rents its
  function room.
- **`products.kind`** + index `(business_id, kind, status)`. Deliberately
  coarse: *how* an offering transacts (inquiry / appointment / date-range
  rental) is a **separate axis** (`booking_mode`, phase 3) — keeping them
  apart is what stops `kind` sprawling into
  `product|service|rental|room|tour|…`. Van rental = `kind:'service'` +
  `booking_mode:'date_range'` + `inventory_count`.
- **`businesses.offering_mode` + denormalized `business_type_id`** (FK +
  index). The type was previously reachable only via
  `businesses → business_categories → business_types`; denormalizing makes
  phase 2's per-render vocabulary lookup a single column read.
  `offering_mode` is **stored, never derived** by scanning `products` — a
  business with zero rows would read as "unknown", and deriving costs a scan
  on every render.
- **New `sync_business_type_id()` trigger** (`BEFORE INSERT OR UPDATE OF
  category_id`, SECURITY DEFINER, pinned search_path, REVOKE'd from
  PUBLIC/anon/authenticated) keeps the denormalized column honest — without
  it, changing a category strands the old type and every phase-2 label goes
  wrong with no visible cause. Clearing `category_id` clears the type.
- **Backfill (best-effort, matched on the admin-editable type name; a rename
  on cloud simply means no match and the defaults hold):** Services →
  `'services'`, **Tourism & Leisure → `'both'`** (a B&B sells rooms *and*
  breakfast), F&B/Retail → `'products'`. `products.kind` flipped to
  `'service'` for **pure-Services businesses only** — they cannot be selling
  goods, so it is safe and spares hand-editing every row; `'both'` businesses
  are ambiguous per row and stay `'product'`. Local: 64 businesses typed
  (0 NULL), 134/613 rows flipped.
- **`categories.business_type_id`** (nullable + index) so the offering-category
  picker can be scoped to a vertical — today a salon's dropdown lists
  "Pastries" next to "Haircut". Every existing row stays NULL = global, so the
  current picker is unchanged until categories are deliberately assigned.
- **Types:** new `lib/types/offering.ts` (`OfferingKind`, `OfferingMode`,
  `OFFERING_*` constants mirroring the DB CHECKs, `modeAllowsProducts/Services`,
  `defaultKindForMode`), `Product.kind` required + `CreateProductRequest.kind`
  optional, re-exported from `lib/types/index.ts`; `make generate-types` run.
- **⚠️ Known decay, deliberately not fixed:** a NEW offering created by a
  services business still defaults to `kind='product'` — the DB can't tell
  "field omitted" from "explicitly 'product'", and a force-flip trigger would
  make a services business unable to ever list a real product. **Phase 3's
  form must set `kind` explicitly** from `defaultKindForMode(offering_mode)`.
- **Tests (+9 vitest, +1 SQL suite):** `lib/types/__tests__/offering.test.ts`
  (constants pinned against the DB CHECKs, mode helpers, `defaultKindForMode`
  never returning an invalid kind) and
  `supabase/tests/offerings_discriminators.test.sql` (backfill completeness,
  mode↔type agreement, kind flip, trigger resync on category change + clear,
  both CHECKs rejecting junk, default-kind on a legacy-shaped INSERT,
  categories left global) — run against the local stack, "ALL SQL TESTS
  PASSED". Verified: `yarn lint` + **1375** tests + `yarn build` green.

## 2026-07-27 — Offerings model phase 0: unit-aware price display (feat/dynamic-product-service-listing)

> **No schema, API-contract, or auth change — presentational bug fix + one
> additive mobile response field.** LOW risk. Plan for the whole model
> (services/rentals: van rental, salon, tours) kept local (not committed).

- **Fixed: every customer-facing surface dropped `price_type`/`price_unit`.**
  `products` has carried `price_type` (`fixed | from | per_hour | per_day |
  per_person | per_event`) and a free-text `price_unit` override since
  `20260511000001`, but only the mobile products route and the owner's
  add-product form ever read them. A ₱500/hr service rendered as a flat
  "₱500"; a ₱3,500/day van rental as "₱3,500". Wrong price, not cosmetic.
- **New `lib/utils/formatOfferingPrice.ts`** — pure, no React/Supabase (the
  mobile route needs it server-side too). `formatOfferingPrice()` →
  `"₱500/hr"`, `"From ₱12,000"`, `"₱350/person"`; `price_unit` overrides the
  enum suffix space-separated (`"₱800 per table"`); unknown/absent
  `price_type` degrades to `fixed` rather than breaking; null/non-finite price
  → `"Price on request"` (forward-compat with the phase-3 `on_request` type).
  `formatOfferingPricePair()` returns `{ base, sale }` so a discounted unit
  price can't render as `"₱400 ₱500/hr"`. Kept the existing `₱1,234` style
  (no forced decimals) — deliberately NOT `phFormat`, which would have added
  `.00` to every product card in the app.
- **Wired into all four render sites:** `PublicProduct` gained
  `price_type`/`price_unit` and `getPublicMenu` maps them through (the
  underlying `getProductsPaginated` already selected `*` — only the mapper
  dropped them); explore menu card, the shared `components/custom/ProductCard`
  (business shop + view-product), and the owner's product-table price column.
- **Mobile:** additive `price_display` string alongside the untouched `price`
  number — old clients ignore the unknown key, new ones get correct copy
  without an APK release (the additive-only mobile contract rule).
- **Also:** cleaned two stale `CLAUDE.md` active-work pointers
  (`.claude/ADMIN_REWORK.md`, `.claude/REGISTRATION_GATING.md` — both files
  already deleted) and replaced them with the offerings-model pointer.
- **Tests (+27, 1339 → 1366):** `formatOfferingPrice` unit suite (21 — all six
  price types, unit override incl. with the `From` prefix, blank-unit,
  unknown-type degradation, null/NaN/zero, sale-pair suffix parity),
  `getPublicMenu` passthrough + fixed-default + error branch (4), mobile route
  `price_display` incl. unit override (2). Verified: `yarn lint` + **1366**
  tests + `yarn build` green.

## 2026-07-25 — Anonymous /explore now renders the LANDING's nav (feat/explore-public-nav)

> Presentational. No schema, API, or auth change.

- **The two public surfaces were two designs.** /explore carried app chrome
  (Home · Explore · Nearby · Deals, shadcn buttons) even for a first-time
  visitor with no account, while / and /home carried the marketing nav. The
  explore header now delegates to the **actual `LandingNav`** whenever there is
  no session, so the two surfaces are one design by construction rather than by
  a maintained resemblance.
- **Why this needed a refactor rather than an import.** `LandingNav` is a 1:1
  port of the design export: styled entirely from CSS custom properties and
  from `.wrap`/`.navlinks`/`.navactions`/`.hamb`, every rule scoped under
  `[data-ilokal-root]` in `landing.css`. Dropped into another page it renders
  with no layout and no palette. Three changes made it embeddable:
  - **`tokens.ts`** — extracted `themeTokens(dark)` (the custom properties
    alone) from `rootStyle(dark)` (properties **+** whole-page layout:
    `min-height:100vh`, `overflow-x:hidden`, page background). Embedding one
    piece of landing chrome no longer drags page layout with it.
  - **`LandingNav`** — now takes `links`, `logoHref`, `actions` and `mobileCta`,
    every one defaulting to exactly what the landing renders, so `/home` is
    byte-identical. The brand lockup gained the same `#`-vs-route split the
    links already had, so a route logo soft-navigates.
  - **`PublicNav`** (new) — supplies the `data-ilokal-root` wrapper +
    `themeTokens`, imports `landing.css`, and drives `dark` from **next-themes**
    rather than page-local state, so the header tracks the theme the rest of
    /explore is painted with. Passes absolute links (`/home#shoppers`) because a
    bare `#shoppers` scrolls nowhere off the landing.
- **`CustomerHeader` is now a session switch:** no user → `PublicNav`; user →
  the app header (customer: Wallet + avatar menu; owner/admin: Go to dashboard).
  A signed-in owner never sees "For Businesses", and `/customer/**` — which
  shares this header — always gets the app set.
- **Dropped an unshipped intermediate.** A first pass (never committed) had
  `CustomerHeader` carry two link arrays and a hand-rolled `xl:`/`md:` row
  pairing to keep six marketing labels from overflowing. `LandingNav` already
  solves that with its own hamburger overlay below 1100px (`landing.css`), so
  none of that machinery survives here.
- **Fixed the logo/nav misalignment** in both the header and the footer. The
  brand `<Link>` renders an `<a>`, which is `display:inline`: as a flex item its
  box is a LINE box, so the inherited line-height strut pads the 28px lockup and
  `items-center` centres that padded box instead of the logo. `flex
  items-center` on the anchor removes the strut.
- **Tests:** `CustomerHeader.test.tsx` reworked to the split — anon asserts
  `[data-ilokal-root]` is present with the landing's label list; signed-in
  asserts it is absent. Four assertions that described the removed anon chrome
  (aria-labelled lockup, `sm:inline-flex` CTA, text-based toggle lookup) were
  retargeted. Verified: `yarn lint` + **1339** tests + `yarn build` green.
- **Unverified in a browser:** the header now paints from landing tokens
  (`#FFFFFF`/`#1A1A1A`) while the body below uses app tokens — near-identical,
  but a seam is possible in dark mode; and there is a one-frame light flash
  before next-themes resolves (the standard mounted-guard trade-off).

## 2026-07-25 — Explore ⇄ landing navigation, phases 0–4 (feat/explore-public-nav)

> Mostly presentational + route constants, but **two session-plumbing fixes
> ride along** (see the last two bullets): the proxy matcher gains `/explore`
> and `createServerSupabaseClient` stops throwing on a read-only cookie store.
> No new migration — `20260725000000` was already committed, just never applied
> locally. **Cloud is unverified** (no cloud credentials in this env): confirm
> `20260717093122`, `20260723000000` and `20260725000000` are present on
> `ilokal-database` before this ships, or `/explore/[businessId]` renders
> without ratings in production.

- **Fixed: `/explore` had no route back to the landing.** The landing links into
  `/explore` (`navLinks[0]`), but `CustomerHeader` carried only Explore/Nearby/
  Deals and its brand lockup pointed at `/explore` — so the browser Back button
  was the only way out of the public shop surface.
- **Why not just mount `LandingNav` there:** it is styled entirely from CSS
  custom properties (`--bg`, `--brand`, …) and class names (`.wrap`,
  `.navlinks`, `.hamb`) that exist **only** under the landing's
  `[data-ilokal-root]` wrapper + `landing.css`, so it renders unstyled anywhere
  else; adding that wrapper to `/explore` would put a second, `useState`-driven
  theme system on top of the app's `next-themes` tokens; 5 of its 6 links are
  landing-only hash anchors that no-op off-landing; and it is session-blind, so a
  signed-in customer would lose the avatar/Wallet/logout menu and be shown a
  "Log In" button. Chose to extend `CustomerHeader` instead.
- **Phase 0 — route constants.** New `ROUTES.PUBLIC.LANDING`; it and the
  no-role fallback `ROUTES.DASHBOARD.HOME` (used by `proxy.ts`,
  `getCurrentUser`, the auth callback) now derive from one module-level
  `LANDING_PATH`, so the two names for `/home` can't drift. New
  `landingSectionPath(section)` + `LandingSection` union — cross-surface anchors
  must be `/home#about`; a bare `#about` silently scrolls nowhere off the
  landing, and a typo'd section is now a type error. `landing/data.ts` no longer
  hardcodes `'/explore'`.
- **Phase 1 — Home link.** `CustomerHeader.NAV_LINKS` leads with
  **Home** → the landing, so it appears in the desktop row *and* the `md:hidden`
  mobile scroll row (both map the same array). Brand lockup destination now
  depends on who's looking: a signed-in customer's home is the shop feed
  (`/explore`), everyone else (anon, owner, admin browsing publicly) gets the
  landing; `aria-label` follows. Active state stays exact-match, so Home never
  highlights while on explore.
- **Phase 2 — CTA + theme parity.** The anon explore header now also carries
  **List Your Business** → `/business/registration` (the landing's primary
  conversion CTA; `hidden sm:inline-flex` so a 320px row can't overflow), and a
  `ThemeToggle` sits first in the actions for every visitor — the explore
  surface previously had no theme control at all. Documented in `tokens.ts` +
  `LandingNav` that the landing's own toggle is page-local React state: it does
  not persist, does not follow the OS preference, and neither toggle affects the
  other's surface. Wiring them together means migrating the landing off its
  design-export tokens — its own branch.
- **Phase 3 — the explore surface finally has a footer.** New
  `components/customer/CustomerFooter.tsx` (server component, Tailwind/shadcn
  tokens): brand lockup + a labelled `Footer` nav — Home · Explore · Nearby ·
  Deals · About · List your business — + the copyright line, mounted after
  `<main>` in `app/explore/layout.tsx` (the layout's `flex-1` main pins it to
  the viewport bottom on short pages). Written fresh rather than reusing
  `LandingFooter`, which reads `[data-ilokal-root]` CSS vars and
  `.wrap`/`.footgrid` from `landing.css` and would have re-imported the whole
  landing theme system. The About entry goes through `landingSectionPath` and a
  test asserts no footer href starts with `#`. The protected `/customer/**`
  layout deliberately did **not** get it — those are logged-in app surfaces.
- **Phase 4 — landing-side link hygiene.** The landing footer's "Shops" and
  "Deals" pointed at `#shoppers`/`#deals` — the landing sections that *advertise*
  the explore surface rather than the surface itself; they now point at
  `/explore` and `/explore/deals`. `LandingFooter` also rendered every entry as
  a plain `<a>`, which was harmless while they were all in-page hashes but
  forces a **full document reload** on a route link. It now mirrors
  `LandingNav`'s split (hash → `<a>`, route → `<Link>`), with the shared style
  string extracted so the two branches can't drift.
- **Tests (+26):** `CustomerHeader.test.tsx` (12 — new file, happy-dom +
  `react-dom/client` per repo convention, no `@testing-library`),
  `CustomerFooter.test.tsx` (5 — new file),
  `landing/__tests__/LandingFooter.test.tsx` (4 — new file; the `next/link` mock
  tags what it renders, so a future bare-`<a>` route link fails the catch-all
  case) and `config/__tests__/routeConfig.test.ts` (+5).
- **Fixed: `/explore` threw "Cookies can only be modified in a Server Action or
  Route Handler".** Two faults, both load-bearing. (1)
  `createServerSupabaseClient().setAll` wrote straight into the request cookie
  store; in an RSC that store is read-only, so auth-js rotating an expiring
  access token threw — and the throw escaped `getUser()` into
  `getCurrentUser()`'s catch, which returned `null`, so a **live session
  rendered as anonymous** (login buttons instead of the avatar menu). Now
  wrapped in try/catch, the documented `@supabase/ssr` pattern. (2) Swallowing
  is only safe because `proxy.ts` re-writes those cookies on a mutable
  response — and `/explore` was **not in the matcher**, so nothing refreshed the
  token there at all. Added `/explore` + `/explore/:path+`;
  `isProtectedPath('/explore')` is false, so it takes the refresh path only —
  no redirect, no role gate, anonymous visitors unaffected.
- **Fixed: `/explore/[businessId]` logged `[getPublicBusinessProfile rating]
  {}`.** `get_business_rating_summary` (migration `20260725000000`, committed
  with the explore feature) had never been applied to the local DB — `pg_proc`
  had only `business_branches` and `get_follower_counts`. Applied via
  `make migrate-up`; verified SECURITY DEFINER + pinned `search_path` + anon
  EXECUTE, and `make generate-types` produced no diff. The rating aggregate is
  decorative, so the page rendered without stars rather than crashing. The
  useless `{}` was its own bug: `PostgrestError` carries its fields
  non-enumerably, so `console.error(err)` hid `PGRST202: Could not find the
  function …`. New exported `describeDbError()` flattens
  `code`/`message`/`details`/`hint`, wired into the three RPC error branches in
  `customerQuery.ts` — the next unapplied migration will name itself.
- **Tests (+33 total):** the 26 navigation tests above plus
  `__test__/features/customer/exploreSessionCookies.test.ts` (5 — read-only
  store doesn't throw, mutable store still writes `httpOnly`, batch abandoned
  after the first rejection, matcher contains explore, explore stays
  unprotected) and `describeDbError` (2). **1333** tests + `yarn lint` +
  `yarn build` green.
- **Remaining:** the manual viewport/role/theme sweep (320 / 768 / 1280px, anon
  vs signed-in customer, light + dark), and the cloud migration check above.

## 2026-07-25 — Sign-in unification: one `/sign-in` door, role-routed (feat/signin-unification)

> **Auth-surface + routing change — HIGH risk, needs human approval before
> merge.** No schema migration. Branch cut from `main` (== `develop` HEAD).
> ⚠️ **Manual pre-merge QA still pending** (needs the local stack + seeded
> accounts): three-role login matrix, MFA owner, `?next=` round-trip via the
> auth nudge, password-reset E2E, logout doors, 9-failure 429.

- **One login door.** `/login` (customer) + `/login/business` replaced by a
  single **`/sign-in`** page — no portal choice; the account's role decides:
  `app_user` → validated `?next=` deep link else `/explore`; `business_owner`
  → `/business/[businessId]` (or `/business/registration` when none); `admin`
  → `/admin`. Admin keeps its own gated door, moved to **`/sign-in/admin`**
  (`loginAsAdmin` unchanged; its wrong-role copy now points at `/sign-in`).
  An admin or owner signing in at `/sign-in` is routed, never rejected — the
  "wrong portal" dead end is gone (`loginAsBusiness` deleted).
- **Legacy URLs survive:** `next.config.ts` 307s `/login` + `/login/business`
  → `/sign-in` and `/login/admin` → `/sign-in/admin`, query preserved
  (`?next=`, `?reset=1`, `?error=`). Deliberately 307 (not 308) until soaked —
  browsers cache permanent redirects past a rollback; flip later.
- **`signInAction`** = the existing role-agnostic `loginAction` core (SEC-8
  shared-bucket rate limits, generic errors, archived/status gates — all
  unchanged) + `businessId` lookup for `business_owner` only.
- **`SignInForm`** merges the two old forms: `?next=` via `safeNext`
  (customer-only), typed 429 rendered distinct from bad credentials, MFA
  elevation step (now runs for every role — no-op unless a verified TOTP
  factor is enrolled), password show/hide, Suspense-wrapped `useSearchParams`.
  Shared `lib/utils/redirectError.ts` (digest-first NEXT_REDIRECT detection);
  `AdminLoginForm` adopted it — its old message-only check breaks in prod
  builds where thrown Server-Action messages are redacted.
- **Route config:** `ROUTES.AUTH.SIGN_IN`/`ADMIN_SIGN_IN`; the three legacy
  constants **deleted** and all ~26 call sites swept (proxy, `getCurrentUser`
  ×8, customer layout/pages, auth callback, headers/menus, SignupForm,
  `useAuth` default, apiClient 401 interceptor, LandingNav, forgot/reset
  forms). `loginPathForPathname`: admin pages → `/sign-in/admin`, everything
  else → `/sign-in`. Five literal `'/login'` strings in business pages +
  DangerZoneTab rewritten to the constants (routeConfig-only rule).
- **Dead code deleted:** `LoginForm` + `PortalSelector` (zero importers),
  `CustomerLoginForm` + `BusinessLoginForm` (superseded).
- **Tests (+14, 1258 → 1272):** `signInAction` unit (businessId per role,
  rate-limited passthrough before any auth work), `SignInForm` happy-dom
  matrix (role×`?next=` routing, 429 without navigation, MFA step + wrong
  code), `isRedirectError` unit, routeConfig door constants +
  `loginPathForPathname` matrix; ResetPasswordForm asserts `/sign-in?reset=1`.
- Verified: `yarn lint` + **1272** tests + `yarn build` green; prod-server
  smoke — `/sign-in` + `/sign-in/admin` 200, legacy paths 307 with query
  passthrough, unauth `/customer` `/business` `/admin` all redirect to
  `/sign-in`. Docs swept (`authentication`, `session-management`,
  `protected-routes`, `caching-strategy`, `architecture`, `folder-structure`,
  `business-owner-flow`).
- **2FA repair (same branch):** enrolling never showed a QR. GoTrue returns
  `totp.qr_code` as RAW SVG markup, not a URL — `next/image` threw in dev
  ("cannot end with a space or control character") and in production silently
  fetched the markup as a RELATIVE PATH, so the request came back as the 404
  page. `enrollMFAAction` now base64-encodes it as a `data:image/svg+xml`
  URL (verified against the live GoTrue response: 283032 B SVG →
  377402 B data URL, round-trip identical), with a client-side normalizer as
  a second net. The dialog auto-enrolls on open (the extra "Generate QR Code"
  click is gone, StrictMode-double-fire guarded), and `SecurityTab` refetches
  the real factor list instead of pushing a `crypto.randomUUID()` placeholder
  whose id made the Remove button unenroll a factor that didn't exist. Enroll
  + verify actions gained a `getUser()` guard.
- **Review hardening (react-doctor + api-doctor, PR #16):**
  - **🔴 Sign-in loop closed:** `signInAction`'s owner lookup had no
    `.is('archived_at', null)`/`.limit(1)` and swallowed the query error — an
    owner whose only business is archived was routed to
    `/business/<archivedId>` → layout bounce → `/business` → `/sign-in`, and a
    second row turned `maybeSingle()` into an error that dropped an existing
    owner into the registration wizard. Now matches
    `getMyBusinesses`/`verifyBusinessOwner`; a lookup error logs and falls back
    to `businessId: null` (never surfaced to the client).
  - **MFA is no longer advisory (HIGH-risk auth change).** Both doors set the
    session BEFORE the TOTP step, and nothing downstream checked AAL — abandon
    the code step, navigate to a dashboard URL, fully signed in. The proxy now
    gates every protected page on
    `mfa.getAuthenticatorAssuranceLevel()`: `nextLevel === 'aal2' &&
    currentLevel === 'aal1'` → expire the `sb-*` cookies and redirect to
    `/sign-in?mfa=required` (which renders an explanation). Fails OPEN on a
    null level. No extra round trip — the call decodes the session JWT and
    reads factors already on the session user (runtime-verified: a fresh
    password login on an enrolled account is `aal1` and carries the verified
    factor). Both forms also sign out when the step is abandoned, and
    `AdminLoginForm` gained the elevation step it never had — required now,
    or an enrolled admin could never reach `/admin`.
  - `/business` sends a signed-in owner with no live business to
    `/business/registration` (it was bouncing them to the sign-in door;
    `getMyBusinesses` throws when unauthenticated, so `!business` only ever
    means "authenticated, no row").
  - The MFA stale-factor sweep is scoped to the friendly name this action
    mints — the blanket version silently destroyed an enrollment started in
    another tab/device — and a failed enroll returns hand-written copy instead
    of GoTrue's message.
  - `MFAEnrollDialog` awaits the parent refetch before closing (a rejection was
    an unhandled rejection that left the card claiming 2FA was off), starts
    busy so it can't paint "Try again" before anything was tried, and the retry
    button only renders on a real error; `SecurityTab.refreshFactors` throws
    instead of silently no-op'ing.
  - `/sign-in` prerendered an empty document — `useSearchParams` bails the
    Suspense boundary and the fallback was `null`. Now a form-shaped skeleton
    (asserted present in `.next/server/app/sign-in.html`).
  - Cookie constants moved to `supabase/cookies.ts` (no `next/headers`) so the
    proxy can expire them; `supabase/server.ts` re-exports them.
  - Admin users page "Sign in" points at `/sign-in/admin` via `<Link>` (was
    `/sign-in` behind `window.location.href`).
  - **Tests 1272 → 1301** (+29): proxy MFA gate incl. fail-open cases (6),
    AdminLoginForm door incl. MFA step (4), MFAEnrollDialog (5),
    SignInForm abandon/notice (2), signInAction archived+error branches (2),
    mfaActions scoped cleanup + generic error (2), plus the earlier 2FA fixes.
    Verified: `yarn lint` + **1301** tests + `yarn build` green.
  - **Still manual-QA pending:** three-role login matrix, MFA owner + MFA
    admin end-to-end, `?next=` round-trip, 9-failure 429, and the new gate's
    behavior for a user who enrolls MFA mid-session.

## 2026-07-25 — Customer portal: public /explore + protected /customer (feat/customer-portal)

> **Big feature — HIGH-risk review surface (auth doors + proxy rules), one
> LOW-risk schema migration** (`20260725000000_business_rating_summary_rpc.sql`
> — aggregate-only anon RPC, applied + smoke-tested locally as anon; needs
> human approval + cloud apply). Everything else rides existing public RLS +
> anon RPCs — **no other DB change**. (Parity/action plan kept local.)

- **Public discovery (`/explore`, no auth):** business directory (trgm search,
  category filter, follower counts, **offset pagination** — shareable URLs,
  exact counts, repo pattern), business profile page (menu via
  `getProductsPaginated`, live coupons under the access invariant, rating
  summary via the new `get_business_rating_summary` RPC, follower count,
  interior gallery, share button reusing `/s/[businessId]`, SEO
  `generateMetadata`), **branch map** (react-leaflet, client-only dynamic
  import) with a straight-line **polyline from the visitor's location** +
  haversine distances (`lib/utils/geo.ts`; geolocation denied ⇒ Iloilo City
  Proper fallback), `/explore/nearby` (geolocated `nearby_businesses` RPC via
  the public mobile endpoint, radius picker), `/explore/deals` (`mobile_deals`
  RPC: featured/flash/all + pagination).
- **Customer accounts (role `app_user`, same as mobile):** `/login` is now the
  customer door (was a redirect to the business login) —
  `CustomerLoginForm` with sanitized `?next=` deep-link back after auth;
  signup already had the Customer role, its post-signup redirect now lands in
  the portal (was falling through to `/business`). `redirectByRole`/
  `ROLE_ROUTES` send `app_user` to `/explore`. Proxy + `protectedRoutes` gate
  the new `/customer` prefix to `app_user` only; layout re-checks server-side
  (defense in depth). Sign-out via the existing `useAuth().logout` in the new
  `CustomerHeader` (BrandLogo, Explore/Nearby/Deals nav, wallet + account
  menu, mobile nav row).
- **Redeem + wallet:** `redeemCouponAction` mirrors the mobile route's gate
  matrix 1:1 (published/window/global-cap/follow-gate/active-dupe/per-user
  cap, atomic `increment_coupon_redemptions` with rollback on the race, owner
  notification non-fatal, same user copy — unification into one shared core is
  a tracked follow-up). Anonymous visitors get an **auth-nudge dialog**
  (signup/login with `?next=`). `/customer/wallet`: Active/Claimed/Expired
  tabs, the server-generated 6-char claim code (copyable) and a **live
  countdown** (`lib/utils/countdown.ts`, urgent style inside 24h).
- **Follow + updates:** follow/unfollow server actions (RLS self-scoped,
  idempotent on 23505), profile Follow button, `/customer/following` =
  followed shops + an Updates feed (posts + new live promos + new products
  from followed businesses) mirroring the mobile `/updates` bounded-scan
  merge (offset over the merged set — kept in lockstep with mobile rather
  than introducing a divergent keyset shape).
- **Landing links:** "Explore Shops" in the landing nav + the hero primary CTA
  now routes to `/explore` (replaced the dead `#` "Get the App").
- **Skeletons:** new customer set (`components/customer/skeletons.tsx` —
  explore grid, profile, wallet, following) on the shared `StatusRegion` a11y
  contract; `loading.tsx` for every new route.
- **Tests (+54):** redeem-action integration matrix (12 — every gate, exact
  copy, rollback-on-race, follow idempotency), customerQuery units (filters/
  offset/RPC merge/invariant/wallet filters/feed short-circuit), geo +
  countdown units (14), protectedRoutes customer rules (4), explore page
  searchParams passthrough (2). Verified: `yarn lint` + **1244** tests +
  `yarn build` green; rating RPC smoke-tested in SQL as `anon`.
- **Known follow-ups:** unify web action + mobile route redeem/updates cores;
  ratings *submission* on web (SEC-4 gate exists server-side).
- **Review hardening (react-doctor + api-doctor, PR #14):**
  - **Unthrottled customer login door closed:** `loginAction` (the Server-
    Action path both login forms use — never covered by the `/api/auth/*`
    SEC-8 budgets) now enforces the same per-IP 30/60s + per-account 8/300s
    budgets itself, generic message, before any auth/DB work.
  - **Account-state gate on customer mutations:** `requireCustomer` now
    rejects non-`active`/archived accounts (explore-page Server Actions bypass
    the proxy's `/customer` status gate, and a live cookie session refreshes
    indefinitely — role alone wasn't enough). `getCurrentUser` returns
    `status` + `archived_at`. Plus a per-user 30/60s flood guard on
    redeem/follow (Server-Action POSTs never enter the proxy limiter).
  - **Two broken public read paths fixed:** menu images now resolve through
    `getPublicMenu` (raw in-bucket paths crashed `next/image`), and branch map
    coordinates come from the `business_branches` RPC (nested PostgREST
    geography select returns WKB hex, so every pin rendered null).
  - **Redeem branch validation (web-first, mobile shares the gap):** the
    branch must belong to the coupon's business, and a branch-scoped coupon
    only redeems at its branch — closes wrong-branch redemptions the "mirror
    1:1" framing would have frozen.
  - **Wallet parity + bounds:** NULL `expires_at` now counts as active /
    can't be expired (mobile contract), and the wallet reads are `.range()`d
    (12/page + PaginationBar) instead of unbounded.
  - **Open-redirect edge closed:** shared `lib/utils/safeNext.ts` also rejects
    backslash paths (`/\evil.com` normalizes protocol-relative); signup now
    honors a validated `?next=` for customers and the auth nudge preserves the
    query string, so the deep-link round-trip works on both doors.
  - **Correctness/UX:** `mobile_deals` + menu reads moved behind
    `customerQuery` (no Supabase in page components — repo rule);
    `getPublicBusinessProfile` wrapped in `React.cache` (generateMetadata +
    page shared fetch) and typed `NOT_FOUND` vs `LOAD_FAILED` (transient blips
    no longer 404/deindex healthy shops); updates feed exposes `has_more`
    (new `FeedPager`) instead of fabricated exact totals from the bounded
    scan; soft-deleted category names filtered from public embeds; explore
    search no longer clobbers in-flight typing after the debounce lands;
    login redirect detection uses the `digest` marker; map geolocation is
    button-only (no unsolicited permission prompt) and recenters when the
    position arrives; distinct "couldn't load" vs "empty" states on all
    customer surfaces; pagination uses `push` (Back walks pages); wallet code
    a11y via sr-only hint.
  - **Tests 1244 → 1250** (+ suspended/archived gates, branch-mismatch ×2,
    per-user rate limit, wallet null-expiry/pagination assertions). Verified:
    `yarn lint` + **1250** tests + `yarn build` green.
- **Round-2 review (react-doctor + api-doctor, PR #14):** all nine round-1
  fixes verified by both reviewers; this round fixed what the hardening itself
  introduced or half-fixed:
  - **`safeNext` control-character bypass closed** — the WHATWG parser strips
    tab/CR/LF before parsing, so `/%09/evil.com` collapsed to
    protocol-relative `//evil.com`; the validator now rejects `\` and all
    ASCII control chars (dedicated unit suite added).
  - **Login rate-limit unified + honest 429:** the Server-Action buckets now
    share the route's `auth:login:*` keys (alternating doors no longer doubles
    an attacker's per-account budget), and the limit branch RETURNS a typed
    `{ rateLimited, message }` instead of throwing (prod Next redacts thrown
    Server-Action messages; the form now shows the real copy and can tell 429
    from bad credentials). Admin/business wrappers keep their throwing
    contract.
  - **Following page outage≠empty completed:** a failed shops read no longer
    renders "not following anyone" or unmounts the updates feed — distinct
    error panel, feed stays. `getFollowedBusinesses` is bounded
    (`.range(0,199)` + exact count; the "Your shops (N)" label uses the count,
    so it can't silently lie past the cap).
  - **Landing nav route links** use `<Link>` (hash anchors stay `<a>`) — the
    `/explore` entry was forcing full document reloads from both the desktop
    nav and the mobile menu.
  - **Redeem treats an archived business's coupons as not found** (the coupon
    RLS policy only checks `verified`; mobile shares the gap — flagged for the
    shared-core follow-up), header avatars resolve raw storage paths via
    `resolvePublicAvatarUrl`, and owners/admins no longer see a permanently
    disabled Redeem button (hidden, matching FollowButton).
  - **Tests 1250 → 1256** (safeNext suite, archived-business gate). Verified:
    `yarn lint` + **1256** tests + `yarn build` green. Migration
    `20260725000000` still awaits human approval + cloud apply before merge.

## 2026-07-25 — Brand rollout: "Hablon Weave" logo across the app (fix/table-toolbar-pagination)

> Presentational only — no schema/API/auth. Assets in `public/brand` (v0.2).
> (Parity/action-item plan kept local, not committed.)

- **New `components/custom/BrandLogo.tsx`** — `BrandMark` (inline weave SVG),
  `BrandWordmark` (Geist 800, tracking −3.5% — HTML text, since SVG-as-`<img>`
  can't load document fonts and would fall back off-brand), `BrandLogo` lockup.
  Palette is theme-aware by default (`#65A30D`/white, dark: `#84CC16`/`#1A1A1A`
  per the brand README) with `palette="light"|"dark"` pinning for surfaces
  outside the `.dark` class system.
- **Swapped every app-brand logo site:** auth header (was lucide `Store` +
  "ILOKAL"), landing nav + footer (were plain text; mark follows the landing's
  own dark toggle — footer now receives `dark`), admin sidebar (was
  `ShieldCheck`; keeps the "Admin" subtitle). Business sidebar and `/s/…`
  share page untouched — tenant branding, not app branding. Reset email keeps
  its text wordmark deliberately (remote images are blocked by default in most
  clients).
- **Favicons:** new `app/icon.svg` (brand favicon) + `app/apple-icon.png`
  (180px) + `app/favicon.ico` regenerated from the brand 16/32 PNGs
  (PNG-in-ICO), replacing the stale pre-brand default. Stripped the Windows
  `*:Zone.Identifier` junk that came with the asset copy.
- **Tests (+5):** BrandLogo render — accessible mark, default auto palette,
  palette pinning, wordmark typography, lockup composition.
- Verified: `yarn lint` + **1200** tests + `yarn build` green.

## 2026-07-25 — Forgot-password "Check your email" panel redesign + working resend (fix/table-toolbar-pagination)

> Presentational + one client-side resend affordance. No API/schema change —
> `POST /api/auth/reset-password` reused as-is, still enumeration-safe.
> (Parity/action-item plan kept local, not committed.)

- **Redesigned the confirmation panel to the repo's success-state language**
  (centered `bg-primary/10` icon circle + centered heading/body, per
  `application-success-dialog`): it was a left-aligned draft — small icon stuck
  top-left, no structure, bare inline "try again" text button.
- **Real resend flow:** bordered "Didn't get the email?" card (spam-folder +
  spelling hints) with a **Resend email** button that re-POSTs the same email,
  toasts generic success/failure (stable id `resend-reset-link` per the
  one-Toaster rule), and runs a **60s cooldown** — started on the initial
  submit and on every resend, so a fast clicker can't burn the route's
  per-account rate budget (8/300s). Failure does NOT restart the cooldown
  (immediate retry allowed). "Use a different email" link returns to the form
  (replaces the old "try again").
- **a11y:** `role="status"` now scoped to the static heading/body block only —
  the cooldown countdown ticks outside it, so AT doesn't re-announce the
  region every second.
- **Tests (5 kept/updated + 5 new, happy-dom + react-dom/client + mocked
  sonner/fake timers):** cooldown disable→enable across the full 60s, resend
  re-POST + success toast + cooldown restart, resend-failure toast with panel
  kept, back-to-form link, and the role="status" scoping.
- Verified: `yarn lint` + **1195** tests + `yarn build` green.

## 2026-07-25 — Wrap-safe table toolbars + real product-catalogues pagination (main)

> No schema/API/auth change — presentational fixes + one page rewired to the
> existing paginated query. LOW-MEDIUM risk. (Parity/action-item plan kept
> local, not committed.)

- **Fixed toolbar overflow on every table (business + admin).** Two class bugs:
  `SearchBar`'s wrapper hardcoded `min-w-sm` (384px — call-site `max-w-xs`
  landed on the inner `<Input>`, not the wrapper, so it couldn't shrink), and
  toolbar rows used `inline-flex h-10` (fixed height, no wrap — children
  overlapped once they exceeded the row, as in the Product Catalogues
  screenshot). SearchBar wrapper is now `w-full min-w-0 sm:w-64 lg:w-80`;
  toolbar rows are `flex flex-wrap … gap-2` (product-catalogues, coupons,
  redeemed-coupons, admin businesses); the category-chip strip is
  `min-w-0 flex-1 overflow-x-auto`. `DataTablePagination` is wrap-safe too
  (`flex-wrap` + `gap-*`, `space-x-*` removed).
- **Fixed "Rows per page" doing nothing (product catalogues).** The page
  rendered `ProductCataloguesClient`, which fetched ALL products
  (`getProductsByBusinessId`, no pagination — silently truncates at the
  PostgREST 1000-row cap), passed `pageSize={products.length}` (blank Select —
  value not in `[10..50]`), a no-op `onPaginationChange`, and an **unwired**
  SearchBar. Page now parses `page`/`perPage`/`search`/`category`/`status`/
  `branch` searchParams, calls the existing `getProductsPaginated()`, and
  renders the URL-driven `ProductCataloguesContent` (the previously dead twin
  every other table already uses). Search, category chips, status filter,
  page-size, and pager all work server-side now. Deleted
  `ProductCataloguesClient.tsx`.
- **`getProductsPaginated` hardening:** now excludes archived rows
  (`.is('archived_at', null)` — stats + byBusinessId already did; this query
  leaked soft-deleted products to `/api/web/products`), and accepts
  `status: ''` (typed `ProductStatus | ''`) to mean "all statuses" — omitting
  still defaults to `'active'`, so the public route contract is unchanged.
- **Tests (+8):** `table-toolbar.contract.test.ts` (SearchBar shrinkable,
  pagination wraps, repo sweep fails on any reintroduced `inline-flex h-10`
  row), `getProductsPaginated` archived/status gating (3), and page-level
  searchParams passthrough incl. clamping + invalid-status rejection (4).
- Verified: `yarn lint` + **1190** tests + `yarn build` green.

## 2026-07-24 — Logout redirect fix + per-page loading skeletons (feat/forgot-password)

> **Auth-surface change — HIGH risk, needs human approval before merge.** It
> changes server-side sign-out semantics, adds a new exported Server Action
> (`signOutAction`) and removes one (`logoutAction`), and now uses the
> service-role client on the sign-out failure path. **No schema/RLS/migration
> change**, so nothing to apply to cloud. Plan in `.claude/LOGOUT_LOADING.md`.
> Applies to **both** business and admin.

- **Fixed: logout didn't redirect until a manual refresh.** `useAuth().logout`
  called a Server Action that does `redirect()` from a bare dropdown `onClick` —
  a Server-Action redirect only drives client navigation inside a form/transition,
  so the cookie cleared but the page stayed put. Reworked to the correct
  server/client split (see below).
- **Server/client navigation split (codified):** server-side flows navigate with
  `redirect()` (`next/navigation`); client-side flows use `useRouter().push()` +
  `router.refresh()`. New redirect-less `signOutAction()` does the server sign-out
  only; the client `useAuth().logout(redirectTo)` awaits it, then
  `router.push(redirectTo)` + `router.refresh()` (drops the cached authed RSC
  tree so Back can't show stale content). The redirecting `logoutAction` /
  `redirectByRole` stay as the server-side primitive. **No `window.location`.**
- **Role-based logout destination:** business `UserMenu` →
  `/login/business`, admin `AdminUserMenu` → `/login/admin` (each passes its
  path to the shared hook; hook default = `/login`). Both menus show a
  `Loader2` + "Signing out…" busy state (disabled, menu kept open via
  `onSelect` + `preventDefault`).
- **Per-page loading skeletons (both dashboards):** new
  `components/custom/skeletons.tsx` (`DashboardSkeleton`, `TablePageSkeleton`,
  `FormPageSkeleton` + pieces, each a `role="status"`/`aria-busy` region with an
  sr-only label). 11 route-level `loading.tsx` files: business + admin roots
  (dashboard), the table routes (product-catalogues/coupons/redeemed-coupons/
  branches; businesses/users/account-status), and settings (form). Sidebar +
  header persist; the skeleton fills the layout's padded content area — so page
  navigation shows a matching skeleton instead of a frozen frame.
- **Tests:** `useAuth` unit (7), menu integration (4 — open the Radix dropdown,
  select "Log out", assert the role login + the busy state), `signOutAction`
  server-side (5), skeleton render (3).
- **Review hardening (react-doctor + api-doctor, PR #12):**
  - **`signOutAction` no longer swallows a failed sign-out.** auth-js *returns*
    `{ error }` rather than throwing, and on a non-401/403/404 failure (e.g. a
    GoTrue 5xx as `AuthRetryableFetchError`) it bails **before** removing the
    local session — the `sb-*` cookies survived while the UI reported a
    completed logout. The action now inspects `{ error }`, falls back to
    expiring every `sb-*` cookie itself (covers chunked `.0`/`.1`), and returns
    `{ ok: boolean }`. `ok` is true only when the browser is guaranteed to hold
    no session. `logoutAction` now delegates to it (no duplicated body), so the
    same safety net covers the redirecting path.
  - **`useAuth` branches on the result:** navigates only on `ok`; otherwise
    stays put with a retry toast instead of showing a login page over a live
    session (the login pages have no authenticated-session guard).
  - **`push` → `replace`**, so the protected URL leaves the history stack, and
    **dropped the bare `router.refresh()`** — it fired against the route the
    client router still considered current (the authed page), whose layout
    answers with its own `redirect()` and could race the navigation. Both
    dashboard layouts are cookie-dynamic, so their RSC payloads aren't reused.
  - **`isLoggingOut` can no longer stick:** `useState` + `finally` for the
    server phase, `useTransition().isPending` for the navigation phase.
  - **Completed the fix at the remaining callers:** `useSessionMonitor` (×3)
    and `SessionWarningDialog` still called the redirecting `logoutAction()`
    from an effect/handler — the exact "cookie clears, no navigation" pattern
    this entry fixes. Both now go through `useAuth().logout()`.
  - **Skeleton coverage gaps:** added `loading.tsx` for `business/[businessId]/
    profile` + `shop` (form) and `admin/[adminId]/branches` (table) — they were
    inheriting the root **dashboard** skeleton from the segment above.
  - **a11y:** `role="status"` now wraps only the sr-only label; the decorative
    placeholders are `aria-hidden` (AT no longer traverses dozens of empty
    boxes).
- **Round-2 review (react-doctor + api-doctor, PR #12):**
  - **Fixed a regression the round-1 a11y rewrite introduced.** Tailwind v4
    compiles `space-y-*` to `:where(& > :not(:last-child))` — DOM direct
    children only. The new `aria-hidden` wrapper was `display:contents`, so the
    skeleton blocks became grandchildren and matched nothing: **every skeleton
    rendered with zero vertical gap**. Spacing now lives on the wrapper that
    directly contains the blocks; a render test asserts it so it can't regress
    silently.
  - **`signOutAction` no longer claims more than it delivers.** Expiring cookies
    only clears *this browser* — the tokens stay valid at GoTrue. It now retries
    the revoke via `createServerAdminClient().auth.admin.signOut(token,
    'global')` before falling back, and returns `{ ok, revoked }`: `ok` = the
    browser holds no session, `revoked` = confirmed server-side. `ok && !revoked`
    is a browser-local-only sign-out.
  - **Deleted `logoutAction`** — zero callers after the round-1 migration, and
    every `'use server'` export is a live callable endpoint. Its `{ok}`-ignoring
    redirect was also inconsistent with the new contract.
  - **Session-expiry auto-logout now forces the navigation.** `logout(path,
    { force: true })` for the three known-invalid-session branches in
    `useSessionMonitor` — staying put protected nothing and re-fired the retry
    toast every 60s tick. The toast also gained a stable id
    (`logout-failed`) per the repo's one-Toaster convention.
  - **`SessionWarningDialog` shares the monitor's `useAuth()` instance** (it was
    creating a second, so an auto-logout left its buttons enabled), and picks
    its login destination from `usePathname()` instead of always `/login`.
  - **Cookie constants deduped:** `SUPABASE_COOKIE_PREFIX` +
    `SUPABASE_COOKIE_OPTIONS` exported from `supabase/server.ts` and used by
    both the write path and the clear path — a future `domain`/`name` change on
    one side can no longer silently turn the fallback into a no-op.
  - **Skeleton coverage:** added `loading.tsx` for `branches/create` and
    `branches/[branchId]` (they were flashing a *table* skeleton).
  - **⚠️ Documented dead surface:** `AuthProvider`, `SessionTracker`,
    `SessionWarningDialog`, `useSessionMonitor` and `config/sessionConfig.ts`
    have **zero mount sites** — role-based session timeouts and the expiry
    warning do not run in production. The logout migration in those files is
    therefore correct but unverifiable at runtime. Marked `⚠️ NOT MOUNTED` in
    each file's header; wiring them up is a follow-up needing QA on the timeout
    values and the 60s polling.
- **Round-3 review (react-doctor + api-doctor, PR #12):**
  - **Removed the pointless service-role revoke.** `signOut()` already revokes
    globally — auth-js defaults to `scope: 'global'` and calls
    `admin.signOut(accessToken, scope)` internally (`GoTrueClient.js:3191`),
    and overwrites `Authorization` with whatever JWT is passed
    (`lib/fetch.js:99`). The round-2 "admin retry" therefore re-sent a
    byte-identical request and only dragged `SUPABASE_SERVICE_ROLE_KEY` onto a
    publicly-invocable Server Action path. Deleted; `createServerAdminClient` is
    no longer imported here.
  - **`revoked` is now honest.** `error: null` does not prove a revoke: auth-js
    returns early when there is no session, and swallows 401/403/404. `revoked`
    now means "a revoke was issued for a real token and auth-js reported no
    failure" — documented as NOT a hard guarantee. `ok && !revoked` stays the
    strong signal (browser-local sign-out only).
  - **Fixed a false claim + a real double-monitor.** `useSessionMonitor` is a
    plain hook, so every caller gets its own poller, listeners and `useAuth` —
    `AuthProvider` *and* `SessionTracker` were both calling it, and the round-2
    comment wrongly claimed the dialog shared an instance. New
    `providers/SessionMonitorProvider.tsx` owns the single instance;
    `SessionTracker` + `SessionWarningDialog` consume it via
    `useSessionMonitorContext()`.
  - **Role-aware expiry destination.** The three forced auto-logouts hardcoded
    `/login`. New pure `loginPathForPathname()` (`config/routeConfig.ts`, +4
    tests) drives both the monitor and the dialog, matching the menus.
  - **a11y:** `aria-busy` moved off the `role="status"` region onto the
    container — on the region it tells AT to defer the very announcement the
    component exists to make, and it never flips to `false`.
  - **De-brittled the guard test.** It matched concatenated attribute strings
    (any class reorder broke it) while never asserting the real invariant. Now
    happy-dom + structural assertions: the placeholders must resolve to a direct
    child of the `space-y-6` element.
  - **Right-shaped skeletons:** new `ShopPageSkeleton` (banner + grids, no page
    header), `TabsPageSkeleton` (tab strip + full-width panel) and
    `ProfilePageSkeleton` (`lg:grid-cols-3` + its own `p-6`) replace the
    mismatched `FormPageSkeleton` on shop/settings/profile. Extracted a shared
    `FormCardSkeleton`.
  - `SUPABASE_COOKIE_OPTIONS` is `Object.freeze`d (it is spread into every auth
    cookie write; a stray mutation would downgrade `httpOnly`/`secure`
    app-wide), and the sign-out test now imports the REAL constants via
    `importOriginal` instead of asserting against its own copy.
  - **Known follow-ups, not fixed here:** `app/api/auth/logout/route.ts` is a
    second, caller-less logout surface still on the bare-`signOut()` pattern
    (delete or delegate); admin `users`/`account-status` fetch client-side, so
    their `loading.tsx` only covers the RSC hop and the data wait still shows an
    empty table.
- Verified: `yarn lint` + **1180** tests + `yarn build` green.

## 2026-07-24 — Password reset: MFA (2FA) support + Resend diagnostics (feat/forgot-password)

> Auth-surface change — review before merge. No schema/migration. Plan in
> `.claude/MFA_RESET.md`.

- **Fixed: MFA-enabled users couldn't reset their password.** After the recovery
  OTP the session is at **AAL1**, and Supabase forbids `updateUser({password})`
  below **AAL2** when MFA is enrolled (`401 insufficient_aal`) — our route mapped
  that to a generic 500, so the reset silently failed. Reproduced in SQL (enroll
  TOTP → recovery → update → `insufficient_aal`).
- **Two-step confirm** (`POST /api/auth/reset-password`):
  - Step 1 `{ token_hash, password }` → `verifyOtp` → check
    `getAuthenticatorAssuranceLevel()`. MFA user (`nextLevel==='aal2' &&
    current!=='aal2'`) → return `{ mfaRequired: true }` and **keep** the AAL1
    recovery session (no `updateUser`/`signOut`). Non-MFA → unchanged
    (`updateUser`→`signOut`). Defensive `insufficient_aal` net also returns
    `mfaRequired`.
  - Step 2 `{ password, code }` (no token) → reuses the recovery-session cookie
    → `listFactors` (factor id derived **server-side**, never client-sent) →
    `challengeAndVerify` (AAL1→AAL2) → `updateUser` → `signOut`. No factor/
    session → `400 SESSION_EXPIRED`; wrong code → `400 INVALID_CODE` (session
    kept for retry). **Confirmed** the `verifyOtp` recovery cookie round-trips
    across the two requests (runtime probe) — so no continuation token needed.
  - `resetPasswordMfaSchema` (`password` + 6-digit `code`) added.
- **Form** (`ResetPasswordForm`): two-step — the password step swaps to a
  "Two-factor authentication" 6-digit code step on `mfaRequired`, carries the
  validated password, and posts `{ password, code }`; wrong code is inline +
  retryable. Non-MFA path unchanged.
- **Resend diagnostics:** `sendResetEmail` now logs Resend's response **body**
  on failure (was only the status), so a prod `403` shows the actual cause
  (e.g. unverified sending domain) in the Vercel logs. (Diagnosed a live prod
  `403` = `EMAIL_FROM` domain `ilokal.shop` not yet verified in Resend.)
- **Tests (+11):** route MFA branches (7 — step-1 `mfaRequired`/safety-net,
  step-2 verify/wrong-code/no-session, weak-password/malformed-code) + form
  two-step (2). Validated end-to-end against the running route with a real TOTP
  enrollment. Verified: `yarn lint` + **1151** tests + `yarn build` green.
- **Known follow-up:** a user who loses BOTH password and TOTP is locked out
  (no backup codes) — needs an admin "reset MFA" path. Out of scope here.

## 2026-07-24 — Business forgot-password flow (Resend + token-hash) (chore/remove-unecessary-feature)

> Auth-surface change — **review before merge**. No schema/migration. Plan in
> `.claude/FORGOT_PASSWORD.md`. New env: `RESEND_API_KEY`, `EMAIL_FROM`
> (server-only; unset ⇒ local log fallback).

- **Reworked `POST /api/auth/reset-password` to Option B (we own the email).**
  - Request `{email}` → service-role `auth.admin.generateLink({type:'recovery'})`
    (mints the token, does not send) → build the confirm URL from the returned
    `hashed_token` → send a branded email via **Resend over `axios`** (no new
    dep) or, with no `RESEND_API_KEY`/`EMAIL_FROM`, **log the link to the server
    console** (local sandbox). Always returns a generic 200 — a non-existent
    email is indistinguishable (no enumeration).
  - Confirm `{token_hash, password}` → `verifyOtp({token_hash, type:'recovery'})`
    → `updateUser({password})` → `signOut()` (the recovery session is a full
    session; it must not linger). Generic error messages only (no raw Supabase
    text). Dropped `generateLink`'s `redirectTo`, so the flow no longer depends
    on the Supabase redirect allow-list.
- **Email layer, server-side under `app/api/emails/`** (colocated with the other
  route-only helpers; never client-bundled): `templates/resetPassword.ts` (pure,
  inline-styled, HTML-escaped, `{subject, html, text}`) and `sendResetEmail.ts`
  (Resend/axios send or log; never throws — a mail failure can't reveal account
  existence). Plus a **dev-only preview route** `app/api/dev/email-preview`
  (renders the template in the browser for design iteration; 404 in production).
- **Pages** under the `(auth)` group (branded split-screen layout):
  `/forgot-password` (`ForgotPasswordForm` — generic "check your email" panel)
  and `/reset-password` (`ResetPasswordForm` — new-password + confirm, strength +
  match, invalid-link state; success → toast + redirect `/login/business?reset=1`;
  `<Suspense>`-wrapped for `useSearchParams`). Business login "Forgot password?"
  now uses `ROUTES.AUTH.FORGOT_PASSWORD`; admin link left as-is (role-agnostic).
- **Validation:** `resetPasswordRequestSchema`, `resetPasswordConfirmSchema`
  (`token_hash` + password == signup rules), and `resetPasswordFormSchema`
  (client confirm-match) added to `lib/validation/auth.ts`.
  `authService.resetPasswordConfirm` updated to the `token_hash` contract.
- **Tests (+31):** template (7), sender (5), preview route (4), route branches
  (8 — enumeration-safety, rate limit, verify/update/signOut order, bad token,
  weak password), and the two forms (3 + 4 — happy-dom + react-dom/client,
  mocked `fetch`/`next-navigation`/`sonner`, no `@testing-library`). Verified:
  `yarn lint` + **1140** tests + `yarn build` green.
- **Scope:** business only (admin pass deferred). **Prod step:** verify a Resend
  sending domain, set `RESEND_API_KEY` + `EMAIL_FROM`.
- **Review hardening (react-doctor + api-doctor):** reset-link base is now
  **fail-closed** on `NEXT_PUBLIC_APP_URL` — never derived from the request
  origin (closes a Host/X-Forwarded-Host reset-link-poisoning → ATO vector); the
  recovery session is `signOut()`'d on update **failure** too (no lingering
  authenticated session); the reset email is sent via `after()` post-response so
  send latency isn't an account-enumeration timing oracle; the sandbox link log
  is gated to non-production; removed dead `authService.resetPassword*` methods;
  a11y `role="status"` on the reset-page Suspense fallback. Tests updated (+1
  fail-closed case; `after()` mocked to run inline).

## 2026-07-24 — Functional, collapse-aware sidebar search (chore/remove-unecessary-feature)

> Presentational + a pure util. No schema/API/auth. Business sidebar only. Plan
> in `.claude/SIDEBAR_SEARCH.md`.

- **Made the business sidebar search functional.** `GlobalSearch` was a dead
  `<Input>` (no state/handler). It now filters the nav live, case-insensitive,
  as you type.
  - **Scalable core:** `lib/utils/navSearch.ts` — pure
    `filterNavSections(sections, query)` + `hasNavResults()`. Matches section /
    item / sub-item titles; parent-match keeps all subs, sub-only keeps matching
    subs; drops empty items then empty sections; empty/whitespace query is a
    same-reference passthrough; non-mutating. Adding nav entries needs no search
    change.
  - **Wiring:** `BusinessSidebar` lifts a `query` state, renders
    `filterNavSections(sections, query)`, and shows a muted "No results for …"
    row (hidden in icon mode) when a non-empty query matches nothing.
- **Fixed the collapsed-sidebar sliver.** In `collapsible="icon"` mode the
  full-width input rendered at icon width, leaving a clipped sliver.
  `GlobalSearch` is now collapse-aware via `useSidebar()`: expanded → labelled
  `searchbox` + leading icon + clear (✕) button; collapsed (desktop) → an
  icon-only `SidebarMenuButton` (tooltip "Search") that expands the sidebar and
  focuses the field on click (pending-focus effect, since the input is unmounted
  at click time). Mobile drawer unaffected.
- **Tests (+16):** `lib/utils/__tests__/navSearch.test.ts` (+11 — match rules,
  section-drop, passthrough identity, non-mutation, `hasNavResults`) and
  `components/custom/__tests__/GlobalSearch.test.tsx` (+5 — expanded searchbox,
  typing→onChange, clear button, collapsed icon, click→`onOpenChange(true)`).
  The component test is the repo's **first** DOM-render test: driven by
  `react-dom/client` + happy-dom (opted in per-file via `@vitest-environment`)
  rather than `@testing-library/react` — its peer `@testing-library/dom` isn't
  installed and the stack is frozen. Every other test keeps the `node` env.
- Verified: `yarn lint` + **1110** tests + `yarn build` green.

## 2026-07-24 — Responsive modals + remove non-functional OAuth (chore/remove-unecessary-feature)

> No schema, API, or auth change — presentational + a dead-UI removal. Plan +
> full modal audit in `.claude/MODAL_RESPONSIVE.md`.

- **Removed non-functional Google/Facebook OAuth login UI.** Deleted
  `components/auth/OAuthButtons.tsx` (the "OR CONTINUE WITH" divider + both
  provider buttons) and its usage in `BusinessLoginForm` + `AdminLoginForm`.
  Kept `app/api/auth/callback/route.ts` — it's the generic PKCE
  `exchangeCodeForSession` handler that also backs email-confirm / magic-link
  redirects, not OAuth-specific.
- **Made all modals fit any viewport (the Add Product modal overflowed on short
  laptop screens — title + footer clipped and unreachable).** Root cause: the
  base `DialogContent` had no `max-height` and no overflow handling, so tall
  content spilled off the top and bottom of the centered card. Reworked in 5
  phases:
  - **Phase 1 — base primitive** (`components/ui/dialog.tsx`): `DialogContent`
    is now a scrollable flex column — `flex flex-col`,
    `max-h-[calc(100dvh-2rem)]`, `overflow-y-auto overscroll-contain`,
    `scroll-p-4 sm:scroll-p-6` (keyboard-safe), `p-4 sm:p-6`. New exported
    `DialogBody` (the `flex-1 min-h-0` scroll region); `DialogHeader`/`Footer`
    get `shrink-0`. Fixes all 28 dialogs at once. Used `overflow-y-auto` (not
    `overflow-hidden`) on the base so un-migrated modals degrade to
    whole-dialog scroll, never a trapped clip.
  - **Phase 2 — 7 long-form modals** adopt pinned-header / `DialogBody` /
    pinned-footer and drop their hand-rolled heights (`add-product`,
    `add-coupon`, `update-coupon`, `update-product`, `edit-branch`,
    `legal-dialog`, admin `view-documents`). The ✕ button is pinned again in
    these.
  - **Phase 3 — width/layout offenders:** `application-success-dialog`
    `min-w-3xl` → `sm:max-w-2xl` (min-width was clipping phones); `TourDialog`
    stacks `flex-col` on mobile, `sm:h-140 sm:flex-row` on desktop; `Masonry`
    lightbox `w-4xl` (fixed 896px) → `w-[min(90vw,56rem)]`, `85vh` → `85dvh`.
  - **Phase 4 — mobile ergonomics:** scroll-padding for keyboard safety (P9);
    `TourDialog` `max-w-5xl!` → responsive (the `!` was killing the mobile
    margin); confirmed footer buttons full-width on mobile via flex stretch.
  - **Phase 5 — guardrail + docs:** `components/ui/__tests__/dialog.contract.test.ts`
    (+10) asserts the base contract and sweeps every `<DialogContent>` in the
    repo, failing the build if any reintroduces a fixed `h-*` or `min-w-*`.
    Documented the header/body/footer contract in `component-standards.md` +
    `ui-standards.md`.
- Verified each phase: `yarn lint` + **1094** tests + `yarn build` green.
  ⚠️ Browser sweep across the viewport matrix (esp. the mobile keyboard) still
  pending — static + unit verification only.

## 2026-07-23 — Registration gating flags + terms acceptance (feat/landing-real-dashboard)

> **One HIGH-risk schema migration** (`20260723000000_app_settings_registration_gating.sql`)
> — applied + red-teamed locally; needs human approval before merge, then cloud
> apply (Supabase MCP ledger rule). Plan in `.claude/REGISTRATION_GATING.md`.

- **Terms & Privacy acceptance (registration):** new required `accepted_terms`
  checkbox on the Review step with in-flow Terms and Conditions + Privacy Policy
  dialogs (`components/legal-dialog.tsx`, placeholder legal copy — needs lawyer
  review). Submit disabled until checked; not persisted in the form cache
  (re-accept after reload).
- **Admin registration flippers (`app_settings`):** new key/value table (RLS:
  authenticated read, admin write) with two flags —
  `require_business_documents` (seeded **false**) gates the Documents step +
  license/tax requirement in registration; `auto_verify_businesses` (seeded
  **true**) makes new businesses go live as `verified` immediately. Admin UI:
  `/admin/[adminId]/settings` ("Platform Settings" sidebar entry) with
  optimistic switches + stable-id toasts, backed by admin-guarded
  `settingsActions.ts` (key allowlist, `updated_by` audit).
- **DB enforcement:** `set_business_initial_status()` BEFORE INSERT trigger on
  `businesses` forces status from the flag for non-admin inserts — also closes
  the pre-existing gap where the owner-scoped FOR ALL policy let a non-admin
  self-insert `status='verified'` via PostgREST. Red-teamed in SQL: flag ON +
  client-passed `pending` → `verified`; flag OFF + attacker-passed `verified`
  → `pending`. Normal (O-enabled) trigger so replica-mode seeds keep explicit
  statuses. `get_app_setting_bool()` helper — both SECURITY DEFINER, pinned
  search_path, REVOKE'd from PUBLIC/anon/authenticated.
- **Dynamic registration steps:** `getSteps(requireDocuments)` +
  `getStepFieldGroups()` replace the static 5-step array; provider takes
  `requireDocuments` from the server layout (via `getRegistrationSettings()`,
  strict fallbacks = legacy behavior), clamps the cached step, and exposes
  `steps` via context. Documents step/card, missing-file guard, and doc uploads
  all skip when the flag is off. Business-home onboarding cards
  (`RegistrationSteps`/`OnboardingCard`/`TourDialog`) show the same gated list.
- **Tests (+13):** steps/field-group gating, settings action (admin guard,
  allowlist, upsert payload, generic error), `getRegistrationSettings`
  fallbacks. Verified: lint + **1081** tests + build green; migration applied
  locally + `make generate-types` run.

## 2026-07-17 — Cloud deploy: all pending migrations applied to remote (perf/security-hardening)

- **Applied 10 migrations to the cloud project `ilokal-database`
  (skvgasimllpyhyudpycu)** via the Supabase MCP (no cloud `SUPABASE_DB_URL` in
  this env): the two June-30 ones that were never pushed (`mobile_deals_rpc`,
  `notification_outbox`) + the seven audit migrations + a new
  `20260717082537_harden_function_search_path.sql` (pins `search_path` on
  `gen_redemption_code`/`handle_updated_at`/`set_redemption_code`/
  `sync_product_availability` — clears the advisor's
  `function_search_path_mutable`; applied locally too).
- **Ledger reconciled:** MCP records its own timestamp versions — rewrote each
  `supabase_migrations.schema_migrations` row to the local file's version, so
  cloud + local ledgers are identical and a future `supabase db push` won't
  re-apply anything.
- **Verified on cloud:** 0 bare `auth.uid()`/`auth.role()` policies (P1), SEC-1
  trigger present, both SEC-4 RESTRICTIVE policies present, all 6 new
  functions + 6 new indexes present, both pg_cron jobs scheduled
  (outbox drain + prune), `mobile_deals()` executes and returns the JSONB
  shape. Advisors: 0 `auth_rls_initplan`; remaining flags are pre-existing
  noise (`multiple_permissive_policies` ×271 — policy proliferation, backlog
  item; `unused_index` — fresh indexes; public-bucket listing — display
  assets, intentional per S10).

## 2026-07-17 — Perf + security hardening, phase 4: SEC-4 + dead-surface removal (perf/security-hardening)

> **One HIGH-risk schema migration** (`20260717080351_sec4_rating_interaction_gate.sql`,
> RLS write-path change) — applied + red-teamed locally; needs human approval before
> merge. **Also a large API-surface deletion** (all endpoints removed were
> non-functional with zero callers — see below). Cloud still needs
> `make migrate-cloud` after approval.

- **SEC-4 — review-abuse gate.** New SECURITY DEFINER
  `has_redeemed_from_business(p_user, p_business)` + RESTRICTIVE INSERT policies
  on `ratings` and `business_ratings`: a non-admin may only create a rating for
  a business they have actually redeemed a coupon from. RESTRICTIVE = ANDs onto
  the existing self-insert policies; UPDATE (editing own review), admin
  (`is_admin()`), and service-role paths untouched. Red-teamed in SQL:
  non-redeemer insert fails with 42501, redeemer insert + upsert path works.
  Mobile business/product rating routes and web ratings POST now map 42501 to a
  friendly 403 ("rate only after redeeming") instead of a logged 500. Tests:
  `app/api/protected/mobile/ratings/__tests__/sec4-interaction-gate.test.ts` (+4).
- **Dead-surface removal (the three phantom modules + product-performance).**
  Every deleted endpoint queried nonexistent tables/columns, errored on every
  call since the schema normalization, and had **zero** UI/service callers:
  - Search: `lib/api/search/*`, `/api/web/search/*`, `/api/web/trending`,
    `lib/services/searchService`, `searchActions`, `lib/validation/search.ts`.
  - Reviews: `lib/api/reviews/*`, `/api/web/reviews/*`, `/api/web/ratings/[id]`
    (phantom-backed), `lib/services/reviewService`, `reviewActions`,
    `lib/validation/reviews.ts`. (The real review surface — `/api/web/ratings`
    list/POST + mobile rating routes on `ratings`/`business_ratings` — kept.)
  - Billing: `lib/api/subscriptions/*`, `/api/web/subscriptions/*`,
    `/api/web/billing/*`, `lib/services/subscriptionService`,
    `billingActions`/`subscriptionActions` + the unused actions barrel,
    `lib/validation/subscriptions.ts`. (Admin plans routes are self-contained
    and kept.)
  - `getProductPerformance` + `/api/web/analytics/products` — `payments` has no
    `product_id`; resolved-by-removal (re-add if payments become product-linked).
  - **Kept + extracted:** `getUserBusiness` (only real, live-called function in
    the deleted module) moved to `lib/api/getUserBusiness.ts`; the four
    analytics routes + server-side `productService` repointed.
  - Orphaned tests removed with their modules (~240 tests covered phantom code).
  - Rollback: `git revert` (no data change; deleted endpoints returned errors).
- Verified: `yarn lint` + **1068** tests + `yarn build` green; local DB fully
  migrated (`20260717080351` applied) + `make generate-types` run
  (`has_redeemed_from_business` in `database.ts`).
- **Audit fully closed.** Remaining ops step: cloud `make migrate-cloud` +
  `get_advisors` after human approval of the 7 branch migrations.

## 2026-07-17 — Perf + security hardening, phase 3: P9 + P13 (perf/security-hardening)

> One LOW-risk schema migration (`20260717075244_profiles_search_trgm.sql`,
> index-only) — applied locally. **Major discovery below needs product/schema
> decisions.**

- **P9 — `count:'exact'` audit (69 sites).** Fixed the wasteful ones:
  - `lib/api/admin/analyticsQuery.ts` — count-only reads now `head:true` (no row
    payload), reads parallelized with `Promise.all`, and the pointless
    `count:'exact'` dropped from `sum()` aggregate reads.
  - **P8-class correctness fix in the same file:** `businesses.is_active` /
    `is_suspended` columns don't exist — the admin dashboard's active/suspended
    business counts always returned 0. Repointed to the real state:
    `status='verified' AND archived_at IS NULL` / `status='suspended'`.
  - Admin `plans/[planId]` DELETE active-subscriptions guard: `select('*')` →
    head-only `select('id', { head: true })`.
  - Deliberately kept exact counts on paginated lists (count piggybacks on the
    data query; owner/user-scoped or admin-small sets — planned/estimated would
    break pagination totals), update/delete row-count checks, and the nearby
    RPC's `has_more` (planner stats don't apply to function scans).
- **P13 — trigram audit of every leading-wildcard `ilike`.** Only *global*
  unindexed search was the admin user search (`profiles.full_name`/`email` via
  `userQuery` + `/api/admin/profiles`). New migration adds `gin_trgm_ops` on
  both. Everything else: business-scoped behind an indexed equality (tiny sets),
  filters the `nearby_businesses` RPC output (function scan — index can't
  apply), or already indexed (`businesses.shop_name`, `coupons.description`).
- **🔴 MAJOR discovery — three query modules target schema that doesn't exist**
  (every function errors and returns empty; same class as the `page_views` bug).
  Flagged NON-FUNCTIONAL in file headers, behavior unchanged:
  - `lib/api/search/searchQuery.ts` — `profiles` with `role='business'` (CHECK
    forbids it) + phantom columns, and nonexistent `featured_deals`. Dead:
    `/api/web/search`, `/api/web/trending`, `searchActions`.
  - `lib/api/reviews/reviewQuery.ts` — nonexistent `reviews` table (real:
    `ratings`/`business_ratings`). Dead: `/api/web/reviews/*`.
  - `lib/api/subscriptions/subscriptionQuery.ts` — nonexistent `subscriptions`
    (renamed to `follows`), `payment_methods`, `billing_invoices`,
    `profiles.business_id`. Dead: `/api/web/billing/*`,
    `/api/web/subscriptions/*`, `billingActions`. Only `subscription_plans`
    reads work.
  - Decision needed: rewrite against real schema or delete the surfaces.
- Tests: admin analytics mocks updated for the new `.eq().is()` chain +
  parallel reads. Verified: `yarn lint` + **1308** tests + `yarn build` green.
- **Still open:** SEC-4 (review-abuse gate, needs approval),
  `getProductPerformance` schema decision, the three NON-FUNCTIONAL modules.

## 2026-07-17 — Perf + security hardening, phase 2 (perf/security-hardening)

> **One new HIGH-risk schema migration** (`20260717072717_analytics_engagement_rpcs.sql`)
> — applied + smoke-tested locally; needs human approval before merge. All five
> phase-1 migrations (`20260717000000`–`000003`) are now **applied to local** and
> verified.

- **Migrations applied + verified (was the phase-1 blocker):** `make migrate-up` +
  `make generate-types` run against the local stack. Verified in SQL:
  `pg_policies` shows **0** bare `auth.uid()`/`auth.role()` in `public`+`storage`
  (P1 wrapper worked); the perf indexes and both phase-1 analytics RPCs exist;
  only PostGIS internals lack a pinned `search_path` (S4 clean). **SEC-1
  red-teamed:** impersonating a non-admin via `request.jwt.claims` +
  `SET ROLE authenticated`, `UPDATE profiles SET role='admin', status='suspended'`
  is silently reverted by the trigger while a `full_name` self-update still lands.
- **P3 COMPLETE — remaining analytics moved to SQL RPCs.** New migration adds
  `analytics_retention_months`, `analytics_monthly_trend`,
  `analytics_follower_funnel`, `analytics_customer_segments`, and
  `analytics_rating_summary` (SECURITY DEFINER, pinned search_path, EXECUTE
  revoked from PUBLIC/anon/authenticated, granted to service_role only — same
  contract as `20260717000003`). Rewired `getRetentionData`/`getMonthlyTrend`/
  `getFollowerFunnel`/`getCustomerSegments` to the RPCs — they fetched whole
  `user_redemptions`/`follows` rowsets and reduced with Map/Set, silently
  truncating at the PostgREST 1000-row cap. `getBusinessHealthIndicators` now
  derives follower growth from the trend RPC and ratings from the rating-summary
  RPC (its fetch-all follows/ratings reads had the same truncation bug); its
  active-deals count gained `head: true`. Deleted the now-unused
  `getBusinessCouponIds` helper. Month labels stay JS-side (RPC rows are
  oldest-first, mapped by index). Remaining JS aggregation: `getBusinessRevenue`
  monthly bucket (bounded 6-month window) and `getProductPerformance`
  (NON-FUNCTIONAL, blocked on schema decision).
- **SEC-7 — storage-delete path hardening + avatars authz fix.**
  `DELETE /api/web/upload/[bucket]/[id]` now 400s any decoded path with an
  empty/`.`/`..` segment or a non-UUID first segment, before ownership checks or
  storage calls. **Found + fixed a real authz gap:** the `avatars` bucket had no
  ownership check — any authenticated user could delete anyone's avatar; now the
  first path segment must equal the caller's user id unless admin. (No client
  currently calls this DELETE route, so no breakage.)
- **Tests:** analytics query tests rewritten to mock the new RPCs (call args incl.
  `p_branch_id` passthrough, row→label mapping, empty-data zeros); +6 route tests
  in `app/api/web/upload/__tests__/delete-path-guards.test.ts`. Verified:
  `yarn lint` + **1308** tests + `yarn build` all green.
- **Still open (see audit):** P9 `count:'exact'` audit, P13 trigram check, SEC-4
  review-abuse gate (needs approval), `getProductPerformance` schema decision.

## 2026-07-17 — Perf + security hardening, phase 1 (perf/security-hardening)

> Full audit + remaining phases in `.claude/PERFORMANCE_AUDIT.md`. **Two schema
> migrations — HIGH-risk, applied to NEITHER local nor cloud yet; need
> `make migrate-up` + human approval before merge.** Local Supabase stack was
> down during implementation, so migrations are verified by review only; the code
> changes are covered by the unit suite (1299 green) + build.

- **SEC-1 (CRITICAL) — closed profiles privilege-escalation.** The self-update
  RLS policy (`USING/CHECK auth.uid()=id`) had no column guard: a normal user
  could `PATCH /rest/v1/profiles {"role":"admin"}` via PostgREST with the anon
  key + own JWT, then get an admin JWT on next refresh (via the sync_role_to_jwt
  trigger). New migration `20260717000001_fix_profiles_privilege_escalation.sql`
  adds a BEFORE UPDATE trigger that, for a non-admin editing their own row:
  reverts any `role` change; allows `status` only active↔inactive (never leaves
  `suspended`); allows setting `archived_at` but never clearing it. Mirrors the
  mobile `/me` route guards at the DB layer so direct PostgREST can't bypass
  them; admin/service-role paths unaffected. **Needs a SQL/red-team test.**
- **Perf indexes** — `20260717000000_perf_indexes.sql` adds indexes on the
  unindexed hot FK/filter columns the analytics layer full-scans:
  `payments(business_id,status,created_at)`,
  `user_redemptions(coupon_id,redeemed_at)` / `(branch_id)` / `(user_id)`,
  `business_ratings(business_id)`. (Postgres doesn't auto-index FKs.)
- **Correctness bugs found + fixed in `businessAnalyticsQuery.ts`:**
  - `getBusinessDashboard` filtered `.eq('is_active', true)` — no such column on
    `products` (it's `status`/`is_available`); `active_products` was always 0.
    Now `.eq('status','active')` + `head:true`.
  - `getTrafficMetrics` queried a **non-existent `page_views` table** with
    non-existent `visitor_id`/`created_at` columns → always returned 0. Repointed
    to the real `view_events` table (`user_id`/`viewed_at`; already indexed).
    (Unique-visitor dedupe still client-side — flagged for the Phase 3 RPC.)
- **SEC-5 — stopped raw driver-error leakage** on `business-types` (GET/POST +
  `[id]` PATCH/DELETE), `business-categories` (POST + `[id]`), and `ratings`
  POST: raw Supabase `error.message` (leaks table/column/constraint names) →
  generic client message + `console.error` server-side. Also removed a
  `{ error: err }` that dumped the whole error object.
- **P1 — wrapped `auth.uid()`/`auth.role()` for the RLS initPlan optimization.**
  New migration `20260717000002_wrap_rls_auth_initplan.sql`: a catalog-driven
  `DO` block over `pg_policies` (`public` + `storage`) that rewrites every bare
  `auth.uid()` (106) / `auth.role()` (20) to `(select …)` via `ALTER POLICY`,
  so the planner evaluates them once per query (initPlan) instead of once per
  row. Rewrites the LIVE policy set (last-writer-wins), not historical files;
  idempotent (skips already-wrapped); each `ALTER` is subtransaction-isolated so
  a managed-platform storage-ownership failure logs + continues. Not applied in
  this env (no docker/CLI) — verify post-`migrate-up` via `get_advisors`.
- **SEC-8 — rate-limited the auth surface.** The proxy rate-limits mobile but its
  matcher never covered `/api/auth`, so login/signup/reset were unthrottled
  (credential stuffing / reset spam). New `app/api/helpers/auth-rate-limit.ts`
  (`checkAuthRateLimit`) wraps the existing limiter with two budgets — per-IP
  (30/60s, flood guard) and per-account/email (8/300s, targets one account),
  env-tunable, 429 + Retry-After. Wired into `login`, `signup`, and
  `reset-password` (account-keyed on the email branch). Also generic-ized the
  signup `authError.message` leak (SEC-5). Tests: +6
  (`auth-rate-limit.test.ts` — IP + account budgets, scope isolation, case
  normalization).
- **P3 (partial) — moved truncation-prone analytics aggregation into SQL RPCs.**
  New migration `20260717000003_analytics_aggregation_rpcs.sql`:
  `analytics_coupon_redemption_stats(p_business_id, p_branch_id)` (per-coupon count
  + avg days-to-redeem) and `analytics_traffic_metrics(p_business_id, p_since)`
  (count + count DISTINCT user_id). Both SECURITY DEFINER + pinned search_path,
  REVOKE'd from public/anon/authenticated, GRANT'd to service_role only (called by
  the ownership-checked analytics service-role client). Rewired `getCouponStats`,
  `getCouponPerformance`, and `getTrafficMetrics` to the RPCs — they previously
  fetched whole tables and reduced with Map/Set, which SILENTLY TRUNCATED at the
  PostgREST 1000-row cap (wrong numbers) besides being slow. Added the two funcs
  to `lib/types/database.ts` (pending `make generate-types`).
- **Found + flagged (not fixed — needs schema decision):** `getProductPerformance`
  selects `payments.product_id`, but `payments` has no such column (payments are
  subscription/business-level) → the query errors and the function always returns
  []. Marked NON-FUNCTIONAL in code; left intact to preserve the response contract.
- Updated the analytics query tests to mock the RPCs (coupon-stats + traffic now
  assert `.rpc(...)` calls incl. `p_branch_id` passthrough).
- **P7 — parallelized serialized analytics round trips.** `getBusinessDashboard`
  ran 4 independent queries sequentially → `Promise.all` (counts use `head:true`;
  dropped the unused `count:'exact'` on the two `sum()` reads). `getBusinessRevenue`
  ran its total + 6-month-window reads sequentially → `Promise.all`.
- **P11 — RESOLVED as N/A (not a pooler problem).** Investigated `supabase/server.ts`
  + grepped: every runtime client is `@supabase/ssr` over the PostgREST HTTP API;
  zero direct `pg`/`SUPABASE_DB_URL` use at runtime. No per-invocation Postgres
  handshake to pool. The real slowness levers are P1/P2/P3 (done) + round-trip
  fan-out/caching. Corrected the audit doc so nobody chases the pooler.
- Verified: `yarn lint --fix` + **1305** tests + `yarn build` all green.
- **Not yet done** (see audit): remaining P3 analytics
  aggregation RPCs, P9/P10 count()+caching, P11 pooler verify, SEC-4 review-abuse
  gate, SEC-5 remaining routes, SEC-5 auth-route rate limiting, SEC-6 service-role
  caller re-audit.

## 2026-07-16 — Fix production 413 on business registration (main)

> **API-surface change (auth-adjacent) — review before merge.** No schema migration.

- **Root cause:** registration POSTed one multipart request with logo + banner +
  4+ interior images + license + tax cert (each ≤ 2 MB → up to ~16 MB total).
  Vercel functions reject bodies > 4.5 MB with a platform 413 before the handler
  runs. Worked locally (no limit), failed in production.
- **Fix — split the upload into per-request phases:**
  - `POST /api/web/businesses` now takes **JSON metadata only** (Zod-validated:
    `shop_name`/`description`/`business_category`/`category_id` (z.guid)/`location`),
    creates the business row + branch via new `createBusinessDraft()` and returns it.
    Errors return generic messages (no raw Supabase leak).
  - New `POST /api/web/businesses/[id]/files` — multipart with `kind`
    (`shop_logo|shop_banner|interior_image|business_license|tax_certificate`) +
    `file` (+ `index` for interiors), one file per request. 4 MB server cap (413),
    guid-validated id, `Unauthorized` → 401, wrong-owner/archived → 404. Backed by
    `uploadBusinessRegistrationFile()` (ownership check, WebP pipeline for images,
    raw upload for docs, per-kind row update; interiors append sequentially).
  - Old all-in-one `createBusiness(FormData)` removed (rollback-by-delete gone —
    a failed upload now leaves a resumable draft instead of deleting the row).
- **Client (`shop-registration-content.tsx`):** creates the draft once (id cached
  in ref + `ilokal-registration-business-id` localStorage), then uploads files
  sequentially, skipping already-uploaded ones on retry — a mid-flow failure
  resumes instead of duplicating the business.
- **Tests (+11):** `app/api/web/businesses/__tests__/registration-split.test.ts`
  (draft 201/400/no-leak; files 200, index passthrough, bad id/kind/missing file,
  413 oversize, 401/404 mapping). Verified: lint + **1299** tests + build green.

## 2026-07-01 — Media & feed scaling: WebP pipeline, deals RPC, notification outbox (feat/account-management)

> **Two HIGH-risk schema migrations** (`20260630000000_mobile_deals_rpc.sql`,
> `20260630000001_notification_outbox.sql`) — applied locally; need `make migrate-up`
> + human approval before merge. Full writeup in `.claude/docs/media-and-feed-scaling.md`.

- **Image pipeline (write-time WebP):** new `lib/api/helpers/image.ts` —
  `convertToWebP` (sharp decode → downscale `fit:'inside'`, never enlarge →
  re-encode WebP q80, keeps animation frames), `uploadWebP` (convert →
  `contentType:'image/webp'` → upload primitive), `IMAGE_PRESETS`
  (logo/avatar 512, product 1200, hero 1600), `toWebPFilename`, and
  `ImageProcessingError` (callers map to 4xx; storage errors propagate raw for
  generic-message logging). Free Supabase plan has no on-the-fly transforms, so
  every display image is sized at write time. Converted all call sites: web
  uploads (`business-logo`/`business-interior`/`avatar`/`product-image`), mobile
  `me/avatar`, `productActions`/`branchActions`, and registration
  (`lib/api/business/business.ts`). Docs buckets (`verification-docs`,
  `branch-documents`) intentionally left raw.
- **Deals feed (DB-side classification):** `mobile_deals(p_category, p_search,
  p_page, p_per_page)` SECURITY DEFINER RPC computes featured pick / flash-explore
  split / category filter / subscribed-first sort / pagination in SQL and returns
  one JSONB matching the existing response shape. `app/api/mobile/deals/route.ts`
  shrank from a 500-row scan + in-Node pipeline to an RPC call + `resolveStorageUrl`
  on the raw paths. Deterministic paging (id tiebreaker), bounded counts, index
  `idx_coupons_live_feed`. Contract unchanged — no mobile change.
- **Notification fan-out (adaptive inline/async):** `notify_followers` probes the
  audience (`EXISTS … OFFSET 500`) — ≤ 500 followers fan out inline (unchanged),
  larger audiences enqueue one `notification_outbox` row. A pg_cron worker
  (`process_notification_outbox`, every minute) expands it into
  `business_notifications` in fair, keyset-cursored, `SKIP LOCKED` batches with
  poison isolation (park as `failed` after 5 attempts); `prune_notification_outbox`
  (daily) trims `done`/`failed` > 7 days. `notification_outbox` is deny-all RLS;
  all three functions REVOKE'd from PUBLIC/anon/authenticated.
- **Tests:** `lib/api/helpers/__tests__/image.test.ts` (sharp fixtures: re-encode,
  downscale cap, no-enlarge, no-passthrough, corrupt rejection, `uploadWebP`
  content-type/upsert/error mapping). SQL test
  `supabase/tests/mobile_deals_and_outbox.test.sql` (deals shape/paging/featured,
  outbox exactly-once/fairness/prune — non-destructive, rolled-back tx). Updated
  `productActions` upload tests to feed a real sharp PNG (the action now decodes
  through sharp). Verified: lint + **1288** tests + build + the SQL test
  (`mobile_deals` + outbox, against the local stack) all green.

## 2026-06-24 — Mobile self-service account management endpoints (feat/account-management)

> No schema migration — reuses `profiles.status` (`active|inactive|suspended`) and
> the existing `archived_at` column. **Auth-surface change — review before merge.**

- **New protected mobile endpoints** (all via `getMobileUser`, RLS-scoped client):
  - `POST /api/protected/mobile/me/deactivate` — reversible `active → inactive`.
  - `POST /api/protected/mobile/me/reactivate` — `inactive → active`.
  - `DELETE /api/protected/mobile/me` — **archive-only** soft delete
    (`archived_at = now()` + `status = 'inactive'`); auth user and row kept, hard
    delete stays admin-only. Idempotent.
- **Guards:** all three refuse to touch an admin-`suspended` or archived account, so
  a user can't self-clear an admin action or un-delete. `GET /me` now also returns
  `archived_at` so the app can distinguish *deactivated* from *deleted*.
- **Not done server-side:** email/password change (mobile calls the Supabase SDK
  directly). **Known limitation:** mobile protected routes aren't status-gated yet —
  enforcement is app-side on sign-out/re-login. See **TD-018**.
- Tests: `app/api/protected/mobile/me/__tests__/account.integration.test.ts` (7).

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
