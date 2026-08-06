# Registration menu step — parity table + action items

> **The problem, stated precisely:** registration's definition of "done"
> excludes the menu. `getRegistrationStepIds()` is category → information →
> gallery → (documents, flag-off) → review. A shop submits, is auto-verified,
> and goes public with **zero offerings**. An owner who never adds a menu is
> following the product exactly as designed — so every existing countermeasure
> (the setup checklist, the follow-up email) is chasing someone who already
> left.
>
> **The decision:** a menu step in the wizard, **required, minimum 1 item**. A
> deals/coupons step in the same wizard, **optional**. Plus the friction
> removals that make one item cheap to add on a phone.
>
> Branch: `feat/registration-menu-required`, cut from `main`.

---

## 0. What the words mean here

- **Menu** = rows in `products`. The word on screen is **not always "menu"** —
  `business_types.offering_profile` drives it (`Menu` / `Product Catalogue` /
  `Service Menu` / `Packages`) via `lib/utils/offeringVocabulary.ts`. A salon
  told to "add your menu" is the MF7 defect, repeated one surface earlier.
- **"Not empty"** = at least **one** row that a shopper can actually see:
  `status = 'active'` and `archived_at IS NULL`. That is the same predicate the
  setup checklist (`onboardingQuery.ts:135`) and
  `admin_businesses_missing_menu` (`20260806090000:102`) already use, and
  matching it is load-bearing — see RM4.
- **Deal/coupon** = a `coupons` row. "Live" is narrower than "exists": the
  coupon-access invariant is `status='published'` AND `archived_at IS NULL` AND
  `start_date <= now` AND not past `expiry_date`. A `draft` reaches nobody.

---

## 1. What exists to build on

| Thing | Where | Note |
| --- | --- | --- |
| Step metadata (data, no JSX) | `app/business/registration/data/stepMeta.ts` | `RegistrationStepId` union + `Record`, so a new id is a compile error until it has metadata **and** a component. The single source — `/for-business` reads it too |
| Step components | `app/business/registration/data/steps.tsx` | `STEP_COMPONENTS: Record<RegistrationStepId, ReactNode>` |
| Step validation | `validator/business-registration-form-schema.ts` | `step1Schema`…`step5Schema` + `fullSchema`. Note every file field is `.optional()` and re-guarded at submit (see RM2) |
| Submit orchestration | `components/shop-registration-content.tsx:50` | `performSubmission` — draft first, then files one request at a time, with `uploadedRef` idempotency |
| Draft creation | `api/register-business.ts:30` `registerBusiness()` | JSON metadata → `POST /api/web/businesses`, returns `{id, status}` |
| Per-file upload | `api/register-business.ts:37` | `POST /api/web/businesses/[id]/files`, one file per request (4.5 MB Vercel cap) |
| Form cache | `hooks/useFormCache.ts` | Simple fields in localStorage; file bytes in IndexedDB (`fileCache.ts`) |
| Product create | `lib/api/products/*`, `lib/validation/products.ts` | `createProductShape` requires **only** `name` |
| Offering vocabulary | `lib/utils/offeringVocabulary.ts` | Pure resolver + `defaultKind`; degrades per-field to retail copy |
| Add-product form (the friction) | `product-catalogues/components/add-product.tsx` | The form to fix and to model the step on |
| Setup checklist | `lib/api/business/onboardingQuery.ts:233` | Item `offering`, label from vocabulary |
| Follow-up nudge | `20260806090000` + `/admin/[id]/menu-follow-up` | The backstop this step is meant to make rare |

---

## 2. Parity table — the gaps and traps

