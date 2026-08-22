# Registration Funnel Recovery — parities + action items

> **Branch:** `feat/registration-funnel-recovery` (cut from `main` @ `9970a48`).
> **Status:** Phase 0 shipped. Phase 3 built (its migration is authored but
> applied NOWHERE — needs approval, then local + cloud). Phase 4 investigated
> and it found the bug in §3. Everything else is blocked on §7.
> **🔴 Read §3 first — a CONFIRMED production bug found while validating this
> plan outranks every optimisation in it: a partial submit publishes a live,
> empty, public shop while telling the owner registration failed.**
>
> **Risk:** MEDIUM overall; Phase 1 and Phase 3 each carry ONE schema migration
> that needs human approval before merge and a separate cloud apply.
> Delete this file and its `CLAUDE.md` note when the work lands.

---

## 1. The evidence

Measured against cloud (`ilokal-database`, project `skvgasimllpyhyudpycu`) on
**2026-08-22**. Re-derive before acting on a stale number — every figure here is
a point-in-time read, not a standing fact.

### The funnel

| Stage | Count |
| --- | --- |
| Live `business_owner` accounts (`archived_at IS NULL`) | **41** (43 incl. archived) |
| Distinct owners with a business row | **21** |
| Live businesses | **21** (23 incl. 2 archived) |
| Businesses with ≥1 product | **13** |
| Businesses with ≥1 coupon | **5** |

**20 owner accounts (49%) never produced a business row at all.** The decay
continues past "success": 10 of 23 shops have zero products, 18 of 23 have zero
coupons. An empty shop on `/explore` draws no traffic, so its owner has no
reason to return — the funnel leaks at both ends.

### What is NOT the problem

**Approval.** All 23 businesses are `status='verified'`, because
`auto_verify_businesses` is `true`. Nobody is waiting on an admin. Any theory
that blames the review queue is wrong.

### Supporting signals

- **Signup spike, week of 2026-08-03:** 32 accounts — 18 completed, 14 did not.
  Consistent with an event or outreach push.
- **13 of 23 businesses were created within 30 minutes of the owner signing up.**
  Assisted / same-session onboarding converts; people who leave mostly do not
  come back. This is the strongest single signal in the dataset and Phase 5
  is built on it.
- **`owner_events` telemetry only starts 2026-08-15** (5 owners), so it cannot
  explain the historical 20. What it does show, by distinct owner:
  `reg_step_viewed` **5 → 4 → 3 → 3 → 2 → 2** across the six steps,
  `reg_submitted` **1**.
- **Step 1 was viewed 23 times by 5 owners** (4.6 each). Owners are
  re-entering the wizard repeatedly and not getting through.
- **`reg_step_error` has 0 rows and structurally always will** — see parity P4.

---

## 2. Parities — current vs target

The defect column is what an owner or an admin actually experiences today.

