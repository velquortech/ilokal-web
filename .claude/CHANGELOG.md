# Changelog

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
