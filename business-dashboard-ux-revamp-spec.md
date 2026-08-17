# Business Dashboard UX Revamp — Spec

**Status:** Draft v1 — pending per-phase approval (see §10)
**Date:** 2026-08-14
**Owner:** Product (interview answers captured in §3)
**Scope type:** UI/UX revamp + promo-type data model + instrumentation. No code changes made for this spec.

---

## 1. Problem statement

The business owner experience — from the registration wizard through the daily
dashboard and every nav page — is functionally complete but suffers on
**UI/UX**. From the interview, the four pain areas are:

1. **Visual polish** — spacing, hierarchy, consistency, and overall finish feel
   unfinished.
2. **Form intuitiveness** — labels, defaults, and required fields are unclear;
   fields are not intuitive, especially in **coupon/deal creation**.
3. **Information layout** — hard to find things; nav/info architecture feels
   scattered.
4. **Trust in the flow** — owners don't understand status (pending / verified /
   draft / published) or what to do next; some copy over-promises (e.g. "Instant
   approval").

The single loudest pain point: **adding deals and coupons is hard**. The
current dialog supports only percentage / fixed-₱ discounts, is a long
single-column form, and offers no presets — yet owners think in terms like
**5% / 10% / 15% off, FREE, and Buy One Take One (BOGO)**.

## 2. Goals and non-goals

### Goals

- A phased, per-page revamp of the owner surfaces, anchored on the existing
  **brand v1.0** design system (Brick Ember, semantic tokens, shadcn/ui) — no
  new design language.
- **Coupon & Deal creation becomes a template-driven, near-effortless flow**
  (presets prefill the form; BOGO and FREE become real discount types).
- Owners always know **where they are, what a field means, and what to do
  next** — in English now, with a **full Filipino copy variant** specced.
- Every revamped surface works well on **desktop and mobile** (both are first
  class — no desktop-only designs).
- Each phase ships with **light-first dark mode** support (dark follows, same
  layout, lighter QA) and **owner-funnel instrumentation** so we can prove the
  revamp works.

### Non-goals (this spec)

- No new dependencies / packages (stack is frozen — see §4).
- No changes to the public landing pages, customer mobile app screens, or
  admin surfaces (except where a promo-type schema change touches the mobile
  deals API contract).
- No pixel mockups — this is diagnosis + recommendations (interview decision).
- No implementation in this pass.

## 3. Interview decisions (source of truth)

| #   | Topic               | Decision                                                                                                                                  |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Audit scope         | Dashboard home, store nav pages, account pages, onboarding & empty states — **plus** the coupon/deal creation flow, which is the priority |
| 2   | Pain focus          | Visual polish + form intuitiveness + information layout + trust in flow — all four                                                        |
| 3   | Device              | **Desktop and mobile both well accounted** — every revamp must hold on both                                                               |
| 4   | Promo types         | **Do both**: preset templates over existing types, AND add BOGO + FREE as real discount types (schema + mobile API + admin implications)  |
| 5   | Phase 1             | **Coupon/Deal creation first**                                                                                                            |
| 6   | Dark mode           | Light first, dark follows (dark gets the same layout, lighter QA pass)                                                                    |
| 7   | Copy                | **Full Filipino (Tagalog) copy variant** for owner surfaces — English now, Filipino specced as a variant                                  |
| 8   | Coupons scope       | **Whole flow incl. edit** — create + edit + duplicate + status transitions as one coherent flow                                           |
| 9   | Measurement         | **Yes** — instrument step completion, form-error rates, time-on-step as part of each phase                                                |
| 10  | Spec depth          | **Diagnosis + recommendations** per page (what's wrong, why it hurts, concrete fixes)                                                     |
| 11  | Registration wizard | **Polish within the current 6–7 steps** (no restructure) + **honest copy** about time and approval                                        |
| 12  | Templates           | **Built-ins + auto code suggestions** (e.g. preset "10% off" suggests code like `SUMMER10`)                                               |
| 13  | IA / nav            | **In scope** — a nav/IA proposal section (where things live, mobile nav strategy)                                                         |
| 14  | Phasing             | **Approve per phase** — each phase's spec section is reviewed before that phase is implemented                                            |

## 4. Constraints and guardrails

- **Design system:** brand v1.0 (`.claude/docs/DESIGN.md`). Semantic tokens
  only; `#D70005` never hardcoded on dark surfaces; green reserved for
  _success_; destructive is maroon `#8E0B14`/`#BD3855`. Pally (display) +
  Inter (body). No new fonts.
- **Stack is frozen** — no new packages without explicit approval. Solve with
  existing shadcn/Radix primitives, motion, sonner, react-hook-form, etc.
- **Supabase never in components** — all data through Server Actions
  (`app/**/actions/` or `lib/api/`).
- **Forms:** react-hook-form + zod resolver, `<Field>` wrapper + `FieldError`,
  schemas in `lib/validation/` (use `z.guid()`, never `z.uuid()`).
- **Schema changes are high-risk** — BOGO/FREE data model requires a migration
  - human approval (CLAUDE.md workflow) and touches `lib/validation`, the
    mobile deals API (`/api/mobile/deals`), and the admin surface.
- **Error discipline:** Server Actions return `{ success:false, error:{ code } }`
  and call `logActionError`; never leak backend messages to clients.
- **Toaster:** single sonner instance in root layout; never mount another.
- **A11y floor:** shadcn/Radix gives the baseline; TD-016 notes coverage is
  uneven — treat an axe/keyboard pass as an acceptance criterion, not a bonus.

---

## 5. Current-state map

| Surface               | Route                              | Key components                                                                                                                                                                                                                                    | Owner pain observed                                                                                                      |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Pre-registration home | `/business/:id` (no business row)  | `OnboardingSection`, `RegistrationSteps`, `WhyRegisterCard`, `LockedAnalyticsCard`, `TourDialog`                                                                                                                                                  | Two stacked modals race on arrival (TourDialog + welcome invite) — fixed in code, but the copy overlap remains           |
| Registration wizard   | `/business/registration`           | 7 steps (6 with documents flag off), `StepProgress` side panel, sticky `RegistrationNav`                                                                                                                                                          | "Takes only 5 minutes" / "Instant approval" claims conflict with reality; lat/lng inputs are raw; category grid is dense |
| Dashboard home        | `/business/:id`                    | `AnalyticsDashboard`: `FirstAnswerCard`, `HealthScoreCard`, `AutomationSuggestions`, `MonthlyTrendChart`, `CustomerSegmentsChart`, `RetentionChart`, `FollowerFunnelCard`, `CouponPerformanceTable`, `BranchPerformanceSummary`; `SetupChecklist` | Dense analytics for a mostly-non-technical audience; charts may read as noise; checklist is the real CTA                 |
| My Shop               | `/business/:id/shop`               | `ShopBanner`, `ShopGallery`, `ShopItems`, `ShopLegitimacy`                                                                                                                                                                                        | Customer-preview page; lacks owner affordances ("edit this" affordances live on Profile instead)                         |
| Product Catalogues    | `/business/:id/product-catalogues` | table + add/update/view/delete, `apply-sale`, `manage-sections`, `filter-products`                                                                                                                                                                | Powerful but dense; status vocabulary (active/unlisted/disabled) needs explanation                                       |
| Coupons & Deals       | `/business/:id/coupons`            | `AddCouponDialog` (long single-column), `update-coupon`, `delete-coupon`, stats, table, filters                                                                                                                                                   | **Primary pain.** Only % / fixed ₱; no presets, no BOGO/FREE, no duplicate; 11+ fields in one column                     |
| Redeemed Coupons      | `/business/:id/redeemed-coupons`   | stats, filter, redemption table                                                                                                                                                                                                                   | Naming unclear ("Redeemed" vs "claimed"); no empty-state guidance for cashiers                                           |
| Branches              | `/business/:id/branches`           | grid/table, create wizard (6 steps), branch detail                                                                                                                                                                                                | Parallel wizard to registration; branch approval status needs clarity                                                    |
| Profile               | `/business/:id/profile`            | banner/logo hero, `BusinessInfoForm`, `PersonalInfoForm`, `AccountStatusCard`                                                                                                                                                                     | Only reachable via avatar dropdown; taxonomy pickers are long selects                                                    |
| Settings              | `/business/:id/settings`           | Security / Notifications / Business Preferences / Danger Zone tabs                                                                                                                                                                                | Only reachable via avatar dropdown                                                                                       |
| Insights              | `/business/:id/insights`           | `BidaAnalyticsDashboard`                                                                                                                                                                                                                          | Separate "Bida Ngayon" concept needs a primer for owners                                                                 |
| Onboarding            | everywhere                         | `SetupChecklist`, `OnboardingTourProvider`/`TourOverlay`, `VerifiedCelebration`, `ActiveBranchBanner`, `ShopPendingBanner`                                                                                                                        | Solid foundation — polish, don't rebuild                                                                                 |

---

## 6. Per-surface diagnosis & recommendations

### 6.1 PHASE 1 — Coupons & Deals (creation flow) ⭐ priority

**What's there today** (`add-coupon.tsx`, `update-coupon.tsx`):

- One dialog: Type (Coupon/Deal cards) → Visibility (Draft/Published) → Code →
  Description → Discount Type (Select: percentage/fixed_amount) → Value →
  Applies To (all/specific products) → Product picker → Start/Expiry
  (datetime-local) → Max total uses → Max per customer → Photo → Save.
- Discount data model is `coupons.discount` JSONB `{type: 'percentage' |
'fixed_amount', value}` — **two types only**.
- Edit exists; delete exists; **no duplicate**.

**Diagnosis**

- **Cognitive load:** 11+ fields in a single column with no sense of
  "the minimum thing I must fill in." Owners who just want "10% off this
  week" must decode Type, Visibility, Scope, dates, and caps first.
- **No mental model for promos:** owners think "10% off", "FREE item",
  "Buy 1 Take 1" — the form thinks in `discount.type` + `promotion_type` +
  `usage_scope`. The two vocabularies never meet.
- **Discount types are crippling:** BOGO and FREE simply cannot be expressed.
- **Code is a blank field:** no suggestions, so codes are inconsistent
  (OPENING20, SUMMER10, random strings) and hard for cashiers to read.
- **Dates default empty:** start/expiry are required but blank, so every
  creation starts with an error state waiting to happen.
- **Status vocabulary:** "Draft/Published" cards are fine, but nothing shows
  what _published_ means downstream (deals feed, redeemable now).

**Recommendations**

1. **Template-first creation.** A preset picker at the top of the dialog
   (chip/card grid): **5% off · 10% off · 15% off · ₱ off (fixed) · FREE ·
   Buy 1 Take 1**. Selecting a preset:
   - Prefills discount type + value + sensible defaults (scope = all
     products, start = now, expiry = 30 days) and **auto-suggests a code**
     (e.g. `10OFF`, `FREEBIE`, `B1T1`) that the owner can edit — all
     prefill values are editable.
   - Collapses the visible form to just what that promo needs: BOGO asks
     "Buy [n] Get [n]" + scope + dates; % asks value + dates + caps.
   - "Start from scratch" remains for full control.
2. **Add FREE and BOGO as real discount types** (see §7 — data model).
3. **Group fields into labelled sections** with a visible required/minimal
   path: "What's the deal" (type/value) → "Who can use it" (scope, caps) →
   "When" (dates) → "Details" (code, description, photo). Required fields
   marked; optional ones visually secondary.
4. **Duplicate action** on every row + inside edit ("Duplicate as draft") —
   the cheapest way to create a recurring promo.
5. **Status transitions in one place:** row actions become Publish / Unpublish
   / Edit / Duplicate / Delete, with a small "what customers see now" hint
   (live badge, draft badge, expiry countdown).
6. **Deals need a visual preview** in the dialog — show the bento card as it
   will appear in the deals feed (reuses existing card markup).
7. **Code field:** uppercase transform (already), min length, and a
   uniqueness check inline; suggest the preset code but let them type their
   own.
8. **Instrumentation:** track dialog open → template selected → completed →
   published; form-error rate per field; time in dialog. (See §9.)

**Acceptance criteria (Phase 1)**

- Creating "10% off" takes ≤3 visible fields after picking the preset.
- BOGO and FREE coupons can be created, edited, published, redeemed
  (end-to-end), and render correctly in the mobile deals feed.
- Duplicate works for both coupons and deals.
- Mobile + desktop layout verified; light first, dark pass; axe/keyboard pass
  on the dialog.

### 6.2 Registration wizard

**What's there today:** 6–7 steps (Category → Information → [Documents] →
Gallery → Offerings → Launch Deal → Review) driven by `stepMeta.ts` /
`steps.tsx`; `StepProgress` side panel ("Takes only 5 minutes", "Instant
approval", "Zero setup fees"); sticky Back/Next/Submit bar.

**Diagnosis**

- **Over-promising copy:** "Instant approval" is false when
  `auto_verify_businesses` is on but documents/review can still gate; when
  documents are required, "5 minutes" is unrealistic. This is a _trust_ wound
  on the most important flow.
- **Raw lat/lng inputs** on the Information step — owners should never type
  coordinates; the map + "Use My Location" already exist and should be the
  only path (lat/lng become read-only/derived).
- **Category step is dense:** the type Select + 3-col image grid is
  overwhelming on mobile; no progress cue within the step.
- **Gallery/Offerings/Deal steps** have good microcopy already; the deal step
  only supports % / fixed ₱ (same gap as coupons — should reuse the preset
  pattern from Phase 1).
- **Step claims vs reality:** side panel claims can't be trusted per §6.2
  first bullet; Review step edits are per-form rather than jumping back.

**Recommendations (polish within current steps — interview decision)**

1. **Honest copy:** replace "Instant approval" with the real policy ("Most
   shops are approved automatically"; "We'll email you as soon as you're
   live"), and "Takes only 5 minutes" with a soft time ("Most owners finish in
   about 5–10 minutes — progress saves as you go" only if resume exists;
   otherwise drop the claim).
2. **Information step:** hide lat/lng behind the map + detect button
   (read-only values); validate ZIP with a PH pattern hint; add an address
   preview card ("Customers will see this address").
3. **Category step:** sticky type filter; 2-col grid on mobile; show the
   selected type in the step header; add a "back to edit" affordance from
   Review that scrolls to the field rather than restarting.
4. **Launch Deal step:** reuse the Phase 1 preset picker (5/10/15%, FREE,
   BOGO) so the wizard teaches the dashboard vocabulary.
5. **Progress: keep the sidebar structure**, but make step state explicit
   (done/current/upcoming already exists — verify contrast on the green
   check, DESIGN.md rule).
6. **Instrumentation:** step-entered / step-completed / error counts /
   back-navigation per step — the classic funnel this spec will measure.

### 6.3 Dashboard home (analytics + checklist)

**Diagnosis**

- The page leads with `FirstAnswerCard` (trend), then a dense wall of charts
  (`HealthScoreCard`, `MonthlyTrendChart`, `CustomerSegmentsChart`,
  `RetentionChart`, `FollowerFunnelCard`, `CouponPerformanceTable`,
  `AutomationSuggestions`, `BranchPerformanceSummary`). For a small
  shop owner, this reads as noise; the **SetupChecklist** (the actual
  next-action driver) is a separate card competing for attention.
- Numbers like "retention rate" and "customer segments" have no owner-facing
  explanation; `AutomationSuggestions` may be empty (suggestions: [] in the
  empty dashboard) and currently renders an empty card.
- Verified-state analytics gate ("Analytics unlock once your shop is
  verified") is good but a dead end — no CTA.

**Recommendations**

1. **Reorder: checklist first for non-verified; for verified, keep one
   headline answer, then collapse secondary charts behind tabs or a
   "see more" pattern.** Default visible: First Answer + Health Score +
   Setup Checklist (when incomplete) + Coupon Performance; the rest behind
   "Full report".
2. **Every KPI gets a one-line plain-language caption** (e.g. "How many
   customers came back in the last month") — think Ilonggo shopkeeper, not
   analyst.
3. **Empty/zero states:** `AutomationSuggestions` with no items should render
   a helpful hint ("Add your first deal to start growing") or hide entirely;
   zero-data charts get a compact "no data yet — here's how to get data"
   state.
4. **Gate card gets a CTA:** "Check verification status" linking to Profile's
   AccountStatusCard instead of a dead-end Lock icon.
5. **Mobile:** stat cards stack 1-col; charts full-width; touch targets
   ≥44px.
6. **Instrumentation:** time-to-checklist-dismiss, clicks per card,
   chart-card visibility.

### 6.4 Store nav pages (My Shop, Catalogues, Redeemed Coupons, Branches)

**My Shop (`/shop`)**

- Diagnosis: it's a _customer preview_ with no owner actions; owners expect
  to edit here (the edit surfaces live in Profile).
- Recommend: add a slim owner toolbar on the preview ("Edit profile",
  "Add offering", "Manage gallery") pointing at the right routes; label the
  page "Your shop — what customers see" (already the lede — make it visual).

**Product Catalogues**

- Diagnosis: dense table; status vocabulary (active/unlisted/disabled) is
  unexplained; sale price + sections add power but also confusion; mobile
  table is heavy.
- Recommend: status pills with tooltips ("Unlisted = hidden from customers
  but saved"), a guided "Add offering" flow reusing preset-like defaults,
  product count summary cards, and a mobile card view fallback (not just a
  horizontally scrolling table) — see §6.8 for the full mobile strategy.
  Apply-sale should preview the sale price inline before saving.

**Redeemed Coupons**

- Diagnosis: name says "redeemed" but the table is really
  _claims/redemptions status_; empty state has no guidance for a cashier
  standing at the counter.
- Recommend: rename surfaced label to "Redemptions" (keep route), add a
  prominent "How to redeem at the counter" helper, and a search-by-code
  quick lookup in the header.

**Branches**

- Diagnosis: a second 6-step wizard (parallel to registration) — same
  form-quality issues (raw lat/lng likely duplicated), branch
  `pending_review/active/rejected` statuses need plain-language badges.
- Recommend: share the map/address field components with registration (DRY —
  CLAUDE.md rule), reuse the StepProgress visual language, and explain
  branch approval state inline ("Customers can see this branch once
  approved").

### 6.5 Account pages (Profile, Settings, Insights)

**Profile**

- Diagnosis: banner/logo hero is good; taxonomy pickers are long selects;
  `AccountStatusCard` is the only "why am I pending" surface and it's buried
  at the bottom.
- Recommend: promote verification status to a top banner when pending;
  searchable selects for business type/category (Searchable Select exists);
  keep personal info visually secondary to business info.

**Settings**

- Diagnosis: 4 tabs work well; only reachable via avatar dropdown.
- Recommend: keep tabs; add search within Settings if it grows; ensure
  Danger Zone is unmistakably destructive (already maroon — verify dark
  mode). Consider an in-app Help/FAQ entry point (currently a commented-out
  404 — only restore when the page exists).

**Insights (Bida Ngayon)**

- Diagnosis: "Bida Ngayon" is a marketing concept with no primer.
- Recommend: a one-line explainer card ("Bida Ngayon = this week's trending
  board on iLokal"), empty state when no data, and link back to the main
  analytics from the header.

### 6.6 Onboarding & empty states

- `SetupChecklist` is well-built (server-authoritative dismissal, failure
  state, progress bar). Polish: welcome ring + confetti timing are already
  handled; verify the tour spotlight (TD-020 — never browser-verified) with a
  manual pass; check `data-tour` anchors still match after layout changes
  (tour is measurement-sensitive).
- Pre-registration home has four stacked selling components + a TourDialog —
  reduce to a clear primary CTA path: "Register your shop" → wizard, with
  the tour as secondary.
- **Empty states are a product surface:** every table (products, coupons,
  redemptions, branches, bookings) gets: title, 1-line "why", primary CTA,
  secondary link. Reuse one `EmptyState` composite for consistency.

### 6.7 IA / navigation (interview decision: in scope)

Current: sidebar = Home / Insights + Store Management (My Shop, Catalogues,
[Bookings], [Events], Coupons & Deals, Redeemed Coupons). Profile & Settings
live only in the avatar dropdown. Notifications are **hidden on mobile**
(`hidden sm:flex`). Events is flag-ON; Bookings flag-OFF (dark).

Recommendations (proposal — approve in the IA phase):

1. **Keep the sidebar's Store Management grouping** (it matches how owners
   think) but review labels: "Product Catalogues" → vocabulary-driven label
   already exists for the catalogue entry ("Menu"/"Service Menu"/"Our
   Fleet") — extend the same treatment to "My Shop" and "Coupons & Deals"
   where sensible.
2. **Surface Profile/Settings more visibly:** either a "Manage" group in the
   sidebar or keep in the dropdown but add the shop name + verification
   status into the header so the account menu is the _account_ place.
3. **Mobile:** the sidebar sheet is good; add Notifications to the mobile
   header (it's currently desktop-only); verify the BranchSelector fits
   mobile (it's in the header on all sizes).
4. **Add a "Help & Support" entry only when the route exists** (it 404s
   today — don't advertise it).
5. **Flag-gated items stay hidden** (Events/Bookings) — the sidebar already
   filters on `flags`; keep that behavior through every revamp.

### 6.8 Mobile strategy: data-table pages (catalogues, coupons, redemptions)

**Current state (verified against the code):**

- `components/ui/table.tsx` wraps every `<Table>` in `overflow-x-auto` and
  every cell is `whitespace-nowrap` — so on a phone nothing is squeezed, but
  the **coupons table (10 columns) and redemptions table (8 columns) demand
  long sideways scrolls**, because neither hides a single column below `md`.
- The products table goes through the shared `DataTable` composite, which
  already applies `meta.responsiveClassName` (via `lib/utils/tableMeta.ts`) —
  **but no product column declares it**, so catalogues scrolls full-width too.
- The coupons and redemptions tables **hand-roll the TanStack chrome**
  (Table/Header/Body + `flexRender`) instead of using `DataTable` — fixing
  mobile behavior means doing it three times instead of once (the CLAUDE.md
  DRY rule: extend the shared composite, don't fork it).
- **Touch-target offenders** (all under the ui-standards 44×44 minimum):
  pagination prev/next buttons `h-8 w-8` (32px), the page-size select trigger
  `h-8`, and the row-action kebab `h-8 w-8` (`ProductActions`, and the same
  pattern in `CouponActions`).
- Good foundations to reuse: **expandable rows already exist** (coupons
  expand to linked products, redemptions to coupon details), the catalogue
  image cell opens a `ViewProduct` dialog, and all three page toolbars
  already `flex-wrap`.

**Strategy — two layers, shipped together per page:**

**Layer 1 — hide, don't scroll (every table, small change).** Declare
`meta: { responsiveClassName: 'hidden md:table-cell' }` (or `lg`) on the
secondary columns so the default mobile view shows only what matters:

| Table       | Keep on mobile                                            | Hide below `md`                 |
| ----------- | --------------------------------------------------------- | ------------------------------- |
| Catalogues  | Image, Name, Price, Status, Actions                       | Section, Category               |
| Coupons     | Expand, Code, Discount, Visibility, Availability, Actions | Type, Valid period, Redemptions |
| Redemptions | User, Code, Discount, Redeemed on, Status, Actions        | Branch, Expires                 |

`overflow-x-auto` stays as the safety net for any residual wide cell. Do this
by porting coupons + redemptions onto the shared `DataTable` composite (which
applies the responsive meta for free) rather than by editing each raw table.

**Layer 2 — card-view fallback (the real mobile experience).** One TanStack
instance, two renderers: the existing `<Table>` stays `hidden md:block`, and a
card list renders `md:hidden` from the SAME `table.getRowModel().rows`,
reusing each column's `cell` renderer via `flexRender`. Sorting, pagination,
selection and expansion stay single-source; column defs don't change. Add it
as an optional `renderMobile` prop (or `MobileCardList` sibling) on the shared
`DataTable` composite — no new packages (TanStack already installed).

Card anatomy per page (primary info on top, label/value pairs below, actions
in a bottom row with ≥44px targets):

- **Catalogues:** image + name + description header, price + status chips;
  tapping the card opens the existing `ViewProduct` dialog; actions
  (Edit / Apply Sale / Set Status / Delete) in a kebab footer.
- **Coupons:** code in mono type (the thing a cashier reads), discount in
  primary colour, visibility + availability chips, expiry line; tap expands
  to scope + linked products (reuse the existing `ExpandedProducts`); footer
  row: Publish/Unpublish, Edit, Duplicate, Delete.
- **Redemptions (counter tool):** avatar + name + email, code, discount,
  status badge, redeemed-on; tap expands to coupon details (reuse
  `ExpandedCouponDetail`). Put a prominent **"Search by code"** affordance
  above the list on mobile — the page already has a `SearchBar` with that
  placeholder; on a phone it should be the hero control, not a small corner
  input.

Empty/loading states in card mode use the same EmptyState treatment as §6.6.

**Touch targets (concrete, ui-standards 44×44 minimum):**

- Pagination: `h-8 w-8` prev/next (and hidden `lg:flex` first/last) buttons →
  `min-h-11 min-w-11` on mobile (desktop can stay compact). Page-size select
  trigger `h-8` → `min-h-11` on mobile.
- Row-action kebab `h-8 w-8` → `min-h-11 min-w-11` on mobile (keep compact on
  `md+`).
- Expand-row chevron: currently a `size-4` icon in a bare cell — wrap it in a
  padded hit area (`p-2.5`) so the touch zone is ≥44px.
- Selection checkbox (~16px): wrap in a padded hit area; on touch, tapping
  the row expands (not selects) so the checkbox never has to be aimed at.
- Dialog footers, filter controls and `SearchBar` inputs (`h-9`) → `min-h-11`
  on mobile; toolbars stack full-width with `gap-2`.

**Acceptance criteria (when this phase lands):**

- At 375px viewport, no horizontal scrolling is required to reach any primary
  action on any of the three pages (Layer 1) or the card list renders instead
  (Layer 2).
- Every interactive element is ≥44×44px on touch; desktop stays compact.
- Sorting, pagination, expansion and bulk selection work identically in card
  mode, and the two hand-rolled tables are gone (unified on `DataTable`).
- Light-first dark pass + axe/keyboard pass on card mode.

---

## 7. Promo-type data model (BOGO + FREE) — CONCRETE ARTIFACTS

**Status: written and type-checked, awaiting approval. Nothing is applied to
any database and nothing is deployed.** The artifacts below implement the
recommendation from the spec draft (JSONB union widening — the low-risk path
that keeps the mobile contract's shape stable).

The stored shape on `coupons.discount` becomes a discriminated union:

```ts
type DiscountValue =
  | { type: 'percentage'; value: number } // 0 < value <= 100
  | { type: 'fixed_amount'; value: number } // value > 0, ₱
  | { type: 'free'; value: null } // FREE promo
  | {
      type: 'bogo';
      buy: number; // e.g. 1
      get: number; // e.g. 1 (free item)
      max_free?: number; // optional cap on free items per redemption
      value: null;
    };
```

### 7.1 Files written (this deep-dive)

| File                                                                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260817000000_coupon_discount_bogo_free.sql`                   | **NEW.** Replaces the old `coupons_discount_structure` CHECK (20260526000008, which required a numeric `value` and only allowed percentage/fixed) with `coupons_discount_shape_check` pinning the 4-arm union. The drop is REQUIRED, not optional: a bogo/free row would still violate the old constraint. Validates existing rows in place (all legacy rows are percentage/fixed with numeric `value` ≥ 0, so no backfill). Uses `jsonb_typeof` + `CASE WHEN` guards so a missing key evaluates to NULL→false, never a cast error. Rollback: drop the new constraint + re-add the old one (both statements in the file header). **Found + fixed during browser testing** — the first draft only ADDED the new constraint and BOGO creation failed with `INTERNAL_ERROR` against the still-live old CHECK. |
| `lib/types/coupon.ts`                                                                | `DiscountType` widened to 4 literals; `DiscountValue` is now the discriminated union (`PercentageDiscount` / `FixedAmountDiscount` / `FreeDiscount` / `BogoDiscount`). New `FlatDiscountType` = legacy `'percentage'\|'fixed_amount'` used by the old dialogs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `lib/types/customer.ts`                                                              | `PublicCoupon.discount` (the mobile customer type) now `DiscountValue \| null` — the API passes `discount` through raw, so the widened shape flows to customers unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `lib/validation/coupons.ts`                                                          | `discountValueSchema` is now `z.discriminatedUnion('type', …)` — percentage ≤100, fixed >0, free `value:null`, bogo buy/get ≥1 ints (+ optional `max_free`). `createCouponSchema` / `updateCouponSchema` inherit it automatically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lib/validation/__tests__/coupons-discount.test.ts`                                  | **NEW.** 13 tests: the 4 shapes accepted, bad shapes rejected (percentage >100, missing value, BOGO without `get`, `buy:0`, unknown type), plus end-to-end `createCouponSchema` with BOGO/FREE/legacy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `app/business/[businessId]/coupons/components/coupon-table/columns.tsx`              | `formatDiscount` renders all 4 arms (`FREE`, `Buy 1 Get 1 FREE`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `app/business/[businessId]/redeemed-coupons/components/redemption-table/columns.tsx` | Same 4-arm `formatDiscount` for the cashier-facing redemptions table (and dropped a dead conditional type).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `app/business/[businessId]/coupons/components/add-coupon.tsx` + `update-coupon.tsx`  | Kept compiling on the legacy flat shape (`FlatDiscountType`); the update dialog narrows a FREE/BOGO row to percentage on open (they have no editable %/₱ value in the old UI). Both are replaced by the template-first dialog in this phase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `lib/types/index.ts`                                                                 | Re-exports `FlatDiscountType`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### 7.2 Mobile deals API — verified, NO route change needed

- `mobile_deals` RPC (`20260815020000`) projects `c.discount` as raw jsonb into
  the deal object — new types pass through byte-identical. **Do not touch the
  RPC for this change** (re-running `supabase/tests/mobile_deals_and_outbox.test.sql`
  is only needed if you do).
- `GET /api/mobile/businesses/[businessId]/coupons` selects `discount` raw —
  same passthrough.
- `redeemCoupon` / the protected redemption routes read the coupon row and
  return `discount` unchanged — BOGO/FREE redemption is still code-based
  (customer shows the code at the counter); no rule change.
- **The mobile APP's card renderer** (not in this repo) must learn to draw
  FREE/BOGO cards from the union — ship that with the app release that
  depends on it. Old app versions ignore unknown shapes the same way they
  ignored `deal_image_url` when it was added.

### 7.3 Deferred to the rest of Phase 1 (UI track — not in this data-model pass)

1. **Template-first add/edit dialog** — presets (5/10/15%, ₱, FREE, BOGO),
   auto code suggestions, grouped fields, duplicate action, status
   transitions, deals-feed preview (§6.1). This is where the new union gets
   its UI.
2. **Registration Launch Deal step** — the wizard's `registrationDealSchema`
   and `Deal.tsx` still offer %/fixed only; wire BOGO/FREE through them when
   Phase 2 lands (the `createBusinessRegistrationDeal` conversion already
   builds `{type, value}` from a flat shape — extend it there, not now).
3. **Seeds** — add a few real BOGO/FREE coupon rows (e.g. `BOGO-COLDBREW`,
   `ISAW10`, `FREE-EGGS` are currently approximated as percentages) so the
   deals feed and dashboard tables have test data in the new shape.
4. **Phase-1 instrumentation** (`owner_events` table + events from §9).

### 7.4 Approval checklist (what “ready for approval” means here)

- [x] Review `20260817000000_coupon_discount_bogo_free.sql` (the CHECK body
      and the rollback statement) — reviewed during the Phase 1 code review;
      the old-constraint conflict was found in browser testing and fixed
      (drop `coupons_discount_structure`, then add the widened CHECK).
- [ ] Confirm the BOGO semantics in §12 (per-product via `usage_scope`, and
      whether `max_free` is needed) — only affects the UI/dialog, not the
      stored shape.
- [x] Apply the migration **locally** (done — `supabase_db_ilokal-web`;
      recorded in `schema_migrations`). Cloud/live apply still requires human
      approval before the dashboard code that creates BOGO/FREE rows deploys
      (CLAUDE.md workflow: rollback artifact, cloud apply precedes app deploy).
- [x] Browser-test BOGO/FREE creation against the applied constraint — the
      Phase 1 end-to-end run created a `B1T1` row (`{type:'bogo',buy:1,get:1,
value:null}`) and a percentage draft successfully against the live
      local CHECK.
- [ ] Verify `supabase/tests/mobile_deals_and_outbox.test.sql` still passes
      (it must — the RPC is untouched, but the coupon rows it reads now
      validate against the new CHECK).

**Migration risk note:** JSONB union widening is the low-risk path; no column
changes, no RPC rewrite, existing rows validate in place. Two real risks,
both now mitigated:

1. **The pre-existing CHECK.** `coupons_discount_structure` (20260526000008)
   demands a numeric `value` and percentage/fixed only — a migration that only
   ADDS the new constraint silently leaves bogo/free un-creatable. The
   migration DROPs it (verified live during browser testing: BOGO create went
   from `INTERNAL_ERROR` to a persisted row).
2. **A CHECK written wrong** (rejecting future legitimate rows) — mitigated
   by keeping the app layer (`discountValueSchema`) the strictest of the three
   layers (zod ⊂ CHECK in strictness: zod requires value > 0, the CHECK allows
   ≥ 0 so legacy rows can never block the ALTER). The `free` arm requires
   `jsonb_typeof(value) = 'null'` — the app stores `{type:'free', value:null}`
   (key present), which the builder guarantees.

### 7.5 Phase 2 — implemented (registration wizard)

**Status: implemented, reviewed, browser-tested (25/25 checks), committed +
pushed on `feat/business-dashboard-ux-revamp`, held for PR.** Migration
`20260818000000_owner_events.sql` applied locally only.

**What shipped (all §6.2 items):**

1. **Honest copy** — `step-progress.tsx` side panel now says "Most owners
   finish in about 5–10 minutes — progress saves as you go" and "Most shops
   are approved automatically" (replacing the false "5 minutes" / "Instant
   approval" claims). "Zero setup fees" stays.
2. **lat/lng hidden** — `ShopInformation.tsx` removed the editable Latitude /
   Longitude number inputs entirely. Coordinates are set only via the map pin
   - "Use My Location" and shown as a read-only "Pin set: x, y" line (or a
     "No pin set yet" hint). The map stays on `md+`.
3. **Category step mobile polish** — `ShopCategoryStep.tsx`: the type filter
   is now a sticky bar (pinned while the grid scrolls) with an active-type
   chip; the grid is 2-col on mobile (was 1-col), with responsive card
   heights that no longer clip.
4. **Deal-step preset reuse** — `Deal.tsx` now shows the SAME preset chips as
   the Phase 1 coupon dialog (5/10/15%, ₱, FREE, Buy 1 Take 1) by importing
   `PROMO_TEMPLATES` (pure module — no cross-bundle risk). Picking one
   prefills the discount (+ value or buy/get); the wizard now produces
   FREE/BOGO coupons. `registrationDealSchema`, the deal route `bodySchema`,
   `RegistrationDealInput`, `createBusinessRegistrationDeal`, and the client
   `createRegistrationDeal` all carry the 4-arm discount. 4 new schema tests +
   2 new write tests.
5. **Reg-funnel instrumentation** — new `owner_events` table (migration
   `20260818000000_owner_events.sql`: `owner_id` NOT NULL, `business_id`
   nullable for pre-submit events, event + jsonb payload, RLS owner-insert /
   owner-select / admin-select) + `logOwnerEvent` server action
   (`app/business/registration/actions/ownerEvents.ts`, fire-and-forget:
   never throws to the caller, silent no-op without a session). Wired:
   `reg_step_viewed` (mount + step change), `reg_step_completed`,
   `reg_step_error` (with the offending fields), `reg_back_nav`, and
   `reg_submitted` (with `with_deal` / `require_documents`). 3 action tests.
   Later phases extend the `OwnerEventName` union.

**Browser verification (local DB, `owner@example.com` — an owner with
no business, so the wizard is reachable):** honest copy replaces the claims;
no Latitude/Longitude inputs; "No pin set yet" + "Use My Location" present;
all 6 preset chips; BOGO Buy/Get inputs; 10% off prefills value 10; category
grid is 2 columns at 390px; and `owner_events` gains `reg_step_viewed` (31)

- `reg_step_completed` (1) rows for the test owner.

**Still deferred:** Phase 2's deal step reuses preset chips but not the full
bento deals-feed preview (that's the Phase 1 dashboard track); TD-019
(`safeNext` owner path — return owners to the wizard after signup) was left
for a later pass per the sequencing rules.

### 7.6 Phase 3 — implemented (dashboard home + onboarding)

**Status: implemented, reviewed, browser-tested (28/28 checks), committed +
pushed on `feat/business-dashboard-ux-revamp`, held for PR.** No new
migration — instrumentation reuses the Phase 2 `owner_events` table.

**What shipped (all §6.3 items):**

1. **Checklist-first + Full-report collapse** — `page.tsx` already rendered
   the `SetupChecklist` above both home branches; `AnalyticsDashboard.tsx`
   now keeps the default view to **First Answer + Health Score + Smart
   Suggestions + Coupon Performance** and moves the trend / segments /
   retention / funnel charts (and the branch summary) behind a **"See the
   full report" / "Show less"** toggle (`aria-expanded`, ≥44px touch
   target). No data is dropped — it's one deliberate click away.
2. **KPI captions** — `StatCard` gained an optional `caption` prop (plain-
   language one-liner under the trend line, never instead of it);
   `HealthScoreCard` passes all four: "How many customers came back in the
   last month", "People who started following your shop this month",
   "Coupons and deals customers can redeem right now", "Average rating from
   customer reviews".
3. **Empty/zero states** — `AutomationSuggestions` no longer hides when
   empty; it renders a dashed "Add your first deal and suggestions will start
   appearing here" hint with a **Create a deal** CTA (`businessId` prop). All
   five zero-data surfaces now say what to do: coupon table ("Publish your
   first deal and its redemptions will appear here"), segments ("build from
   redemptions"), retention ("fills in as customers visit"), funnel ("Share
   your shop link to grow your audience"), and the defensive trend empty
   state (the RPC always returns zero-valued month rows, so the chart branch
   is the reachable one — verified).
4. **Gate card CTA** — the unverified "Analytics unlock once your shop is
   verified" card in `HomePage.tsx` now ends with a **"Check verification
   status"** button linking to `businessProfilePath` (Profile's
   `AccountStatusCard`), instead of a dead-end Lock. `AlmosstThereSection`
   (pre-registration) gains a "Register your shop" CTA to the wizard, and
   `OnboardingSection` drops the same false "5 minutes" / "Instant approval"
   claims fixed in Phase 2 (now "Most owners finish in 5–10 minutes" / "Most
   shops are approved automatically").
5. **Dashboard instrumentation** — `OwnerEventName` union extended with
   `dash_full_report_open` (on expand), `dash_checklist_dismiss` (from
   `SetupChecklist`'s Hide), and `dash_card_clicked` (verification-gate CTA,
   with `{card: 'verification_gate'}` payload). All fire-and-forget through
   the existing `logOwnerEvent` action.

**Browser verification (local DB):** Part A on `owner2@ilokal.dev`
(GigaGrind — verified, zero data): all four KPI captions; coupon-table and
funnel/segments/retention zero-state guidance; charts hidden by default;
"See the full report" → all four charts + "Show less"; checklist Hide →
`dash_checklist_dismiss`; expand → `dash_full_report_open` (1 row each, in
`owner_events`). Part B on `owner2@example.com` with the business
flipped to `pending` in the LOCAL DB (restored after): gate card copy, CTA
href → `/business/:id/profile`, click lands on Profile with AccountStatusCard,
and `dash_card_clicked` `{"card":"verification_gate"}` rows recorded.

**Deferred:** the pre-registration home (`!business` branch of `HomePage`)
is unreachable in practice — the `[businessId]` layout gates on
`verifyBusinessOwner`, so an owner with no business row is redirected to the
wizard — its copy fixes landed anyway for consistency and for the archived-
row edge. Chart-card visibility-by-scroll and time-to-checklist-dismiss
(§6.3.6) are partially covered (`dash_checklist_dismiss` is the dismissal
moment; scroll visibility needs an IntersectionObserver — deferred to the
mobile/IA phase to keep this diff small).

### 7.7 Phase 4 — implemented (store nav pages)

> **Roadmap renumber:** this is the spec's Phase-5 row ("Store nav pages")
> delivered as the user's **Phase 4** — the spec's Phase-4 row ("IA /
> navigation + mobile") is deferred. Scope = My Shop toolbar, Catalogues
> status pills + mobile card view, Redemptions counter helper, Branches
> shared fields. The full data-table mobile strategy for coupons/redemptions
> (§6.8 Layer 1+2 on the hand-rolled tables, unify onto `DataTable`) stays
> deferred.

**Status: implemented, reviewed, browser-tested (26/26 checks), committed +
pushed on `feat/business-dashboard-ux-revamp`, held for PR.** No new
migration; no data-model change.

**What shipped:**

1. **My Shop toolbar** — new `ShopOwnerToolbar` (client) on the
   customer-preview page: a bordered strip with the honest lede ("This is
   your shop page — what customers see…") and three links — **Edit
   profile** → `businessProfilePath`, **Add {offering}** →
   `businessAddOfferingPath` (the `?add=1` marker opens the add dialog
   directly; label follows the offering vocabulary), **Manage gallery** →
   `businessShopGalleryPath`. The page stays a pure preview; the toolbar is
   the only owner affordance.
2. **Catalogues status pills + tooltips** — the status cell is now a
   `Tooltip`-wrapped pill (focusable, `cursor-help`) explaining the
   vocabulary: "Active = Visible to customers and on the app", "Unlisted =
   Hidden from customers. Kept in your catalogue.", "Disabled = …" — from
   the existing `PRODUCT_STATUS_OPTIONS` descriptions (single source).
3. **DataTable mobile strategy (§6.8), Layer 1 + 2 for catalogues** — the
   shared `DataTable` gained an optional `renderMobile(table)` prop: when
   provided, the `<Table>` hides below `md` and a card list renders from the
   SAME TanStack rows (sorting/pagination/selection stay single-source);
   Section + Category columns declare `meta.responsiveClassName` as a safety
   net. New `MobileProductCardList` reuses each column's `cell` via
   `flexRender` — image (tappable → `ViewProduct`) + name/description
   (tappable → `ViewProduct`) header, price + status-pill row, actions kebab
   footer. Touch targets bumped to ≥44px on mobile: pager prev/next and
   page-size trigger (`h-11 md:h-8`), product kebab (`h-11 w-11 md:h-8
md:w-8`); desktop stays compact. Verified: at 375px no horizontal scroll,
   cards render; at md+ the table returns and the card list hides.
4. **Redemptions counter helper + rename** — sidebar and page title now say
   **"Redemptions"** (route `/redeemed-coupons` unchanged; the old name made
   the claims table read like a historical log). New prominent Alert above
   the table: **"How to redeem at the counter"** — 1) ask for the code, 2)
   search it (the `Search by coupon code…` input), 3) apply the discount and
   the coupon is marked claimed. Search-bar input stays the counter's hero
   control on the page header toolbar.
5. **Branches shared fields + approval language** — the branch-creation
   location step now matches registration (Phase 2): raw lat/lng number
   inputs removed; coordinates are read-only and set only via the shared
   `LocationPicker` map + "Use My Location" (`useGeolocation`), shown as
   "Pin set: x, y" / "No pin set yet…" (the map/address components were
   already DRY-shared). Branch cards and the branch-detail header explain
   approval state in plain language: pending → "Customers can see this
   branch once it's approved."; rejected → "This branch isn't visible to
   customers." (the 6-step wizard already reuses the StepProgress visual
   language).

**Browser verification (local DB, Gugma — `owner2@example.com`):**
toolbar lede + all three links' hrefs (Edit profile, Add Service →
`product-catalogues?add=1`, Manage gallery); at 375px the catalogue renders
cards (product name, Active pill, kebab) with the table `display:none` and no
horizontal scroll (scrollWidth=375), and at 1280px the table returns while
the card list hides; Redemptions title + counter-helper steps + search
placeholder + sidebar label (old name gone); a branch flipped to
`pending_review` in the LOCAL DB (restored after) shows the approval note on
its card; the branch wizard's location step has no lat/lng inputs, the
read-only pin line, Use My Location, and the street-address field.

**Deferred (kept small on purpose):** coupons + redemptions mobile card
views and their port onto the shared `DataTable` (§6.8 — the two hand-rolled
TanStack tables stay as-is this phase); apply-sale inline price preview;
"guided add" flow beyond the existing `?add=1` deep link; branch wizard
copy-map entries.

### 7.8 Phase 5 — implemented (§6.8 data-table mobile strategy: coupons + redemptions)

**Status: implemented, reviewed, browser-tested (24/24 checks), committed +
pushed on `feat/business-dashboard-ux-revamp`, held for PR.** No new
migration; no data-model change.

**What shipped — the two hand-rolled TanStack tables are gone:**

1. **`DataTable` gained expandable rows** — an optional
   `expandable: { getRowCanExpand, renderExpanded }` prop wires
   `getExpandedRowModel` + `onExpandedChange` and renders the expanded panel
   full-width below the row (the pattern coupons/redemptions previously
   hand-rolled). Expansion state lives in the composite, so it is shared
   between the desktop table and the mobile card list (single source).
2. **Coupons ported onto `DataTable`** — `CouponsTable` now renders through
   the composite with `expandable` (Linked Products panel) and
   `renderMobile`. Layer 1 (§6.8 table): `Type`, `Valid Period` and
   `Redemptions` columns declare `hidden md:table-cell`. Layer 2:
   `MobileCouponCardList` reuses each column's cell via `flexRender` —
   chevron + mono code header, `Draft`/visibility + `Active`/availability
   chips, discount + usage scope, expiry line, tap-to-expand Linked
   Products, kebab footer (`CouponActions`).
3. **Redemptions ported onto `DataTable`** — `RedeemedCouponsTable` renders
   through the composite with `expandable` (Coupon Details panel) and
   `renderMobile`. Layer 1: `Branch` and `Expires` hidden below `md`.
   Layer 2: `MobileRedemptionCardList` — avatar + name + email, mono code,
   discount, status badge, redeemed-on line, tap-to-expand Coupon Details.
   The code search is now the **hero control on mobile** (leads the toolbar
   below `md` via `order-first`).
4. **Touch targets** — expand chevrons in both tables gained a `p-2.5`
   hit area (≥44px), and the coupon kebab is `h-11 w-11 md:h-8 md:w-8`.
   Catalogues already had its card view from Phase 4 — all three pages now
   share one composite, one expansion model, one pager.

**Browser verification (local DB, Gugma):** at 375px both pages render
cards (mono codes incl. the Phase-1 `B1T1` BOGO "Buy 1 Get 1 FREE", chips,
status badges, kebabs) with the desktop table `display:none` and
scrollWidth=375; tap-to-expand reveals Linked Products (`Classic Manicure`)
and Coupon Details; the redemptions search input leads the toolbar; at
1280px the tables return with the Layer-1 headers (Type / Valid Period /
Redemptions; Branch / Expires). Test fixtures seeded locally: 3
`user_redemptions` rows (claimed/active/expired) and `B1T1` linked to one
product (`usage_scope='specific_products'`).

**Remaining §6.8 notes:** the redemptions table has no bulk selection; the
coupons `select` column is inert on mobile cards (no bulk toolbar exists) —
selection stays single-source where it is used. Card-mode axe/keyboard pass
and the coupons/redemptions Filipino copy stay in the account-phases batch.

### 7.9 IA / navigation pass — implemented (§6.7)

**Status: implemented, reviewed, browser-tested (28/28 checks), committed +
pushed on `feat/business-dashboard-ux-revamp`, held for PR.** No new
migration; no data-model change.

**What shipped — the spec's deferred Phase-4 row ("IA / navigation +
mobile"), delivered as Phase 6:**

1. **Vocabulary-driven nav labels** — `OfferingNouns` gained `shopLabel` +
   `dealsLabel` (defaults "My Shop" / "Coupons & Deals") with the same
   fallback contract as `catalogue`; the sidebar now resolves all three
   entries through the vocabulary (a vertical can rename its storefront —
   "My Fleet" — without touching the nav config). The nav fallback label
   "Product Catalogues" → "Product Catalogue" so the fallback never
   disagrees with the resolved label. Both new labels are universal today;
   the mechanism is what ships (§6.7.1 "where sensible").
2. **Profile/Settings surfacing — account-place design (§6.7.2 option b)** —
   the header now prints a compact shop identity (avatar + name +
   verification badge) whenever the sidebar is collapsed or on mobile (where
   the sheet is closed by default and the owner otherwise never sees their
   own shop name); the account menu shows the same badge under the email, so
   the avatar dropdown is unmistakably the _account_ place. New shared
   `BusinessVerificationBadge` (verified/pending/rejected/suspended arms;
   icon-only below `sm` in the header, `title` kept for discoverability).
   **Both §6.7.2 options now ship**: a **Manage** sidebar group (option a,
   `manageNavigation` — Profile + Settings as a visible nav section under
   the Store Management group) makes the account pages part of the nav the
   owner reads all day, and the header identity (option b) keeps the account
   menu unmistakably the account place. The dropdown no longer duplicates
   the nav entries — Profile/Settings have a single home in the Manage
   group, and the account menu is purely the account control (identity +
   verification, tour, sign-out).
3. **Mobile notifications** — the `NotificationBell` wrapper lost
   `hidden sm:flex`; the bell (44px touch target) now sits in the mobile
   header. Branch switching is no longer mobile-hidden either: the
   `BranchSelector` trigger becomes an icon-only 44px button below `md`
   (name + chevron are the desktop part; the `w-72` dropdown fits 375px).
   Header controls (trigger, bell, branch, theme) all use 44px mobile
   touch targets, compact `md:` sizes.
4. **Help & Support stays hidden** (§6.7.4) — no `help/` route exists, so
   the entry remains absent (verified 404s); same for Subscription. Flag-
   gated items (Bookings/Events) keep the existing `flags` filter (§6.7.5,
   verified unchanged — Bookings absent while the flag is off).

**Verification:** typecheck clean · 2,874 tests pass (3 new
`BusinessVerificationBadge` unit tests + vocabulary tests for the new
nouns) · lint + prettier clean · 28/28 browser checks on the local DB
(Gugma, verified): desktop sidebar labels ("My Shop", "Service Menu",
"Coupons & Deals", no generic "Product Catalogue"); account menu with
Profile/Settings + Verified badge and no Help/Subscription; identity hidden
while open → appears on collapse with shop name + badge; at 375px identity
shows, bell/branch/theme are 44px, no horizontal scroll (scrollWidth=375),
bell popover + branch dropdown open, sheet shows the same labels.

### 7.10 Account pages + copy map — implemented (§6.5 + §8)

**Status: implemented, reviewed, browser-tested (13/13 checks), committed +
pushed on `feat/business-dashboard-ux-revamp`, held for PR.** No new
migration; no data-model change. The final roadmap row — the only remaining
item is the Filipino ROLLOUT, which stays gated on the §8.3 native-speaker
review.

**What shipped:**

1. **Profile — pending top banner** (§6.5): the verification state is now a
   top banner on the Profile page (the same `ShopPendingBanner` the
   dashboard uses, so the copy agrees everywhere) instead of living only in
   the buried Account Status card. Pending is the one question every pending
   owner asks first — it now answers it above the fold.
2. **Insights — Bida Ngayon primer** (§6.5): the page explains what the
   board IS ("Bida Ngayon is this week's trending board on iLokal…") in a
   lead Alert, and the header gained a **Back to dashboard** link to the
   main analytics (Home). Empty states already existed (no items / no
   views) — verified unchanged.
3. **Settings — Danger Zone** (§6.5): already unmistakably destructive
   (`border-destructive/30`, `bg-destructive/5`, `variant="destructive"`
   throughout) — verified rendering red in dark mode rather than gray.
4. **Copy map — first 30** (§8.1): `lib/copy/owner.ts` is the typed
   `Record<Locale, OwnerCopy>` with all 30 strings (en + fil), keyed by
   surface, verbatim from the §8.1 inventory — plus `LocaleProvider` /
   `useOwnerCopy()` (default `en`, deliberately NO i18n framework per
   §8.1). A contract test pins the map to reality: both locales share
   exactly the same keys, no empty strings, DB-stored values untranslated,
   and the `en` strings are asserted against the LIVE sources (stepMeta,
   PendingBanner) so a UI copy change fails the test instead of silently
   desyncing the map.

   **Rollout stays gated** (§8.3): the `fil` strings are proposals pending
   native-speaker review. Wiring surfaces to `useOwnerCopy()` is the next
   cross-cutting phase — the map is the artifact this phase was asked to
   deliver, and the wizard wiring alone would half-translate (only 5 of 7
   steps are in the first 30), so nothing switches locales at runtime yet.

**Verification:** typecheck clean · 2,881 tests pass (7 new copy-map
contract tests) · lint + prettier clean · 13/13 browser checks on the
local DB (Gugma): profile shows the pending banner only while pending
(flipped → verified → restored in local DB; banner sits above the form);
insights explainer + Back to dashboard returns to Home; Danger Zone tab in
dark mode renders destructive tokens (red text/border, not gray).

---

## 8. Filipino (Tagalog) copy variant

Interview decision: **full Filipino copy variant for owner surfaces** (not
just hints).

Approach to spec:

1. **Content inventory first:** every owner-facing string currently hardcoded
   in `app/business/**` — export into a copy map keyed by surface
   (en + fil). Do NOT introduce an i18n framework (stack frozen); a typed
   `lib/copy/owner.ts` with `Record<Locale, OwnerCopy>` and a locale from the
   profile/settings (default en) is the cheapest correct pattern.
2. **Priority strings:** registration steps + field labels + helper text +
   validation messages first (highest friction), then coupon dialog, then
   dashboard captions, then nav labels.
3. **Review gate:** a native Filipino speaker reviews promo vocabulary
   (BOGO/FREE phrasing: "Bumili ng 1, Kumuha ng 1" etc.) before the variant
   ships.
4. **Do not translate:** codes, product names, the brand, or status values
   stored in the DB (status stays `draft/published` — the UI maps to words).
5. **Rollout:** ship English polish first (Phase 1), then land the Filipino
   variant as a cross-cutting phase after the copy map exists.

### 8.1 Copy inventory — first 30 strings (draft Filipino, pending native-speaker review)

Every string below was pulled verbatim from the code; the Filipino column is a
**proposal** to be reviewed per §8.3 before it ships. The English column is the
current hardcoded text — when the copy map lands, these become keys in
`lib/copy/owner.ts`, not literals. **Not translated:** DB-stored status values
(`draft`/`published`), codes, brand, product names; "coupon" and "promo" stay
as loanwords (standard Taglish), "deal" → "promo". The two wizard claims
("Takes only 5 minutes", "Instant approval") are being replaced with honest
copy in Phase 2 — translate the replacement, not the claims.

**Registration wizard (15)** — highest friction, first to land:

| #   | English (current)                                                                                                         | Filipino (proposed)                                                                                                                 | Location                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Business Category                                                                                                         | Kategorya ng Negosyo                                                                                                                | `registration/data/stepMeta.ts` → step title           |
| 2   | Select the category that best describes your business.                                                                    | Piliin ang kategoryang pinaka-angkop sa iyong negosyo.                                                                              | `stepMeta.ts` → step description                       |
| 3   | Shop Information                                                                                                          | Impormasyon ng Tindahan                                                                                                             | `stepMeta.ts` → step title                             |
| 4   | Provide basic details about your shop.                                                                                    | Ibigay ang pangunahing detalye ng iyong tindahan.                                                                                   | `stepMeta.ts` → step description                       |
| 5   | What You Offer                                                                                                            | Ang Iyong Mga Alok                                                                                                                  | `stepMeta.ts` → step title                             |
| 6   | Add at least one item so your shop page is not empty on day one.                                                          | Magdagdag ng kahit isang item para hindi walang laman ang pahina ng iyong tindahan sa unang araw.                                   | `stepMeta.ts` → step description                       |
| 7   | A Launch Deal                                                                                                             | Pambungad na Promo                                                                                                                  | `stepMeta.ts` → step title                             |
| 8   | Optional. Give shoppers a reason to walk in — you can skip this.                                                          | Opsyonal. Bigyan ng dahilan ang mga mamimili na pumunta — maaari mong laktawan ito.                                                 | `stepMeta.ts` → step description                       |
| 9   | Review & Submit                                                                                                           | Repasuhin at Isumite                                                                                                                | `stepMeta.ts` → step title                             |
| 10  | Shop Name                                                                                                                 | Pangalan ng Tindahan                                                                                                                | `registration/steps/ShopInformation.tsx` → field label |
| 11  | City/Municipality                                                                                                         | Lungsod/Bayan                                                                                                                       | `ShopInformation.tsx` → field label                    |
| 12  | Use My Location                                                                                                           | Gamitin ang Aking Lokasyon                                                                                                          | `ShopInformation.tsx` → button                         |
| 13  | Note: This address will be used for verification purposes and may be displayed to customers. Please ensure it's accurate. | Tandaan: Gagamitin ang address na ito para sa beripikasyon at maaaring ipakita sa mga customer. Tiyaking tama ito.                  | `ShopInformation.tsx` → amber note                     |
| 14  | Make it live as soon as my shop is                                                                                        | I-publish ito kapag na-activate na ang aking tindahan                                                                               | `registration/steps/Deal.tsx` → publish checkbox label |
| 15  | Leave this unticked and the deal is saved as a draft — nobody can redeem it until you publish it from your dashboard.     | Kung hindi ito i-tick, ise-save ang promo bilang draft — walang makakapag-redeem hanggang i-publish mo ito mula sa iyong dashboard. | `Deal.tsx` → publish helper text                       |

**Coupon dialog (10)** — Phase 1 surface, next priority:

| #   | English (current)                                              | Filipino (proposed)                                                   | Location                                           |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| 16  | Add Coupon or Deal                                             | Magdagdag ng Coupon o Promo                                           | `coupons/components/add-coupon.tsx` → dialog title |
| 17  | Create a discount coupon or a featured deal for your customers | Gumawa ng discount coupon o featured promo para sa iyong mga customer | `add-coupon.tsx` → dialog description              |
| 18  | Draft — Only you can see this                                  | Draft — Ikaw lang ang makakakita nito                                 | `add-coupon.tsx` → visibility option               |
| 19  | Published — Visible to customers                               | Published — Nakikita ng mga customer                                  | `add-coupon.tsx` → visibility option               |
| 20  | Applies To                                                     | Saklaw                                                                | `add-coupon.tsx` → scope label                     |
| 21  | All products                                                   | Lahat ng produkto                                                     | `add-coupon.tsx` → scope option                    |
| 22  | Max Total Uses (Optional)                                      | Pinakamaraming Paggamit (Opsyonal)                                    | `add-coupon.tsx` → limits label                    |
| 23  | Start Date                                                     | Petsa ng Pagsisimula                                                  | `add-coupon.tsx` → date label                      |
| 24  | Code is required                                               | Kinakailangan ang code                                                | `add-coupon.tsx` → validation message              |
| 25  | Must be greater than 0                                         | Dapat higit sa 0                                                      | `add-coupon.tsx` → validation message              |

**Dashboard & onboarding (5)** — the daily landing surface:

| #   | English (current)                                                      | Filipino (proposed)                                                    | Location                                                        |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 26  | Finish setting up your shop                                            | Tapusin ang pag-setup ng iyong tindahan                                | `components/custom/onboarding/SetupChecklist.tsx` → card title  |
| 27  | Your shop is registered — here's what's next                           | Nakarehistro na ang iyong tindahan — narito ang susunod                | `SetupChecklist.tsx` → welcome title                            |
| 28  | Awaiting Verification                                                  | Naghihintay ng Beripikasyon                                            | `[businessId]/home/components/PendingBanner.tsx` → banner title |
| 29  | — Your shop is currently invisible to public users while under review. | — Hindi pa nakikita ng publiko ang iyong tindahan habang sinusuri pa.  | `PendingBanner.tsx` → banner detail                             |
| 30  | Analytics unlock once your shop is verified                            | Magiging available ang analytics kapag na-verify na ang iyong tindahan | `[businessId]/home/HomePage.tsx` → gate card                    |

**Next batch (the "second 30"):** nav labels (My Shop → Aking Tindahan,
Coupons & Deals → Coupons & Promos, Redeemed Coupons → Mga Na-redeem na
Coupon, Store Management → Pamamahala ng Tindahan — `libs/configs/config.ts`),
remaining field labels + helper text (Gallery, Documents, Offerings steps),
remaining validation messages, success/error toasts ("saved as a draft", "is
live"), redemptions table headers, and the Settings/Profile tab names.

---

## 9. Instrumentation (owner funnel)

Existing: `view_events` is **customer**-facing; Sentry is errors-only;
product analytics live in `view_events` + `analytics_*` RPCs. **Owner-side
events have no home today** — that's the gap.

Proposed (spec-level):

1. **New table** (e.g. `owner_events`: `business_id`, `owner_id`, `event`,
   `payload jsonb`, `created_at`) + RLS (owner-write/admin-read) + a
   `logOwnerEvent` Server Action — following the existing migration/RPC
   conventions. **Migration → high-risk approval.** Alternative if a table
   is too heavy for Phase 1: ship the event calls behind a no-op until the
   migration lands.
2. **Events per phase:**
   - Registration: `reg_step_viewed`, `reg_step_completed`, `reg_step_error`,
     `reg_back_nav`, `reg_submitted`, time-per-step.
   - Coupons (Phase 1): `coupon_dialog_open`, `coupon_template_selected`
     (template id), `coupon_saved_draft`, `coupon_published`,
     `coupon_field_error` (field name), time-in-dialog, `coupon_duplicated`.
   - Dashboard: `checklist_dismissed`, `checklist_item_clicked`,
     `chart_card_clicked`.
3. **Success metrics to report per phase:**
   - Coupon creation: publish-rate within one session, time-in-dialog
     (target: -40% vs baseline), field-error rate (target: -50%).
   - Registration: completion rate per step (find the drop-off),
     submission rate.
   - Dashboard: checklist completion rate, "no-data" state click-through.
4. **Dashboards:** reuse the `analytics_*` RPC pattern to aggregate;
   admin-facing, not shipped to owners.

---

## 10. Phased roadmap (approve per phase)

> Interview decision: each phase's section is reviewed/approved before
> implementation. Phase order is a proposal; Phase 1 is fixed by interview.

| Phase | Scope                                | Key deliverables                                                                                                                                                                                                                                                                                                            | Approx risk   |
| ----- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --- | ----- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ----- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **1** | Coupons & Deals flow                 | Template-first creation (presets + code suggestions), BOGO/FREE data model + mobile render, duplicate, edit/status coherence, dialog restructure, Phase-1 instrumentation                                                                                                                                                   | High (schema) |
| **2** | Registration wizard                  | Honest copy, lat/lng hidden, category-step mobile polish, deal-step preset reuse, reg funnel instrumentation                                                                                                                                                                                                                | Low–Med       |
| **3** | Dashboard home + onboarding          | Reordered home, KPI captions, empty/zero states, checklist polish, tour browser pass (TD-020), dashboard instrumentation                                                                                                                                                                                                    | Low           |
| **4** | Store nav pages — delivered          | Shop toolbar, catalogue status tooltips + **mobile card view (§6.8 Layer 1+2 on catalogues)**, redemptions rename + counter help, branches shared map/address fields + approval language. _(Delivered as the user's Phase 4; the spec's original Phase-4 row "IA / navigation + mobile" is deferred.)_                      | Med           |     | **5** | Coupons/redemptions mobile — delivered | Card-view fallbacks for the coupons + redemptions tables and their port onto the shared `DataTable` (§6.8 Layer 1+2, all three pages unified). Remaining: guided-add flow, apply-sale inline preview _(IA/nav pass shipped as the user's Phase 6 — §7.9)_ | Med |     | **6** | IA / nav pass — delivered | Sidebar labels vocabulary-driven (`shopLabel`/`dealsLabel` nouns), shop identity + verification badge in header + account menu, **Manage sidebar group (Profile/Settings visible in nav — §6.7.2 option a)**, mobile notifications + 44px header targets, branch selector icon trigger on mobile, Help & Support stays hidden (route 404s). _(Delivered as the user's Phase 6 — §7.9.)_ | Low |
| **7** | Account pages + copy map — delivered | Profile pending top banner, Settings Danger Zone verified destructive (dark), Insights Bida Ngayon primer + dashboard link, `lib/copy/owner.ts` first-30 map (en+fil) + `LocaleProvider` + contract test. **Remaining: Filipino rollout (gated on §8.3 native-speaker review — wire surfaces to `useOwnerCopy()`)** — §7.10 | Low–Med       |

Cross-cutting in every phase: light-first dark pass, a11y (axe + keyboard),
mobile verification, `logActionError` in any new action, CHANGELOG update.

**Dependencies / sequencing rules**

- Phase 1's schema migration must be approved and applied **before** the
  dashboard code that reads BOGO/FREE ships (or the table CHECK rejects
  inserts).
- Phase 2's deal step reuses Phase 1's preset components — do not rebuild.
- TD-019 (`safeNext` owner path) is a natural companion to Phase 2 (return
  owners to the wizard after signup) — pull in when Phase 2 is approved.

---

## 11. Risks

1. **Schema change for BOGO/FREE** — high-risk; the concrete artifact
   (`20260817000000_coupon_discount_bogo_free.sql`) uses JSONB widening, the
   low-risk path, but still needs human approval + rollback artifact + cloud
   apply before deploy (per CLAUDE.md migration workflow). If the CHECK is
   later found too strict, the rollback is a one-line DROP CONSTRAINT.
2. **Scope creep into "rebuild" territory** — the design system and stack
   are frozen; every change must be expressible in existing tokens +
   primitives. Reject anything that needs a new package or new brand color.
3. **Mobile regression on data tables** — catalogues/coupons/redemptions are
   desktop-heavy; the mobile fallback (column hiding + card view, §6.8) must
   ship in the same phase, not a follow-up, and the two hand-rolled tables
   must be ported onto `DataTable` rather than patched in place.
4. **Copy drift between en/fil** — the copy map must be the single source;
   never two hand-maintained lists (same failure mode as `stepMeta` history).
5. **Tour breakage** — `data-tour` anchors are measurement-sensitive;
   every layout change in Phases 2–4 must re-verify the tour spotlight
   (TD-020 — manual browser pass).

## 12. Open questions (deferred to phase reviews)

- **BOGO semantics (resolved by default, confirm at dialog review):** "Buy 1
  Take 1" applies to whatever the `usage_scope` says (all products vs
  specific products) — the stored shape (`buy`/`get`/`max_free`) is agnostic,
  so this only affects the dialog UI.
- **FREE promo (still open):** free _item_ (needs product scope) or free
  _entry/offer_ (code-only)? Both fit the `{type:'free'}` shape — the
  distinction lives in copy + `usage_scope`, not the data model.
- Filipino variant: which locale to start (Tagalog vs Hiligaynon/Ilonggo for
  the Iloilo core market)? Copy review by a native speaker required.
- Should the owner funnel use a new `owner_events` table or piggyback a
  business-scoped variant of `view_events`? (Recommendation: new table.)

---

## Appendix A — Phase 1 deep dive: coupon dialog target layout (conceptual)

```
┌──────────────────────────────────────────────┐
│ Add Coupon or Deal                        [×] │
│ Start from a template, or build from scratch  │
│                                              │
│ [ 5% off ] [ 10% off ] [ 15% off ] [ ₱ off ] │
│ [ FREE ]   [ Buy 1 Take 1 ]  [ Custom ]      │
│  ▲ preset chips — pick one, most fields fill  │
│  (custom selected → current long form)        │
│ ───────────────────────────────────────────── │
│ Deal (what customers see)                    │
│ [ 10% off · code SUMMER10 · until Aug 30 ]   │
│ ───────────────────────────────────────────── │
│ Details                                      │
│ Code      [ SUMMER10       ]  (auto, editable)│
│ Discount  [ 10% ▾ ]  Value [ 10      ]       │
│ Runs      [ now ▾ ] – [ in 30 days ▾ ]       │
│ Applies   [ All products ▾ ]                 │
│ ───────────────────────────────────────────── │
│ Limits (optional, collapsed)                 │
│ Max total uses [ Unlimited ] Per customer [ ] │
│ ───────────────────────────────────────────── │
│ Visibility  [○ Draft] [● Published — live]   │
│ ───────────────────────────────────────────── │
│                        [Cancel]  [Save]      │
└──────────────────────────────────────────────┘
```

BOGO selection swaps the discount row for "Buy [1▾] Get [1▾] free · applies
to [products ▾]" — the only fields that promo needs.