| # | Area | Current | Target | Risk |
| --- | --- | --- | --- | --- |
| **P1** | Draft persistence | No server state until the final Submit. `createBusinessDraft` runs at the END of the wizard; everything before it lives in `localStorage` + IndexedDB in ONE browser. Abandoners are invisible except by absence; clearing cache or switching phones restarts from step 1. | A real draft row exists from step 2 completion. Resumable on any device, visible to admin, addressable by email. | HIGH (schema + status semantics) |
| **P2** | Gallery weight | 6 images before the owner has received anything: `shop_logo` + `shop_banner` + `interior_images` **min 4**, each ≤ 2 MB, typically phone + mobile data, at step 3 of 6. | One photo to pass; the rest moved to the dashboard setup checklist that already exists. | LOW |
| **P3** | Location gate | `geometry: z.string().min(1)` is REQUIRED to leave step 2 (`lat`/`lng` are optional; `geometry` is not). The map is react-leaflet behind a client-only dynamic import — if it fails to load, is ad-blocked, or geolocation is denied and the owner cannot find their spot, the step is a permanent dead end. | Pin optional, or a non-map fallback ("use my barangay centre") so the step can NEVER dead-end. | MEDIUM (feeds `/explore/nearby`) |
| **P4** | Stall visibility | `register-nav.tsx:73` — `disabled={!canProceed \|\| isSubmitting}`. Two costs. **UX:** a dead grey button and no statement of what is missing; RHF only surfaces errors on TOUCHED fields, so an untouched required field is invisible. **Measurement:** `nextStep()` can never run while invalid, so the `reg_step_error` event at `registration-form-provider.tsx:283` — built precisely to name the stalling field — is UNREACHABLE. 0 rows, permanently. | Next always clickable. Invalid → reveal every missing field with a plain summary AND fire `reg_step_error`. | LOW |
| **P5** | Step order | The two steps that give the owner something visible (`offerings`, `deal`) are LAST. All cost up front, payoff at the end; an abandon at step 3 leaves nothing listable. | Content-producing steps early, so an abandon still leaves a listable shop. | MEDIUM (cache-shape change) |
| **P6** | Schema consistency | `shop_logo` / `shop_banner` are `.optional()`, so `undefined` passes the STEP schema — but `interior_images` defaults to `[]` (not `undefined`), so its `length >= 4` refine DOES run. Net effect: an owner can advance past Gallery with no logo but cannot SUBMIT without one (`handleSubmitForm` guards the full set). **Investigated 2026-08-22 and deliberately left alone** — it is inconsistent but the lenient direction is the better UX (advance now, come back), and "fixing" it to block the step would make the heaviest step heavier. Documented rather than changed. | Documented. | LOW |
| **P7** | Admin recovery | `menu-follow-up` can nudge an owner whose shop has no menu. There is NO surface for an owner who never finished registering — the 20 are unreachable through the product. | Same page, second tab: incomplete registrations, same send-one / send-all affordances. | MEDIUM (schema + outbound email) |
| **P8** | Partial submit ships a live empty shop | **CONFIRMED BUG — see §3.** `performSubmission` creates the business row FIRST, then `await`s each file upload with no per-upload catch. Any interior-image failure throws and aborts BEFORE products are written. The row is already `verified` (auto-verify), so the owner gets "Failed to submit application" while their shop is LIVE, PUBLIC, gallery-less and empty. | Registration is atomic from the owner's point of view: either nothing is public, or what is public is complete. | 🔴 HIGH |
| **P8b** | Post-registration completion (historical) | 10 of 23 shops have zero products. The 08-03 cohort predates the Offerings step, but **08-10 and 08-17 each have 1 of 2 businesses with zero products**, and the Offerings step requires ≥ 1 item — so either those rows are admin-created, or the offerings→products write is failing silently. UNVERIFIED. | Verified either way, with a regression test pinning the write. | HIGH if it is a real bug |

---

## 3. 🔴 CONFIRMED BUG — partial submit publishes an empty shop

**This outranks the rest of the plan.** Found while verifying P8; it is not a
funnel-optimisation question but a correctness and data-integrity one.

### The evidence

The 2026-08-18 shop, from `owner_events` + `businesses`:

| Signal | Value | Reading |
| --- | --- | --- |
| `reg_step_completed` | **6** | walked the ENTIRE wizard |
| `reg_submitted` | **0** | the submission never finished |
| `logo_url` / `banner_url` | present | the first two uploads landed |
| `interior_images` | **0** | the gallery uploads did not |
| `products` | **0** | Phase 3 was never reached |
| `status` / `archived_at` | `verified` / null | **live and public right now** |

The 2026-08-11 row is the same shape (archived since). Two owners hold a
duplicate business row with one archived each — consistent with an owner
re-registering after being told it failed.

### The mechanism

`shop-registration-content.tsx` → `performSubmission`:

1. **Phase 1** `registerBusiness()` — creates the row. `set_business_initial_status()`
   plus `auto_verify_businesses: true` make it `verified`, i.e. **public
   immediately**.
2. **Phase 2** logo → banner → docs → interiors, each `await upload.run()` in a
   bare `for` loop with **no per-upload try/catch**. One throw aborts everything
   after it.