| ID | Item | Why it matters | Risk |
| --- | --- | --- | --- |
| **RM1** | **There is no `business_id` during the wizard.** The row is created inside `performSubmission`, at final submit — not on entry | A menu step therefore **cannot write products while the owner is on it**. Items must be held in form state and POSTed *after* `registerBusiness()` returns an id, in the same phased flow as the files. Any design that assumes "create the shop, then add items" is designing a different wizard | 🔴 |
| **RM2** | A retried submit must not duplicate items | `performSubmission` is re-entrant by design: `businessIdRef` + localStorage resume the draft, `uploadedRef` skips already-sent files, and a 404 triggers a **full replay** (`:169`). Without the same per-item guard, one 404 replay writes every menu item twice | 🔴 |
| **RM3** | Wizard-created items must be written with the right `products.kind` | Documented decay from offerings phase 1: the DB defaults `kind='product'` and cannot tell "omitted" from "explicitly product", so a **services** business silently mints products. `add-product.tsx:220` already sends `kind: vocabulary.defaultKind` explicitly — the new path must too, or pest control's first offering is typed wrong at birth | 🔴 |
| **RM4** | Items must be created `status='active'` | Both the checklist and `admin_businesses_missing_menu` count only `active`. An item written `unlisted` satisfies the wizard, leaves the public page **empty**, and still earns the owner a "you have no menu" email — the exact contradiction this step exists to remove | 🔴 |
| **RM5** | Required menu blocks registration completion | Abandonment risk on a wizard that already demands 4+ photos. Mitigations: **1 item**, templates (RM9), no per-item image (RM10), and the draft survives so a return trip resumes rather than restarts. **Accepted trade-off, decided.** Instrument it (RM18) so the cost is measurable rather than argued | 🟠 |
| **RM6** | The add form requires **3** fields; the schema requires **1** | `add-product.tsx:323` makes category required and `:403` price required, while `createProductShape` needs only `name`. Category is a 9–20 option select the owner has no reason to care about — 20 options for the water-refilling station we just added. If the wizard step inherits this form's rules, "required menu" quietly becomes "required category" | 🟠 |
| **RM7** | Vocabulary in the wizard has **no provider to read from** | `useOfferingVocabulary()` is seeded server-side from a `businessId` that does not exist yet (RM1). The step must resolve the noun from the **category picked in step 1** → `business_categories.business_type_id` → `business_types.offering_profile`. Otherwise every vertical reads "Product" | 🟠 |
| **RM8** | Two-column grids have no responsive prefix | `add-product.tsx:384`, `:493`; `apply-sale.tsx:278`, `:338` — bare `grid grid-cols-2`. Price beside price-type at 320–360px, on the exact form we are about to make mandatory for phone registrants | 🟠 |
| **RM9** | Blank form vs. templates | Decided against sample **rows** (§3). Templates prefill name-placeholder + category + price type from `offering_profile`; **no row exists until save**. Nothing public, nothing to clean up, and it kills RM6's category tax | 🟡 |
| **RM10** | Per-item images in the wizard | Each is ≤2 MB, one upload request each, and the cache would need IndexedDB per item. The image is already optional on the dashboard form. **Omit from the wizard**, say so in the copy | 🟡 |
| **RM11** | Menu items must survive a reload | Everything else in the wizard does (`useFormCache`). Items are small JSON → localStorage, **not** IndexedDB (that store exists for file bytes). Follows from RM10: no bytes to cache | 🟠 |
| **RM12** | The bulk write is a publicly invocable endpoint | Whatever accepts N items must: validate each with the existing product schema, prove ownership of the **draft id**, write the **verified** id, cap N, and rate-limit per user. Server-Action POSTs never reach the proxy limiter, and this one amplifies into N inserts | 🔴 |
| **RM13** | A partially-failed bulk write | If item 3 of 5 fails, the owner must not be told "registration failed" for a shop that now exists with 2 items. Report per-item, keep the successes, let the remainder be added on the dashboard — the shop is already registered by then | 🟠 |
| **RM14** | A coupon step can publish a live discount | This is the money hazard. A `published` coupon inside its window enters `mobile_deals` — the app's Deals front page — and **is redeemable**: a real `user_redemptions` row, a real 6-char cashier code, a real owner notification, for a discount a first-time owner may not have read. Default the optional step to **`draft`** with an explicit publish choice | 🔴 |
| **RM15** | The coupon step must not gate submit | Decided optional. It must be skippable in one tap and must never block Submit, or RM5's abandonment cost doubles for a step that is nobody's priority | 🟠 |
| **RM16** | `/for-business` and the dashboard cards follow automatically | `getRegistrationStepMeta` feeds `app/for-business/page.tsx`, `RegistrationSteps.tsx` and `OnboardingSection.tsx`; the public page interpolates `steps.length`. Adding a step changes public marketing copy **the same deploy** — intended, but its description must be written for strangers, not for the form | 🟡 |
| **RM17** | Existing tests pin the step count | `__tests__/steps-gating.test.tsx:13,25` assert 5 / 4, and `:33` asserts `getStepFieldGroups().length === getSteps().length`. Both must move together — the field-group parity assertion is what stops a step existing with no validation | 🟠 |
| **RM18** | Nothing measures where owners drop | "Some don't add their menu" cannot distinguish *quit at Gallery* from *never found the catalogue* from *opened the add form and bailed* — three different fixes. `view_events` is the cheap precedent. Without this, RM5's trade-off can never be evaluated | 🟡 |
| **RM19** | The checklist's offering row becomes pre-ticked | Every shop registered after this ships arrives with item 4 already done. That is the point — but the checklist must not then read as broken/empty for new shops, and the follow-up admin page will (correctly) go quiet for them. Verify both rather than assume | 🟡 |
| **RM20** | Existing shops with no menu are untouched | This changes registration only. The ~N shops already registered empty still need the phase-2..5 email, which is still gated on `RESEND_API_KEY` and the **MF11** unsubscribe/CAN-SPAM decision. Do not close that work on the strength of this one | 🟡 |

---

## 3. Decisions, with the reasoning

**Menu required, minimum 1.** "Not empty" read literally. Item #2..N happen on
the dashboard, where the checklist and the follow-up email already push. Three
was considered (it matches the "3 samples" idea) and rejected: 3× the phone
typing at the moment abandonment is highest, and a shop with 2 real products
could not finish registering.

