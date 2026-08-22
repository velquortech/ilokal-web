# Changelog

## 2026-08-22 — Fix: the step summary went stale, insisting a filled-in field was still empty (feat/registration-funnel-recovery)

> One line in the registration provider. A **self-inflicted regression from the
> Phase 0 work earlier the same day**, reported from a browser with the fields
> visibly filled and the summary still demanding them.

- **Symptom.** Owner presses Next on Shop Information, gets "2 things still need
  your attention — Shop name is required / Description is required", types both,
  and the complaint stays on screen unchanged. Worse than the dead grey Next it
  replaced: that said nothing, this asserted their correct input was wrong.
- **Cause.** `stepIssues` was `useMemo`'d on `form.formState.errors`.
  **React Hook Form MUTATES its error object in place**, so the reference can
  survive a change — the memo never recomputed and the list froze at whatever
  was wrong the moment Next was pressed. Now recomputed every render; it walks
  one step's field group, a handful of keys.
- **The form was never the problem.** The values were in RHF the whole time —
  the "15 / 500" counter reads `form.watch('description')` — which is what ruled
  out the field wiring and pointed at the memo.
- **Why the existing tests missed it:** the Phase 0 suite asserted the summary
  cleared only AFTER a second Next press, which recomputes for other reasons.
  Nothing covered the live case, which is the only one an owner experiences.
- **Tests (+2), and they were verified to actually catch it:** with the `useMemo`
  restored both fail; without it both pass. One asserts a single issue disappears
  as soon as its field is filled **while the others remain listed**, so the owner
  still knows what is left; the other asserts the whole summary unmounts once
  nothing is outstanding — neither pressing Next again.
- Verified: `yarn lint` + `yarn build` green, **3362** tests pass — including the
  three `business_products.integration.test.ts` local-DB cases that had been
  failing all session, so the local database has since been migrated.

## 2026-08-22 — Fix: a partial registration no longer publishes a live, empty shop (feat/registration-funnel-recovery)

> No schema, API or auth change — one component. **This is a production bug fix,
> not an optimisation**; it outranks the rest of the funnel work it was found
> during. Full evidence in `.claude/REGISTRATION_FUNNEL.md` §3.

- **What was happening.** `performSubmission` created the business row FIRST,
  then `await`ed every file in a bare loop with no per-upload catch. One
  interior-image failure threw, aborted before the catalogue was written, and
  left the owner reading **"Failed to submit application"** while their shop was
  already `verified` and public with **no products and no photos**. Confirmed on
  production: the 2026-08-18 shop recorded `reg_step_completed` ×6 (the owner
  walked the entire wizard), `reg_submitted` **0**, and it is live and empty
  right now. Two owners hold duplicate business rows, consistent with
  re-registering after being told it failed.
- **The catalogue is now written BEFORE any display file.** Products are what
  make a shop page worth opening; photos are decoration. It only ever sat behind
  the uploads because it needs a business id — not because it needs a photo.