3. **Phase 3** offerings → `products`. Never reached if step 2 threw.
4. **Phase 4** the deal. Same.

So the owner sees `Failed to submit application. Please try again.` while a
verified, empty, gallery-less shop is already on `/explore`.

### Why the existing resume does not save them

`uploadedRef` (which uploads already landed) is a **React ref** — it dies on
reload. `localStorage` keeps only the business ID. So an in-session retry
resumes correctly, but a retry after a refresh re-uploads the logo and banner
(orphaning copies in the bucket) and re-appends interiors server-side.

### ✅ FIXED 2026-08-22 with (a) + (b). (c) still open.

`performSubmission` now writes the CATALOGUE before any display file, and every
display-file upload is individually non-fatal and REPORTED. The owner gets
"Your shop is registered, but we couldn't upload your banner image" — naming the
files — instead of "Failed to submit application", and `reg_submitted` fires
with an `upload_failures` array. A failed catalogue or deal write is still
fatal, because without those there is no shop to report.

Upload progress now also survives a reload (`ilokal-registration-uploaded`,
cleared with the business id), so a retry on a fresh page no longer re-uploads
the logo (orphaning a bucket copy) or re-appends the interior photos (the server
appends rather than replaces, which duplicated gallery images).

**(c) — "do not publish until complete" — was deliberately NOT done.** It needs a
BEFORE INSERT trigger change affecting every business insert, and this branch
cannot verify it: the migration would be unapplied and the local DB is 44
migrations behind. Shipping an unverifiable HIGH-risk trigger change to look
complete is how a fix becomes an incident. (a)+(b) already remove the harm; (c)
is defence-in-depth and should land on its own branch, against a migrated local
DB. The decision it needs is small, and it is already made in §7 Q1: **drafts
stay `pending`** — public reads all filter `status='verified'`, so `pending`
needs no new status value and no feed audit.

### Fix options as originally framed — kept for the record

- **(a) Reorder: write products + deal BEFORE the image uploads.** Smallest
  change; the shop then has its catalogue even if photos fail. Aligns with the
  Phase 5 reorder rationale.
- **(b) Make interior uploads non-fatal**, like the offering photos already are
  ("the item is the required thing and the picture is decoration" — the
  precedent is in the same function). Tension: the schema currently demands 4,
  which Phase 2.1 proposes cutting to 1 anyway.
- **(c) Do not publish until complete** — the row starts unpublished and is
  flipped only after Phase 4 succeeds. Strictly the most correct, and it is the
  same status machinery Phase 1.3 needs, so the two should be decided together.
- **Regardless:** persist the upload progress somewhere that survives a reload,
  and reconcile the 1 live empty shop + the duplicate rows.

**Recommended: (a) + (c) together** — (a) is cheap and immediately reduces the
damage, (c) removes the class. (b) only if Phase 2.1 lands first.

## 4. Phased action items

Phases are ordered by information-per-unit-risk, not by size. Phase 0 ships
alone and first: it costs almost nothing and it is what tells us whether the
Phase 2 guesses are right. **Do not reorder 0 before 2** — cutting the gates
before the instrumentation lands destroys the baseline we would measure against.

### Phase 0 — make the funnel observable (LOW risk, no schema) ✅ DONE

The highest information-per-line change in the plan.

- [x] **0.1** `register-nav.tsx` — drop `!canProceed` from the Next button's
  `disabled` (keep `isSubmitting`). Wire the invalid path to
  `form.trigger()` + `setFocus` on the first error.
- [x] **0.2** Render a step-level error summary listing every missing field by
  its human label, not the field path. This is what replaces the dead grey
  button as the "why can't I continue" answer.
- [x] **0.3** Confirm `reg_step_error` now fires with `fields:
  Object.keys(form.formState.errors)` (already written at
  `registration-form-provider.tsx:283` — it just needs to become reachable).
- [x] **0.4** Keep `canProceed` for the *visual* affordance if wanted
  (de-emphasised style), but it must not block the click.