**Deals/coupons optional.** A shop with no menu has nothing to discount, and
deals are checklist item **5** to the menu's **4**. Optional keeps the ordering
honest.

**Sample rows rejected in favour of templates.** The original idea was to
pre-create 3 products and a coupon. Two things kill it:

1. **A new shop is already public.** `auto_verify_businesses` is seeded true, so
   `set_business_initial_status` publishes the shop before the owner sees the
   dashboard. Sample rows are live rows — a sample coupon is redeemable (RM14).
2. **It blinds the measurement.** Both the checklist and the follow-up RPC
   define "has a menu" as `status='active'`. The day anyone ships samples as
   active, every shop instantly looks done, the admin page reports zero shops
   needing a nudge, and nobody has a real menu. Silent; you would find it by
   noticing the list went empty.

Templates get the same friction reduction with neither hazard: tapping one
**prefills the form**, and no row exists until the owner saves. They also come
free per-vertical — `offering_profile` already carries `fields`,
`allowed_price_types` and `default_booking_mode`.

**Price stays required.** A menu without prices is not a menu. `on_request` is
the existing escape hatch and is already in Services' `allowed_price_types`.

---

## 4. Action items, phased

Each phase is independently shippable and independently revertable.

### Phase 1 — friction removal (no new step, no schema)
Standalone value: it makes the *existing* add form usable on a phone, which the
follow-up email already sends people to.

- [ ] **RM8** — `grid-cols-1 sm:grid-cols-2` on the four bare grids
- [ ] **RM6** — category optional in the add form (schema already allows null), or
      pre-selected from the shop's vertical
- [ ] **"Save and add another"** — keeps the dialog open, resets name/price,
      keeps category/section/branch. The 20-dish carinderia case
- [ ] **RM5-adjacent** — checklist and empty-state CTAs open the dialog directly
      (`?add=1`) instead of landing on the catalogue page to hunt for a button
- [ ] Tests: grid contract sweep; the reset-but-keep behaviour

### Phase 2 — the menu step, required (the core)
- [ ] **RM1** — `'offering'` id in `RegistrationStepId`, metadata, component,
      placed before `review`; `getStepFieldGroups` entry (**RM17**)
- [ ] **RM7** — resolve vocabulary from the step-1 category, with the resolver's
      existing per-field fallback
- [ ] **RM9** — templates from `offering_profile`; prefill only, never a row
- [ ] **RM11** — items cached as JSON in `useFormCache`
- [ ] Step schema: ≥1 item, each `{name, price|on_request, category?}`;
      **RM10** no image
- [ ] **RM2/RM3/RM4/RM12/RM13** — write items after `registerBusiness()` inside
      `performSubmission`, `kind` explicit, `status='active'`, per-item
      idempotency key, ownership on the verified id, capped + rate-limited
- [ ] **RM16** — public-facing step description
- [ ] Tests: submit blocked at 0 items; replay writes each item once; `kind` per
      vertical; `status='active'`; partial failure keeps successes; cache
      round-trip; step count 5/6 (**RM17**)

### Phase 3 — the optional deal step
- [ ] **RM14/RM15** — optional, skippable in one tap, **`draft` by default**
      with an explicit publish choice and plain copy about what publishing does
- [ ] Tests: skipping submits; default is never `published`; a published one
      satisfies the coupon-access invariant

### Phase 4 — measurement
- [ ] **RM18** — per-step reach + add-form open/save counters
- [ ] **RM19** — verify the checklist and the admin follow-up page behave for a
      shop that arrives with a menu

---

## 5. Open questions

1. **RM14** — is `draft` default right, or should the optional step publish
   outright? Draft is the safe read of "optional"; publishing is what an owner
   who bothered to fill it probably wants. Recommend draft + explicit toggle.
2. **RM5** — do we want a hard block, or block-with-escape ("my shop has no
   fixed menu")? Some verticals genuinely have none — a quote-only pest control
   operator. `on_request` covers the price, but not the "I sell one bespoke
   thing" case.
3. **RM18** — is `view_events` the right home for wizard funnel counters, or
   does that table mean something narrower?
4. **RM20** — MF11 (unsubscribe/CAN-SPAM) is still undecided and still gates the
   backstop for every shop that registered before this ships.

---

## 6. Out of scope

- Bulk paste-a-list entry (`Adobo 120` per line) — real value for a 20-item
  menu, but its own validation + review surface. Revisit after RM18 says
  whether item count is where people stall.
- Per-item photos anywhere in the wizard (**RM10**).
- Narrowing offering categories below the vertical — the water station sees 20
  Retail options because categories scope to the **vertical**, not the shop
  type. Real, but a taxonomy change, not a wizard change.
- Backfilling menus for shops already registered empty (**RM20**) — that is what
  the follow-up email is.
