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
>
> **Part 1 (phases 1–4) has shipped on this branch.** Part 2 — photos on the
> items and on the deal — is planned in [§7](#7-part-2--photos-on-offerings-and-deals)
> and reverses the RM10 deferral. Read §7 before touching it: one half needs no
> schema change and the other needs a migration and a change to the RPC behind
> the app's Deals feed.

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
| **RM10** | ~~Per-item images in the wizard~~ — **SUPERSEDED by [§7](#7-part-2--photos-on-offerings-and-deals)** | Originally deferred: each is ≤2 MB, one upload request each, and the cache would need IndexedDB per item. That cost was real but it was a cost, not an objection, and photos were asked for. §7 plans them; the IndexedDB-per-item concern became IMG1–IMG4 | 🟡 |
| **RM11** | Menu items must survive a reload | Everything else in the wizard does (`useFormCache`). Items are small JSON → localStorage, **not** IndexedDB (that store exists for file bytes). Still true with §7: the rows stay JSON in localStorage and only the photo blobs go to IndexedDB, keyed per item (IMG2) | 🟠 |
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
- [x] **RM19** — verified against the live database, and pinned as block 12 of
      `supabase/tests/menu_followup.test.sql`: a shop that registers with a
      menu is **not** listed by `admin_businesses_missing_menu` and is refused
      by the send-time re-check, while a shop with no offerings still is — so
      the backstop keeps covering everyone who registered before this shipped.
      The assertion was proven to fail by writing the item `unlisted`, which is
      exactly the RM4 hazard.
- [ ] **RM18** — ⛔ **BLOCKED on a schema decision, not on effort.**
      `view_events` cannot hold wizard funnel events, and this is now settled
      rather than suspected: its CHECK is
      `(business_id IS NULL) <> (product_id IS NULL)`, so every row must name a
      business or a product — and a wizard step event has **neither**, because
      the business does not exist until final submit. It also carries no
      event-type column, and its two `uq_*_daily` unique indexes would collapse
      repeated funnel events into one per day, which is the opposite of what a
      funnel counts.
      So RM18 needs a **new table**, i.e. a migration, i.e. human approval —
      and a funnel table with the wrong grain is worse than none, because it is
      approved once and then lived with. Decide before building:
      1. Grain — one row per (step, session) or a counter per step?
      2. Identity — the owner is authenticated at step 1, but the interesting
         drop-offs may be people who never signed up at all.
      3. Retention — funnel rows accumulate forever unless something prunes
         them (`prune_notification_outbox` is the precedent).

---

## 5. Open questions

1. **RM14** — is `draft` default right, or should the optional step publish
   outright? Draft is the safe read of "optional"; publishing is what an owner
   who bothered to fill it probably wants. Recommend draft + explicit toggle.
2. **RM5** — do we want a hard block, or block-with-escape ("my shop has no
   fixed menu")? Some verticals genuinely have none — a quote-only pest control
   operator. `on_request` covers the price, but not the "I sell one bespoke
   thing" case.
3. **RM18** — ~~is `view_events` the right home for wizard funnel counters?~~
   **Answered: no.** Its CHECK requires a business or product id and a wizard
   step has neither; its daily unique indexes would dedupe the very events a
   funnel counts. A new table is needed, which makes this a migration — see
   the three questions under phase 4 before writing one.
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

---

## 7. Part 2 — photos on offerings and deals

> **The ask:** let an owner attach a photo to each item they add in the menu
> step, and to the launch deal, using the compressor built on 2026-08-05.
> This **reverses RM10**, which deferred per-item images. The reasoning there
> was cost, not principle, so it is a fair call to make — but the cost is real
> and most of it is not in the picker. Read §7.1 before estimating.
>
> **Read of "so their menu list does have samples with image in it":** real
> items the owner adds, each with a photo — not pre-seeded sample rows. Sample
> rows were rejected in [§3](#3-decisions-with-the-reasoning) and both reasons
> still hold: a new shop is auto-verified and public, so seeded rows are live
> rows, and rows written `active` would make every shop look done to
> `admin_businesses_missing_menu` while nobody has a real menu.

### 7.1 Facts established before planning

Each was checked against the running system, not assumed. They are what make
the two halves of this ask different sizes.

| # | Fact | Consequence |
| --- | --- | --- |
| **F1** | The `product-images` bucket's INSERT policy is `foldername(name)[1] = businesses.id AND owner_id = auth.uid() AND archived_at IS NULL` | **Nothing can be uploaded before the business row exists.** The row is created at final submit (RM1), so image *bytes* must be held client-side for the whole wizard — which is exactly the cost RM10 named |
| **F2** | **`coupons` has no image column.** Full list: `id, business_id, code, description, discount, usage_scope, scope_values, start_date, expiry_date, max_redemptions_global, max_redemptions_per_user, current_redemptions, created_at, updated_at, archived_at, promotion_type, status, branch_id, requires_follow` | A deal photo is a **schema migration** → HIGH risk → human approval. The offering photo is not: `products.image_url` already exists |
| **F3** | The deals feed derives card imagery from the **business**: `mobile_deals` projects `biz.logo_url AS business_logo_url` and `biz.interior_images[1] AS business_image_url`. There is no per-coupon image anywhere in the pipeline | Adding the column is not enough. Without changing the RPC **and** the mobile route **and** the web deal cards, a deal photo would be stored and never shown — a column that lies |
| **F4** | `compressImage` is mandatory: the 2026-08-05 contract sweep asserts every image surface calls it and none hand-rolls `createImageBitmap`/`toBlob`. `ImageUploadField` already calls it | Use the shared field. A bespoke picker fails the sweep and re-opens the EXIF-rotation, animated-GIF and PNG-alpha traps |
| **F5** | `fileCache.putFiles` measures its 25 MB ceiling **per field key**, not across the store | Per-item keys each get their own 25 MB budget, so there is **no global guard** — 20 items × 2 MB is invisible to it. The real limit is the origin's IndexedDB quota |
| **F6** | `uploadProductImageAction` calls `verifyBusinessOwner()` with **no argument**, which falls back to whichever shop `.limit(1)` returns | Do **not** reuse it here. Extend `POST /api/web/businesses/[id]/files`, which proves ownership against the route segment's id and already runs the WebP pipeline |

### 7.2 Parity table

| ID | Item | Why it matters | Risk |
| --- | --- | --- | --- |
| **IMG1** | Bytes must survive the whole wizard (F1) | The upload cannot happen until final submit, so a picked photo lives in memory for several steps. Losing it on a reload is the defect `useFormCache` exists to prevent — and the one the IndexedDB rewrite was done for | 🔴 |
| **IMG2** | Cache key must be **stable per item**, not per index | `fileCache` is keyed by field name. Index keys (`offering_image_0`…) re-map every time an item is removed, so deleting item 1 silently moves item 2's photo onto item 1. Give each row a client-side `uid` at creation and key on that | 🔴 |
| **IMG3** | Removing an item must delete its cached blob | Otherwise every discarded photo stays in IndexedDB for the life of the origin — the same leak `clearCache()` was widened to fix | 🟠 |
| **IMG4** | No global size guard (F5) | Twenty 2 MB photos is ~40 MB of blobs with nothing to stop it. Needs its own budget check across the offering keys, and an honest message when it is hit — the form must keep working uncached, never block | 🟠 |
| **IMG5** | Compression is not optional (F4) | Must go through `ImageUploadField` / `compressImage`. A phone photo is 3–6 MB and the transport cap is what rejects it, so an uncompressed picker reproduces the bug the compressor was written for | 🔴 |
| **IMG6** | Upload happens **after** the draft exists, one request per file | Same phased flow as the registration files: a single multipart POST with everything is what 413'd in production. Sequential, each ≤4 MB | 🔴 |
| **IMG7** | Uploads must be replay-safe | `performSubmission` replays wholesale on a 404 and can be re-submitted after a mid-flight failure. Without a per-file key in `uploadedRef`, a retry re-uploads every photo and orphans the first copies in the bucket | 🔴 |
| **IMG8** | A failed photo must not cost the owner the item | The item is the required thing; the photo is decoration. If an upload fails, write the offering without an image and say so — never fail the registration | 🟠 |
| **IMG9** | The offerings write must accept and validate `image_url` | It is a publicly invocable endpoint. Accept only a path this app produced (bucket-relative, under the verified business id) — never an arbitrary string, which would let a caller point a row at any URL | 🔴 |
| **IMG10** | Store the bucket-relative **path**, not an absolute URL | The 2026-08-06 gallery bug: mixing paths and absolute URLs in one column made the diff match nothing and delete live files. New writes store paths | 🟠 |
| **IMG11** | The step must stay usable on a phone at 320px | Adding a thumbnail column to the draft row and to each list item is the most likely way to reintroduce the overflow just fixed. Same `grid-cols-1 sm:grid-cols-2` discipline | 🟡 |
| **IMG12** | The dead-band fix must survive | The list currently absorbs the step's leftover height. Taller rows change where that slack goes; re-measure rather than assume | 🟡 |
| **IMG13** | `/for-business` must not start promising photos | `STEP_FIELDS.offerings` is public copy. The photo is optional, so saying "photo" there adds a perceived requirement to a page whose whole job is removing surprises | 🟡 |
| **IMG14** | **Deal photo needs a column** (F2) | `ALTER TABLE coupons ADD COLUMN image_url text` — additive and nullable, but still a migration: HIGH risk by policy, human approval, and it queues behind the 21 already unapplied to cloud | 🔴 |
| **IMG15** | **A deal photo with no reader is a column that lies** (F3) | `mobile_deals` must project it, the mobile route must resolve it through `resolveStorageUrl`, and the deal cards must prefer it over the business fallback. Miss any one and the owner uploads a photo that is never shown | 🔴 |
| **IMG16** | Changing `mobile_deals` is not a small edit | It is the RPC behind the app's Deals front page, and it exists *because* the in-Node version silently truncated at the PostgREST 1000-row cap. Any change re-opens that surface and needs its SQL suite re-run | 🟠 |
| **IMG17** | The dashboard must be able to change what the wizard set | An owner who adds a photo at registration and cannot replace it later is worse off than one who added none. The product dialogs already do images; the coupon dialogs do not, and would need the field adding | 🟠 |
| **IMG18** | Orphaned uploads on abandonment | A photo uploaded during a submit that then fails leaves bytes in the bucket with no row pointing at them. Bounded and low-harm, but it should be a known cost rather than a surprise | 🟡 |

### 7.3 The recommendation: split it

The two halves are not the same size, and bundling them makes the cheap one
wait for the expensive one.

- **Offering photos need no schema change.** `products.image_url` exists, the
  bucket exists, the compressor exists, the upload route exists. It is client
  plumbing plus one validated field on an endpoint this branch already added.
- **Deal photos are a migration + an RPC change + two card surfaces**, for a
  step that is optional and that a first-time owner will mostly skip. And the
  RPC in question is the one behind the Deals feed.

So: ship offering photos first, on this branch. Take the deal photo as its own
change with its own approval, or drop it — a deal already renders with the
shop's own logo and interior photo (F3), which is not nothing.

### 7.4 Action items

#### Phase 5 — photos on offerings (no schema change)
- [ ] **IMG2** — add a client-side `uid` per offering row; strip before the API call
- [ ] **IMG5** — mount `ImageUploadField` in the draft row; no bespoke picker
- [ ] **IMG1/IMG3** — cache each photo under `offering_image:<uid>`; delete on remove
- [ ] **IMG4** — budget check across offering keys; degrade to uncached with a message, never block
- [ ] **IMG6/IMG7** — upload after `registerBusiness()`, one request per file, keyed in `uploadedRef`
- [ ] **IMG8** — a failed upload writes the offering without a photo and reports it
- [ ] **IMG9/IMG10** — offerings route accepts `image_url`, validated as a bucket-relative path under the verified business id
- [ ] **IMG11/IMG12** — re-measure at 320/768/1440 and re-check the dead band
- [ ] **IMG13** — leave the public step copy alone
- [ ] Tests: uid keying survives a removal, remove deletes the blob, replay uploads once, a failed upload still writes the item, a foreign/absolute `image_url` is rejected

#### Phase 6 — photos on the deal (needs approval)
- [ ] **IMG14** — migration: `coupons.image_url text` nullable, no backfill
- [ ] **IMG15/IMG16** — project it through `mobile_deals`, resolve it in the mobile route, prefer it in the deal cards; re-run the deals SQL suite
- [ ] **IMG17** — add the field to the coupon dialogs so it is editable after registration
- [ ] Same upload/cache/replay rules as phase 5

### 7.5 Open questions

1. **Is the deal photo worth phase 6 at all?** A deal already shows the shop's
   logo and interior photo. The honest alternative is to skip IMG14–IMG16 and
   spend the same effort on IMG17 for products.
2. **Required or optional on offerings?** Optional is assumed. Requiring a photo
   would undo the RM5 abandonment trade-off the one-item minimum was chosen for.
3. **IMG18** — do we want a cleanup path for orphaned uploads, or is the leak
   acceptable at registration volume?