**Acceptance:** on a fresh wizard, clicking Next on an empty step 2 produces
(a) a visible list of missing fields, (b) focus in the first one, (c) exactly
one `owner_events` row with `event='reg_step_error'` naming those fields.
**Rollback:** revert one file.

### Phase 1 — server-side draft (HIGH risk, ONE migration)

The structural fix. Converts an invisible abandoner into a contactable one.

- [ ] **1.1** Create the business row on **step 2 completion** (category + name
  + description + location), not at final Submit.
- [ ] **1.2** PATCH the draft as each later step completes, so the flow is
  crash-safe and device-independent.
- [ ] **1.3** 🔴 **The draft must not go live.** `set_business_initial_status()`
  (BEFORE INSERT, migration `20260723000000`) forces status from
  `auto_verify_businesses`, which is **`true` on cloud** — so a naive draft
  insert would publish a half-built shop to `/explore` immediately. Needs a
  status the public feed excludes, and every public read filtered on it.
  **This is the approval-gated decision in this phase.**
- [ ] **1.4** Resume path: on wizard mount, adopt the owner's existing draft
  instead of trusting `localStorage`. Reconcile with the existing
  `ilokal-registration-business-id` cache rather than adding a second source
  of truth.
- [ ] **1.5** Audit every public/browse read (`/explore`, nearby, deals,
  business-types filter, `mobile_deals`) for the new status.

**Acceptance:** abandon at step 3 on device A, sign in on device B, land back
on step 3 with data intact; the draft appears in NO public surface; a SQL
red-team insert cannot publish a draft.
**Rollback:** revert code + `DROP` the status addition; existing rows unaffected
if the value is additive.

### Phase 2 — lower the gate (LOW–MEDIUM risk, no schema)

Only after Phase 0 has produced a week of `reg_step_error` data — that data may
reprioritise this whole phase.

- [ ] **2.1** `interior_images` minimum **4 → 1**. Move "add 3 more photos" to
  the dashboard setup checklist.
- [ ] **2.2** Resolve P6: state logo/banner requiredness explicitly and make
  the schema agree with the UI.
- [ ] **2.3** Make the map pin optional, OR add a "use my barangay centre"
  fallback that writes `geometry` without the map. Decide from the Phase 0
  data whether `geometry` is genuinely the top stall field before touching it.
- [ ] **2.4** If the pin stays required for `/explore/nearby`, the fallback is
  mandatory — a step that can dead-end is not acceptable either way.

**Acceptance:** a step-2 and step-3 pass is possible with no map interaction and
one photo; `/explore/nearby` still returns the shop.
**Rollback:** revert; the schema is code-only.

### Phase 3 — admin nudge for incomplete registrations (MEDIUM risk, ONE migration) ✅ BUILT, MIGRATION UNAPPLIED

Page decision in §4. Reuses the `menu-follow-up` stack end to end.

- [x] **3.1** Migration: `profiles.registration_reminder_sent_at timestamptz`,
  mirroring `businesses.menu_reminder_sent_at` (`20260806090000_menu_followup.sql`).
  **On `profiles`, deliberately not on `businesses`** — the whole point is
  owners with NO business row, so this phase must not depend on Phase 1
  landing first.
- [x] **3.2** Migration: three SECURITY DEFINER RPCs mirroring the menu set —
  page / uncapped count / id list — for `business_owner` profiles with no live
  business. `SET search_path = public, pg_temp`, `REVOKE FROM PUBLIC, anon,
  authenticated`, `GRANT EXECUTE TO service_role` only.
- [x] **3.3** `lib/api/admin/registrationFollowUpQuery.ts` — same contract as
  `menuFollowUpQuery.ts`: verify admin BEFORE the service-role client, never
  throw, report `failed: true` so the UI can tell an outage from an empty list.
- [x] **3.4** `app/api/emails/templates/registrationFollowUp.ts` +
  `sendRegistrationFollowUp.ts`, alongside the menu pair. Pure, inline-styled,
  HTML-escaped, `{subject, html, text}`; never throws.