- **Display-file uploads are individually NON-FATAL and reported.** The
  precedent was already in the same function for offering photos ("the item is
  the required thing and the picture is decoration"). The owner attached the
  files; failing to STORE one is ours to report, not a reason to discard a
  completed registration. Interiors go last, being the four-plus most likely to
  fail. Still fatal: the row, the offerings write, the deal write — without
  those there is no shop to report on.
- **The owner is told the truth.** A new non-destructive alert — "Your shop is
  registered, but we couldn't upload your banner image. You can add it from your
  dashboard at any time" — naming each file. Deliberately separate state from
  `submitError`: telling someone "failed" while their shop is live is the whole
  defect.
- **`reg_submitted` now carries `upload_failures`.** Previously a partial
  submission fired NO completion event at all, so it was indistinguishable from
  an abandonment in the funnel — the reason this went unnoticed.
- **Upload progress survives a reload** (`ilokal-registration-uploaded`, written
  with the same lifecycle as the cached business id and cleared with it).
  `uploadedRef` was a React ref, so a retry on a fresh page re-uploaded the logo
  and banner (orphaning a copy of each in the bucket) and re-appended the
  interior photos — the server appends rather than replaces, so it duplicated
  gallery images. A corrupt cache entry is treated as empty; re-uploading is
  recoverable, a parse error at submit time is not.
- **Tests (+12)** `__tests__/submit-resilience.test.tsx` — real component over
  the real provider, API layer mocked with an ordered call log: catalogue before
  any file, business row first, catalogue still written when the first upload
  throws, remaining uploads continue past a failure, the success-with-caveat copy
  (asserting it does NOT say "Failed to submit"), `reg_submitted` naming the
  failed keys, empty `upload_failures` on a clean run, catalogue failure still
  fatal and firing no `reg_submitted`, persistence across an interruption,
  cleared on success, corrupt-cache tolerance.
  **The suite earned its keep immediately:** the first implementation had a
  self-recursive `markUploaded` (a blanket rename rewrote the `add()` call
  inside the helper into a self-call), which surfaced as
  `RangeError: Maximum call stack size exceeded` rendered to the owner as a
  submission error. Static checks and a type-check both passed it.
- Verified: `yarn lint` + `yarn build` green, **3357** tests pass.
  ⚠️ Same 3 pre-existing `business_products.integration.test.ts` failures —
  local-DB drift from the `main` reset; needs `make migrate-up`.
- **Deliberately NOT done, with reasons recorded in the plan:**
  - **"Do not publish until complete"** (the belt-and-braces version) needs a
    BEFORE INSERT trigger change on every business insert, and this branch cannot
    verify it — the migration would be unapplied and the local DB is 44
    migrations behind. Shipping an unverifiable HIGH-risk trigger change to look
    complete is how a fix becomes an incident. Its own branch, against a
    migrated DB. The design decision it needs is already settled: drafts stay
    `pending`, which every public read already filters out.
  - **Reconciling the existing rows** (1 live empty shop, 2 duplicates) is a
    production data write and needs explicit approval.
  - **The map-pin fallback** turns out not to be implementable on the frozen
    stack: `lib/ph-locations.ts` carries names only, no coordinates, so a "use my
    barangay centre" button has nothing to derive a point from. Needs a
    coordinate dataset or a geocoding service — both new dependencies. No
    half-measure shipped.
  - **Cutting the 4-photo gallery minimum** is the one remaining pure product
    call, and it is deliberately waiting on a week of the `reg_step_error` data
    Phase 0 just switched on. It is also no longer urgent: a failed gallery
    upload no longer costs the whole registration.

## 2026-08-22 — Registration funnel phase 3: admin nudge for the owners who never listed a shop (feat/registration-funnel-recovery)

> **ONE new migration — `20260822000000_registration_followup.sql`. Applied
> NOWHERE (not local, not cloud).** Needs human approval, then `make migrate-up`
> + `make migrate-cloud` + a ledger reconcile. Until then the new admin tab
> renders an outage state, not zeros. Plan: `.claude/REGISTRATION_FUNNEL.md`.

- **The cohort nothing could reach.** 41 live `business_owner` accounts, 21
  businesses: 20 owners (49%) signed up and never listed a shop. Because the
  wizard keeps everything in `localStorage` until the final submit, they leave
  no server-side trace — so there was no list, no progress, and no way to
  follow up. This is the read + send side of that.
- **No twelfth admin page.** `/admin/[adminId]/menu-follow-up` became a
  two-tab **"Owner Follow-up"**: *Incomplete registration* (new, leads — it is
  the earlier and larger leak) and *Missing menu* (unchanged). Same job, same
  affordances, so a separate route would have duplicated the shell and crowded
  the sidebar. Route deliberately did NOT move — a redirect plus a sidebar href
  change would have been churn for a label. The active tab lives in the URL:
  both tables write page/search into the query string, so an uncontrolled
  `Tabs` would have snapped back the moment an admin paged the second tab. The
  registration table's URL keys are PREFIXED (`rSearch`, `rPage`, `rPerPage`)
  so paging one tab can't page the other.
- **Migration** — `profiles.registration_reminder_sent_at` (nullable, no
  backfill: a `DEFAULT now()` would claim everyone had been nudged) plus three
  SECURITY DEFINER RPCs mirroring the menu trio: one page / uncapped stats /
  `uuid[]` for "send to all". Pinned `search_path`, REVOKE'd from
  PUBLIC/anon/authenticated, GRANTed to `service_role` only.
  🔴 **The marker is on `profiles`, not `businesses`** — the whole cohort has no
  business row, and hanging it there would have made this depend on the
  server-side-draft phase landing first. `furthest_step` comes from
  `owner_events` via a LATERAL (one indexed pass per candidate, not an
  aggregate over the whole event table).
  The cohort SQL was **dry-run read-only against cloud before the migration was
  written**: exactly 20 rows, matching the funnel number.
- **`furthest_step` NULL is not step 0.** `owner_events` only began recording
  2026-08-15, so NULL means "we never saw them", and the query maps it through
  as null rather than `Number(null)`. The table renders "Unknown" and the email
  omits the progress line entirely — inventing progress would be a false
  statement to a real person. Out-of-range steps are ignored too, so a stale
  cached step can't render "step 9 of 6".
- **Send path mirrors the menu twin's guarantees**: admin proven before the
  service-role client, send-time RE-VERIFY (an owner who registered since the
  list was rendered is skipped — the list is a hint, not a gate), per-admin rate
  limit (Server-Action POSTs never reach the proxy limiter), an ATOMIC
  conditional-UPDATE claim before sending so two tabs can't both email, and a
  restore of the PRIOR marker when the send fails so a failed email doesn't
  silence an owner for a whole cooldown. Never throws; each target yields an
  outcome so a batch survives one bad row. **Every failure path calls
  `logActionError`** — the menu twin logs three of its failures without
  capturing them, which is a real gap and NOT something to mirror.
- **🔴 Extracted `app/api/emails/templates/shell.ts`.** The new email would have
  been the third copy of the ~130-line table-based, mso-conditional email
  markup, and a mail shell drifts invisibly — you find out when someone opens
  the odd one out in Outlook. `menuFollowUp.ts` now renders through it and its
  7 existing tests pass unchanged, so the output is byte-compatible. The shell
  documents an explicit escaping contract: `*Html` fields are trusted
  pre-escaped fragments, everything else is escaped by the shell.
  `resetPassword.ts` is deliberately NOT migrated — security-specific furniture,
  and it is the one email whose delivery is load-bearing for account recovery.
- **New `TabbedTablePageSkeleton`** (header + tab strip + stat cards + table).
  The existing `TabsPageSkeleton` puts a FORM card under its tabs, which is the
  same skeleton/content mismatch the 2026-07-24 pass had to go back and fix on
  three routes.
- **The email is honest about what it can promise.** The CTA is the wizard's
  entry point, NOT a resume deep link — there is no server-side draft to resume
  (that is Phase 1). So it says "pick up where you left off" only when a real
  step was recorded, because on the owner's original device the cache genuinely
  does restore.
- **Tests (+33):** query (10 — admin gate, page/stats split, blank search,
  NULL-step passthrough, `failed` on either RPC erroring), actions (23 — the
  full re-check matrix, claim-before-send, restore-to-prior and restore-to-null,
  advisory step lookup failing without blocking the send, batch dedupe,
  send-to-all deriving ids server-side) and the template (11 — subject/heading
  variants, singular "1 step", no step line when unknown, out-of-range rejected,
  escaping incl. the ampersand-first ordering).
- Verified: `yarn lint` + `yarn build` green, **3345** tests pass (3301 → 3345).
  ⚠️ The same 3 `business_products.integration.test.ts` failures persist —
  local-DB drift from the `main` reset, unrelated; needs `make migrate-up`.
- **Cannot be exercised end-to-end yet:** the migration is unapplied, so the tab
  currently shows its outage state. Also unverified — whether a Resend sending
  domain is configured for this template; a missing `RESEND_API_KEY`/`EMAIL_FROM`
  silently falls back to logging, which in production logs an error and sends
  nothing.

## 2026-08-22 — Registration funnel phase 0: the stall is finally visible (feat/registration-funnel-recovery)

> No schema, API or auth change — two component files plus a pure helper.
> Plan, parities and the remaining phases: `.claude/REGISTRATION_FUNNEL.md`.

- **The measured problem.** 41 live `business_owner` accounts, 21 businesses —
  **49% of owners never produce a business row**. The decay continues past
  "success": 10 of 23 shops have zero products, 18 of 23 zero coupons. Approval
  is NOT the bottleneck (all 23 are `verified`; `auto_verify_businesses` is on).
- **Fixed: Next was disabled instead of clickable-with-errors.**
  `register-nav.tsx` gated the button on `!canProceed`. RHF only surfaces an
  error once its field is TOUCHED, so an owner who never focused a required
  field saw a dead grey button and no statement of what was missing. Next is now
  always clickable (still `disabled` while submitting); `canProceed` survives
  as a `variant` hint rather than a block. The final step's Submit was ungated
  too — its `handleInvalidSubmit` already raises a step-naming alert, so the
  click now reveals the reason instead of swallowing it.
- **New `validator/stepIssues.ts`** — pure `collectStepIssues(errors, fields)`
  walking RHF's recursive error tree into `{path, message}` leaves, scoped to
  the current step's field group so a later step's error can't present as a
  phantom blocker. Built from the ZOD MESSAGES, not a field→label map: those
  strings are already written for owners and live next to the rule they
  describe, so there is no second copy to drift. Never walks `ref` (it holds a
  DOM node), collapses RHF's field-array `root` container out of the path so
  `setFocus` gets something real, and dedupes `path+message`.
- **The summary renders in the sticky nav, directly above the button pressed** —
  `role="alert"`, count-aware title, one line per issue — and the first
  offending field is `setFocus`ed, because on the tall steps the blocker is
  often scrolled out of view and a summary alone still reads as "nothing
  happened".
- **`reg_step_error` fires for the first time.** It was written at
  `registration-form-provider.tsx:283` but sat behind `nextStep()`, which the
  disabled button made unreachable — 0 rows, permanently, for the one event
  built to name the stalling field. It now carries `paths` (exact leaves)
  alongside the original `fields`.
- **🔴 Found while testing: the original payload would have been empty anyway.**
  RHF wraps `formState` in a Proxy whose values are only fresh in RENDER; read
  from inside the async `nextStep` callback, `form.formState.errors` comes back
  EMPTY even though validation has already failed. The first version of this
  work reproduced that faithfully (rendered summary correct, logged `paths`
  `[]`) and a test caught it. Reporting now runs in an effect keyed on a
  `stallAttempt` counter, reading a render-derived ref — so the payload always
  matches what the owner is looking at. Had this shipped inline, the event would
  have switched on and still told us nothing.
- **Tests (+17):** `stepIssues` unit suite (11 — nesting, array-root vs
  per-item, group scoping, `root` collapsing, `ref` never walked, dedupe) and
  `step-issues-reveal.test.tsx` (6 — real provider mounted against the real nav,
  because the defect lived in the interaction between them; a test of either
  alone would have passed throughout). Verified: `yarn lint` + `yarn build`
  green, **3301** tests pass.
- ⚠️ **3 pre-existing failures in `business_products.integration.test.ts`** are
  local-DB drift, not this change: the local `business_products` function
  predates `weekly_view_count`. The local stack is behind the 44 migrations that
  arrived with the `main` reset — needs `make migrate-up`.
- **Not done, deliberately:** phases 1–6. Phase 2 (cutting the 4-photo gallery
  minimum, the mandatory map pin) is held until this phase has produced a week
  of real `reg_step_error` data — cutting gates now would destroy the baseline
  the decision should be made against. Phase 1 (server-side draft) and Phase 3
  (admin nudge for the 20) each need one migration and a human decision first;
  see the plan's §6.

## 2026-08-22 — A gallery photo that 400s, and the second Sentry triage pass (fix/broken-shop-images-sentry-triage-2)

> **No schema migration, no RLS change, no auth change.** One API-contract
> change: a malformed `[businessId]` segment answers **404** instead of 500.
> Plan, parity tables and the open questions:
> [`.claude/SENTRY_TRIAGE_2.md`](.claude/SENTRY_TRIAGE_2.md) (local, not
> committed). Round 1 was `.claude/SENTRY_TRIAGE.md` / PR #43.

- **🔴 The reported bug: `encodeURI('%20')` is `'%2520'`.**
  `storage.getPublicUrl()` runs `encodeURI` over the whole url it builds, and
  `%` is not a character `encodeURI` leaves alone. So a stored path that is
  ALREADY percent-encoded is encoded a second time on every read and the url
  400s. Proven against the live bucket rather than reasoned about:
  `…Screenshot%202026-08-08%20095928.webp` → **200**,
  `…Screenshot%25202026-08-08%2520095928.webp` → **400**.
- **The encoded paths got there from our own write path.**
  `extractStoragePath` sliced a public url as a plain string and stored the
  remainder as if it were a path — so `%20` (a space, in a url) was written
  into `interior_images` as three literal characters. Production holds four
  such rows, all on **JV PEST CONTROL SERVICES**: every gallery photo that shop
  uploaded, invisible on the page while sitting intact in the bucket.
- **"Some shops" was not chance.** It is every shop whose uploaded filename
  contained a character `encodeURI` escapes — in practice a space, in practice
  a screenshot or a phone photo with a descriptive name. Every other shop's
  files were seeded or named by the wizard (`logo-<ts>.webp`) and have no such
  character. 18 of 21 businesses store bucket-relative paths, 3 store absolute
  urls; only the encoded ones break.
- **🔴 It is also a DATA-LOSS bug, which is the half that would have been
  missed.** `storagePathsToDelete` decides what to remove by comparing
  normalised paths. A registration-written raw path (space intact) never
  matched the client's encoded form, so the live object was classified as
  removed and `storage.remove()` was called on it — the exact 2026-08-06
  gallery-delete bug, re-opened through a different door for any filename with
  a space. Pinned by a test that feeds it the real production pair.
- **⚠️ Correction to the blast radius, found after this branch was opened.**
  `main` **already carried a read-side decode** in
  `app/api/helpers/storage.ts` — an independent fix with the same diagnosis,
  landed in ONE of the four copies. So the public and mobile surfaces were
  already rendering these photos correctly; the ones still broken were the two
  copies that did NOT decode, in `lib/api/business/business.ts`
  (`getMyBusinesses`, `getBusinessById` → the owner's dashboard, `/shop`, and
  the admin business detail) and `businessQuery.ts` (`getBusinessProfileData` →
  the profile form and the gallery editor). **The owner's own gallery was
  broken while their public page was fine.** The earlier claim here — that all
  four copies lacked it — was read off the wrong branch, and it is corrected
  rather than quietly dropped because it is the sharpest possible argument for
  the consolidation below: the bug was fixed for strangers and left live for
  the person paying us.
- **Fixed in three places, because one is not enough.** The **read** path
  normalises before building a url, which is what makes the existing rows
  render **with no database write** — now in one place instead of one-of-four.
  The **write** path decodes once, so nothing new is stored encoded; `main`'s
  read-side decode did nothing about that, so the column kept accumulating
  encoded values. The **upload** path (`safeObjectName`) slugifies the object
  key, so nothing new needs either. **And the delete diff is untouched by any
  read-side fix** — `storagePathsToDelete` compares stored values, so the
  data-loss path below was live on `main` regardless.
- **The decode is deliberately one-shot, and the reasoning is in the code.** An
  object whose name genuinely contains the four characters `%20` is
  indistinguishable from an encoded space — and this app's upload path can no
  longer produce one. Between "render the owner's photo" and "honour a filename
  nothing here can create", the photo wins.
- **`resolveStorageUrl` existed in FOUR hand-copied versions** — the API
  helper, two closures in `lib/api/business/business.ts`, one in
  `businessQuery.ts` — and this branch caught the fourth copy being fixed while
  the other three stayed broken, in the wild, on `main`. That is not a
  hypothetical any more. One `publicStorageUrl` now, in `lib/utils/storage.ts`
  because the write side needs the same normalisation (CLAUDE.md §DRY, paid for
  twice on the same bug).
- **`safeObjectName` is the mobile avatar route's own rule, shared.** That
  route already stripped unsafe characters on its own; the other six upload
  routes interpolated the owner's filename verbatim. Now one helper, and a
  traversal-shaped or hidden key is unrepresentable rather than merely unlikely.
- **The 4 encoded rows WERE repaired on production** (approved separately from
  the code change), guarded so an entry was only rewritten when the decoded name
  is an object that actually exists — a value we had not proven would have been
  left alone. Pre-repair values captured first; post-repair audit shows **0**
  encoded values left in `interior_images`. The statement, the audit query and
  the inverse live in `supabase/reports/repair_encoded_storage_paths.sql`.
- **One row still cannot be fixed by code or by decoding.** **Gugma Salon & Spa**
  has a `banner.webp` in `interior_images` whose object lives in `shop-banners`,
  so it 404s however it is spelled. Two valid answers — drop the entry, or copy
  the object across — and neither is ours to pick.
- **`NEXT_IMAGE_PUBLIC_URL` is a live foot-gun and is left alone on purpose.**
  It is read at BUILD time to put the Supabase host in `images.remotePatterns`;
  unset on Vercel, the optimizer answers 400 for every shop image in the app,
  with no exception anywhere for Sentry to catch. It fails open in the worst
  direction. It is also **not** what was reported — if it were, every image
  would be broken rather than four photos on one shop — and a build-time
  assertion changes the failure mode of every production build, so it belongs
  in its own change.

### The Sentry pass

- **17 unresolved issues, and 8 of them were already fixed on `main`.** A
  dashboard whose loudest entry is a fixed bug is a dashboard nobody reads, so
  the triage is as much housekeeping as repair.
- **🔴 Three production releases are commits that do not exist in this
  repository** (`9a15c565`, `7f08416f`, `2244def7`, all tagged
  `vercel-production`). That is why `nearby_businesses_filtered` reported
  PGRST202 "function not found" on 2026-08-14 while the function exists on
  cloud today: production ran app code ahead of the database, from a branch
  whose commits are gone. Until that is settled a stack trace cannot be trusted
  to correspond to any code we can read. Recorded, not fixed — it is a process
  finding.
- **🔴 22P02 — the mobile app is asking for shops by SLUG.**
  `GET /api/mobile/businesses/bida-ngayon/products` (and `/coupons`,
  `/ratings`). Nothing validated the segment, so `bida-ngayon` reached
  PostgREST as a `uuid`, Postgres raised `invalid input syntax`, and the route
  answered **500**. Now `z.guid()` at the top of all 8 `[businessId]` routes →
  404, before any DB call. The third cost is the one that mattered: **a 500 hid
  the finding.** A 404 says out loud that the app has a deep-link shape this API
  does not serve, which is a product question nobody could see through a driver
  error. Asked, not answered.
- **PGRST103 was 197 events on one issue** — a client asking for page 2 of a
  one-page result. `/api/mobile/businesses/nearby` no longer has it (paging
  moved into the RPC), but the same `.range()`-on-a-caller's-page-number shape
  was still in the products route. An out-of-range page is now an empty page.
- **`check_phone_format` is E.164 and the app validated nothing.** The
  constraint is `^\+[1-9]\d{1,14}(\s\d+)?$`; the schema was
  `z.string().optional()`. So an owner typing their number the way every
  Filipino writes it — `09171234567` — got a **500 carrying the constraint text
  back to the browser**: table name, column, and the rule. Blank was the same
  failure, because `''` is not NULL and does not match, making "clear my phone
  number" a 500 too.
- **It normalises rather than rejects, and that is the deliberate half.**
  `09171234567` is what is printed on the shop's own signage; a field that
  refuses it is a field nobody can fill. Spaces/dashes/parens are stripped, a
  leading `0` becomes `+63`, an already-`+` number is left alone so an
  international owner is not misread as Filipino, and blank parses to `null` —
  which is what the column wants. A test asserts the invariant that matters:
  nothing the schema accepts can reach Postgres and violate the CHECK.
- **The driver text no longer reaches the client** — `userService` logged and
  re-threw a generic message. CLAUDE.md §"Error leakage"; the validation is the
  fix, this is the backstop.
- **PGRST303 "JWT issued at future" is dropped, not fixed.** Neither end of
  that comparison is our code: the token is minted by GoTrue and validated by
  Postgres. It fires from `readPublicFlags`, i.e. on every page load by an
  affected visitor. Dropped at the REPORTING layer only — the request still
  fails and the flags still fail **closed**, which is the behaviour deliberately
  chosen when `public_feature_flags()` was introduced.
- **The React streaming-reveal filter matches the FRAME, never the message.**
  `Cannot read properties of null (reading 'parentNode')` from React's `$RS`
  reveal helper, when a translator or an in-app browser removed the placeholder
  comment first — 8 events across three browsers, unactionable. Putting that
  message in `ignoreErrors` would have swallowed a real null-parent bug in our
  own code, so the test asserts a `parentNode` error WITH an application frame
  is still reported.
- **Two test fixtures had to become real uuids.** `biz-00000000-…` was fine
  while nothing validated the segment; the new guard 404s it. Changed only in
  the two files that drive a guarded route — the other twelve `biz-` constants
  never reach one — and both suites gained a test asserting the slug 404s
  without touching the database.
- **Not done, and it is the interesting one: every server issue is still titled
  `<anonymous>`.** Round 1's fingerprint fixed the GROUPING and it works — the
  list has separate issues per context and SQLSTATE. But PostgREST errors are
  plain objects with no stack, Sentry synthesises one at the capture site, and
  the capture site is the dynamic `import()` that keeps `@sentry/nextjs` out of
  an offline suite of 3,287 tests. The fix is a synthetic `Error` carrying the
  SQLSTATE — which re-opens every existing server issue under a new
  fingerprint, so it is scheduled rather than bundled with an image fix.
- **Tests (+77):** the encoding round trip against the exact production values
  (incl. proof that a raw path and its own url are one file, and that a bare
  `%` neither throws nor is rewritten), `safeObjectName` (traversal, hidden
  keys, unicode, the `encodeURI(key) === key` invariant), the phone schema
  (every accepted value satisfies the DB CHECK), the three drop/empty-page
  predicates, and a contract sweep asserting all 8 `[businessId]` routes guard
  **before** their first Supabase call — order being the whole point, since
  validating after the query validates nothing.
- **Six Sentry issues were resolved rather than fixed**, each with its reason on
  the activity feed: NEXTJS-9 (PGRST103), -5 (the view_events FK, PR #43), -2 and
  -3 (the in-app-browser filters), and -B / -C — which were only ever "app
  deployed ahead of the database", verified fixed by reading `pg_proc` and
  `information_schema.columns` on cloud. The 8 this branch fixes are left open
  until it deploys.
- Verified: `yarn lint` clean + **3287** tests + a clean `yarn build` (`.next`
  removed first), plus the 200/400 pair confirmed by hand against the live
  storage host and every claim in the parity table checked against the live
  database rather than against a migration file.
- **Not verified — needs a browser:** the shop gallery itself. These surfaces
  are behind auth and this environment has no login path, so the fix is pinned
  by assertions on the url this code builds, not by watching the photo appear.

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

## 2026-08-06 — Menu follow-up, phase 5: the admin page (feat/menu-followup-email)

> **No schema, API-contract or auth change.** Presentational + one new admin
> route wiring the phase-2 read and the phase-4 actions together. Completes the
> feature (behind the still-unapplied migrations). Plan (MF9, MF12, MF13):
> [`.claude/MENU_FOLLOWUP.md`](.claude/MENU_FOLLOWUP.md).

- **New `/admin/[adminId]/menu-follow-up`** — the surface the whole feature was
  for. Stat cards (shops with no menu / also no live deal / already reminded), a
  table (shop, owner, missing noun, live-deal, registered, last reminded), a
  per-row **Send reminder**, and a header **Send to all (N)** with a confirm
  dialog. Sidebar entry + `loading.tsx` + a route helper
  (`adminMenuFollowUpPath`, now the single source for the segment the actions
  revalidate).
- **The RPC returns the whole filtered set; pagination is sliced on the page**
  (MF9-adjacent), because the list is admin-scale and **"send to all" must act
  on the whole filter, not the visible page** — so the button is handed every
  matching id, not the ten on screen. The 100-cap and its overflow reporting
  live in the action.
- **Outage ≠ empty (MF12).** A failed read renders "we couldn't load this
  list"; a genuinely empty one renders "every verified shop has a menu". The
  stat cards show an em dash on failure rather than three confident zeros.
- **The row and batch buttons report what actually happened, not just
  success.** A send-time re-check or a cooldown means "send" often means
  "skipped" — the row button toasts the reason (added a menu / reminded recently
  / no email), and the batch toasts `N sent · M skipped · K failed`, plus "run
  again" when the cap truncated. Both refresh the page so "last reminded" and
  the stats update.
- **Both buttons latch against a double-click** (a `useRef` before React commits
  `disabled`) and carry `aria-busy`; the confirm dialog can't be dismissed
  mid-send.
- **A "only shops with no live deal" toggle** drives the RPC's `p_only_no_promo`
  through the URL, so the filter is shareable and survives a refresh.
- **Tests (+6):** `adminMenuFollowUpPath` + the sidebar entry (its base href
  matching what the actions revalidate — a rename there is how a nav link and a
  revalidate path silently drift), and a render suite for the row button mapping
  each outcome (sent / skipped-with-reason / failed / unauthorized) to the right
  toast, since the skip-reason copy is real logic. Verified: `yarn lint` +
  **2347** tests + a clean `yarn build`.
- **Not verified — needs a browser:** the page is behind admin auth and this
  environment has no login path, so the table, the confirm dialog and the toasts
  have not been clicked through. And it is **still gated on the two unapplied
  migrations** (phases 2 + 4) and on **MF11** — no `RESEND_API_KEY` means every
  send is sandbox-logged, not delivered, which is the safe default until the
  unsubscribe/CAN-SPAM decision is made.

## 2026-08-06 — Menu follow-up, phase 4: the send actions (feat/menu-followup-email)

> **ONE migration (`20260806093000_menu_followup_target.sql`) — HIGH risk: a
> second SECURITY DEFINER function reading owner email.** Applied + red-teamed on
> LOCAL ONLY. ⚠️ **Needs approval + `make migrate-cloud` + a ledger reconcile.**
> No app-contract change. Plan (MF4, MF8–MF10, MF14):
> [`.claude/MENU_FOLLOWUP.md`](.claude/MENU_FOLLOWUP.md).

- **The send path — admin emails an owner to add their menu.**
  `sendMenuFollowUpAction(id)` (one shop) and `sendMenuFollowUpBatchAction(ids)`
  (a selection / "send to all"). Every export proves the caller is admin,
  validates the id, and rate-limits — Server-Action POSTs never reach the proxy
  limiter, and the batch fans out N emails.
- **🔴 Re-checked at SEND time, not trusted from the list (MF4).** The table the
  admin clicks is a hint; between seeing it and clicking, an owner may add a
  menu. New `admin_business_followup_target(p_business_id)` re-reads ONE shop and
  returns `is_sendable` (verified, non-archived, no live menu) — the same
  "re-verify eligibility, don't trust the source" the coupon redeem route
  applies. A shop that added a menu is skipped `ALREADY_HAS_MENU`, an
  unverified/archived one `NOT_ELIGIBLE`.
- **Idempotent within a cooldown (MF14).** A shop reminded inside the window
  (env `MENU_REMINDER_COOLDOWN_HOURS`, default 14 days) is skipped
  `RECENTLY_SENT`, so a double-click or an over-eager "send to all" can't email
  the same owner twice. The alternative — one-shot, never re-nudge — is the open
  decision; this ships the cooldown.
- **Stamped only AFTER a real send.** `menu_reminder_sent_at` is written on a
  confirmed dispatch; a send that never left (Resend down, sandbox) reports
  `SEND_FAILED` and leaves the marker untouched, so the owner stays retryable
  (MF10). A stamp-write failure after a successful send is logged but still
  counts as sent — reporting it would invite a duplicate resend.
- **Skips a blank owner email `NO_EMAIL` (MF8)** rather than sending to nothing.
- **Batch never truncates silently (MF9).** Over the 100-cap, the first 100 go
  and the overflow is REPORTED as `capped`, logged, not dropped. Deduped, and
  each id re-checked independently; a single failure doesn't stop the loop.
  Returns `{ sent, skipped, failed, capped, outcomes }`, never throws.
- **CTA is fail-closed (MF5).** The link is `NEXT_PUBLIC_APP_URL` +
  the owner's catalogue path — app-owned, never request-derived. No base in
  production → no send (a relative CTA would be broken); dev falls back to
  localhost, where the sandbox logs rather than sends.
- **`sendMenuFollowUpEmail`** mirrors `sendResetEmail`'s contract — Resend over
  axios, sandbox-logs without a real `re_` key, **never throws**. A parallel
  sender rather than a refactor: the two share only the ~10-line POST but differ
  in sandbox logging, and retrofitting the reset path risks its tests. The
  duplication is noted in the file.
- **Tests (+22):** the target RPC's grants + `is_sendable` across
  eligible/has-menu/archived/unknown (added to `menu_followup.test.sql`, rolled
  back); `sendMenuFollowUp.test.ts` (sandbox, placeholder key, real POST
  payload, never-throws); `menuFollowUpActions.test.ts` (non-admin and malformed
  id blocked before any send, the five skip reasons, no stamp on a failed send,
  batch dedupe + counts + empty rejection). Verified: `yarn lint` + **2341**
  tests + a clean `yarn build` + the SQL suite green + `make generate-types`.
- **Not done:** the cloud apply (needs approval); phase 5 (the admin
  page/table/button). **MF11 still gates a real at-scale send** — outbound
  unsolicited mail needs an unsubscribe/CAN-SPAM decision before the batch
  action is pointed at production.

## 2026-08-06 — Menu follow-up, phase 2: the read side (feat/menu-followup-email)

> **ONE migration (`20260806090000_menu_followup.sql`) — HIGH risk: a new
> SECURITY DEFINER function that reads EVERY shop's owner email, plus a schema
> column.** Applied + red-teamed on LOCAL ONLY. ⚠️ **Needs human approval before
> merge, then `make migrate-cloud` + a ledger reconcile.** Additive: the column
> is nullable, no backfill, no new policy. Plan (MF1–MF14):
> [`.claude/MENU_FOLLOWUP.md`](.claude/MENU_FOLLOWUP.md) (local, not committed).

- **The data source for the admin nudge feature.** `admin_businesses_missing_menu(p_search, p_only_no_promo)`
  returns each **verified, non-archived** shop with **no live offering** — its
  owner email, resolved offering noun, whether it has a live promo, and when it
  was last reminded.
- **Aggregated in SQL, not fetched-then-counted** — the standing analytics rule.
  A `products` count per shop in Node would silently truncate at the PostgREST
  1000-row cap and mislabel shops. "Live menu" = an `active`, non-archived
  product (what a shopper sees — an `unlisted`/`disabled`/archived catalogue
  renders empty, so it still counts as no menu); "live promo" = a `published`,
  non-archived coupon inside its date window (the coupon-access invariant).
- **SECURITY DEFINER, service_role only.** It reads owner emails across every
  shop, which no RLS-scoped client can. EXECUTE is revoked from
  public/anon/authenticated and granted to `service_role`; pinned
  `search_path`. Red-teamed as `anon` and `authenticated` — both denied.
- **The offering NOUN is resolved the dashboard's way** — the shop's
  `offering_mode` picks the branch of its type's `offering_profile`, falling
  back to "menu"/"listings" so the email never renders a blank noun. A salon
  reads "Service Menu", not "Menu".
- **`businesses.menu_reminder_sent_at`** (nullable, no default) ships in the
  same migration because the RPC returns it — phase 4's send path writes it.
  NULL = never reminded; a `DEFAULT now()` would have claimed every shop was
  already nudged.
- **`getBusinessesMissingMenu`** verifies admin BEFORE using the service-role
  client (the ordering that keeps an unguarded owner-email read impossible), and
  reports `{ rows, failed }` so the admin table can tell an outage from "no
  shops need a nudge".
- **Tests:** `supabase/tests/menu_followup.test.sql` (9 blocks — verified-only,
  pending/archived/has-menu excluded, unlisted-only still listed, search, the
  promo filter, every row carries an email + noun, and the grant matrix + the
  SECURITY-DEFINER/search_path lint), run against the local stack and rolled
  back; `menuFollowUpQuery.test.ts` (7 — the admin gate never reaching the RPC,
  arg passthrough + trimming, the mapping, and outage-vs-empty). Verified:
  `yarn lint` + **2326** tests + a clean `yarn build` + `make generate-types`
  (the RPC is now typed in `database.ts`).
- **Not done:** the cloud apply (needs approval); phase 4 (the send actions —
  re-check "still no menu" at send time, per-admin rate limit, `{ sent, skipped,
  failed }`) and phase 5 (the admin page/table/button). A full `make
  migrate-reset` was **skipped** rather than run against the dev database
  unasked — the migration is `ADD COLUMN IF NOT EXISTS` + `CREATE OR REPLACE`,
  and no seed touches the column, so a reset would only re-prove ordering.
- **Still open (product/legal):** MF11 — this is outbound unsolicited mail, so
  the unsubscribe/CAN-SPAM stance is a real decision before phase 4 sends
  anything at scale.

## 2026-08-06 — The gallery's "See All" went nowhere, and saving it deleted photos (develop)

> **No schema, API-contract or auth change.** One new route, one new Server
> Action (narrow by design), one widened shared component. MED risk: it touches
> the business shell's sidebar default and a live storage-delete path. Parity
> table (SG1–SG13): [`.claude/SHOP_GALLERY.md`](.claude/SHOP_GALLERY.md) (local,
> not committed).

- **🔴 The whole gallery could be deleted out of the bucket by saving the
  profile form.** `interior_images` holds **two representations of the same
  file**: registration writes the raw path `storage.upload()` returns
  (`business.ts:163`), while `POST /api/web/upload/business-interior` and every
  save after it write the absolute public URL. The read layer hides the split —
  `getBusinessById` / `getBusinessProfileData` resolve paths to URLs on the way
  out — so the client always hands back URLs. `updateBusinessProfileAction` then
  diffed those URLs against the raw paths in the row, matched **nothing**,
  classified every registration-uploaded photo as removed, and called
  `storage.remove()` on all of them. The row kept pointing at files that no
  longer existed. Reachable by any owner who registered through the wizard and
  then edited their profile once.
- **Fixed with `storagePathsToDelete(current, next, bucket)`** — both sides
  normalised to a path before comparing, so identity is decided by the file and
  not by which code path last wrote the string. An entry that does not resolve
  to the bucket is **dropped rather than deleted**: deleting on a guess is how a
  value we failed to parse becomes a file we destroyed.
- **New writes store bucket-relative paths.** An absolute URL bakes the Supabase
  project host into the row — the exact portability bug the seeds were rewritten
  to fix on 2026-06-16 — and it is what created the two representations in the
  first place.
- **🔴 "See All" was a `<Button>` with no `onClick` and no `href`.** The primary
  control on the section, doing nothing, wearing a `ChevronDown` (which reads as
  "expand in place") while promising navigation. It is a `<Link>` now, and it
  **forks on the same condition that chose the images**: a branch gallery is a
  different array on a different row (`branches.gallery_images`), edited in the
  branch editor, so an owner looking at branch photos goes there — sending them
  to the business gallery would have them edit a set they cannot see.
- **It also renders when the gallery is EMPTY now** ("Add photos"). It was
  gated on `hasAnyImages`, so the one state that needs the control most had no
  way to reach it at all.
- **New `/business/[businessId]/shop/gallery`** — a child of the section it
  belongs to, so the way back is the URL. Reuses `GalleryUploader` rather than
  growing a second uploader: `CLAUDE.md`'s contract sweep requires every image
  surface to call `compressImage` and forbids hand-rolled
  `createImageBitmap`/`toBlob`, so a fresh one would have failed the sweep and
  re-opened the EXIF, animation and alpha traps.
- **🔴 The obvious way to save it would have erased four columns.**
  `updateBusinessProfileAction` writes `description`, `logo_url`, `banner_url`
  and `category_id` as `?? null` **unconditionally** — only `interior_images` is
  conditional — and requires `shop_name`. A gallery page sending
  `{ shop_name, interior_images }` silently blanks the rest. Hence a narrow
  `updateBusinessGalleryAction` that touches one column, with a test asserting
  the update payload's key set is exactly `['interior_images']`.
- **Saves on the spot, not behind a Save button** — the upload has ALREADY
  happened by then; the file is in the bucket. Deferring the row write means
  every abandoned page both loses the owner's work and orphans the file it just
  uploaded.
- **Which is why delete is confirmed here and staged in the profile form.**
  Same `GalleryUploader`, one new optional `onRequestRemove`: omitted, the
  removal is staged and a mis-click costs nothing; supplied, the click is
  immediate **and** deletes the file, so it asks first. The profile form passes
  nothing and is byte-identical.
- **Both numbers are stated, because they are different numbers.** The cap is
  10; the shop page needs **4** before `Masonry` renders the full layout and
  falls back to a plain row below that. An owner with three photos could not
  previously tell why their page looked different. `MAX_GALLERY_IMAGES` and
  `MASONRY_MIN_IMAGES` are now single exported constants — the cap was
  previously a literal in the schema and another in the uploader.
- **New `getBusinessGallery` distinguishes an outage from an empty gallery.**
  `getBusinessProfileData` collapses "no such shop" and "the read failed" into
  one `null`, which is fine for a form that 404s either way and wrong here: the
  empty state tells an owner to upload photos they may already have. A failed
  read renders "we couldn't load your gallery"; only a genuinely missing shop
  404s.
- **The action is a publicly invocable endpoint and is guarded like one:** id
  shape validated **before** `verifyBusinessOwner` (which reads a falsy id as
  "no argument" and authorizes whichever shop `.limit(1)` returns — the
  multi-shop bug the event actions shipped with), ownership proved with the
  **route segment's** id, the **verified** id written, a per-user flood guard
  (Server-Action POSTs never reach the proxy limiter, and this one amplifies
  into a storage delete), and no driver text in any client message.
- **Sidebar defaults open, and its persistence stopped being decorative.**
  `SidebarProvider` has always **written** the `sidebar_state` cookie and
  **nothing ever read it** (`grep` → one hit, the constant), so collapsing it
  never survived a reload. Flipping the boolean alone would have left that
  broken and merely inverted who is annoyed. The name moved to
  `config/sidebarCookie.ts` (non-client, the same split as `supabase/cookies.ts`
  and for the same reason), the **server** layout reads it, and absent reads as
  open. Comments in `BusinessHeader` and `TourOverlay` that asserted the old
  default were corrected; neither's behaviour depended on it, both read live
  state.
- **Testimonials & Reviews is hidden.** `hasContent` was hardcoded `false`, the
  cards came from `data/shop` fixtures, and both "Add Testimonial" and "Check
  Reviews" had no handler — a section advertising a feature that does not exist,
  with two dead controls. Mount commented out with the reason; component and
  fixtures kept, because this is a planned feature rather than a fake control.
  `ratings` / `business_ratings` exist and SEC-4 gates who may write them — the
  owner-side READ is the missing half.
- **Tests (+33, 2238 → 2271):** the storage diff (a raw path and its own public
  URL are the **same file**; a foreign host is dropped, not deleted; dedupe;
  growth deletes nothing), the action (malformed id refused before
  `verifyBusinessOwner` is called, verified id written, cap rejected before any
  DB work, payload key set exactly `['interior_images']`, paths not URLs stored,
  nothing deleted when the write failed, no driver text), and a contract sweep
  (See All navigates and keeps no `ChevronDown`, forks on the branch condition,
  path from `routeConfig`, the page mounts the shared uploader and hand-rolls
  no upload, confirms before removing, never imports the whole-profile action,
  and the masonry threshold matches what `Masonry` actually enforces). The
  sweep strips comments first — these files quote the thing that was removed,
  and a sweep that fails on its own explanation teaches people to delete the
  explanation.
- Verified: `yarn lint` + **2271** tests + a clean `yarn build` (`.next`
  removed first) green.
- **Not verified — needs a browser:** these surfaces are behind auth and this
  environment has no login path, so the upload, the confirm dialog, the autosave
  toast and the branch-vs-business fork have not been clicked through. **The
  storage-delete fix especially** — the assertions pin the diff this code
  computes, not what the bucket does.
- **Not done:** reorder (array position is the render order, and `Masonry` makes
  index 0 the large tile, so the owner still cannot choose the lead photo); the
  same standalone page for branch galleries; `unoptimized` on the uploader's
  tiles; the admin sidebar, still `defaultOpen={false}`.

### Account menu: two links to a 404, and an avatar labelled "CN"

- **🔴 Subscription and Help & Support both pointed at pages that do not
  exist.** There is no `subscription/` or `help/` segment under
  `app/business/[businessId]/`, so two of the six entries in the account menu
  were links to a 404. Same class as the handler-less "See All" above and the
  `ProCard` that advertised billing this app has no surface for. Commented out
  with the reason, not deleted — restore each the day its page lands.
- **The separator travels with the tour entry now.** With Help & Support gone
  that group can be empty, and with the tour switched off the menu rendered two
  separators in a row — which reads as an item that failed to render rather than
  as a deliberate gap.
- **The avatar's fallback was the literal string `"CN"`** — shadcn's
  placeholder, two letters belonging to nobody, on the one control that says who
  is signed in. It now shows the **shop's logo**, falling back to the owner's
  personal avatar, falling back to the **shop's initials**.
- **`alt` is derived from the same choice as `src`**, so the picture can never
  be labelled as the other thing — a shop logo announced as the owner's name is
  a worse label than none.
- **Blank rather than guessed when there is no name at all.** An empty circle
  reads as "no picture"; stray letters read as someone else's account, which is
  exactly what `"CN"` was doing.
- **`initialsFromName` is shared now** (`lib/utils/initials.ts`).
  `AdminUserMenu` had its own copy — the second caller is the repo's own trigger
  to widen rather than fork. The shared one fixes two things the copy had: it
  split on a single space, so a leading space made the first "word" empty and
  the initials came out short; and `name[0]` returns half a surrogate pair for a
  name starting with an emoji. It also takes first + LAST word ("Seed Business
  Owner" → SO, not SB), since a surname carries more identity than a middle
  word. Admin keeps its `'AD'` default explicitly — that shell has no shop logo
  to fall back to.
- **The avatar block was rendered twice** (trigger and menu label), each with
  its own copy of the placeholder. One `AccountAvatar`, one derivation.
- **`resolveAccountAvatar` is exported and pure, and that is a testability
  decision worth recording:** Radix mounts `<AvatarImage>` only once the image
  has actually LOADED, and nothing loads under happy-dom — so the first version
  of the logo test read `container.querySelector('img')` behind an `if (img)`
  guard and passed whether the logic was right or not. Asserting the resolver
  directly is the only honest option.
- **Tests (+15, 2271 → 2286):** the shared helper (first+last, single word,
  real-form whitespace, an astral first character, the fallback, and the blank
  default), the menu (neither dead entry offered, Profile and Settings
  untouched, no doubled separator, `"CN"` nowhere in the rendered output, the
  shop's initials preferred over the owner's), and the resolver (logo over
  avatar with the matching label, avatar with the owner's label, shop initials
  when there is no picture, owner initials when there is no shop name, and never
  the placeholder for any empty input).
- Verified: `yarn lint` + **2286** tests + a clean `yarn build` green.

## 2026-08-05 — An auto supply shop fit nowhere in either taxonomy (feat/image-compression)

> **ONE migration (`20260805130000_retail_trades.sql`) — data-only: 9 rows into
> `categories`, 6 into `business_categories`. No table, column, policy or index
> change.** Applied on LOCAL only. ⚠️ **Needs human approval before merge, then
> `make migrate-cloud` + a ledger reconcile.**

- **An auto supply store could neither describe itself nor categorize a single
  product.** It is missing from BOTH taxonomies, and they are different tables
  doing different jobs:
  - `business_categories` — the SHOP type, picked once at registration, stored
    on `businesses.category_id`. Retail had **4** rows (Bookstore, Clothing,
    Grocery, Specialty Shop), so an auto supply store registered as *Specialty
    Shop* — which is also what the explore filter groups it under, so the whole
    trade is unfindable as a group.
  - `categories` — the OFFERING type, picked per product. Retail had **7** after
    `20260805120000`, none covering parts, oils or batteries.
- **9 offering categories** (Retail 7 → 16): Auto & Motor Parts, Hardware &
  Construction, Agri & Pet Supplies, Medicine & Pharmacy, Sports & Outdoor,
  Bags & Footwear, Baby & Kids, Jewelry & Accessories, Plants & Garden. Inserted
  global then pinned, so an unresolved vertical leaves a row visible everywhere
  rather than nowhere.
- **6 shop types** (Retail 4 → 10): Auto Supply / Motor Parts, Hardware /
  Construction Supply, Agrivet / Farm Supply, Pharmacy / Drugstore, Pet Shop,
  Sports & Outdoor Shop. *Agrivet* is one row on purpose — in PH retail the feed,
  fertilizer and veterinary counters are the same shop.
- **🔴 The seed's retail block would have silently swallowed these.** It is
  wrapped in `IF NOT EXISTS (SELECT 1 FROM business_categories WHERE
  business_type_id = retail_id)` — a guard that skips the whole block once ANY
  retail category exists, i.e. on every database that has ever been seeded.
  Appending there looks right and does nothing. The new rows live in their own
  **unguarded, per-row `WHERE NOT EXISTS`** block instead.
- **`ON CONFLICT (name)` is not available:** `business_categories` has **no
  UNIQUE on `name`**. Idempotency is per-row `WHERE NOT EXISTS`, the shape
  `seeds/subscription_plans.sql` was rewritten to on 2026-06-16 after a plain
  INSERT added four duplicate plans on every re-run.
- **🔴 A shop type with no image CRASHES registration.** `image_url` is nullable
  in the schema, but `ShopCategoryStep.tsx:255` renders
  `<Image src={item.imageURL} />` with no fallback and `fetchCategories.ts:14`
  types it `string` — so a NULL does not render an empty tile, it throws and
  takes the step with it. Every new row therefore carries an image. **The
  nullable-column-vs-required-prop mismatch itself is pre-existing and is NOT
  fixed here** — it needs a fallback tile in the component, which is a change to
  a wizard step with its own QA.
- **🔴 The first cut used picsum and all six tiles rendered broken — an
  allowlisted host is not enough, because CSP re-checks every REDIRECT HOP.**
  `picsum.photos` is in `imageRemotePatterns`, so `buildImgSrc` put it in
  `img-src`; but picsum answers **302 to `https://fastly.picsum.photos`**, which
  is not on the list, and the browser blocks the redirect target. `curl` says
  200 (it follows the redirect), the CSP header looks correct, and the DB row is
  fine — the only symptom is alt text where the picture should be. **Dev-only**,
  because the production branch of `buildImgSrc` pushes a bare `https:`
  (`next.config.ts:72`) — so this would have passed a production smoke and
  failed for every developer touching registration.
- **Fixed by moving to `images.unsplash.com`, which the other ten tiles already
  use** — allowlisted *and* serving 200 with no redirect. Consistency was the
  point: a grid where four tiles are photographs of shops and six are
  illustrations reads as unfinished.
- **Getting real photo ids took three attempts, and the working one is worth
  recording.** Unsplash's search API and oEmbed both answer "Authorization
  required"; `unsplash.com/photos/<id>/download` 307s into an anti-bot wall; a
  `curl` of the search page returns markup with no image URLs in it. **WebFetch
  renders the page and returns them.** That is the route to take next time a
  category needs a picture.
- **Chosen by eye, not by alt text.** Each candidate was downloaded at card size
  and looked at, which is the only reason the obvious-from-the-description picks
  were rejected: the top auto-parts result is a scrapyard, the pet-shop one is a
  flat-lay of dog biscuits on pink, the farm-supply one is a **black-and-white
  archival photograph**, and one auto storefront carries a legible chain name —
  a named business on a category tile implies an affiliation that does not
  exist. Final set: bins of vehicle lamps, a hardware tool wall, sacks of feed
  on store shelving, a pharmacist among dispensary shelves, a dog inside a pet
  store, an outdoor apparel shop.
- **`h=1200` in each URL is load-bearing.** The card renders into a fixed
  `h-36`/`h-52` box with **no `object-cover`**, so it top-crops — a portrait
  source shows its ceiling and nothing else. Two of the six sources are
  portrait; forcing a 4:3 crop at the CDN makes what lands in the box
  predictable.
- **A same-origin fallback was built and then dropped.** Generated brand tiles
  (Cornsilk field, lucide glyph, rendered through the installed `sharp`) fixed
  the CSP problem completely and needed no host at all — but they were
  illustrations in a grid of photographs. Kept in history, not on the branch;
  `public/categories/` is gone.
- **Tests:** `category_scoping.test.sql` gained a block asserting **no live shop
  type has a NULL or blank `image_url`** (the crash above), **no duplicated
  `name`** (what a careless plain INSERT would produce, given there is no
  UNIQUE), and **every image is either same-origin or on
  `images.unsplash.com`** — the two shapes verified to survive the CSP. That
  last one was proven to bite: setting one row back to a picsum URL makes it
  report 1. Suite green: "ALL CATEGORY SCOPING TESTS PASSED". All sixteen retail
  tile URLs were also fetched **as stored in the row** — 200 each, so this is
  not an assertion about a string that was later edited.
- **Left alone, worth knowing:** `picsum.photos` is now referenced by nothing and
  remains in `imageRemotePatterns`, i.e. an allowlisted host that always
  redirects somewhere blocked. Removing it changes the CSP for the whole app and
  `mobile-api.md`'s sample seed data still quotes picsum, so it is a separate
  call.
- **Verified:** migration applied; re-running it inside a rolled-back
  transaction reports `INSERT 0 0` / `UPDATE 0` (idempotent); and deleting the
  six shop types plus nulling every category mapping, then running the seed,
  restores all of it — 16 retail categories, 10 retail shop types, 0 null
  images — inside a rolled-back transaction, so the dev database was never
  touched.
- No TypeScript or schema changed, so `make generate-types` produces no diff and
  there is nothing new to lint or build.
- **Not done:** cloud apply (needs approval); real photography for the six shop
  types; and a browser pass on the registration category step.

## 2026-08-05 — Two verticals had a one-option category picker (feat/image-compression)

> **ONE migration (`20260805120000_more_offering_categories.sql`) — data-only:
> 23 rows into `categories` + four `UPDATE`s pinning them to a vertical. No
> table, column, policy or index change.** Applied on LOCAL only. ⚠️ **Needs
> human approval before merge, then `make migrate-cloud` + a ledger reconcile.**

- **A salon and a tour operator were each offered exactly ONE offering
  category.** The picker's rule is "my vertical OR global"
  (`getCategoriesPaginated`, `lib/api/products/productQuery.ts:48`), and after
  `20260801064656` pinned the five seeded rows there was nothing at all for
  Services or Tourism — only Health & Beauty, the single global row, reached
  them. **A picker with one entry is not a choice, it is a required field with a
  default.** F&B had two.
- **This is the phase the scoping migration named.** `20260801064656` says out
  loud: *"Services and Tourism intentionally end up with no vertical-specific
  categories yet. Inventing them here would be guessing; phase 6 reads the
  section names owners actually type and turns the recurring ones into real
  categories."*
- **Per-vertical, not a flat list.** 5 F&B, 4 Retail, 6 Services, 6 Tourism,
  plus 2 global. Picker totals go 2/4/1/1 → **9/10/9/9**. Dumping them all in
  global would have undone the scoping on purpose — an electronics shop does
  not need "Rooms & Stays".
- **`Gift Sets & Bundles` and `Other` stay GLOBAL**, for the reason Health &
  Beauty already does: a gift bundle is as plausible from a bakery as from a
  souvenir shop, and *Other* has to exist in every picker or an owner with an
  unlisted offering has nowhere to put it.
- **Rows are inserted global, then pinned** — so a vertical that fails to
  resolve leaves the category visible **everywhere** rather than nowhere. Same
  fail-open shape as `20260801064656`.
- **The original five are LEFT IN PLACE.** `food-beverages` already carries a
  product and `categories.id` is an FK target, so dropping a row would strand
  `products.category_id`. They stay as the broad catch-all beside the finer
  ones.
- **The mapping is repeated in `seeds/business_categories.sql`, and that is not
  redundancy.** `business_types` are created by the SEED, which runs **after**
  migrations, so on a fresh database every `WHERE bt.name = …` in the migration
  matches **zero rows** — the trap that once left every `offering_profile` NULL.
  COALESCE'd, so an admin's reassignment survives a re-seed. Verified by nulling
  all 28 mappings and re-running the seed inside a rolled-back transaction: all
  25 re-pin.
- **The existing SQL test broke, correctly, and was rewritten to stop being
  able to.** `category_scoping.test.sql` asserted `count = 2` for an F&B
  picker — a literal about how MANY categories exist inside a suite about
  SCOPING, so adding one failed it. It now asserts the picker equals *own +
  global* computed, and gained a loop asserting **every** live vertical has at
  least one category of its own, which is the invariant this migration
  establishes. Suite green: "ALL CATEGORY SCOPING TESTS PASSED".
- **Found on the way: there is no admin path to add a category.**
  `app/admin/[adminId]/actions/categoryActions.ts` has **zero callers**, and it
  gates on `profile?.role !== 'super_admin'` — the role CHECK is
  `admin | business_owner | app_user`, so `super_admin` cannot exist and the
  action would refuse every caller it ever got. Seeding is the only way in
  today. Not fixed here (it needs a UI, not just a role string).
- No TypeScript changed and no schema changed, so `make generate-types` produces
  no diff and there is nothing new to lint or build.
- **Not done:** the cloud apply (needs approval); a browser pass on the Add
  Product picker (dashboard is behind auth and this environment has no login
  path); and `make migrate-reset` was **skipped** rather than run against the
  dev database unasked — the migration is `ON CONFLICT DO NOTHING` +
  `WHERE business_type_id IS NULL`, and the seed path was proven above without
  destroying data.

## 2026-08-05 — Oversized photos are now resized, not rejected (feat/image-compression)

> Client-side only. No schema, API or auth change. Phases 1–2 of
> [`.claude/IMAGE_COMPRESSION.md`](.claude/IMAGE_COMPRESSION.md) (local, not
> committed); the remaining upload surfaces are phase 2's tail.

- **🔴 A phone photo could not be uploaded at all.** The 2 MB cap is enforced in
  four independent places — the registration Zod schema, the gallery's own
  filter, three Server Actions and three route handlers — and a modern phone
  photo is 3–6 MB. So an owner photographing their own shop, which is *the* way
  an interior image gets produced, was told the picture was invalid with no way
  forward. The registration gallery was the worst of it: it needs **at least
  four** such photos, and it silently dropped the oversized ones and reported a
  count.
- **The server already knew how to fix this and never got the chance.**
  `convertToWebP` downscales every display image at write time (512/1200/1600),
  so a 5 MB photo would land in storage at a few hundred KB. It was rejected
  before it could be transported — Server Actions cap at 3 MB, Vercel functions
  at 4.5 MB. **The cap is a transport limit being enforced against the user as
  if it were a rule about their photo.**
- **New `lib/utils/compressImage.ts`** — one function, `createImageBitmap` +
  canvas, no new dependency. Decode → downscale → encode, stepping down a fixed
  quality ladder, then halving the dimension cap once before giving up.
- **A fixed ladder, not a binary search:** a search costs ~7 encodes of a
  full-resolution bitmap on a phone and lands within a few percent of the same
  size.
- **It never throws and never makes things worse.** Every failure path returns
  the ORIGINAL file so the existing validation still applies — a compressor that
  threw would turn a rejected upload into a broken form. Four things it
  deliberately refuses to touch: **PDFs** (the licence/tax-certificate path
  uploads raw bytes), **HEIC** (Chrome and Firefox cannot decode it, so it says
  so by name instead of blaming the size), **animated GIF/WebP** (canvas
  captures one frame, and the server's pipeline deliberately PRESERVES
  animation — flattening here would be a silent regression), and anything
  already under the cap.
- **`imageOrientation: 'from-image'` is load-bearing.** Drawing to a canvas
  drops EXIF, so without it an iPhone portrait uploads rotated 90°.
- **WebP, not JPEG**, because a PNG logo re-encoded as JPEG gets a black
  background where its transparency was.
- **Wired into the shared `ImageUploadField`** (both product dialogs inherit it)
  and all three registration inputs — logo, banner, and the interior batch. Each
  compresses BEFORE the size check, shows a busy state while it works (a 5 MB
  photo takes a beat, and a frozen-looking control at that moment reads as a
  hang), and reports what happened: "Resized from 4.7 MB to 0.9 MB."
- **The failure message now names the reason.** HEIC and animation cannot be
  fixed by trying again, and an owner cannot tell which one they hit from a
  size message.
- **A dead branch was found by its own test.** The first draft guarded against
  an encode coming back LARGER than the input — real for already-optimised
  JPEGs. But compression only runs when the file is over the cap, so any result
  accepted (`≤ maxBytes`) is smaller by construction; the guard was
  unreachable. Removed rather than kept for comfort, with the reasoning left in
  place so it is not re-added.
- **Tests (+17, 2213 → 2230):** the round trip and both sizes reported; the
  ladder stopping at the rung that fits; the dimension halving; PDFs, HEIC and
  animated GIFs left untouched (with a single-frame GIF still compressible);
  and four never-worse paths — encoder returns null, encoder throws, result
  still too big, result bigger than the input. The canvas encode is injected,
  because happy-dom has no `createImageBitmap` and the stack is frozen, so the
  alternative to a seam is no test at all.
- Verified: `yarn lint` + **2230** tests + a clean `yarn build`.
- **Not verified — needs a browser:** the actual encode. happy-dom has no
  canvas, so the tests pin the decisions, not the pixels. Worth a real phone
  photo through the registration gallery before merge, and an iPhone portrait to
  confirm the orientation fix.
- **Every image surface now compresses** (phase 2 complete): the shared
  `ImageUploadField` (which the event form and both product dialogs mount), all
  three registration inputs, the profile logo and gallery uploaders, the
  personal avatar, the admin avatar, branch create (cover + gallery) and branch
  edit (cover + gallery). Documents — the licence, tax certificate and branch
  documents — are deliberately untouched: a PDF through a canvas is a corrupt
  PDF.
- **The quality ladder starts at 0.92, not 0.82.** This pass exists only to
  clear the transport cap; the server re-encodes at quality 80 and owns the
  stored artefact, so every point given away here is given away **twice**.
  Starting high hands the server a cleaner source at almost the same transport
  size, and the lower rungs still catch photos that need them.
- **Nothing converts an under-cap file.** Client conversion for a file that
  already fits buys zero storage or delivery benefit — the server's WebP output
  is identical either way — while adding a second lossy pass and a decode on the
  owner's phone. The compressor exists for transport; the server owns quality.
- **A contract sweep pins it:** every image surface calls `compressImage`, none
  hand-rolls `createImageBitmap` or `toBlob` (the EXIF, animation and alpha
  traps get solved once or not at all), the two document surfaces do NOT call
  it, and the event form mounts the shared field rather than growing its own
  file input.
- **The build caught what the tests could not:** a `const result` in the admin
  avatar handler collided with the existing `result` from `response.json()`.
  Vitest never loads that component; Turbopack does.

## 2026-08-05 — Second alignment pass: dangling doc links, and a debt log listing fixed work (chore/standards-debt)

> Documentation only. Follows the sweep below; this is what re-verifying that
> sweep's own output turned up.

- **Verified every claim the first pass added, against the live database** — not
  re-asserted: `public_feature_flags()` returns exactly 4 columns,
  `business_settings` carries exactly 2 onboarding columns,
  `idx_branches_business_id_live` exists, `enable_onboarding_tour` is seeded
  `true`, and that flag is **not** in the RPC's return list. The migration queue
  is 16, and every version named in `CLAUDE.md` matches a file on disk.
- **Two dangling references in `CLAUDE.md`, neither introduced by this work.**
  `@.claude/skill.md` sat in the **always-loaded** list and does not exist — a
  load instruction pointing at nothing. And the API-standards section cited
  `.claude/PERFORMANCE_AUDIT.md`, a local doc that is gone; it now points at the
  four 2026-07-17 CHANGELOG entries, which carry the same findings.
- **🔴 The debt log listed five items as open that were fixed weeks ago.**
  TD-001 (service-role key under `NEXT_PUBLIC_*`), TD-002 (no rate limit on
  `/api/auth/*`), TD-005 (taxonomy mutations without handler authz), TD-014 (no
  `loading.tsx`) and TD-017 (billing routes on a non-existent table). Each was
  re-checked **against the code** before closing — 0 occurrences of the
  `NEXT_PUBLIC_` service key, `checkAuthRateLimit` in 4 auth routes,
  `assertAuthorized` in the taxonomy route, 28 `loading.tsx` files, and the
  subscriptions module deleted outright — rather than closed on the strength of
  a changelog entry. A debt log that lists finished work gets read the way a
  stale schema doc does: people stop believing the rows that are still true.
- **Deliberately left open:** TD-008 (the follows POST still has no id
  validation — verified, the route has neither `z.guid()` nor a uuid check),
  TD-003, TD-004 (SEC-5 covered several routes, not all — not cheaply
  verifiable), TD-012 (the root `database.types.ts` is still there), and
  TD-009/010/011/013/015/016/018.

## 2026-08-05 — Standards sweep: the docs had drifted, not the code (chore/standards-debt)

> Documentation + one redundant class. No schema, API or auth change. Parity
> table (SD1–SD7): [`.claude/STANDARDS_DEBT.md`](.claude/STANDARDS_DEBT.md)
> (local, not committed).

- **Swept 76 files across the 11 commits** of the onboarding, IndexedDB,
  leaflet, spinner and `/for-business` work against `CLAUDE.md`. **No standard
  is broken by the code.** Verified rather than assumed: the stack is still
  frozen (`package.json`/`yarn.lock` untouched in every commit), no retired
  green, no Supabase in a `.tsx`, no literal route strings, no `z.uuid()`, no
  `whileInView`, one `<Toaster>`, head-only counts throughout the new query,
  both new Server Actions carrying validate → verify-owner-by-segment-id →
  rate-limit, both new migrations with pinned `search_path` and explicit
  REVOKE/GRANT, and no `@testing-library` import or `any` in the new tests.
- **🔴 What HAD drifted is the file that tells everyone what is true.**
  `CLAUDE.md` claimed *"local and cloud are fully in sync through
  `20260717082537` — no pending migrations"*. There are **16** after that point,
  none confirmed on cloud. That line is load-bearing: the repo's own
  "verify schema before writing queries" rule exists because four whole modules
  were once written against tables that never existed, and this is the sentence
  people read instead of checking the database.
- **The queue is now named, in order, with its blast radius.** Until it lands,
  cloud has no `events` / `booking_requests` / `product_sections` tables, no
  offering columns on `products`, no onboarding columns on `business_settings`,
  and a 2-column `public_feature_flags()` — so code that works locally
  42P01/42703s in production. The apply procedure (approval →
  `make migrate-cloud` → ledger reconcile) is spelled out where the claim used
  to be.
- **Four new schema facts recorded**, each with the reasoning that makes it
  worth knowing rather than a changelog line: the widened
  `public_feature_flags()` and **why the return list is the contract** (an
  anonymous table read on `app_settings` returns zero rows and no error, which
  a caller reads as "not configured"); why `enable_onboarding_tour` is
  deliberately outside it; the two `business_settings` onboarding columns and
  the upsert-not-update rule that follows from their lazy row; and
  `idx_branches_business_id_live`, because Postgres does not auto-index FKs and
  the checklist counts branches on every dashboard load.
- **Two dead "Active work" notes removed.** Both said "delete this note when
  merged" and both features had merged. Replaced with one accurate banner about
  the migration queue and which features ship dark.
- **`tech-debt.md`:** TD-011 re-scoped from three migrations to the real queue
  and raised to 🔴; new **TD-019** (`safeNext` is customer-scoped, so an owner
  who signs up from `/for-business` is not returned to the wizard the page was
  describing) and **TD-020** (the surfaces shipped without a browser pass, with
  the note that a cached Playwright chromium turned out to exist during the
  landing redesign — worth re-checking before assuming it cannot be done).
- **One code change:** the landing's `<h1>` carried `font-display`, which
  `@layer base` already applies to every heading (`globals.css:238`). Removed;
  the rendered markup is byte-identical apart from that class.
- Verified: `yarn lint` + **2213** tests + a clean `yarn build`, plus a
  production check that the landing headline still renders with its type intact.
- **Not in scope:** applying the migrations to cloud — that needs credentials
  and human approval, and making it visible is the point of the fix.

## 2026-08-05 — PR #29 review fixes (feat/how-to-register)

> Fixes from the react-doctor + api-doctor review. **Edits the unmerged
> `20260805090000` migration in place** (not on cloud) and re-verified against
> the live database. Approval + `make migrate-cloud` still required.

- **⛔ The page's own CTA re-created the dead-end it exists to remove.** It
  branched on `Boolean(user)`, so a signed-in **customer** got "Start
  registering" → the wizard, and `roleAllowedForPath` admits only
  `business_owner`/`admin`, so the proxy bounced them to `/home` with no
  explanation. One click away: `CustomerFooter`'s "List your business" renders
  for every session on /explore. It branches on ROLE now, and a customer is told
  *why* the button says "create an account".
- **🔴 The reader was coupled to a migration that exists only on local.** If the
  app shipped first, the old 2-column RPC resolved *successfully* without the
  registration keys and both fell to strict fallbacks — regressing
  **authenticated** flows that previously worked: the wizard would grow a
  Documents step and the success dialog would promise a review again. It now
  falls through to the old table read when the RPC row lacks the keys, so the
  deploy order is no longer load-bearing for signed-in users.
- **🔴 `/for-business` was missing from the proxy matcher** while reading the
  session for its CTA and its owner redirect. Unmatched, nothing refreshes an
  expiring token — the RSC cannot write the rotated cookie — so a live owner
  session renders as anonymous. The same note `proxy.ts` already carries for
  `/explore`.
- **🔴 The widened RPC silently broke the repo's own contract test.**
  `events.test.sql` asserted `public_feature_flags` exposes **exactly 2**
  columns, so that suite aborted at block 6c and blocks 7–8 never ran. Updated
  to 4, with the two new columns asserted anon-readable — and a new assertion
  that `enable_onboarding_tour` stays **out** of the return list, since "the
  list is the contract" only means something if something is deliberately
  excluded.
- **A malformed flag row could flip a switch or black out the others.**
  `get_app_setting_bool` cast `(value #>> '{}')::boolean`, and Postgres accepts
  `'yes'`/`'on'`/`'1'` — looser than the TypeScript check it replaced. Worse,
  an uncastable value raised 22P02, and since all four flags now come from ONE
  call, a bad registration row would have blanked events and bookings for every
  anonymous visitor. Only a real JSON boolean counts now; verified by setting
  `'"maybe"'` and watching the other three survive.
- **The migration is transactional and keeps its owner.** `DROP` + `CREATE`
  outside a transaction leaves a window where the function is missing and every
  anonymous caller gets PGRST202 — all four flags failing closed at once. And a
  drop resets the OWNER, which matters here: this is SECURITY DEFINER and calls
  `get_app_setting_bool`, whose EXECUTE is revoked from anon. `BEGIN`/`COMMIT`
  plus an explicit `ALTER FUNCTION … OWNER TO postgres`.
- **Four flag reads and two session lookups per render, now one each.** A single
  public page asked for the flags four times (the copy, twice inside
  `PublicShell`, and the metadata) and for the session twice. A `React.cache`d
  private reader in `appSettings` — `'use server'` constrains exports, not
  internals — and `getCurrentUser` wrapped in `React.cache`, which helps every
  surface that composes the shell.
- **The share card claimed a step count the page could contradict.** Static
  `metadata` said "four steps" while the spine renders `{steps.length}`; it is
  `generateMetadata` now, reading the same flag. Same for the hero and the final
  CTA, which had the count typed into their prose.
- **Also:** the page has an `<h1>` (nothing in `PublicShell` renders one, and
  every peer public page has one); `PublicShell` moved to a `layout.tsx` with a
  `loading.tsx`, so the chrome no longer waits on the page's own reads;
  `bg-[#D70005]` on a dark surface replaced with `bg-primary` (the raw hex
  measures 3.23:1 there, which CLAUDE.md forbids) and the invented
  `dark:bg-[#2A2724]` with the card token; both CTAs got a ring-offset colour, so
  the focus indicator is not a white halo on white; the landing's "What you'll
  need" link deep-links to `#what-you-need` instead of duplicating the button's
  href beside it, and uses `outline-hidden` so the ring survives forced-colors
  mode; `OnboardingSection` — a client component — stopped importing `getSteps`,
  which pulled the whole wizard including the map picker into the dashboard
  bundle; and the owner redirect uses a narrow `getOwnedBusinessId` that logs
  instead of `getMyBusinesses().catch(() => null)` with its `select('*')` and
  three storage resolutions.
- **Tests (+7, 2206 → 2213):** the role branch and the customer's explanatory
  note; the prose count following the flag; the `<h1>`; the RPC named
  explicitly (a typo previously passed by falling through to the fallbacks);
  the pre-migration RPC shape falling back to the table, and staying strict when
  neither source can answer; plus the contract sweep extended to the page itself
  and to the proxy matcher.
- Verified: `yarn lint` + **2213** tests + a clean `yarn build` + the events SQL
  suite green, plus a production smoke confirming the `<h1>`, the interpolated
  OG description ("Ten minutes, 4 steps"), and the deep link.

## 2026-08-05 — A public page for how to register, and the CTAs that led nowhere (feat/how-to-register)

> **ONE migration (`20260805090000_public_registration_flags.sql`) — widens an
> existing SECURITY DEFINER function's return list. No table, column or policy
> change.** Applied on LOCAL ONLY. ⚠️ **Needs human approval before merge, then
> `make migrate-cloud` + a ledger reconcile.** Parity table (HR1–HR17) and the
> phased plan: [`.claude/HOW_TO_REGISTER.md`](.claude/HOW_TO_REGISTER.md)
> (local, not committed).

- **🔴 Every public "List your business" CTA dead-ended at a sign-in wall.** All
  six of them — the landing nav, the landing hero, the business block, the final
  CTA, the explore nav and the explore footer — pointed at
  `ROUTES.BUSINESS.registration`. But `/business` is a wholesale protected prefix
  and the wizard's layout calls `getMyBusinesses()`, which throws
  unauthenticated. A stranger clicking the site's primary business CTA was
  bounced to `/sign-in` having been told nothing about what registering
  involves. **That, not the absence of a page, is what this fixes.**
- **New `/for-business`** — a public route, deliberately NOT under `/business`:
  a page for logged-out visitors placed inside a protected prefix is a page its
  own audience cannot open, and carving a marketing exception into a security
  prefix trades the wrong thing.
- **The page is generated from the wizard, not written alongside it.** The steps
  come from the wizard's own metadata, so the page cannot describe a flow the
  product no longer has — and it shows the **real fields** each step asks for
  (`Map pin`, `Photos of the shop (4 or more)`), because the four-photo minimum
  is what people discover at step three and abandon over.
- **New `data/stepMeta.ts` splits the step titles from the step COMPONENTS.**
  `steps.tsx` carried both, so naming the steps anywhere else meant pulling the
  whole client-side form into that bundle — the reason a marketing page would
  otherwise have been given its own hand-typed copy of the list. The wizard now
  builds its components around the same metadata, keyed by a step-id union, so a
  new step is a compile error until it has both a component and a description.
- **Nothing factual on the page is hardcoded.** The documents line reads
  `require_business_documents` — off for the MVP, so it says "No permits or
  paperwork", and it says the opposite the day an admin flips it. The
  after-submit copy reads `auto_verify_businesses`: promising a 24–48 hour
  review on an indexed page would be the exact lie ON18 just removed from the
  success dialog, with a bigger audience.
- **🔴 Which is how the smoke test caught a live one.** A production build of
  the page told every anonymous visitor they needed a **business permit** and a
  **review**, while the database said `require_business_documents = false` and
  `auto_verify_businesses = true`. Cause: `getRegistrationSettings` read
  `app_settings` directly, and that table is readable `TO authenticated` only —
  so an anonymous caller gets **zero rows and no error**, which the function read
  as "not configured" and answered with its strict fallbacks. Invisible while
  both callers were behind auth. The migration widens the existing
  `public_feature_flags()` RPC (fixed return list, so a future settings row stays
  private by default) and the reader goes through it — the same trap, and the
  same fix, as the events flags.
- **Design.** Reuses the landing's own primitives and the public shell rather
  than a second set: one Cornsilk "before you start" card (Charcoal on Cornsilk
  is 14.12:1), a numbered spine — numbering earns its place because the wizard
  IS a sequence, which is also why the landing's business block stays a
  three-line teaser and does not repeat these — and field names set in mono so
  they read as the form rather than as prose. **No `.il-reveal`**: those rules
  are scoped to `[data-ilokal-root]`, which this page is not inside, so they
  would have silently done nothing. The FAQ is native `<details>`, so the page
  ships no JavaScript of its own.
- **The FAQ answers only what the schema or the flow can back.** No pricing
  question: there is no billing surface in this app, and "free forever" on an
  indexed page is a commercial promise, not a product fact.
- **`RegistrationSteps` stopped claiming progress nobody has made.** It printed
  "Step 1 of N" from a prop that was defaulted and that no caller ever passed,
  while every row rendered identically — a static list wearing a progress
  indicator's clothes. It reads the step count now. And the dashboard's "Learn
  More", a `<Button>` with no handler since it was written, finally has a
  destination.
- **Tests (+20, 2186 → 2206):** the step spine grows from four to five the
  moment the documents flag flips and names the Documents step only then; the
  prerequisites and after-submit copy fork on their flags and never render both
  variants; the hero survives `renderToStaticMarkup` with no `opacity:0`; and a
  contract sweep over the whole landing and customer directories — not a list of
  known files, which is how the first version of it passed while the hero and
  final CTA still pointed at the wizard — asserts no public surface links a
  logged-out visitor into the protected prefix.
- Verified: `yarn lint` + **2206** tests + a clean `yarn build`, plus a real
  production smoke: `/for-business` 200 for an anonymous visitor rendering the
  four steps, "No permits or paperwork" and "goes live right away"; `/home` and
  `/explore` each carrying links to it and **zero** remaining links to
  `/business/registration`.
- **Not done:** the cloud apply (needs approval); threading `?next=` so signup
  returns an owner to the wizard (`safeNext` is customer-scoped today, so the
  anonymous CTA goes to signup plainly); and a browser pass at 320/768/1280 in
  both themes.

## 2026-08-05 — "Go to dashboard" looked dead while it worked (feat/business-onboarding)

> One button. No schema, API or auth change.

- **The last click of registration had no feedback.** The dashboard is a server
  component that fetches analytics, branches and the setup checklist before it
  can paint, so `router.push` there is a real second or two — and the button did
  not change, leaving the owner clicking a control that appeared broken at the
  one moment they have just finished a long form.
- **Now: spinner, "Opening your dashboard…", disabled, `aria-busy`.**
- **A latch, not `useTransition().isPending`.** Two reasons. The wait ends when
  this dialog is *replaced* by the dashboard, so the busy state should last
  until the component goes away rather than until a transition settles; and a
  ref-backed latch makes a double-click unable to queue a second `push` even
  before React commits the `disabled` attribute.
- **With a 15s failsafe, because the dialog blocks Esc and outside clicks.** A
  spinner that never ends would be a modal with no way out. If the navigation
  has not happened by then the control hands itself back.
- **Tests (+3, 2189 → 2192):** the busy label, disabled state and `aria-busy`
  after a click; two clicks producing exactly one `push`; and the failsafe
  restoring the button. The pending window could not have been asserted through
  `useTransition` here — a mocked `router.push` resolves instantly, so the
  transition never observably pends, which is also what made the latch the
  honest choice rather than the convenient one.
- Verified: `yarn lint` + **2192** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** how long the wait actually is, and
  therefore whether 15s is the right failsafe.

## 2026-08-05 — PR #27 review round 2 (feat/business-onboarding)

> Fixes from the second react-doctor + api-doctor pass. Round 1's fixes were
> verified as landed; these are the defects those fixes introduced, plus one
> they did not reach. No schema change — the `20260804233000` approval gate is
> unchanged.

- **🔴 Clicking outside the tour card consumed the tour.** `onOpenChange` routed
  Radix's outside-pointer dismissal into `onSkip`, which **settles** — marker
  written, Server Action posted, never offered again. So a pointer-down anywhere
  outside the card, *including on the ringed nav link the step is pointing at*,
  ended onboarding permanently. That is the precise rule round 1's `abort()` was
  added to enforce, on a far more reachable path than the no-anchor case it
  fixed. `onInteractOutside` is prevented now; only Skip, Done and Esc end the
  tour, and Esc still counts as an answer because it is one.
- **🔴 The empty-`businessId` hole in the shared guard.**
  `verifyBusinessOwner(businessId?)` treats a FALSY id as *no argument* and falls
  back to whichever shop `.limit(1)` returns — so `completeOnboardingTourAction('')`
  from a two-shop owner authorized, and stamped, the wrong shop. These are
  publicly invocable endpoints. New `businessIdSchema` (`lib/validation/business.ts`)
  rejects before the helper is ever called.
- **The promo step expired with the clock.** Round 1 added the live window
  (`start_date <= now <= expiry_date`) so the row could not tick for a deal
  reaching nobody — but that made done-ness *un-do itself*: the moment a mature
  shop's last deal ran out, the completed checklist reappeared telling an owner
  who did the step years ago to publish their first deal, with no action of
  theirs. Reverted to "has ever published one", with the reasoning recorded in
  the query so it is not re-tried a third time: a setup checklist records that a
  thing was learned; whether a deal is running now is the deals page's job.
- **`.eq('status','active')` broke the empty state it shares a number with.**
  That filter is right for the checklist row and wrong for the dashboard, which
  asks "has this owner added anything at all" — so a shop whose whole catalogue
  is `unlisted` was told "No products yet". There are two head-only counts now,
  `offeringCount` (active) and `totalOfferingCount` (any), and the empty state
  reads the second.
- **The welcome marker was stranded in a component that does not always
  render.** `page.tsx` skips `SetupChecklist` entirely for a dismissed checklist
  on a verified shop, and the `?welcome=1` strip lived inside it — so on that
  path the marker stayed in the URL and in history, and a back-navigation
  replayed the invitation. Moved into `TourWelcomeTrigger`, which renders
  unconditionally and already owned the other one-shot job. Both are now
  ref-guarded rather than dep-guarded: `useRouter()`'s identity is not something
  to bet a repeated `replace` on, and the test proved it fires twice.
- **A pending shop got two stacked modals.** The post-registration invite now
  mounts on the same page as `BusinessHome`, which was still mounting the
  **pre-registration** `TourDialog` unconditionally — so 800 ms after arriving,
  an owner saw a second Radix modal saying "Register your shop to get started",
  for the shop they had just registered, with two competing focus traps. Gated on
  `!business`, which is the only state that dialog's copy describes.
- **The memo fix keyed on flag values but left `vocabulary`** — also a fresh
  object per RSC render, so the same defect survived under a different name.
  `resolveTourSteps` reads exactly two fields; those two strings are the deps.
- **The end-of-tour focus return could land on `<body>`.** On the welcome path
  `remember()` runs from a mount effect, when `document.activeElement` IS body —
  an `HTMLElement`, so the `instanceof` guard passed it. The restore now rejects
  both `<body>` and a disconnected node, and leaves focus where the tour ends,
  which beats throwing a keyboard user to the top of the document.
- **The oversized-step anchor was 0×0**, and floating-ui's `autoUpdate` skips
  its movement observer on a zero-size reference — so the card had no reposition
  signal while the measure loop moved the anchor through the smooth scroll. 1×1
  now, plus `updatePositionStrategy="always"`.
- **The first frame painted before the first measurement.** The measure loop was
  a passive effect, so the frame where the overlay mounts drew the ring at (0,0)
  with the full-screen shadow and `motion-safe:transition-all` animated it in
  from the corner. `useLayoutEffect` — this component never server-renders.
- **Also:** the dashboard starts the checklist derivation without awaiting it and
  joins it to the analytics `Promise.all`, instead of putting five queries ahead
  of the page's real payload; and a failed or refused tour write is logged the
  way the dismissal already was (both RESOLVE, so `.catch()` never saw them).
- **Tests (+12, 2177 → 2189):** an outside pointer-down leaves the tour running;
  a malformed id is refused before `verifyBusinessOwner` is called; the promo
  count carries no date filters; two product reads with exactly one status
  filter; the marker is stripped with the checklist absent and not touched
  without a marker; plus the checklist's own marker tests inverted to assert it
  no longer owns that job.
- Verified: `yarn lint` + **2189** tests + a clean `yarn build` + the SQL suite
  green.
- **Unchanged and still required:** human approval for `20260804233000`, then
  `make migrate-cloud` + a ledger reconcile, with the cloud apply landing before
  the app deploy.

## 2026-08-05 — Leaflet was painting over the navigation bar (feat/business-onboarding)

> Two class attributes and a contract test. No schema, API or auth change.

- **🔴 The branch map on `/explore/[businessId]` rendered on top of the sticky
  header.** Scrolling a shop page put map tiles over Home / Explore / Nearby /
  Deals / Events, so the nav was unusable while the map was in view.
- **Cause: leaflet hardcodes its own z-indexes and nothing contained them.**
  `.leaflet-pane` is `z-index: 400` and `.leaflet-top` / `.leaflet-bottom` are
  `1000` (from `leaflet/dist/leaflet.css`), against a header at `z-50`. Those
  numbers are only meant to order leaflet's layers against each other, but with
  no stacking context on the map's wrapper they compete with the whole document —
  and 400 beats 50. Raising the header instead would have been a losing game: the
  next dialog or popover would need to outrank 1000 too.
- **Fix: `isolation: isolate` + `z-0` on the map's own wrapper**, so leaflet's
  400 and 1000 resolve *inside* that box and the box itself sits at `z-0` against
  the page. Applied to `BusinessMap` (the reported bug) and to the shared
  `LocationPicker`'s root — the latter covers all four of its call sites at once,
  including the event dialog, where the same 1000 would have outranked a Radix
  dialog's own chrome. It is also why the picker's `z-[1000]` hint badge still
  works: it now competes with the tiles and nothing else.
- **Tests (+2, 2183 → 2185):** `mapPicker.contract` asserts both the shared
  picker and the public branch map carry `isolate` + `z-0`, so a future class
  sweep cannot quietly delete the containment and put the map back over the nav.
- Verified: `yarn lint` + **2185** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** the stacking itself. happy-dom has no
  layout or paint, so the test pins the declaration, not the result.

## 2026-08-05 — PR #27 review hardening (feat/business-onboarding)

> Fixes from the react-doctor + api-doctor review of the whole onboarding
> branch. **Edits the unmerged `20260804233000` migration in place** (it is not
> on cloud) — it still needs human approval + `make migrate-cloud` + a ledger
> reconcile before merge.

- **🔴 The outage-vs-empty lie was fixed for the checklist and reintroduced one
  component down.** `hasOfferings` defaulted to `false`, and a failed
  `getOnboardingProgress` reports `offeringCount: 0` — so on any read outage a
  pending shop got "We couldn't load your setup checklist" stacked directly on
  "No products yet. Your shop dashboard is empty", for a shop that may have 200
  offerings. `hasOfferings` is now **`boolean | undefined`**, where `undefined`
  means *unknown*, and `HomePage` tests `=== false` / `=== true`, so an outage
  renders neither the empty state nor the analytics-lock card.
- **🔴 A tour with nothing to point at consumed itself.** The "no anchor
  measures" exit called `onSkip`, which settles — writing the seen marker AND
  posting the Server Action. An owner clicking "Take the tour" on a layout where
  no anchor renders saw nothing happen and would never be offered it again. New
  `abort()` closes without recording; the overlay takes an explicit `onAbort`.
- **🔴 The step index was never clamped when the visible set shrank.** A shorter
  list left `current` undefined, the overlay returned `null` with `phase` still
  `'running'`, and `startTour()` was then a no-op — the tour was dead until the
  provider remounted. Clamped in the same effect that recomputes the set.
- **🔴 The migration now says out loud what it needs.** Approval + cloud apply +
  ledger reconcile, and specifically that **the cloud apply must land before the
  app deploy**: without the columns `getOnboardingState` errors 42703 on every
  dashboard load and both writers silently return `ok:false`.
- **Three checklist items ticked for states that reach nobody.** The promo count
  only checked `published`, but `mobile_deals` also requires `start_date <= now
  <= expiry_date`, so an expired or scheduled deal marked "reaches the app's
  Deals feed" done. The offering count ignored `products.status`, so a shop whose
  only offerings are `unlisted`/`disabled` — both `is_available = false` via
  `sync_product_availability` — was told the step was done while its public page
  was empty (and the same count feeds the empty state). And the verification
  row's nested ternaries told a **suspended** shop "Verification in review —
  nothing to do"; it is a `Record` over the status union now, so a new status is
  a compile error.
- **`branches.business_id` was unindexed** and the checklist counts it per
  dashboard load — Postgres does not auto-index FKs. Partial index (`WHERE
  archived_at IS NULL`, matching the query) added to the same migration.
- **🔴 The tour flag's default direction was unsafe, so the row is seeded
  instead.** `app_settings` is readable `TO authenticated` only, so a caller on
  the `anon` role gets zero rows and **no error** — and an ON-when-absent reader
  turns that into "enabled", silently defeating an admin who switched it off.
  Exactly the trap that moved `readFlag` onto the `public_feature_flags` RPC. The
  migration now seeds `enable_onboarding_tour = true` (`ON CONFLICT DO NOTHING`,
  so an admin's choice survives a re-run), which makes "absent" unreachable and
  lets the reader **fail closed** like its siblings. It also now requires a real
  boolean `true`, not a truthy value.
- **Focus return after the tour was pointing at a detached node.** Radix restores
  focus on menu UNMOUNT, after the exit animation, so the `requestAnimationFrame`
  start recorded a menu item that no longer existed — and Radix's own late
  restore punched focus out of the open tour card. The tour is started from
  `onCloseAutoFocus` with `preventDefault()` now, and `startTour(element)` takes
  the trigger explicitly.
- **The test caught a live bug in that same fix:** `startTour` is passed straight
  to `onClick` in two places, so its first argument is routinely a click EVENT.
  The element is now validated with `instanceof HTMLElement` rather than
  truthiness, which is what makes the focus return work from the card as well.
- **The step-resolution memo keyed on the `flags` OBJECT identity**, which the
  server layout re-creates on every RSC render — including the `router.replace`
  that consumes the welcome marker. Each new identity restarted the overlay's
  380 ms settle timer and re-fired `scrollIntoView` mid-tour. Keyed on the flag
  values now.
- **The geometry memo read `window.innerWidth/Height` but was keyed on the rect
  alone**, so a height-only resize kept pre-resize dimensions for both the
  viewport clipping and the oversize decision. Viewport size is tracked by the
  same measure loop and is part of the deps.
- **`onFinish()` was called inside a `setIndex` updater.** Updaters must be pure
  and StrictMode invokes them twice, which would double-fire the settle (a
  localStorage write plus a rate-limited action).
- **Also:** `role="region"` on the checklist card (`Card` is a bare `<div>`,
  where ARIA prohibits naming, so `aria-labelledby` alone was dropped — the
  landing claim-code defect again); the dashboard reads the stored answers FIRST
  and skips the five-read derivation when the card cannot render; `EmptyState`
  takes the vocabulary, so a salon no longer reads "No products yet / Add First
  Product"; a refused dismissal (`FORBIDDEN`/`RATE_LIMITED` resolve rather than
  reject) is logged instead of dropped; the onboarding writers no longer touch
  `updated_at`, which means "the owner changed a setting"; the actions treat a
  missing user id as unauthorized rather than skipping the flood guard, and
  narrow `verifyBusinessOwner`'s error union instead of casting it; and the
  IndexedDB store resolves writes from `tx.oncomplete`, so a commit-time quota
  abort is no longer reported as a successful cache.
- **Tests (+6, 2177 → 2183):** abort records nothing and leaves the tour on
  offer; a no-anchor tour does not consume it; the index clamps when the set
  shrinks; the promo date window and the `status='active'` offering filter; the
  suspended label; plus the SQL suite gained assertions that
  `branches.business_id` is indexed and the flag row is seeded, and the
  appSettings tests were inverted to the fail-closed contract.
- Verified: `yarn lint` + **2183** tests + a clean `yarn build` + the SQL suite
  green, with the new index and the seeded flag applied to the local DB.
- **Not re-run:** `make migrate-reset`. The migration is `ADD COLUMN IF NOT
  EXISTS` / `CREATE INDEX IF NOT EXISTS` / `INSERT … ON CONFLICT DO NOTHING` and
  no seed touches these columns, so a reset would only re-prove ordering — and
  it would wipe the dev database unasked.

## 2026-08-05 — Tour step card was rendering outside the viewport (feat/business-onboarding)

> Presentational fix to the phase-2 overlay. No schema, API or auth change.

- **🔴 The first tour step opened above the top of the window.** All that was
  visible was its Skip/Next row, hanging off the browser edge; the step's title
  and body were off-screen entirely.
- **Cause: the card was anchored to an element the size of the viewport.** The
  highlight box doubled as the popover anchor, and step one points at the setup
  checklist — ~680px tall and nearly full width. There is no side of a box that
  size with room for a 320px card, so Radix's collision logic flipped it to the
  top, where there was no room either, and it clipped at the window edge.
  Anchoring a popover to something almost as large as the space it must fit into
  has no correct answer; the anchor was the wrong shape, not the placement.
- **Highlight and anchor are now two boxes with two jobs.** The ring still
  outlines the element. The anchor **collapses to a zero-size point** at the
  bottom-centre of the element's visible area once it exceeds half the viewport
  in either direction, and the card opens upward from there — over the thing it
  describes, but always inside the window. Small anchors (nav links, the branch
  switcher, the bell) are unchanged: ring and anchor stay the same rect and keep
  the step's own preferred side.
- **The ring is clipped to the viewport too.** An anchor starting above the fold
  or running past the bottom would otherwise draw at a negative offset, putting
  both the ring and the card hanging off it outside the window. An anchor
  scrolled fully out of view yields no ring and no anchor rather than a box at
  (0,0).
- **Two smaller belts on the card itself:** `sticky="always"` keeps it against
  the anchor while the page scrolls, and `max-h-[calc(100dvh-2rem)]` with
  internal scrolling means a card taller than the window scrolls instead of
  pushing its own buttons off the edge — which is the shape of the original
  symptom.
- **Tests (+3, 2174 → 2177):** a small anchor keeps its own box; a
  viewport-sized anchor collapses to a point at the expected coordinates while
  the ring still covers the full element; an anchor half above the top edge has
  its ring clipped to the visible intersection.
- Verified: `yarn lint` + **2177** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** the placement itself. happy-dom has no
  layout engine, so the tests pin the geometry this code computes, not what
  floating-ui finally paints.

## 2026-08-04 — Registration `QuotaExceededError`: picked files move to IndexedDB (feat/business-onboarding)

> **No schema, API-contract or auth change.** Client-side storage only. LOW risk,
> and it fixes a path that could not succeed.

- **🔴 Registering a business threw `QuotaExceededError` on the gallery step.**
  `useFormCache` cached picked files by base64-ing them into **localStorage**.
  localStorage holds strings, so a file pays +33% for base64 and browsers then
  count the string as UTF-16 (×2), against a ~5 MB quota. `step3Schema` requires
  **at least four** interior images of up to 2 MB each — so the smallest
  *conforming* selection is ~8 MB of bytes → ~10.7 MB of base64 → ~21 MB against
  5 MB. This was not an edge case at the upper bound: the field the cache existed
  for **could never have cached once**.
- **It failed loudly and then silently.** The write was inside a `try/catch` that
  logged with `console.error`, so Next's dev overlay surfaced it as an error the
  owner saw mid-registration, while the actual consequence — the files not
  surviving a reload — was invisible. The form itself was never blocked, which is
  why this survived.
- **New `app/business/registration/hooks/fileCache.ts` — an IndexedDB blob
  store.** Native API, no new dependency (the stack is frozen). Blobs are stored
  as blobs: no base64 inflation, no `atob` loop over megabytes, and a quota
  measured in hundreds of MB. Keyed by form field, one entry per field.
- **Best-effort by contract: every function resolves, never rejects.** The cache
  exists so a reload does not lose a half-filled form; failing to cache must not
  be able to break a registration. A browser with IndexedDB blocked (private
  mode) or one that throws on `open` simply gets no caching — asserted both ways.
- **`run()` reports transaction health separately from the result**, because a
  successful `delete`/`clear` resolves `undefined` while a successful `put`
  resolves the key — collapsing the two would have made every write report
  failure.
- **A 25 MB ceiling, and a stale entry is dropped rather than kept.** There is no
  maximum image COUNT in the schema, only the 2 MB per-file cap, so forty photos
  is representable. Past the ceiling nothing is cached and a warning says so —
  and the previous entry is deleted, because restoring an older, smaller
  selection over the one the owner can see in the form is worse than restoring
  nothing.
- **The legacy localStorage entries are read ONCE, then purged.** An owner
  mid-registration keeps whatever small files did fit (in practice a logo or a
  banner — anything larger never landed), and the dead base64 stops occupying the
  origin's quota for everything else that uses it. Migrated forward on read, so
  the next reload comes from IndexedDB. `clearCache()` now clears both stores;
  leaving either behind means a completed registration holds megabytes of dead
  bytes for the life of the origin.
- **No caller changed.** `cacheFile`, `cacheFiles` and `clearFileCache` keep
  their signatures, so `Gallery.tsx` and `Documents.tsx` are untouched —
  `clearFileCache` stays sync and fires the async delete without awaiting it.
  Single-file fields are stored as one-element lists, so one restore path covers
  both shapes and `restoreFileFromCache` is gone.
- **Tests (+17, 2157 → 2174):** `fileCache.test.ts` drives the store against a
  minimal hand-rolled IndexedDB fake (happy-dom ships none, and `fake-indexeddb`
  would be a new dependency) — a round trip of the exact four-2 MB-image payload
  that used to throw, name/type/`lastModified` preserved, per-field keys not
  merged, a new selection replacing rather than merging, an empty selection
  treated as a removal, the ceiling dropping the stale entry, and four
  degrade-quietly cases (no IndexedDB, `open` throwing, an unknown field, a
  record whose blob did not survive). `fileCacheMigration.contract.test.ts`
  sweeps the source so the old approach cannot come back: exactly ONE
  `localStorage.setItem` in the hook and it writes the metadata key, no
  `readAsDataURL` anywhere in the wizard, the legacy prefix only ever read and
  removed, and the hook delegating to the one store module instead of touching
  IndexedDB itself.
- Verified: `yarn lint` + **2174** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** the actual gallery step. This environment
  has no login path, and the failure being fixed is a browser storage quota,
  which only a real browser enforces. **Restart `next dev`** before retrying —
  `.next` was rebuilt.

## 2026-08-04 — Onboarding phase 3: onboarding state moves off the device (feat/business-onboarding)

> **ONE schema migration (`20260804233000_business_settings_onboarding_state.sql`)
> — HIGH risk by policy (schema), applied + red-teamed on LOCAL ONLY.**
> Additive: two nullable `timestamptz` columns, **no new policy, no index, no
> backfill, no RLS change**. ⚠️ **Needs human approval before merge, then
> `make migrate-cloud` + a `supabase_migrations.schema_migrations` ledger
> reconcile.** Plan: [`.claude/ONBOARDING.md`](.claude/ONBOARDING.md) (local, not
> committed).

- **The two onboarding answers were per-BROWSER, which is the wrong unit** (D5 /
  ON5). Dismissing the setup card on a phone and opening the dashboard on a
  laptop asked again; taking the tour on one machine meant nothing on the next.
  `business_settings` now carries `onboarding_tour_completed_at` and
  `onboarding_checklist_dismissed_at`.
- **Only these two facts are stored. Everything else stays derived.** The
  checklist's six items still come from `businesses`, `branches`,
  `business_settings`, `products` and `coupons` — storing "logo uploaded ✓"
  duplicates a fact `logo_url` already holds and the two drift the first time an
  owner deletes the logo. These are the only two with no other source.
- **`business_settings`, not a new table** (CLAUDE.md §DRY — prove the existing
  one cannot hold it). It is already keyed by `business_id`, already owner-scoped
  and already the home for per-shop configuration; a parallel `onboarding_state`
  table would have meant a second set of RLS, indexes, queries, service and UI
  for two timestamps. **Not `profiles`**, because onboarding is per SHOP: an
  owner with two shops sets up each one, and a user-keyed flag would report the
  second shop as already onboarded.
- **Checked before writing the migration, not assumed:** the owner policy
  ("Owner manages own business settings", `FOR ALL`) does carry an **explicit
  `WITH CHECK`**, verified against `pg_policy` on the live database rather than
  the migration file — a `FOR ALL` policy silently reuses `USING` for writes,
  which is the PR #18 lesson that cost `booking_requests` its owner UPDATE
  policy. And its `auth.uid()` is already wrapped as `(select auth.uid())` by
  `20260717000002`. So the write path needed nothing.
- **Nullable with no default, and no backfill — none is possible.** The existing
  markers live in browsers nobody can read. NULL means "not answered", so an
  owner who dismissed the card before this migration is asked once more, on one
  device; a `NOT NULL DEFAULT now()` would instead have claimed every shop on the
  platform had already answered.
- **🔴 `upsert`, never `update`.** The `business_settings` row is created lazily
  on the owner's first save, so most shops have none at the moment they answer
  the tour — an `update` would have reported success having written nothing,
  which is precisely the silent failure this phase exists to remove. PostgREST's
  upsert touches only the payload's columns, so hours, contact details and review
  settings on an existing row survive; a test pins the payload's key set for that
  reason.
- **localStorage is kept, demoted to a LOCAL ECHO.** It can only ever add a
  "seen"/"hidden" — never contradict the server. That is what keeps a device
  quiet when the server write fails, and it is why the checklist's effect
  recomputes `dismissed || <local key>` rather than only OR-ing in: the key is
  per business, so switching shops must still be able to bring the card back.
- **Seeded from the server, so nothing is painted and then yanked away.** The
  card's `hidden` state and the tour's `seen` state both start from the server's
  answer instead of `false`-then-corrected. An owner who answered elsewhere never
  sees the invitation flicker while localStorage is consulted, and the server
  HTML matches the first client render either way.
- **One read, shared.** `getOnboardingState` is `React.cache`d because the
  LAYOUT needs the tour flag (to seed the provider) and the PAGE needs the
  dismissal flag (to seed the card) — two components that cannot pass props to
  each other. `.maybeSingle()`, because a lazily-created row means "no row" is
  *not answered*, not an error; `.single()` would raise PGRST116 and put every
  brand-new shop's dashboard on the failure path.
- **A failed read SHOWS the guidance.** Both flags read false and `failed: true`
  is reported: wrongly showing a card is a small annoyance, while wrongly hiding
  the setup checklist withholds the one thing a new owner needs.
- **Two Server Actions, in `app/actions/` rather than under
  `app/business/[businessId]/`** — the callers are shared components in
  `components/custom/`, and a shared component reaching into one route's action
  folder is how that folder stops being one route's (the same move
  `notificationActions` made). Each validates the id's shape and proves ownership
  with the **route segment's** id — a `verifyBusinessOwner()` with no argument
  falls back to whichever shop `.limit(1)` returns, which is the multi-shop bug
  the events actions shipped with — writes the **verified** id, and shares one
  per-user flood-guard budget (Server-Action POSTs never reach the proxy's
  limiter).
- **Both writes are fire-and-forget, and say so.** The card is already gone and
  the tour already closed by the time they run; a failed write is logged
  server-side and reported as `{ recorded: false }` rather than thrown at the
  page, and neither action calls `revalidatePath` — re-rendering the dashboard
  under the owner to change nothing they can see is not a fix. The tour records
  **once**: a replay settles again, but the server already holds the answer and
  this is a rate-limited endpoint, not a heartbeat.
- **Deliberately NOT behind `enable_onboarding_tour`.** A shop that answered
  while the flag was on must still be able to record a dismissal if an admin
  flips it mid-session, and neither write exposes anything.
- **Tests (+25, 2132 → 2157, plus a new SQL suite):** `onboardingState`
  (both markers from one row scoped to the shop, a missing row read as
  not-answered rather than an error, `failed` on a query error and on a dead
  client, the upsert's `onConflict`, the payload touching only its own column,
  a failed write reported instead of thrown), `onboardingActions` (ownership
  proved against the caller's id, the **verified** id written, refusal before any
  write, the flood guard between auth and write, one shared budget),
  `useOnboardingTour` (+3 — settles on the server's answer with no null phase,
  records once across replays, never re-posts an answer the server holds),
  `SetupChecklist` (+3 — the dismissal recorded server-side, seeded hidden from
  the prop, the echo unable to resurrect it), `OnboardingTourProvider` (+2 — the
  answer recorded once, and an owner who answered on another device not asked),
  and `supabase/tests/onboarding_state.test.sql` (columns nullable/typed/
  default-free, still exactly ONE policy on the table and it still has an
  explicit `WITH CHECK`, the owner can record an answer, a **stranger can
  neither read nor update** another shop's state, `get_business_public_info`
  still returns exactly four columns and none is an onboarding one, no
  anon-readable policy, anon still cannot read the table).
- Verified: `yarn lint` + **2157** tests + a clean `yarn build` + `make
  migrate-up` + `make generate-types` (a +6-line diff, both columns) + the new
  SQL suite and the pre-existing `business_public_info` suite both green.
- **Not done / not verified:** the cloud apply (needs approval); a full `make
  migrate-reset` was **skipped** rather than run against the dev database
  unasked — the migration is `ADD COLUMN IF NOT EXISTS` and no seed touches
  either column, so the reset would only re-prove ordering; and the
  cross-browser behaviour itself is unverified in a browser, since these
  surfaces are behind auth and this environment has no login path.
- **Next:** phase 4 (per-surface empty states, plus D6 "Learn More" and D8
  `RegistrationSteps`).

## 2026-08-04 — Onboarding phase 2: the post-registration guided tour (feat/business-onboarding)

> **No schema migration.** A client overlay, one new flag reader, and
> `data-tour` attributes on elements that already existed. LOW–MED risk (it
> mounts across the business shell). Ships behind
> `app_settings.enable_onboarding_tour`. Plan and parity table (ON3, ON4, ON7,
> ON8, ON9, ON15, ON16): [`.claude/ONBOARDING.md`](.claude/ONBOARDING.md)
> (local, not committed).

- **The app had a tour, and the people who needed it could never see it.**
  `TourDialog` is mounted only inside `BusinessHome`, which `page.tsx` stops
  rendering the moment `status === 'verified'` — so on a default install
  (`auto_verify_businesses` seeded true) the owner who most needs "here is
  where things live" is the only one who cannot get it (D3). Its one primary
  action sends you to `ROUTES.BUSINESS.registration`, i.e. back into the form
  you just submitted (D2), and dismissing it wrote a device-wide
  `hasSeenShopTour` with **no UI anywhere that reopens it** (D4). This is a
  **second, separate** tour that begins where that one ends. The
  pre-registration hero and `TourDialog` are untouched: different audience,
  different CTA, its own hook, its own key.
- **An invitation, not an ambush.** The welcome arrival opens a card — "Want a
  quick tour?" / "Not now" — and the spotlight starts only if it is accepted. A
  spotlight that seizes the page before the owner has looked at it is more
  intrusive than asking, and skipping costs one click either way. It is offered
  **only** on `?welcome=1`, the one visit provably following registration;
  every other entry is click-started.
- **`TourWelcomeTrigger` renders nothing, and sits BESIDE the checklist rather
  than inside it.** The marker is read on the server and passed down (phase 1's
  rule), so the trigger does not race `SetupChecklist`'s `router.replace` — and
  a checklist that is hidden, dismissed or already complete cannot silently
  cancel the tour by returning `null`.
- **The invitation can be requested before the "already seen" read lands, and
  is HELD rather than dropped.** The trigger is a deep child, so its effect runs
  before the provider's storage read — dropping the request there means a
  post-registration owner gets no onboarding at all on exactly the paint where
  it matters.
- **🔴 The step id IS the anchor, and a rename is a compile error.**
  `TOUR_STEPS: Record<TourStepId, TourStep>` keyed by a string union;
  `NavItem.tourId` is typed as `TourStepId`, so the three sidebar anchors break
  the build if an id moves. `tourSteps.contract.test.ts` covers the rest by
  sweeping `app`/`components` for each anchor and asserting `Nav.tsx` still
  renders `data-tour={item.tourId}`. This is the `LandingSection` lesson —
  renaming a section id without updating the union turned `/explore`'s nav into
  dead links, twice.
- **No new DOM.** Every anchor is an attribute on an element that already
  exists: the nav links, the branch-switcher trigger, the header's notification
  cluster, the setup card. Nothing is wrapped merely to be measured.
- **A step whose anchor is not PAINTED is dropped, not pointed at.** Presence in
  the DOM is not enough — the branch switcher is `hidden md:flex` and the bell
  cluster `hidden sm:flex`, so both are real elements with a 0×0 box on a small
  screen. The visible set is computed once, after a settle delay, from
  `getBoundingClientRect`, and a dropped step is not counted either: "step 3 of
  6" that skips a number is its own bug. With nothing paintable at all the tour
  **ends quietly** instead of dimming the screen over an empty card.
- **The measure loop stops on its own.** `getBoundingClientRect` per frame until
  the box has held still for 20 frames, restarted by resize, by a
  `ResizeObserver`, and by scroll **in the capture phase** — the dashboard
  content is its own scroll container, so a bubbling scroll listener never sees
  it. The settle delay before the first measurement is the `LocationPicker`
  lesson: measuring inside a container that is still animating returns a stale
  box.
- **The sidebar is opened and then put back.** It is `defaultOpen={false}`, so
  three anchors are bare icons when the tour starts; the prior state is captured
  at mount and restored on exit — an owner who works with it collapsed should
  not find it expanded because they watched a tour.
- **Mobile gets a list, deliberately.** There the sidebar is a `Sheet` that is
  not in the DOM until opened and half the anchors are hidden anyway; a
  spotlight would point at nothing, and a broken spotlight is worse than no
  spotlight. Same steps, same copy, as a numbered list.
- **Copy comes from `useOfferingVocabulary()`** (ON6), so a salon's tour reads
  "Service Menu" and talks about services; steps are filtered by the **same
  `flags` record `BusinessSidebar` filters its nav by**, so the tour can never
  narrate a route that 404s (ON7) — and a filtered-out step does not inflate the
  step count.
- **Replay from two places** (ON4): the user menu and the setup card. Both are
  **absent**, not disabled, when the switch is off — a menu entry that opens
  nothing is worse than one that is not there.
- **The kill switch defaults ON, which is the opposite of the other two — on
  purpose.** `enable_events` / `enable_bookings` gate features that ship dark
  and enforce themselves in the database, so an unset flag must read as off. The
  tour has no server side and nothing to leak; treating "never configured" as
  off would ship a feature that only works after an admin finds a switch nobody
  told them about. A real read **failure** still returns false — an overlay
  painted over the dashboard is the one failure worth being timid about, and
  turning it off without a deploy is what the flag is for. Read straight from
  `app_settings` (readable `TO authenticated`) rather than widening the
  anon-facing `public_feature_flags` RPC, which would need a migration to expose
  something anonymous visitors have no use for. The admin **Features** card and
  the action's key allowlist gained the key, so the row is created by the first
  flip — no seed migration.
- **a11y (ON16):** the step card is a Radix modal popover, so focus is trapped
  and `Esc` skips; focus is returned to whatever started the tour (there is no
  single trigger to hand back to, so the provider records `document.activeElement`
  itself); the step is announced **once** as a single `aria-live="polite"`
  `aria-atomic` region rather than as a title update and then a body update; the
  highlight transition is `motion-safe:` only, and the scroll-into-view falls
  back to `auto` under `prefers-reduced-motion`.
- **Still device-scoped (ON5).** Dismissal is `ilokal-onboarding-tour:<id>`,
  keyed per business so an owner with two shops onboards each one. Phase 3's
  `business_settings.onboarding_tour_completed_at` changes where it is stored,
  not what the key means. `useDashboardTour` / `hasSeenShopTour` were
  deliberately **not** widened — sharing them would let one tour's dismissal
  silence the other.
- **Tests (+46, 2086 → 2132):** `tourSteps.contract` (order covers the union
  exactly, every anchor resolves to a `data-tour` or a typed `tourId`, flags
  name real keys, a non-`true` flag value is off, vocabulary reaches the copy,
  no step resolves an empty string), `TourOverlay` (an unpainted anchor is
  dropped and uncounted, nothing paintable ends the tour, forward/back/finish,
  the sidebar restored to the owner's own state, exactly one live region, the
  mobile list keeping every step), `useOnboardingTour` (the held request, never
  re-offering after an answer, replay after "seen", per-business keys, the
  switch off, and unusable storage read as *seen* rather than asking forever),
  `OnboardingTourProvider` (offered only on the welcome arrival, not asked twice
  across a remount, the spotlight starting on accept, nothing mounted with the
  switch off, no id ⇒ disabled, focus returned), `UserMenu` (+2, the entry
  present/absent by flag), `SetupChecklist` (+2, the anchor and the second
  replay entry), and `appSettings` (+6, the inverted default and both
  fail-closed paths).
- Verified: `yarn lint` + **2132** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** the spotlight itself. It is behind auth
  and this environment has no login path, so the cut-out, the popover's
  collision flipping, the sidebar open/restore and the scroll-into-view have not
  been watched on a real layout — which is exactly the class of defect a
  measured overlay has.
- **Next:** phase 3 (the two `business_settings` columns — HIGH risk, needs
  approval), phase 4 (per-surface empty states, plus D6/D8 cleanup).

## 2026-08-04 — Onboarding phase 1: the hand-off and a derived setup checklist (feat/business-onboarding)

> **No schema migration.** Presentational + one new derived read. LOW risk.
> Plan, parity table (ON1–ON20) and the remaining phases:
> [`.claude/ONBOARDING.md`](.claude/ONBOARDING.md) (local, not committed).

- **A business owner who finished registering was handed a dashboard and no
  guidance.** `pending` got a bare `EmptyState`; `verified` got the analytics
  page straight away. The only onboarding surface the app had — the hero,
  `RegistrationSteps` and `TourDialog` — renders **before** you have a shop,
  which is the one state that needs it least. Phase 1 fills the landing
  moment; the guided tour is phase 2 and the persistence migration phase 3.
- **🔴 The success dialog told most owners something false.** It hardcoded
  "Your shop registration is under review", a 24–48 hour timeline and an
  "Under Review → Shop Activated" tracker — but `auto_verify_businesses` is
  seeded **true** (`20260723000000`), so `set_business_initial_status` had
  already published the shop before that dialog painted. The owner was told to
  wait for an approval that had happened, then landed on a dashboard for a
  live shop. It now forks on the **persisted** status: `verified` → "Your shop
  is live" with no timeline and no "Review Process" breakdown, `pending` →
  today's copy unchanged.
  The status is trustworthy because `createBusinessDraft` does
  `.insert(...).select().single()` and PostgREST's `RETURNING` runs **after**
  the trigger. A **resumed** submit is the one case with no status — the row
  already existed and was never read back — and that path says "registration
  received" rather than guessing, because guessing "under review" is the bug.
- **🔴 `EmptyState` claimed an empty shop for any shop.** `HomePage` rendered
  it whenever a business existed; nothing counted products. A shop with 200
  offerings read "No products yet. Your shop dashboard is empty." It is now
  gated on the derived count, and a pending shop that *does* have offerings is
  told why the page is bare ("Analytics unlock once your shop is verified")
  instead of getting a blank column.
- **The welcome signal is a param, not a guess.** The dialog pushes
  `businessWelcomePath(id)` — `?welcome=1` on the shop's **own** path, because
  `/business` answers with `redirect(businessPath(id))` and a redirect drops
  every search param, so a marker put there would never arrive. The dashboard
  reads it on the SERVER from `searchParams` (not `useSearchParams()`, which
  would force a Suspense boundary whose fallback has nothing to show yet) and
  `router.replace`s a clean URL, so a refresh or a shared link cannot replay
  it. `businessPathWithoutWelcome` strips only the marker — a `?branch=`
  selection has to survive, or consuming the welcome would silently kick the
  owner back to all-branches mode. `businesses.created_at` recency was
  rejected: a heuristic with a clock in it, misfiring on a slow first login.
- **The checklist is DERIVED, never stored.** Storing "logo uploaded ✓"
  duplicates what `businesses.logo_url` already holds and the two drift the
  first time an owner deletes the logo. `getOnboardingProgress` runs one
  `Promise.all` of head-only counts (`select('id', { count: 'exact', head:
  true })` — `select(...)` then `.length` is silently wrong past the PostgREST
  1000-row cap) and never throws.
  Six rows: profile, pinned branch, hours + contact, first offering, first
  published deal, and verification. **Verification is read-only and excluded
  from both sides of the ratio** — counting a step nobody can take leaves the
  bar permanently short through no fault of theirs.
- **"Done" means genuinely usable, which is narrower than "not null".** A
  branch with no `location` is invisible to `nearby_businesses`, which filters
  on it — an unpinned branch is not a finished step, it is a shop nobody can
  find. A **draft** coupon reaches nobody, so only `status='published'` counts.
  An **empty** `operating_hours` object is what a form that saved nothing
  leaves behind and renders no hours at all. A whitespace-only description is
  not a description. The settings row is created lazily, so it is read with
  `.maybeSingle()` and "no row" is *not done*, not an error — `.single()`
  would raise PGRST116 and fail the whole checklist.
- **A failed read says so, and says it INSTEAD of the list.** `failed: true`
  renders "we couldn't load your setup checklist" with no rows at all. Six
  unchecked boxes and an outage look identical otherwise, and an unchecked box
  tells the owner to redo work they already did — the `getEventStats` /
  `getBookingStats` lesson. A half-built list is the same lie.
- **Deliberately not flag-filtered.** Every item is part of being *sellable*
  and none lives behind a kill switch. Events and bookings are **absent**
  rather than conditionally present; adding one later means taking the same
  `flags` record `BusinessSidebar` filters on, not a second source.
- **Also:** the offering row's label comes from `useOfferingVocabulary()`, so a
  salon reads "Add Service" and a rental firm "Add Vehicle"; dismissal is keyed
  **per business** (`ilokal-onboarding-hidden:<id>`), so an owner with two
  shops sets up each one; hidden state starts `false` and is corrected after
  mount, so the server HTML and the first client render agree; the pre-
  registration hero and `TourDialog` are **untouched** — different audience,
  different CTA, no shared state.
- **Tests (+37, 2049 → 2086):** `onboardingProgress` (head-only reads, per-shop
  scope, unpinned branches and draft promos excluded, lazy settings row,
  empty-hours and blank-string cases, vocabulary label, `failed` on a query
  error / missing row / thrown client with `items` empty),
  `SetupChecklist.test.tsx` (the failure state replaces the list, nothing
  renders when complete, the marker is consumed by exactly one `replace`, no
  replace without a marker, dismissal keyed per business, done-ness stated in
  text because every tick is `aria-hidden`),
  `application-success-dialog.test.tsx` (all three status forks and both push
  targets), and `routeConfig` (+4 — the marker rides the shop path, stripping
  keeps `?branch=`, repeated params survive).
- Verified: `yarn lint` + **2086** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** the dashboard is behind auth and this
  environment has no login path, so the card, the welcome ring and the
  registration hand-off have not been clicked through.
- **Next:** phase 2 (guided tour behind `enable_onboarding_tour`), phase 3 (the
  two `business_settings` columns — HIGH risk, needs approval), phase 4
  (per-surface empty states).

## 2026-08-04 — Event tables join the dashboard, and admin staff picks (feat/events-festivals)

> **No schema migration.** Everything rides the table, policies, triggers and
> RPCs `20260802034107_events.sql` already ships. LOW–MED risk: presentational
> for the tables, one new admin-only write path. Parity table and action items:
> [`.claude/EVENTS_TABLE.md`](.claude/EVENTS_TABLE.md) (local, not committed).

- **Both event lists were bespoke `<ul>`s of cards while every neighbouring
  table is a TanStack `DataTable`.** Not a cosmetic gap: no rows-per-page, no
  "page N of M", no column headers, no kebab, and `Remove` as a bare row button
  with **no confirmation** — one mis-click soft-deleted an event. Owner
  (`/business/[id]/events`) and admin (`/admin/[id]/events`) are now the same
  table as the catalogue and coupons: stat cards, filter popover, debounced
  URL search, `manualPagination` + `DataTablePagination`, kebab row actions,
  confirm dialogs on anything destructive.
- **🔴 Admin "Add event" — staff picks.** `createPlatformEvent()` has existed
  in the service since the feature landed and **never had a caller**. It does
  now: an admin authors an event, `business_id` stays null, and it inserts at
  `approved` — an admin writing the event **is** the review, and the dialog says
  so instead of offering "Send for review". No draft button and no offering
  picker: a platform event has no shop, so it has nothing to promote (the
  composite FK would refuse one anyway). New `updatePlatformEvent` /
  `archivePlatformEvent`, both scoped **`.is('business_id', null)` in the
  WHERE** — the admin RLS policy covers every row, so without that predicate
  the same functions would silently edit and archive a *shop's* event. Taking
  a shop's event down stays the **reject** path, which notifies the owner with
  a reason; Edit and Remove are therefore **absent** on a shop's row, not
  disabled.
- **🔴 Fixed the multi-shop bug the code itself documented.** Every event
  action called `verifyBusinessOwner()` with **no argument**, which falls back
  to whichever shop `.limit(1)` returns — so an owner holding two shops filed
  events against the wrong one. All five now take `businessId` from the route
  segment and verify it, matching `sectionActions.ts`, which always has. The
  dialog carried a comment admitting this; the comment is gone because the bug
  is.
- **One form, not two.** `EventDialog` moved to
  `components/custom/events/EventFormDialog.tsx` taking
  `variant: 'proposal' | 'staff-pick'` plus **injected** save/upload calls — a
  Server Action is bound to a role, so the component rendering the fields must
  not pick one. Copy lives in a `Record<Variant, …>` map, so a third variant is
  a compile error until every string is written. Same for the status pill and
  tone map (`EventStatusBadge`), the image/title/when/venue cells
  (`EventCells`), and the filter popover (`FilterEvents`) — each was spelled
  out twice before.
- **`DataTable` gained an optional `emptyState`**, defaulting to `"No results."`
  so every other table is unchanged. Both event lists distinguish "we couldn't
  load this" from "you have none" — a distinction this repo has had to restore
  on three separate surfaces — and that survives the port only because the
  shared table can carry the caller's copy.
- **`DataTablePagination` no longer claims a selection that cannot exist.** It
  printed `"0 of 10 row(s) selected"` unconditionally; on a table with no
  checkbox column that describes a control that isn't there. It now renders
  that line only when a `select` column exists — byte-identical for the
  catalogue, coupons and redemptions, which all have one. **Neither event table
  has one, deliberately:** the owner's four states are per-event decisions, and
  bulk-approving is precisely what the approval gate exists to prevent.
- **Stat cards** — `getEventStats(businessId?)`: head-only counts (`select('id',
  { count: 'exact', head: true })`) run in parallel, one per status, never
  `select('status')` then `.filter().length`, which the PostgREST 1000-row cap
  turns into a wrong number. A shop is never asked for its staff-pick count —
  a platform event has no `business_id`, so inside a shop's scope the answer is
  always 0. A failed read reports `failed: true` and the cards render an em
  dash: four confident zeros and an outage look identical otherwise, which is
  the `getBookingStats` lesson.
- **Also:** admin nav entry and page title `Event Proposals` → **Events** (the
  page authors staff picks now, which are nobody's proposal); banner order
  moved from an inline control in a card into an `Order` column, still an
  inline input because a dialog for one two-digit number is worse; every event
  link in the admin table still passes through `safeExternalUrl` with
  `rel="noopener noreferrer"`.
- **🔴 The event form asked for latitude and longitude as two bare numbers.**
  Nobody knows their own coordinates, so most events would be filed with both
  blank — and `events_nearby` filters `location IS NOT NULL`, so a blank pair
  makes the event **invisible** to `/events/nearby` and to the mobile endpoint.
  The feature would have shipped and received no data. A guessed pair is worse
  than a blank one: every value in range is valid, so a typo puts the pin in
  the sea with no error anywhere, and `POINT(lng lat)` — longitude first — is
  the opposite of how everyone says it. Both fields now sit under a **map you
  click to pin**, with a draggable marker, "Use my location", and the numbers
  still there and still editable (the map is a `div`, so it gives a keyboard
  user nothing — it is an aid, never the only path).
- **The picker was moved, not copied.** It lived under
  `app/business/registration/components/` while branch creation already
  reached **across features** to import it — two outside importers is the
  repo's own trigger for `components/custom/` (CLAUDE.md §DRY), and events
  would have been the third reach. `git mv` to
  `components/custom/map/LocationPicker.tsx`, plus a new `LocationField` (map +
  the two inputs + device location + clear) and `useGeolocation` — the latter
  replacing **twenty lines duplicated verbatim** in the two step files.
- **Three things that are free on a page and broken in a dialog**, which is why
  this was a widen and not a drop-in: leaflet measures its container at mount,
  and in a dialog that mount is mid-open-animation, so it paints a grey band —
  a `ResizeObserver` calling `invalidateSize()` covers that, a rotation and a
  breakpoint reflow; `scrollWheelZoom` defaults to **true**, so scrolling the
  form with the pointer over the map zoomed the map and trapped the reader
  mid-form (the dialog passes `false`, the two page call sites keep the
  default and are unchanged); and the inputs take **strings**, because a
  controlled `type="number"` cannot hold `"10."` on the way to `"10.6973"` and
  swallows the decimal point.
- **The map renders at every width in the dialog**, unlike registration and
  branch-create, which wrap the picker in `hidden … md:block` — so on a phone
  those two show no map at all and the user is back to typing coordinates, on
  the one device that actually knows where it is. Their `hidden md:block` is
  **left alone** (changing a wizard step is its own change with its own QA) and
  recorded as a follow-up in `.claude/EVENTS_TABLE.md` §6, along with the
  absence of any geocoding from the typed address — that needs a provider, and
  the stack is frozen.
- **No validation change.** `createEventSchema` already refuses half a pair,
  the dialog already sends the keys only when both parse, and
  `eventService.toRow()` already writes `location` only on a real pair — so a
  blank form still cannot wipe an existing pin. The map adds a way to *set* the
  value and changes none of those rules.
- **Tests (+47, 1917 → 1964):** `DataTable.contract` (the selection line
  follows the checkbox column; `emptyState` defaults and overrides),
  `eventStats` (head-only reads, per-status scope, the skipped staff-pick
  query, `failed` on both a query error and a dead client),
  `eventPlatformService` (the `business_id IS NULL` scope on both writes,
  NOT_FOUND when a shop's id is passed, `product_id` pinned null, no driver
  text in the message), the admin actions' new endpoints (kill switch before
  auth, auth before DB, guid validation), `eventActions` re-pointed at the new
  signature **plus** a regression asserting `verifyBusinessOwner` receives the
  segment id, and an `eventTables.contract` sweep (the owner's menu moves an
  event only to `draft`/`pending_review`; no `select` column in either table;
  Edit/Remove gated on `business_id === null`; neither dialog forks the form).
- **Map tests (+39, 1964 → 2003):** `useGeolocation` (six decimal places, the
  busy flag clearing on **both** paths — a spinner that never stops is worse
  than the failure it hides — the message naming the two ways out, the
  no-geolocation browser, and `clearError`), `LocationField` (a half-typed
  `"10."` survives; the map gets a usable pair or `undefined`, never `NaN`;
  clear empties both or neither; the wheel-zoom switch reaches the map), and a
  `mapPicker.contract` sweep (all three call sites import the shared component,
  none reaches into `app/business/registration/components/`, all mount
  `ssr: false`, none hand-rolls `navigator.geolocation`, the dialog passes
  `scrollWheelZoom={false}`, and the two bare `event-lat`/`event-lng` inputs
  are gone).
- Verified: `yarn lint` + **2003** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** both tables are behind auth and this
  environment has no login path, so the kebab menus, the staff-pick dialog and
  the stat cards have not been clicked through. **The map especially** —
  leaflet needs a real layout box and a tile server, and the dialog failure
  mode this code exists to prevent (a grey band instead of tiles) is only
  visible in a browser.

## 2026-08-02 — Events: proposals, review, and the /explore dateline (feat/events-festivals)

> **ONE schema migration (`20260802034107_events.sql`) — HIGH risk: new table
> + 4 RLS policies + 3 gate/fan-out triggers + 2 SECURITY DEFINER RPCs + a
> public storage bucket + two widened CHECKs.** Applied, red-teamed and
> `migrate-reset`-verified on **LOCAL ONLY**. ⚠️ **Needs human approval before
> merge, then `make migrate-cloud` + a `supabase_migrations.schema_migrations`
> ledger reconcile.** Ships **DARK** behind `app_settings.enable_events`
> (default false). Plan, parity table and phased action items:
> `.claude/EVENTS.md` (local, not committed).

- **The whole feature is one question: who decides what appears on the front
  page.** A shop proposes an event; an admin approves it; only then does it
  reach `/explore`. Everything else is presentation.
- **🔴 The gate is a TRIGGER, not RLS.** The owner policy is `FOR ALL`, and RLS
  cannot express "you may write this row but not that column" — so without a
  trigger an owner could `PATCH status='approved'` straight through PostgREST
  and publish their own banner to every visitor. `set_event_initial_status`
  forces a non-admin insert to `draft`/`pending_review` and zeroes `priority`;
  `guard_event_review_columns` reverts any later attempt and **re-arms review
  when an approved event's content is edited** — otherwise you approve "Free
  coffee at the plaza" and it becomes something else, on the front page, with
  no second look. Both `ENABLE ALWAYS`, because seeds run under
  `session_replication_role = replica`, which skips ordinary triggers.
  Red-teamed as an impersonated owner: 11 attacks, all blocked (insert-as-
  approved, update-to-approved, self-set priority/review columns, edit-after-
  approval, cross-shop product, `javascript:`/`data:` links, inverted dates,
  half-set daily window, another shop's event, anon reading a pending row, a
  stranger driving the notify RPC).
- **Cross-shop promotion is unrepresentable, not merely checked.** An event may
  promote one offering, and a client-supplied `product_id` is not proof of
  ownership — the same hole `sectionBelongsToBusiness()` had to close in
  application code. Here a redundant `UNIQUE (id, business_id)` on `products`
  lets `events` carry a **composite FK** on `(product_id, business_id)`. Zero
  application code, and it cannot be forgotten.
- **Two timestamps model a CONTINUOUS span, which is wrong for most events.**
  A three-day fiesta open 10:00–22:00 daily is not running at 3am on day two.
  Optional `daily_start_time`/`daily_end_time` (CHECK-paired, so half a window
  is rejected) make the run explicit; an end at or before the start means it
  closes after midnight, reusing the overnight rule
  `lib/utils/operatingHours.ts` already applies to shop hours.
- **`location geography(Point,4326)`** — the brief listed `event_address` only,
  but you cannot compute distance from a string, so "events near me" was
  unbuildable without it.
- **Times are pinned to `Asia/Manila` on READ *and* WRITE.** A
  `datetime-local` input value carries **no zone**: handing it to `new Date()`
  reads it wherever the owner is sitting, so someone filing "18:00" from abroad
  would schedule their event for 18:00 somewhere else.
  `manilaInputToIso`/`isoToManilaInput` pin `+08:00` (fixed — the Philippines
  has not observed DST since 1978), tested for round-trip fidelity across a
  year boundary and for midnight rendering as `00:00`, not `24:00`.
- **Notifications: one table, one bell, one new RPC.** `notifications` already
  takes any `auth.users` id as recipient and an admin **is** a user, so an
  `admin_notifications` table would have duplicated the schema, the RLS, the
  keyset index, the query layer, the service and the bell. Admin→owner needs
  **no new SQL** (`create_notification` already authorises an admin caller);
  only owner→admins does, because that caller is neither admin nor recipient —
  the exact situation that produced `notify_coupon_redemption`, and
  `notify_event_proposal_submitted` is built to that template. It refuses
  unless the event is genuinely `pending_review`, so a draft or a resubmit loop
  cannot hold down a "notify every admin" button.
- **The admin bell was a MOVE, not a build.** `NotificationBell` and
  `notificationActions` sat under `app/business/[businessId]/` but contained
  nothing business-specific — the actions read `getCurrentUser()` and RLS scopes
  the rows. Relocated to `components/custom/` and `app/actions/` (via `git mv`,
  so history follows) and mounted in `AdminHeader`. One bell, one unread count,
  one keyset pager. `notificationHref` was extended rather than forked;
  `event_proposal_submitted` deep-links to `adminEventsPath(user_id)`, since
  only admins receive that type and admin routes are keyed by the admin's own
  id — which *is* the recipient.
- **The signature: `/explore` gets a dateline, not a carousel.** Events are the
  only thing in the app with a DATE — shops, offerings and deals are ambient —
  so order IS the information and the gaps are real. One exception, and it is
  the point: something happening **right now** jumps ahead of chronology,
  because someone opening the app on a Saturday afternoon wants what is on, not
  what is next. Deliberately **no auto-advance** (the plan called for it): a
  dateline is scrubbed, not waited on, and a strip that moves on its own is
  fighting whoever is reading it. Ranking depends on "now", which differs
  between server and client, so the server ships the query's order and the live
  ranking applies after mount — nothing is hidden either way, asserted against
  `renderToStaticMarkup`. **Zero events renders literally nothing**
  (`expect(html).toBe('')`).
- **Public surfaces:** `/events` (upcoming / finished / everything, search,
  `.range()` pagination) and `/events/[eventId]` (the two links are the page's
  real job — **Get tickets** primary, **Visit &lt;host&gt;** secondary, both
  through `safeExternalUrl` with `rel="noopener noreferrer"`, **absent when
  unset rather than disabled**). The public RLS policy is deliberately **not**
  date-filtered: a link shared on Facebook must not 404 the morning after, so a
  finished event stays reachable and says *Finished*.
- **Nearby is PULL, and the entry says so.** There is no push infrastructure in
  this repo — no device-token table, no provider, no worker, and `profiles`
  stores no location. `GET /api/mobile/events/nearby` + `/events/nearby` ask,
  holding the caller's own coordinates. Followers do get an in-app inbox row on
  publication, via a trigger calling `notify_followers` — that function is
  revoked from anon/authenticated precisely because a direct caller could
  inject notifications into every follower's inbox, so a trigger is the only
  sanctioned path. `business_notifications.type` gained `'event'`; without it
  the fan-out would have violated the CHECK and its exception handler would
  have swallowed the failure, leaving a feature that silently never notified
  anyone.
- **DRY passes made on the way through** (CLAUDE.md §DRY, added this branch):
  `describeDbError` moved to `lib/utils/` once a second module needed it;
  `NotificationType` was spelled out twice (union + a separate Zod enum) and
  the schema is now derived from the constant; `documentDecisionSchema` became
  `reviewDecisionSchema` with an alias, because "a reason is required on
  reject" is the same rule whether the thing reviewed is a document or an
  event; `readFlag(key)` backs both `getBookingsEnabled` and
  `getEventsEnabled`; `NavItem` gained `flag?`, replacing a hardcoded
  `endsWith('/business/bookings')`, and **all four** nav surfaces (business
  sidebar, admin sidebar, customer header, customer footer) now take the same
  `flags` record; and `PublicShell` was extracted when `/events` needed the
  same chrome as `/explore`.
- **Routes:** `ROUTES.EVENTS`, `eventPath`, `businessEventsPath`,
  `adminEventsPath`. `/event/:eventId` 307s to `/events/:eventId` — the plural
  collection + camelCase segment matches every other route, and the singular
  form is kept so any link already shared keeps working.
- **Admin settings** gained a **Features** card covering `enable_events` and
  `enable_bookings`; the action's key allowlist widened from two keys to four
  (the allowlist is the security boundary — this is a callable endpoint).
- **Tests (+~145, 1846 → 1894, plus the SQL suite):** the daily-window logic
  (mid-run-but-closed, overnight past midnight, the span capping the last day,
  a UTC-vs-Manila boundary), every dangerous URL scheme incl. tab/CR/LF-embedded
  and protocol-relative, the action gate ORDER (validation before auth, kill
  switch before any DB work), a draft never notifying, reject-without-a-reason
  refused server-side, a failed notification never undoing the decision it
  describes, the banner's server HTML, outage-vs-empty on every public surface,
  the mobile route's clamps and `.range()`, and `supabase/tests/events.test.sql`
  (7 blocks, ending "ALL EVENT TESTS PASSED").
- Verified: `yarn lint` + **1894** tests + a clean `yarn build` + a full
  `make migrate-reset` re-applying the migration from scratch, with the SQL
  suite green afterwards.
- **Not done:** cloud apply (needs approval); a browser sweep of the new
  surfaces (they are behind auth or behind the flag, and this environment has
  no login path); background push (D7 — needs infrastructure that does not
  exist); per-day schedule exceptions; event categories.

## 2026-08-02 — Product catalogue "Set Status" was writing values the DB rejects (feat/product-catalogue-status)

> No schema, API-contract, or auth change. One additive optional prop on the
> shared `DataTable`. MEDIUM risk (touches a component every business + admin
> table renders).

- **"Set Status" in the row menu never worked.** The submenu offered
  **`inactive` / `archived`** — values `products.status` cannot hold. The CHECK
  is `active | unlisted | disabled` (`20260526000013`), and the `ProductStatus`
  type, `productStatusSchema`, the filter popover, the Edit dialog and the
  status column **all** already used the right trio. The setter was the single
  surface in the page disagreeing with the filter sitting beside it.
- **So two of the three options were dead and the third was a wasted write.**
  Radix's `MenuRadioItem` composes `onSelect` into `onValueChange(value)`
  **unconditionally** — there is no equality check (`@radix-ui/react-menu`,
  `checkForDefaultPrevented: false`) — so re-picking the current status fired a
  redundant UPDATE while the other two 23514'd. The new
  `if (status === product.status) return` guard is what makes the no-op case
  free; it is load-bearing, not belt-and-braces.
- **And it failed silently.** The handler was `if (result.success)
  router.refresh()` with no `else`, no toast, no pending state, so a 23514
  came back and was discarded. That is what turned a one-line value bug into
  "the button does nothing".
- **`updateProductStatusAction` skipped Zod** — alone among the product
  actions — and handed the raw string to PostgREST. It is an exported Server
  Action, i.e. a publicly invocable endpoint, so the CHECK was the only guard
  and its violation surfaced as a generic `INTERNAL_ERROR`. It now parses with
  `productStatusSchema` **before** the ownership check and returns
  `VALIDATION_ERROR`.
- **New `PRODUCT_STATUS_OPTIONS`** (`lib/types/product.ts`, beside the existing
  `PRICE_TYPES` precedent) is the one source for the row menu, the bulk menu,
  the filter popover and the Edit dialog — four places that each spelled the
  trio out and one of which drifted. It carries a `description` per status
  because `unlisted` and `disabled` are indistinguishable by name:
  `sync_product_availability` sets `is_available = (status = 'active')`, so
  **both** hide the offering. The difference is intent — `deleteProduct` uses
  `disabled` + `archived_at` as its soft delete.
- **Bulk status (new).** The table has had a selection checkbox column since it
  was written and **nothing consumed it** — "0 of 1 row(s) selected" with no
  action to take. `DataTable` gained optional `rowSelection` /
  `onRowSelectionChange` / `getRowId` / `toolbar` props (omitted everywhere
  else, so every other table is byte-identical) and the catalogue renders a
  bulk bar when a selection exists. Selection is keyed by **product id, not row
  index** — the default index keys are meaningless across a server-side page
  change — and the bar acts only on ids still present on the page, so a row
  deleted elsewhere can't be swept along by a stale selection.
- **`updateProductsStatus` is one UPDATE with `business_id` in the WHERE**, not
  a loop of single updates: N round trips is slow, and a partial failure
  halfway through leaves a selection nobody can reason about. `archived_at IS
  NULL` is part of that scope so a bulk "set to Active" cannot resurrect a
  soft-deleted offering. Zero rows affected reports `NOT_FOUND` rather than
  toasting a success it never got.
- **Also:** `unlisted` was styled red, which reads as a fault — it is a
  deliberate hidden state, so it takes amber; green stays reserved for success
  per the standing rule. Status cells render the shared label instead of the
  raw column value.
- **Tests (+28):** `productStatusActions.test.ts` — the runtime status list
  matches the Zod enum matches the CHECK; every picker option parses; each of
  the four pickers reads `PRODUCT_STATUS_OPTIONS` **and** names no dead value
  (a source sweep for `value="inactive"` / `"archived"`, which is the exact
  regression); the action rejects `inactive`/`archived`/`''`/`'ACTIVE'` without
  reaching the DB or even the auth check; bulk rejects empty, non-uuid,
  bad-status and over-50 selections. `updateProductsStatus.test.ts` — the
  `.in`/`.eq`/`.is` scope chain, `is_available` never written by hand (the
  trigger owns it), NOT_FOUND on zero rows, and no driver text in the error.
- **PR #22 review (react-doctor + api-doctor) — fixed in-branch:**
  - **The bulk bar acted on less than it visibly had ticked.** Selection
    survived a page/filter/search change while the action was narrowed to the
    current page, so five ticked boxes reported "2 selected", updated 2, and
    cleared all 5. Selection is now dropped whenever the row set changes — what
    is ticked is always what will be acted on.
  - **The single-row path could resurrect a soft-deleted offering.**
    `getProductById` does not filter archived rows, so
    `updateProductStatusAction(<deletedId>, 'active')` put it back on the public
    menu — the exact thing the bulk path's `archived_at IS NULL` scope prevents.
    `updateProduct` now refuses archived rows, with the same predicate on the
    write as defense against a concurrent delete.
  - **Zod schemas moved to `lib/validation/products.ts`** (`bulkProductStatusSchema`,
    `productIdSchema`, `MAX_BULK_STATUS_IDS`) — they were inline `z.object()` in
    the Server Action, the one place `code-principles.md` says they must not be.
    The bulk cap and the page's `perPage` ceiling are now **one constant**, so
    "select all on this page" cannot outgrow the cap silently. The page was
    also carrying a **fifth** hand-written copy of the status trio; it reads
    `PRODUCT_STATUSES` now.
  - **Both status actions are rate-limited per user** (30/60s, env-tunable,
    after the auth check). Server-Action POSTs never enter the proxy limiter and
    the bulk call is a 50-row write amplifier — same guard shape as
    `requireCustomer`.
  - **`id` is guid-validated** on the single-row action, matching its bulk
    sibling; a malformed id was reaching PostgREST and returning as a misleading
    NOT_FOUND.
  - **The bulk write counts instead of returning rows** —
    `.update(payload, { count: 'exact' })` rather than `.select('id')` read for
    `.length`, per the repo's count rule.
  - **`DataTable`'s three loose selection props became one `selection` object.**
    State without a handler froze the selection; state without `getRowId`
    silently fell back to row-INDEX keys, meaningless across a server-side page
    change. Both are now unrepresentable.
  - **a11y:** the bulk bar stays mounted (unmounting it on clear destroyed the
    focus Radix had just restored, dropping the keyboard user to `<body>`), the
    count is `aria-live="polite"` — it renders above the table, so tabbing
    forward from a row checkbox never reaches it — and the container is a
    labelled `region`.
  - **Corrected a wrong claim in this entry.** Radix's `MenuRadioItem` calls
    `onValueChange` unconditionally, with no equality check, so re-picking the
    current status fired a redundant write rather than being a no-op.
  - Test mock in `updateProductsStatus.test.ts` was a type error
    (`mock.calls[0][0]` on an argless `vi.fn()`), invisible because Next 16's
    build no longer type-checks.
- Verified: `yarn lint` + **1721** tests + a clean `yarn build` green.
- **Not verified — needs a browser:** the submenu, the bulk bar and the amber
  badge have not been clicked through; these are dashboard surfaces behind auth
  and this environment has no login path.

## 2026-08-02 — Product image upload 413: Server Action body limit (develop)

> Config only. No schema, API-contract, or auth change. LOW risk.

- **Adding a product image failed with `Error: Body exceeded 1 MB limit`
  (413).** Server Actions default to a **1 MB** request body, but every upload
  action already enforces its own **2 MB** per-file cap
  (`productActions.MAX_IMAGE_SIZE`, `branchActions.MAX_IMAGE_SIZE` /
  `MAX_DOC_SIZE`) and both product dialogs advertise `maxSizeLabel="2 MB"`. So
  any image over 1 MB was rejected by the transport **before** the handler's
  own size check ran — the user saw a 500, not the friendly validation message.
- **Fix:** `experimental.serverActions.bodySizeLimit: '3mb'` in
  `next.config.ts`. Not 2 MB exactly — the request also carries multipart
  boundaries and the other form fields, so a 2 MB file needs a body budget
  above 2 MB. Stays under Vercel's 4.5 MB platform function-body cap (the same
  ceiling that forced the registration upload split on 2026-07-16).
- **Per-file caps are unchanged at 2 MB** — this only widens the transport so
  the app's own limit is the one that actually applies.
- **Test (+3):** `__test__/config/server-action-body-limit.contract.test.ts`
  asserts the limit is declared, **strictly exceeds every `MAX_*_SIZE` the
  upload actions enforce** (so raising a per-file cap without raising the body
  budget fails the build), and stays under 4.5 MB.
- Verified: `yarn lint` + **1688** tests + a clean `yarn build` green.
  ⚠️ `next.config.ts` is read at boot — **restart `next dev`** for this to take
  effect.

## 2026-08-01 — Product Catalogues: shop sections, and the taxonomy split (feat/rebranding)

> **TWO schema migrations — HIGH risk by policy: new table + 4 RLS policies + 2
> SECURITY DEFINER triggers + an anon/authenticated-granted RPC.** Applied,
> red-teamed and `migrate-reset`-verified on **LOCAL ONLY**. ⚠️ **Needs human
> approval before merge, then `make migrate-cloud` + a
> `supabase_migrations.schema_migrations` ledger reconcile** (the Supabase MCP
> records its own timestamp as the version). They queue behind the 10
> migrations cloud is already missing — 12 total. Plan kept local
> (`.claude/CATALOGUES.md`, not committed).

- **The "Manage Catalogues" drawer was a mock, and could never have been
  anything else.** Add and rename were `console.info`, delete had no handler,
  **Save Changes had no handler**, the search box was unbound, every row read a
  hardcoded "99 Products", and the copy claimed "changes are saved locally"
  when nothing was saved anywhere. It also could not have worked: it wrote to
  `categories`, whose RLS is admin-only, so an owner INSERT is a 42501 whatever
  the UI does. Deleted rather than hidden — a hidden mock is an invitation to
  re-enable it.
- **The fix is a taxonomy split, not a repair.** `categories` stays the
  PLATFORM axis (admin-curated: explore filters, facets, SEO slugs, cross-shop
  analytics). New **`product_sections`** is one shop's own merchandising —
  "Hot drinks", "Pasalubong" — where a bad row embarrasses one shop instead of
  landing in the platform's navigation. A product carries BOTH `category_id`
  (how strangers find it) and `section_id` (how this shop arranges it).
  Deliberately **not** a nullable `business_id` on `categories`: that shortcut
  makes every read depend on remembering a filter, and the one query that
  forgets leaks a shop's private naming into the global picker — the class of
  mistake that exposed the whole follow graph in `20260607000000`.
- **Schema (`20260801061117`):** `product_sections` (`business_id`, `name`
  CHECK 1–40, `position`, `archived_at`), a partial unique index on
  `(business_id, lower(btrim(name)))` over live rows so "Hot Drinks" and "hot
  drinks" collide, public-read policy matching the `business_posts` gate, owner
  `FOR ALL` with an **explicit `WITH CHECK`** (a FOR ALL policy silently reuses
  USING for writes — the PR #18 lesson), admin policy, `(select auth.uid())`
  throughout, a 30-section cap trigger raising private **`IL003`**, and
  `products.section_id` (`ON DELETE SET NULL`) whose archive path **clears the
  pointer via trigger** so a soft-deleted section can never take inventory with
  it. Counts come from `section_product_counts(business_id, branch_id)` —
  **SECURITY INVOKER**, unlike the analytics RPCs, because RLS already
  expresses exactly the right scope and a DEFINER function would have to
  re-implement that check.
- **Schema (`20260801064656`):** `categories.business_type_id` populated —
  F&B → Food & Beverage, Clothing/Electronics/Home → Retail. **Health & Beauty
  stays global on purpose**: it belongs to a salon's services and a pharmacy's
  shelves alike. The picker reads *"my vertical OR global"*, so NULL means
  *offered everywhere* and an unmapped or renamed row degrades to
  visible-everywhere rather than vanishing. The seed repeats the mapping
  (COALESCE'd) because `business_types` are created by the SEED, which runs
  **after** migrations — the same trap that blanked every `offering_profile`.
- **App layer:** `product_sections` types/Zod/query/service, four Server
  Actions behind `verifyBusinessOwner` (each passing the **verified** id, never
  the client's), a real drawer where **every edit saves on the spot** (the
  staged Cancel/Save could only ever lose work), chips switched to sections
  plus **All** and **Uncategorised** (85 products had no grouping and were
  reachable from no chip at all), a section picker in both product dialogs, and
  the public shop page grouped under the shop's own headings with ungrouped
  offerings last under "More".
- **🔴 Cross-shop hole closed:** a `section_id` from the client is not proof of
  ownership — the FK only says the row exists. `sectionBelongsToBusiness()`
  now runs before every product write.
- **🔴 Separate live bug found and fixed:** the business **profile** form's
  Category picker was filled from the OFFERING categories, but
  `businesses.category_id` FKs to **`business_categories`** — every option was
  an id from the wrong table, so saving raised a foreign-key violation and a
  shop could never change its category. Now read server-side from the right
  table and passed as a prop.
- **Pre-existing, fixed because it blocked typecheck:**
  `getProductStatsByBusiness` counted `'inactive'`/`'archived'`, values
  `products.status` cannot hold (the CHECK is `active|unlisted|disabled`), so
  both buckets were always zero wherever rendered.
- **Also in this pass:** explore + dashboard visual revamp — `PageHeader`
  across every business and customer page, id-derived brand tones shared by the
  directory card, deals wall and shop hero (`brandTone.ts`), distance-forward
  nearby cards, a dashboard "first answer" replacing equal-weight cards, the
  `Celebrate` success moment (product added, promo **published**, shop
  verified — never on a delete), and `ProCard` removed (an empty `<Progress />`
  and a button to nowhere, advertising billing that does not exist).
- **PR #21 review (react-doctor + api-doctor) — fixed in-branch:** the **All
  chip could never render selected** (Radix computes `value ? [value] : []`, so
  an empty-string item value is never in the pressed set); **reorder could
  silently revert itself** (payload rebuilt from props that `router.refresh()`
  had not yet updated — now optimistic local order); `products.section_id`
  gained an index **leading with it** (the archive trigger and the FK's RI
  check were both seq-scanning `products`); the cap trigger now covers
  **un-archive**; a failed counts RPC reports `counts_failed` instead of
  letting placeholder zeroes make the archive dialog say "this section is
  empty" before moving real offerings; `reorderSections` verifies rows-affected
  instead of toasting success it never confirmed; `business_type_id` is
  guid-validated before reaching a PostgREST `.or()` filter string; the profile
  picker moved off a client effect with no `.catch()`; counts are branch-scoped
  so the chips agree with the filtered table; `Celebrate`'s context value is
  memoised; the deal card pins `Asia/Manila`; `outline-none` → `outline-hidden`
  (Tailwind v4 drops the ring in forced-colors mode).
- **Tests:** +~90 across the branch (**1674** total, plus 3 SQL suites —
  `product_sections`, `category_scoping`, and the existing sets). Verified:
  `yarn lint` + `yarn test:run` + a clean `yarn build` (`.next` removed, no dev
  server running) + `make migrate-reset` re-applying both migrations from
  scratch.
- **Not done:** cloud apply (needs approval), a pre-flight run of the
  `category_scoping` orphan query against cloud data, and the dashboard browser
  sweep — those surfaces are behind auth and this environment has no login
  path.

## 2026-08-01 — Link previews: the share card that was missing (feat/rebranding)

> Presentational + metadata. No schema, API, or auth change.

- **Sharing any page to Facebook or Messenger produced a bare text card.**
  Title, description, `og:site_name` and `og:type` were there; **`og:image`
  was not**, and neither was `metadataBase` — without which Next cannot turn a
  relative image path into the absolute URL every crawler requires. The
  per-business pages (`/s/[id]`, `/explore/[id]`) did set images, so only they
  previewed with a picture.
- **New `app/opengraph-image.png` + `app/twitter-image.png`** (1200×630, 69 KB)
  built from the brand assets: Brick Ember field, Jasmine wordmark, the
  jasmine/petal blooms from the landing's gradient, grain. Uses Next's file
  convention, so `og:image`, `:type`, `:width` and `:height` are emitted
  automatically. `.alt.txt` alongside each, for screen readers on the post.
- **Root metadata now carries** `metadataBase`, `alternates.canonical: './'`
  and `openGraph.url: './'` — both resolve per-route, so every page advertises
  itself instead of every page claiming to be the home page — plus
  `og:locale: en_PH` and `twitter:card: summary_large_image`.
- **The base URL is configuration, not the request.** A crawler can be pointed
  at any host and the `Host` header is attacker-controlled, so it comes from
  `NEXT_PUBLIC_APP_URL` with a localhost fallback for dev.
- **⚠️ Deployment note: `NEXT_PUBLIC_APP_URL` must be set at BUILD time.**
  `NEXT_PUBLIC_*` is inlined during the build, so setting it only in the
  runtime environment leaves every share card pointing at
  `http://localhost:3000`. Verified both ways: a default build emits localhost
  URLs; `NEXT_PUBLIC_APP_URL=https://ilokal.shop yarn build` emits
  `https://ilokal.shop/opengraph-image.png`.
- **Tests (+9):** `app/__tests__/social-preview.contract.test.ts` — asserted at
  the source level because `app/layout.tsx` pulls in `next/font/local` and
  `globals.css`, neither of which loads under the node test environment. Guards
  `metadataBase`, that the origin comes from config and never from headers, and
  that both cards exist at 1200×630, under Facebook's size ceiling, with alt
  text.
- **Business pages had a card, but a broken one.** `/explore/[businessId]` and
  `/s/[businessId]` both set `openGraph`, and **Next replaces a parent
  `openGraph` rather than merging it** — so declaring `{ title, images }` in a
  route silently dropped `og:site_name`, `og:type`, `og:locale` and `og:url`
  from the root layout. A Facebook card with no site name reads as a scrape.
  `/explore/[businessId]` also had **`twitter:image` falling through to the
  root `twitter-image.png`**, so a shop previewed as its own banner on
  Facebook and as the generic iLokal card on X.
- **New `lib/utils/socialCard.ts`** owns the business card for both routes, so
  the two public business surfaces cannot drift. It restates the replaced
  fields, keeps `twitter:image` on the same picture as `og:image`, prefers the
  landscape banner over the square logo, and only gives a real banner
  `summary_large_image` — a square logo stretched to 1200×630 is pillarboxed
  with grey bars. With no imagery at all it omits `images` entirely (absent,
  not empty) so the root card is inherited.
- **Tests (+6 more):** `lib/utils/__tests__/socialCard.test.ts` covers each of
  those, including the absent-vs-empty distinction.
- Verified: `yarn lint` + **1566** tests + `yarn build` green; tags confirmed
  in the served HTML on `/home`, `/explore`, `/sign-in`, plus a banner shop, a
  logo-only shop and `/s/[id]`, and the images fetched back 200.

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
- **Tests (+23, 1528 → 1551):** `landing/__tests__/sections.test.tsx` — every
  jump-nav target resolves, nav order equals page order, the business block is
  the only `<ol>` on the page, the claim code announces once rather than six
  times, the category filter keeps every chip reachable, cards straighten on
  keyboard focus and not only hover. Everything renders under `MotionConfig
  reducedMotion="always"`, so the suite doubles as the reduced-motion check.
- Verified: `yarn lint` + **1551** tests + `yarn build` green. Production
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
- **The hero's right column carries the live product, not photography.** At
  >=1024px it was empty, which on a page arguing "go outside and eat with
  people" read as unfinished. A first pass filled it with the identity deck's
  stock frames — two people laughing on a seamless backdrop, a black-gloved
  hand holding a phone — and it looked like exactly what it was, an agency
  mockup rather than Iloilo. **Reverted.** The deck has no candid photography
  usable here: its one genuinely candid frame is ~435px wide, and the
  moodboard shots are *other brands'* reference images, not iLokal's to ship.
  So the column carries the same hand of shops the search is finding, dealt
  out and re-dealt as the craving changes. That makes the hero one idea
  instead of two competing ones — the question on the left, the answer on the
  right, one `useCravingRotation`.
  `CravingSwitcher` split into that hook plus `CravingSearchBar` and
  `CravingSpread`; the spread fans (overlapping, hand-tilted) beside the
  headline from lg and lays out as a row below it, because a fan needs height
  a phone does not have. Fan steps are fixed rem against a fixed card height —
  a percentage of the container does not track the card, and anything tighter
  than an 11rem step against a 12rem card ate the district and walk time, the
  two facts that make the spread worth reading.
  The headline needed a second size ramp at lg: the wrap caps at 1200px, so
  the column stops growing while `8.5vw` does not, which at 1440 pushed "The
  best spots" onto two lines. NearYou's heading moved to the deck's other
  proximity line ("Your next craving is closer than you think") and stays
  there.
  **Real photography of real Ilonggo shops still belongs in this column** when
  it exists; the fan would move under the search bar on the left.
- **Still deferred:** a scrolled state for the nav.
- **Review hardening (react-doctor + api-doctor, PR #19):**
  - **🔴 The hero pill still shipped EMPTY in the server HTML.** The whole
    point of this branch's reveal rewrite was that nothing renders blank
    without JS — and the page's signature control was the one thing that did.
    `useState(reduced ? cravings[0].query : '')` seeds off `useReducedMotion()`,
    which is **always `false` during SSR**, so the visible span was `''` and
    only the `sr-only` copy carried the text. `sections.test.tsx` couldn't see
    it: its guard greps for `opacity:0`, and this failure mode is empty text,
    not a hidden element. Now seeded with the first query unconditionally, and
    the type-out starts at the first **switch** rather than at hydration — re-
    typing on mount would have blanked the pill for half a second the moment JS
    arrived, trading an SSR bug for a hydration flicker. Verified in the built
    `/home` HTML: `>batchoy</span>` is present.
  - **The `'use client'` was on the wrong component.** It sat on
    `LandingPage`, the composition root, so all seven sections compiled into
    the client bundle regardless of their own directives — the "five of seven
    are server components" claim above was not true of the shipped build. The
    boundary now wraps the chrome (`LandingShell`: theme, nav, footer, gradient)
    and the sections arrive as `children`. Verified: CounterMoment-only copy
    ("the whole thing", "no printing") appears in **0** client chunks, while
    Hero's and DealsWall's still do — those two genuinely need the client.
  - **The lockup preloaded four images to paint two.** In `palette="auto"`
    both cuts render and CSS picks one, and `eager` was putting `priority` on
    both — so the nav emitted a preload for two images that land in
    `display:none`, a net LCP loss from the change made to protect LCP.
    `priority` is now light-cut only. Neither mark had `sizes` either, so
    next/image preloaded the 512px mark into a 28px box and the **1128px**
    wordmark into a ~120px one. Verified on the built `/sign-in`: 2 brand
    preloads (was 4), `imageSizes="28px"` and `"128px"`.
  - `FinalCta`'s wordmark was `priority` — a preload of the **last** section on
    the page, competing with the real LCP resource. Now lazy with a real
    `sizes`.
  - **The claim code announced as nothing.** `aria-label` was on a `<p>`, where
    ARIA prohibits naming, so AT dropped it — and all six character tiles are
    `aria-hidden`. `role="img"` makes the label take. The test asserted the
    attribute existed, which it did; that isn't the same as being exposed.
  - **Twelve keyboard stops that did nothing.** `ShopCard` and `DealCard` were
    `tabIndex={0}` `<article>`s with nothing to activate — three in the hero
    fan, nine on the deals wall, sitting between the filter chips and the "All
    deals" link, and their only effect was to un-tilt a card. Removed with the
    focus-visible styling; when these become real shops they should be links,
    and the focus stop returns with a destination. Test inverted to guard it.
  - **`/s/[businessId]` rendered "Name · iLokal · iLokal".** The new root
    `title.template` applies to `metadata.title`, and this page still appended
    the suffix itself — one of the 14 that were meant to be stripped. The
    template does NOT apply to OG/Twitter titles, so those keep the spelled-out
    brand (the pattern `/explore/[businessId]` already uses).
  - **The anchor guard was guarding retired anchors.** `routeConfig.test.ts`
    still asserted `landingSectionPath('about')` and `('shoppers')` — both
    deleted from `LandingSection` by this branch. It stayed green (the helper
    is string concat) while documenting two anchors the page no longer renders,
    which is the exact regression the union exists to prevent. Retargeted to
    `voices` / `near-you`.
  - **The claim code's "settle" was never once seen.** The tiles used
    `.il-rise` — the hero's page-LOAD entrance — so the animation fired on
    first paint and was long finished by the time anyone scrolled six sections
    down to it. New `.il-settle` is scroll-linked like the other reveals.
    Staggering it needed a **shifted `animation-range`**, not
    `animation-delay`: a scroll-driven animation is progressed by scroll
    position, so a time delay does nothing at all. Each tile offsets its entry
    window by `--i * 4%`, which is what makes the code land left-to-right.
  - **Pally shipped twice.** `next/font/local` only reads the sources at build
    time and re-emits them hashed and immutable under `/_next/static/media`, so
    keeping the originals in `public/` also served every face a second time at
    `/fonts/Pally-Bold.woff2` — uncache-busted, and requested by nobody. Moved
    to `assets/fonts/` (`git mv`, so history follows); docs and the brand
    contract test repointed. Verified: all three still preload from
    `_next/static/media`, and `public/fonts` no longer exists.
  - `advance.current = …` in `useCravingRotation` was a **ref write during
    render**, which React explicitly disallows and which is not
    concurrent-safe. It also bought nothing — the updater form already reads
    the latest index. Deleted; the timeout calls `setIndex` directly.
  - Verified: `yarn lint` + **1551** tests + a clean `yarn build` (`.next`
    removed first, no dev server running) all green, plus the built-output
    checks quoted above.

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