- [x] **3.5** The email's CTA is a **resume deep link**. Without Phase 1 it can
  only land on `/business/registration` (their `localStorage` may still hold
  progress on that device); WITH Phase 1 it resumes the real draft. Ship the
  plain link first; upgrade the copy when Phase 1 lands.
- [x] **3.6** Actions in `menuFollowUpActions.ts`' shape —
  send-one / send-batch / send-all, admin-guarded, stamping
  `registration_reminder_sent_at`.
- [x] **3.7** ⚠️ Every new action's catch block calls `logActionError`. The
  existing `menuFollowUpActions.ts` logs at `:102`, `:141`, `:166` WITHOUT
  capturing — do not copy that half of the pattern (see §6).

**Acceptance:** admin sees the 20; send-one and send-all deliver; a second send
is visibly deduped by the timestamp; a non-admin gets nothing from the RPCs;
Resend failure surfaces as `failed`, not a crash.
**Rollback:** revert code; `DROP COLUMN` + `DROP FUNCTION`. No data loss —
the column is additive and advisory.

### Phase 4 — the partial-submit bug (HIGH, was "verify P8")

- [x] **4.1** Determine whether the zero-product businesses were admin-created
  or came through the wizard. **Answered: the wizard.** See §3.
- [x] **4.2** Identify the mechanism. **Answered:** uploads abort before the
  products write, on an already-published row.
- [x] **4.3** Apply the chosen fix from §3 — **(a) + (b) done**; (c) deferred to
  its own branch with the reason recorded in §3.
- [x] **4.4** Persist upload progress across a reload, so a retry neither
  orphans bucket copies nor re-appends interiors.
- [x] **4.5** Integration test — `__tests__/submit-resilience.test.tsx` (12):
  ordering, one-upload-throws, keeps-going, success-with-caveat copy,
  `reg_submitted` naming the failures, catalogue-failure still fatal,
  persistence across an interruption, corrupt-cache tolerance.
- [x] **4.6** Reconcile the existing rows. **Investigated 2026-08-22: no data
  write is needed.**
  - **The duplicates are already reconciled.** Both owners hold one archived row
    and one live row that has its catalogue (10 and 69 products). Whoever
    cleaned them up got it right; nothing to undo.
  - **One live empty shop remains** — `4bad96ce`, verified, 0 products, 0 gallery,
    created 2026-08-18. It needs no migration or manual UPDATE, because it
    already qualifies for the **Missing menu** tab (verified, non-archived, no
    active product), so an admin can nudge that owner from the surface built in
    Phase 3. That is a better outcome than archiving a real business behind its
    owner's back.
  - ⚠️ One gap the fix does NOT close for THAT owner: their business row exists,
    but if their browser no longer holds `ilokal-registration-business-id` a
    fresh registration attempt would create a SECOND row rather than resume the
    first. Adopting an existing incomplete draft server-side is Phase 1.4 — the
    same work, from the other direction.
- [ ] **4.7** (c) on its own branch, against a migrated local DB.

### Phase 5 — reorder, and the assisted path (MEDIUM risk)

- [ ] **5.1** P5 reorder: category → shop info → offerings → gallery → deal →
  review. ⚠️ Touches `stepMeta.ts`, `getStepFieldGroups()`, the cached step
  index and `fileCache` keys — a cached step from the old order must not
  overshoot or restore into the wrong step. `fileCacheMigration.contract.test.ts`
  exists for exactly this class of change; extend it.
- [ ] **5.2** 13-of-23-within-30-minutes says assisted onboarding converts and
  self-serve does not. Consider making that explicit — a staff-completes-on-
  behalf path, or a "we'll call you" option — rather than only optimising
  self-serve. **Product decision, not a code task.**
- [ ] **5.3** Chase the empty shops specifically: live, invisible, no traffic,
  no reason to return.

### Phase 6 — non-code, available immediately

- [ ] **6.1** **Phone the 20 now.** You have their emails and it is a
  hand-workable list. You will NOT know where they stopped — that is what
  Phase 0 and Phase 1 buy for the next 20.

---

## 4.5 What shipped, and what it cost

**Phase 0** (`register-nav.tsx`, `registration-form-provider.tsx`, new
`validator/stepIssues.ts`, +17 tests). One finding worth carrying forward: the
`reg_step_error` payload would have been EMPTY even after the event became
reachable. RHF wraps `formState` in a Proxy that is only fresh during render,
so `form.formState.errors` read inside the async `nextStep` callback comes back
`{}`. Reporting now runs in an effect keyed on a `stallAttempt` counter, reading
a render-derived ref. **Any future code that needs the error list outside render
has the same trap.**

**Phase 3** — migration `20260822000000_registration_followup.sql` (marker on
`profiles` + three RPCs), `lib/api/admin/registrationFollowUpQuery.ts`,
`templates/registrationFollowUp.ts`, `sendRegistrationFollowUp.ts`,
`registrationFollowUpActions.ts`, four components + the tab shell, +33 tests.

Two things it changed beyond its own scope, both deliberate:

- **Extracted `app/api/emails/templates/shell.ts`.** The registration email
  would have been the THIRD copy of the ~130-line table-based email markup, and
  a mail shell drifts invisibly — you find out when someone opens the odd one
  out in Outlook. `menuFollowUp.ts` now renders through it (its 7 tests pass
  unchanged, so the output is byte-compatible). `resetPassword.ts` deliberately
  keeps its own markup: it carries security-specific furniture and it is the one
  email whose delivery is load-bearing for account recovery.
- **New `TabbedTablePageSkeleton`.** The existing `TabsPageSkeleton` puts a FORM
  card under its tabs, which is the same skeleton/content mismatch the
  2026-07-24 pass had to go back and fix on three routes.

The cohort SQL was dry-run read-only against cloud before the migration was
written: it returns exactly **20** rows, matching the funnel number, of which 3
have telemetry.

## 5. Where the admin nudge lives — no new page

**Decision: extend `/admin/[adminId]/menu-follow-up` into a two-tab surface.
Do not add a twelfth admin page.**

There are already 11 admin pages and the sidebar is the crowded surface. The
existing page is the same job on a different cohort — "owners who need a
push" — with the same affordances (search, filter, paginate, send-one,
send-all) and the same stats strip.

Proposed shape:

- Route stays `menu-follow-up` (no redirect debt, no sidebar churn).
- Sidebar label **"Menu Follow-up" → "Owner Follow-up"**, icon `MailWarning`
  kept (`sidebarConfig.ts:50`). Update its test.
- `TabsPageSkeleton` already exists for the loading state (added in the
  2026-07-24 skeleton work) — the tabbed shape is already served.
- Two tabs, each keeping its own `searchParams` namespace so the two
  paginations cannot collide:
  - **Incomplete registration** (new) — `business_owner`, no live business.
    Columns: owner, email, signed up, last step seen (from `owner_events`
    once Phase 0 makes that meaningful), reminder sent.
  - **Missing menu** (existing, unchanged) — verified shops with no live
    offering.
- Stats strip gains the registration counts beside the menu ones, so the whole
  owner-activation picture reads in one glance.

**Reuse ledger** — everything below is precedent to follow, not to duplicate:

| Need | Existing thing to mirror |
| --- | --- |
| Page shell + searchParams parsing | `menu-follow-up/page.tsx` |
| Admin-guarded service-role read | `lib/api/admin/menuFollowUpQuery.ts` |
| Reminder tracking column | `businesses.menu_reminder_sent_at` (`20260806090000_menu_followup.sql`) |
| Page / count / ids RPC trio | `admin_businesses_missing_menu` + siblings |
| Email template | `app/api/emails/templates/menuFollowUp.ts` |
| Sender | `app/api/emails/sendMenuFollowUp.ts` |
| Send one / batch / all actions | `menuFollowUpActions.ts:197,268,295` |
| Buttons | `send-reminder-button.tsx`, `send-all-button.tsx` |
| Stats | `menu-follow-up-stats.tsx` |

Per the DRY rule in `CLAUDE.md`: where the two cohorts need the same component,
**widen the existing one and keep one caller-visible name** — do not fork a
near-duplicate `registration-*` twin of each file.

---

## 6. Testing plan

- **Phase 0:** happy-dom wizard test — Next clickable on an invalid step,
  summary lists the missing labels, `logOwnerEvent` called once with
  `reg_step_error` and the right `fields`. Repo convention: `react-dom/client`
  + happy-dom, no `@testing-library`.
- **Phase 1:** draft created at step 2 completion; resume adopts the server
  draft over a stale `localStorage` id; SQL red-team proving a draft cannot
  reach `verified` via a client-passed status; every public read filtered.
- **Phase 2:** schema unit tests for the new minimums; a step-3 pass with one
  photo; nearby still returns a pin-less shop.
- **Phase 3:** query returns only no-business owners; non-admin gets null;
  `failed: true` on RPC error; template escaping + `{subject, html, text}`;
  action stamps the timestamp and dedupes; send-all acts on the whole filtered
  set, not one page.
- **Phase 4:** N offerings in → N products out.
- **Phase 5:** extend `fileCacheMigration.contract.test.ts` for the reorder.
- **Every phase:** `yarn lint --fix && yarn test:run && yarn build`.

---

## 7. Open questions — need a human decision

1. **P1/1.3 — what status does a draft carry, and does the public feed exclude
   it?** Blocks Phase 1. Interacts with `set_business_initial_status()` and the
   live `auto_verify_businesses: true`.
2. **P3/2.3 — the map pin.** Investigated 2026-08-22: **the fallback as framed is
   not implementable on the frozen stack.** `lib/ph-locations.ts` carries names
   only — no coordinates — so a "use my barangay centre" button has nothing to
   derive a point from. Doing it needs either a coordinate dataset or a
   geocoding service, both of which are new dependencies requiring approval.
   Deliberately did NOT ship a half-measure (a manual lat/lng field is a
   fallback a small shop owner will not use). Phase 0 has at least made the
   stall visible — "Set your location coordinates to continue" now appears in
   the step summary instead of a silent grey button. **Decide: approve a
   dataset/service, or accept the pin as a hard requirement.**
3. **P2/2.1 — is 1 interior photo acceptable to the brand/product bar,** given
   these shops render on `/explore` cards? The only remaining pure PRODUCT call.
   Held deliberately: Phase 0 shipped 2026-08-22, so a week of real
   `reg_step_error` rows will say whether the gallery is actually where owners
   stall. Cutting the gate now would destroy the baseline the decision should be
   made against — and it is no longer urgent, because a failed gallery upload no
   longer costs the whole registration.
4. **Phase 3 — who owns the outbound copy and the send cadence?** Also: is a
   Resend sending domain verified for this template? A missing
   `RESEND_API_KEY`/`EMAIL_FROM` silently falls back to logging the link.
5. ~~**P8 — were the zero-product shops admin-created?**~~ **ANSWERED: no.** All
   10 have a branch and a logo, so they came through the wizard. Eight predate
   the Offerings step (shipped 2026-08-07); the 08-11 and 08-18 rows are the
   confirmed bug in §3.
6. **Phase 5.2 — is an assisted-onboarding path in scope at all?** The data
   argues for it more strongly than for any self-serve tweak.
7. 🔴 **§3 — which fix, (a), (b) or (c)?** And: should the 1 live empty shop be
   archived or completed by hand, and the 2 duplicate rows reconciled?
   Blocking, and it should be decided together with Q1 — (c) and Phase 1.3 are
   the same status machinery.

## 8. Known adjacent defect (found while investigating, not in scope)

`menuFollowUpActions.ts:102,141,166` log failures with `formatErrorForLog` but
never call `logActionError`, so `LOOKUP_FAILED` / `CLAIM_FAILED` / restore
failures reach the console and never reach Sentry. Same shape at
`businessReviewActions.ts:190` and `business/[businessId]/actions/mfaActions.ts:125,141`
(the latter also logs only `error?.message`, dropping the stack). Phase 3 must
not copy that pattern; fixing the existing six sites is a separate small PR.
