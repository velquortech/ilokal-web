# CLAUDE.md — iLokal Web

> **⚠️ Cloud sync was VERIFIED on 2026-08-10 through `20260808090000` ONLY.**
> At that date every migration after `20260717082537` was confirmed applied to
> `ilokal-database` by object existence, cross-checked with
> `supabase migration list --linked`. **That verification has not been repeated
> since.** `supabase/migrations/` now holds **47** migrations after
> `20260717082537` (max version `20260819010000`, 151 files total) — so **23
> migrations added after the audit have never been probed against cloud.**
> Their state is UNKNOWN, not "behind" and not "in sync".
>
> **Do not assert either direction from memory or from this file.** Re-derive:
> `yarn supabase db query --linked -f supabase/reports/cloud_drift_probe.sql`
> (read-only, one verdict per migration). A stale "it isn't there" costs as
> much as a stale "it is" — an older version of this banner told people to
> avoid tables that had been in production for weeks, and the version before
> that claimed a backlog that did not exist.
>
> **🔴 The probe itself is now incomplete.** `cloud_drift_probe.sql` carries
> **31** version rows against **47** migrations after the cutoff, so **20
> migrations have no probe row and are silently reported as nothing at all**.
> Add a row to its `VALUES` list for each missing version before trusting a
> run. (`cloud_object_inventory.sql` still declares 98 objects, matching the
> count quoted below.)
>
> **Flag values ON CLOUD as read on 2026-08-10 (not re-read since):**
> `enable_events` **true** · `enable_onboarding_tour` **true** ·
> `auto_verify_businesses` **true** · `require_business_documents` **false**.
> Events are **not dark** — the "ships dark" note that used to sit here
> described the seeded default, not the current value. (Whether events RENDER
> also depends on the deployed build carrying the events code; only the flag
> was verified.)
> **`enable_bookings` is no longer a live web flag** — the 2026-08-17 removal
> deleted every web reader of it (admin allowlist, Feature Flags card, both
> shells). The `app_settings` row and the `public_feature_flags()` return
> column still exist and are still read by the DB contract, but nothing in this
> app branches on them; see "Schema state" for the dormant booking schema.

> **Active work:** Registration-funnel recovery (49% of owner accounts never
> produce a business row) — parities, phased action items and the testing plan
> in [`.claude/REGISTRATION_FUNNEL.md`](.claude/REGISTRATION_FUNNEL.md).
> Phase 1 and Phase 3 each carry one pending migration. Delete that file and
> this note when finished.

## Commands

```bash
# Next.js
yarn dev             # Start dev server
yarn build           # Production build
yarn lint            # ESLint
yarn lint --fix      # ESLint with autofix
yarn test:run        # Vitest (single run)
yarn test            # Vitest (watch)

# Supabase / Make
make setup-supabase  # First-time setup
make run-dev         # Start Supabase + Next.js
make stop-db         # Stop Supabase DB
make clean           # Full teardown
make migrate-new name=<name>  # New migration file
make migrate-up      # Apply pending migrations
make migrate-reset   # Reset and re-apply all
make generate-types  # Regenerate lib/types/database.ts
```

Soft test step: `yarn lint --fix && yarn build` (or `make review` to include tests)

## Package manager

**yarn** — always use `yarn` instead of `npm`. Never run `npm install`, `npm run`, or `npx` (use `yarn dlx` instead).

## DRY — search before you write

**Before adding a function, table, component, schema or helper, look for the one
that already does it, and reuse it.** A second implementation of something is
not neutral: it doubles the surface a bug can hide in, and the two copies drift.
This repo has already paid for that — the status trio was spelled out in five
separate files until one of them drifted to values the DB rejects, and "Set
Status" silently did nothing for weeks.

Reuse means *call the existing thing*, not copy it. If it is close but not
general enough, **widen it and keep one caller-visible name** (rename + alias so
no call site breaks) rather than forking a near-duplicate.

- **Search first, in this order:** `lib/utils/` (pure helpers) → `lib/api/*/`
  (query + service per domain) → `lib/validation/` (Zod) → `components/custom/`
  → `supabase/migrations/` (an RPC or trigger may already do it).
  `grep -rn "<the noun>" lib app components supabase` costs seconds.
- **A shared constant, not a repeated literal.** Anything spelled out in more
  than one file — a status set, a size cap, a route string, a bucket name — is
  one exported constant. Route strings come from `config/routeConfig.ts`; that
  rule is a special case of this one.
- **Components are role-agnostic until proven otherwise.** A component that
  reads `getCurrentUser()` and lets RLS scope the data works for every role —
  mount it again, do not rebuild it per surface. Move it to `components/custom/`
  when the second surface appears.
- **New table? Prove the existing one can't hold it.** Check whether the FK
  already points at `auth.users` / `businesses` and a nullable column or a new
  `type` value would do. Normalized beats parallel: two tables with the same
  shape means two sets of RLS, indexes, queries, services and UI.
- **New RPC? Check whether an existing one already authorizes your caller.**
  `create_notification` covers admin→anyone and self→self; only a caller who is
  *neither* needs a new SECURITY DEFINER function (that is why
  `notify_coupon_redemption` exists, and it is the template when you do).
- **Extend the map, don't branch beside it.** `Record<SomeUnion, …>` maps
  (`TYPE_ICON`, `TYPE_TONE`, label tables) make a missing case a compile error.
  Add the entry; never add an `if` next to the map.
- **Duplication that IS justified:** when the two callers genuinely change for
  different reasons. Say so in a comment, so the next reader does not "fix" it
  by merging them.

## Stack

Next.js 16 (`^16.2.6` in package.json; App Router; latest stable — open proxy-bypass advisories have no stable fix yet, compensated in the Proxy bullet) · React 19 · TypeScript strict · Supabase SSR + PostGIS · Zod 4 · shadcn-ui + Radix UI · Tailwind CSS v4 · Vitest

**Stack is frozen — no new dependencies without explicit approval.** Do not
`yarn add` any package (runtime or dev) unless the user explicitly asks for it
or approves it first. Solve problems with what's already installed: React/Next
built-ins, `react-dom/server` for static component tests, existing shadcn/Radix
components, sharp, motion, axios, sonner, etc. If a task genuinely needs a new
package, stop and propose it (name, why existing deps can't do it, size/risk) —
don't install speculatively. Same rule for new external services, CDNs, fonts,
or APIs.

## Design system — brand v1.0 (standing direction)

The **"Presented Brand Identity"** (2026-08-01) is the identity, not a phase.
It replaced the v0.2 green "Hablon Weave" in full. Full palette, measured
contrast ledger, OKLCH token tables and type system:
[`.claude/docs/DESIGN.md`](.claude/docs/DESIGN.md). Asset rules:
[`public/brand/README.md`](public/brand/README.md). The rules below are the
ones that cause real defects when unknown — read DESIGN.md before any
significant visual work.

**Palette.** Brick Ember `#D70005` (primary) · Jasmine `#FEE87B` · Cornsilk
`#FEF8D6` · Petal Frost `#FCD9F7` · Porcelain `#FBFAF6` · Charcoal `#1A1A1A`.
Use semantic tokens (`bg-primary`, `text-muted-foreground`) — raw hex only for
brand moments that genuinely have no token.

- **Nothing green is brand.** `#65A30D` / `#84CC16` are retired;
  `brand.contract.test.ts` sweeps `app`/`components`/`lib`/`config` and fails
  on any reintroduction. It matches hex, so watch `rgba()` — five green shadows
  survived the rebrand precisely because `rgba(101,163,13,…)` isn't a hex.
- **Green is still correct for *success*.** `StatusBadge`, verification badges,
  active pills, trend-up arrows stay green. Success-green beside brand-red is
  the signal; repainting them destroys it.
- **Never hardcode `#D70005` on a dark surface** — it measures 3.23:1 and fails
  AA. `--brand` / `--primary` already switch to the lifted `#DD2920` under
  `.dark`; hardcoding bypasses that.
- **Jasmine on Brick Ember is 4.38:1 — large display type only.** Fine for the
  logo lockup, never for body copy.
- **Destructive is deliberately maroon** (`#8E0B14` / dark `#BD3855`), because
  the brand red *is* `--primary` and stock red would make Delete read as Save.

**Type.** Pally (display) + Inter (body) + Geist Mono. `h1`–`h6` get Pally
automatically from `@layer base` — do not add `font-display` to headings. Pally
has no 800; `font-extrabold` resolves to Bold. Sources live in `assets/fonts/`,
**not** `public/` — `next/font/local` reads them at build time and re-emits them
hashed, so a copy under `public/` just ships every face twice.

**The wordmark is drawn lettering, not a typeface setting.** Never render the
literal text "iLokal" as a logo — use `BrandMark` / `BrandWordmark` /
`BrandLogo` from `components/custom/BrandLogo.tsx`. Assets are matted PNGs;
**there is no vector source**, so 1128px is the ceiling (fine for web, not for
large print). `palette="auto"` renders both cuts and lets CSS pick, so `eager`
sets `priority` on the light cut only — priming both preloads images that never
paint. Both marks carry `sizes`; without it next/image preloads the 1128px
wordmark into a ~120px box.

### Landing invariants (`app/home/components/landing/`)

The landing is "the walk": one ambient gradient sky (`GradientField`) warming as
you descend, broken twice by a solid Brick section, with the craving switcher as
its signature. These are the rules it is built on — breaking one has already
shipped a blank page once:

- **Reveals are CSS view-timeline animations (`.il-reveal` / `.il-rise` /
  `.il-settle`), NEVER motion's `whileInView`.** Motion writes `initial` into
  the SERVER HTML, so `whileInView` shipped `style="opacity:0"` on everything
  and the page rendered blank without JS. `sections.test.tsx` guards this.
- **Nothing may be invisible in the server HTML — and the guard only greps
  `opacity:0`.** Empty text passes it. Any state seeded from a client-only
  value (`useReducedMotion()`, `resolvedTheme`, `mounted`) is `false`/unset
  during SSR: seed from the real content and correct after mount, never the
  other way round.
- **Scroll-driven animations ignore `animation-delay`.** Progress comes from
  scroll position, not time. Stagger with a shifted `animation-range`
  (`.il-settle` uses `--i`).
- **The client boundary belongs on `LandingShell`** (theme, nav, footer,
  gradient), not on `LandingPage`. `'use client'` on the composition root drags
  every section into the client bundle regardless of its own directive.
- **Landing dark mode is `next-themes`**, not page-local `useState` — one
  toggle has to move both the custom properties the shared chrome reads and the
  `.dark` class the sections read.
- **`landing.css` rules must stay scoped to the chrome.** A blanket
  `[data-ilokal-root] a` is specificity (0,1,1) and beats every Tailwind
  utility (0,1,0), so new sections silently get red links and stripped buttons
  no class can override.
- **`LandingSection` in `config/routeConfig.ts` is the cross-surface anchor
  contract.** Renaming a section id without updating it turns `/explore`'s nav
  into dead links — which has happened. Keep it in lockstep with the ids the
  sections render; `sections.test.tsx` asserts both directions.
- Decorative fixture cards are **not** focusable. A `tabIndex={0}` on something
  with nothing to activate is a dead keyboard stop; make it a link or leave it
  out.

## Architecture

- **Routing:** App Router only. Server Actions for internal mutations, API routes for external/mobile integrations.
- **Server Actions:** Use static imports from `lib/api/*/Service` and `lib/api/*/Query` directly. Never call `lib/services/` HTTP wrappers from a Server Action — they make an unnecessary network round-trip. `lib/services/` is for the admin/axios pattern only.
- **Supabase must never appear in components.** Components (`.tsx` files) must never import from `@supabase/ssr`, `@supabase/supabase-js`, `config/client.ts`, or call `createBrowserClient` / `createServerClient` directly. All Supabase queries and auth calls belong in Server Actions (`'use server'`) under `app/**/actions/` or `lib/api/`. Components call the exported action function — they never touch the Supabase client. This keeps auth logic, RLS scoping, and DB access in one auditable layer and prevents credential leakage into client bundles.
- **API namespaces:** `app/api/web/` — web-facing routes; `app/api/mobile/` — public mobile; `app/api/protected/mobile/` — JWT-gated mobile; `app/api/admin/` — admin only; `app/api/auth/` — auth flows.
- **Proxy:** Single `proxy.ts` at repo root (Next.js 16 replaces `middleware.ts`). (1) **Rate-limits** the whole mobile surface (`/api/mobile` + `/api/protected/mobile`) by client IP before any auth/DB work — 200 req / 60s default (env `MOBILE_RATE_LIMIT` / `MOBILE_RATE_WINDOW_MS`), returns 429 + `Retry-After`. In-memory/per-instance (`app/api/helpers/rateLimit.ts`) — a baseline flood guard, not a distributed quota (swap for Upstash/KV for that). (2) Refreshes session cookies for page routes. (3) Verifies JWTs for `/api/protected/**` via `supabase.auth.getUser()` and forwards `x-verified-user-id`. That header is **defense-in-depth only** — `getMobileUser()` always re-verifies the JWT itself and does NOT trust the header to skip `getUser()`, so a proxy bypass can't yield impersonation (compensating control for the open Next ≤16.3.0-canary proxy-bypass advisories).
  - Protected mobile handlers: call `getMobileUser(req)` from `app/api/helpers/mobile-request.ts` — **always verifies the JWT via `getUser()`**, returns `{ user, token, supabase }` with an RLS-scoped client.
  - Web/admin handlers: call `assertAuthorized(req)` from `lib/utils/auth/`.
- **Auth:** Supabase SSR with HTTP-only cookies (web) or `Authorization: Bearer <jwt>` (mobile).
- **Types:** `lib/types/` — re-export from `lib/types/index.ts`.
- **Validation:** Zod schemas in `lib/validation/`. For UUID ids use `z.guid()`, NOT `z.uuid()`/`z.string().uuid()` — Zod 4's `z.uuid()` is strict RFC-9562 and rejects this app's Postgres/seed UUIDs (silently 400s every request that validates an id).
- **Error format:** `ApiResponse<T> = { success: boolean; data?: T; error?: { code: string; message: string } }`.
- **Error leakage:** never pass a backend/Supabase `error.message` into a client response. On 500 paths use `loggedServerError(context, error)` (`app/api/helpers/response.ts`) — logs server-side, returns a generic body. Raw driver errors leak table/column/constraint names; reserve message text for hand-written 4xx.
- **Path alias:** `@/*` maps to project root.

## Schema state

Key facts about the current normalized schema (as of 2026-06-08):

- **`coupons`** — fully normalized in `20260523000000`. Columns: `code` (NOT `title`), `discount` JSONB `{type:'percentage'|'fixed_amount', value:number}` (NOT `type` enum), `expiry_date` (NOT `end_date`), `status` (`draft|published`). `redeem_time_limit_minutes` is gone. `promotion_type` (`'coupon' | 'deal'`, migration `20260523000001`) — the deals feed (`/api/mobile/deals`) filters `promotion_type = 'deal'`. Redemption caps live on the row: `max_redemptions_per_user`, `max_redemptions_global`, `current_redemptions`. `requires_follow` (boolean, default false; renamed from `requires_subscription` in `20260605000004`) — when true the redeem route requires the user to follow the business first. `branch_id` (nullable FK → `branches`, `20260528000001`; `null` = all branches) scopes a coupon to one branch — carried through `CreateCouponRequest`, `createCouponSchema`/`updateCouponSchema`, and `couponService`.
- **`products.status`** — `'active' | 'unlisted' | 'disabled'` (NOT `inactive|archived`). `is_available` is kept in sync by trigger; `status` is canonical. Also has `sale_price` (nullable) and `category_id` → `categories(id, name, slug)` (the `categories` table, NOT `business_categories`).
- **Ratings** — two tables: `ratings` (product-level: `product_id`, `business_id`, `review_text`) and `business_ratings` (`comment`). Mobile rating routes `upsert` with `onConflict`, so each needs a matching UNIQUE: `ratings(user_id, product_id)` (`20260528000006`) and `business_ratings(user_id, business_id)` (`20260508000003`).
- **Redemptions** — `user_redemptions` is the live table (has `expires_at`, `is_claimed`, `branch_id`). `coupon_redemptions` is a dead table — never insert into or query it; use `user_redemptions` for all redemption reads/writes (routes, analytics, service layer). `user_redemptions.coupon_id` has an FK → `coupons(id)` (restored in `20260530000000`; the `20260523000000` normalization dropped it via CASCADE, which broke PostgREST nested `coupons(...)` selects until restored).
- **Coupon claim flow** — redeeming inserts a `user_redemptions` row (`is_claimed=false`); claiming flips it via `PATCH /api/protected/mobile/redemptions/[id]/claim` with an atomic `.eq('is_claimed', false)` guard. RLS `"Users manage own interactions"` (`FOR ALL USING auth.uid() = user_id`) lets the user's RLS-scoped client do both. The redeem route (POST) also enforces a follow gate (`requires_follow` → 403) and rejects a second unclaimed, unexpired redemption of the same coupon (active-dupe → 400). Full rule matrix in `.claude/docs/coupon-rules.md`.
- **`follows`** — social follow table, renamed from `subscriptions` in `20260605000000` (distinct from the billing tables `subscription_plans`/`business_subscriptions`). Policies are self (`"Users manage own follows"`) + admin only — **never publicly readable**. A `USING(true)` public read (`20260607000000`) leaked the whole follow graph to anon and was dropped in `20260608000001`. Follower counts (nearby/detail badges) come from `get_follower_counts(p_business_ids uuid[])`, a SECURITY DEFINER RPC (granted anon/authenticated) returning counts only — never `user_id`. Don't re-add a broad SELECT on `follows`.
- **`business_posts`** (`20260605000003`) — content behind `GET /api/protected/mobile/updates` (merges posts + live coupons + new products from followed businesses). RLS: public read for posts of verified, non-archived businesses; writes owner/admin only (no mobile write path).
- **`user_redemptions.code`** (`20260608000002`) — 6-char display code shown to the cashier, **server-generated** by the `trg_set_redemption_code` BEFORE INSERT trigger (single source of truth — no client/dashboard hashing). The trigger is `ENABLE ALWAYS` so it still fires under `session_replication_role = replica` (see seed-trigger gotcha below).
- **Deals promotion** — the explore feed (`/api/mobile/deals`) sizes bento cards by `subscription_plans.features_promo_boost` (boolean, `20260530000002`), NOT by `price`. The anon feed reads promoted subs via the public SELECT policy in `20260530000003` (active subs on promo-boost plans only). Set the flag on new promoted plans, or they silently won't get boosted.
- **Coupon access invariant** — every route that fetches a coupon for display or redemption must filter `.eq('status', 'published').is('archived_at', null).lte('start_date', now)`. Omitting any of the three allows draft, archived, or not-yet-active coupons to be acted on.
- **`increment_coupon_redemptions(p_coupon_id uuid)`** — SECURITY DEFINER RPC (`20260527000001`). Call via `supabase.rpc('increment_coupon_redemptions', { p_coupon_id })` after inserting into `user_redemptions`. Returns `true` if incremented, `false` if global cap already hit. Must be SECURITY DEFINER — authenticated users have no UPDATE policy on `coupons`. Only the **global** cap is race-safe via this RPC; the per-user cap in the redeem route is a non-atomic count-then-insert (TOCTOU) — concurrent redeems by one user can slip past it.
- **Migration state — VERIFIED THROUGH `20260808090000` ONLY (2026-08-10).**
  As of that audit, all **24** migrations then existing after `20260717082537`
  were applied to `ilokal-database`, with 24 matching `schema_migrations` rows
  (`max(version) = 20260808090000`). `supabase migration list --linked` showed
  both columns populated for every row. Everything from `20260717093122`
  through `20260808090000` — the offerings model, product sections, events,
  booking requests, onboarding columns, both menu-follow-up RPCs, the 4-column
  `public_feature_flags()`, the data-only trade seeds, and `banner_url` on
  `nearby_businesses` — was present on cloud. Confirmed by object existence,
  not by the ledger alone:
  `public.events` (24 cols, 1 row), `public.product_sections` (5 rows),
  `public.booking_requests` (0 rows), and
  `public_feature_flags() RETURNS TABLE(enable_events, enable_bookings,
  require_business_documents, auto_verify_businesses)`.
  - **🔴 That audit is now stale by 23 migrations.** `supabase/migrations/`
    holds **47** migrations after `20260717082537` (max `20260819010000`); the
    24 above are the ones the probe covered. The other 23 — everything after
    `20260808090000`, including the popular-products, product-search, nearby
    type-count and map/draft work — have **never been probed against cloud**.
    Do not read the paragraph above as covering them. Re-run the probe (and
    first extend it — see the next bullet) before assuming either state.
  **Scope of that claim:** ONE discriminator object per migration, plus four
  post-review version assertions (below). It proves each migration ran; it does
  not prove every statement inside it landed — so a second sweep,
  `supabase/reports/cloud_object_inventory.sql`, checks **all 98 named
  objects** (26 functions, 24 indexes, 16 policies, 11 triggers, 21 columns).
  Currently 0 missing.
  - **🔴 That second sweep found a real partial application, and the cause
    generalises.** `idx_products_section_id` was absent from cloud while
    `20260801061117` read APPLIED. It was added to the migration file in a
    LATER commit (`ad680af`) than the one that created it (`b2c9a32`) — cloud
    had already applied the file and written its ledger row, so `db push`
    skipped it and the added statement never landed. **Any migration edited in
    place after cloud applied it silently loses the edit**, and this repo edits
    migrations in place routinely (PR #18, #21, #27, #29 all did). The index was
    created on cloud on 2026-08-10, matching the file's definition byte for
    byte. Re-run the inventory sweep after any in-place migration edit.
  - **Cloud holds the POST-REVIEW versions, checked explicitly.** Several of
    these files were edited in place after review (PR #18 rewrote the seven
    `20260727*`; PR #27 rewrote `20260804233000`; PR #29 rewrote
    `20260805090000`), and a pre-review draft satisfies a plain existence
    check. All four assertions PASS — notably **`booking_requests` has exactly
    three policies and no non-admin UPDATE policy**, i.e. the PR #18 fix for
    the missing `WITH CHECK` is on cloud, not the draft that allowed a direct
    PostgREST `PATCH` to rewrite `user_id`/`status`/`starts_at`.
  > **This bullet claimed the exact opposite until 2026-08-10** — that cloud had
  > none of these tables and that queries against them would 42P01. That was
  > false, and it is the reason to re-probe rather than read: a stale "it isn't
  > there" is as expensive as a stale "it is".
  - **`20260808090000_nearby_banner` was the last gap; applied 2026-08-10.**
    It sat unapplied while 23 louder migrations landed, because **it failed
    silently**: the RPC still succeeded, `banner_url` was simply absent from
    the row, mobile's `z.object()` dropped the unknown-absent key, and the
    nearby cards fell back to `interior_images[0]`. No error, no log line.
    **Signature drift on an RPC is invisible in a way a missing table never
    is** — a missing table 42P01s on first call; a missing return column just
    degrades. Verified post-apply: 19-column signature, `SECURITY DEFINER` and
    `search_path = public, postgis` intact, EXECUTE re-granted to
    `anon`/`authenticated`/`service_role`, and a live call returning real
    `banner_url` values.
  - **Apply procedure** (still needs human approval per Workflow):
    prefer `yarn supabase db push --linked --yes` — it authenticates with a PAT
    over the Management API and needs no cloud `SUPABASE_DB_URL`, which is what
    `make migrate-cloud` demands and what `.env` does not carry (it holds the
    LOCAL connection string only). **`db push` records the FILE's version in
    the ledger, so no reconcile is needed** — confirmed on the
    `20260808090000` apply. The reconcile warning still stands for the Supabase
    **MCP**'s `apply_migration`, which records its OWN timestamp as the
    version; that row must be rewritten to the local file's version or the next
    `db push` re-applies everything.
    Before any `DROP FUNCTION` + `CREATE` migration, save the current
    definition (`pg_get_functiondef`) as a rollback artifact, and expect a brief
    window where anon callers get PGRST202 — the hazard the
    `public_feature_flags` rollout recorded.
  - **Re-verify, don't trust this bullet.** The probe is checked in at
    `supabase/reports/cloud_drift_probe.sql` (read-only; one verdict per
    migration, reporting DDL presence and ledger presence separately):
    `yarn supabase login --token <PAT>` → `yarn supabase link --project-ref
    skvgasimllpyhyudpycu` → `yarn supabase db query --linked -f
    supabase/reports/cloud_drift_probe.sql`. Add a row to its `VALUES` list
    for each new migration.
    **🔴 That upkeep has lapsed: the probe carries 31 version rows against 47
    migrations after the cutoff, so 20 migrations are missing from it.** A
    migration with no row produces no verdict — the run looks clean and says
    nothing about it, which is the same silent-success failure mode this probe
    exists to catch. Extend the `VALUES` list before reading a result as
    coverage.
    The ledger is a hint, not the fact — a row can exist without its DDL (and
    then `db push` silently SKIPS it) or DDL can exist under a different
    version string. For the three **data-only** migrations
    (`20260805120000`, `20260805130000`, `20260807000000` — rows in
    `categories` / `business_categories`, no DDL) an object probe is
    meaningless; probe rows instead (`'Rooms & Stays'`,
    `'Auto Supply / Motor Parts'`, `'Water Refilling Station'` — all three
    present on cloud).
- **Notable DB facts (through `20260717082537`, confirmed on both):**
  `sync_role_to_jwt` trigger (role/status → JWT `app_metadata`),
  `increment_coupon_redemptions` RPC, `UNIQUE ratings(user_id, product_id)`,
  the `20260717*` hardening set (see "API security & performance standards"
  below), and pg_cron jobs `process-notification-outbox` (every minute) +
  `prune-notification-outbox` (daily).
- **`public_feature_flags()`** (widened `20260805090000`) — SECURITY DEFINER,
  granted to anon: returns **exactly four** booleans (`enable_events`,
  `enable_bookings`, `require_business_documents`, `auto_verify_businesses`).
  **The return list is the public contract**, which is why flags are read
  through it rather than from `app_settings`: that table is readable `TO
  authenticated` only, so an anonymous table read returns zero rows and **no
  error**, and a caller reads that as "not configured". `enable_onboarding_tour`
  is deliberately NOT in the list — it is owner-facing, read from the table, and
  fails closed. `get_app_setting_bool` counts only a real JSON boolean; anything
  else takes the default, because all four flags come from one call and an
  uncastable value used to error the whole RPC.
- **`business_settings` onboarding columns** (`20260804233000`) —
  `onboarding_tour_completed_at` and `onboarding_checklist_dismissed_at`,
  nullable, NULL = not answered. The only STORED onboarding facts; every
  checklist item is derived. No new policy was needed: the owner `FOR ALL`
  policy already carries an explicit `WITH CHECK`. Written by upsert, never
  update — the settings row is created lazily. The same migration seeds
  `app_settings.enable_onboarding_tour = true` and adds
  `idx_branches_business_id_live` (partial, `archived_at IS NULL`), because the
  checklist counts pinned branches per shop on every dashboard load and
  Postgres does not auto-index FKs.
- **`ratings`/`business_ratings` INSERT gate (SEC-4, `20260717080351`)** — a
  non-admin can only create a rating for a business they have redeemed a coupon
  from (RESTRICTIVE RLS policy via `has_redeemed_from_business()`). Rating
  routes map the 42501 denial to a friendly 403 — new rating write paths must do
  the same. Editing own rating (UPDATE), admin, and service-role paths are
  ungated.
- **`profiles` privileged columns (SEC-1, `20260717000001`)** — a BEFORE UPDATE
  trigger silently reverts non-admin self-changes to `role` (always),
  `status` (only active↔inactive allowed; never leaves `suspended`), and
  `archived_at` (settable, never clearable). Don't rely on route guards alone —
  the DB enforces this against direct PostgREST calls.
- **Mobile response envelope** — `successResponse(data)` returns data flat (e.g. `{ businesses: [...] }`), NOT wrapped in `ApiResponse<T>`. The `success/error` wrapper applies to web routes only.
- **Migration timestamps must be unique** — `supabase_migrations.schema_migrations` uses version as PK. Two files sharing a timestamp will fail on the second insert.
- **Seed triggers under replica mode** — seed files set `session_replication_role = replica` to bypass the `auth.users` FK, which **skips normal (`O`-enabled) triggers**. A `BEFORE INSERT` trigger that must populate a `NOT NULL` column during seeding needs `ENABLE ALWAYS` (e.g. `trg_set_redemption_code`), or `migrate-reset` fails on the seed insert.

## Mobile route conventions

- **Storage URLs:** any stored image field a mobile route returns must pass through `resolveStorageUrl(supabase, bucket, pathOrUrl)` (`app/api/helpers/storage.ts`). Seeds store full public URLs; real registrations store raw paths — returning the raw value yields a broken image.
- **Pagination:** PostgREST is capped at `max_rows = 1000` (`supabase/config.toml`). Fetch-all-then-paginate-in-memory silently truncates past 1000 rows — push filters and `.range()` into the query.
- **Soft deletes:** `business_types` and `business_categories` have `deleted_at`; filter `.is('deleted_at', null)` (top-level and on embedded relations) so deleted rows don't leak.

## API security & performance standards

Standards established by the 2026-07-17 perf/security audit (branch
`perf/security-hardening`; the audit doc was local and is gone — the findings
and what landed are in the four 2026-07-17 `.claude/CHANGELOG.md` entries). All new
code must follow these:

- **RLS policies: always wrap auth functions** — write `(select auth.uid())` /
  `(select auth.role())`, never bare `auth.uid()`. Bare calls re-evaluate per
  row scanned (Supabase's #1 RLS perf killer). Migration `20260717000002`
  wrapped the entire live policy set; don't reintroduce bare calls. Verify with
  the Supabase performance advisor (`auth_rls_initplan` must stay 0).
- **Aggregations belong in SQL, not Node** — never fetch-all-then-reduce with
  `Map`/`Set`: PostgREST caps at 1000 rows (`max_rows`), so JS aggregates
  silently return WRONG numbers past that. Write a SECURITY DEFINER RPC
  returning the finished aggregate (precedent: `analytics_*`, `mobile_deals`,
  `get_follower_counts`). Analytics RPCs are `GRANT EXECUTE TO service_role`
  only, and the caller must verify business ownership BEFORE the RLS-bypassing
  call.
- **SECURITY DEFINER functions** — always `SET search_path = public, pg_temp`
  and explicit `REVOKE ... FROM PUBLIC, anon, authenticated` + targeted
  `GRANT`. Trigger helpers get a pinned search_path too (advisor lint).
- **Counts** — count-only reads use `select('id', { count: 'exact', head:
  true })` (no row payload). Paginated lists keep `count: 'exact'` piggybacked
  on the data query. Never attach `count` to a `sum()`/aggregate read.
- **Indexes** — Postgres does NOT auto-index FKs: any new FK or hot filter
  column used by queries needs an explicit index in the same migration. Any
  *global* (not business-scoped) leading-wildcard `ilike` search column needs a
  `gin_trgm_ops` index (`shop_name`, `coupons.description`,
  `profiles.full_name`/`email` already have one).
- **Verify schema before writing queries** — the audit found four whole modules
  querying tables/columns that never existed (`reviews`, `subscriptions`,
  `payment_methods`, `page_views`, `products.is_active`, …) — every call
  errored and returned empty for months. Check `lib/types/database.ts` (or the
  live DB) for every table/column a new query touches; don't scaffold against
  an imagined schema.
  **⚠️ `lib/types/database.ts` is itself stale as of 2026-08-18** — it is missing
  the `product_search` and `nearby_business_type_counts` RPCs, both of which have
  migrations on disk (`20260814170000`, `20260812000000`) and live callers
  (`app/api/mobile/product-search/route.ts`,
  `app/api/mobile/businesses/nearby/route.ts`). So "not in `database.ts`" does
  **not** prove "does not exist" right now. Run `make generate-types` and commit
  the diff; until then, cross-check `supabase/migrations/` before concluding an
  object is missing.
  Deleted dead surfaces: `/api/web/{search,trending,
  reviews,subscriptions,billing}`, `/api/web/ratings/[id]`,
  `/api/web/analytics/products`. `getUserBusiness` lives in
  `lib/api/getUserBusiness.ts`.
- **Rate limiting is a MERGE GATE, not a follow-up.** Checked before every push
  and every merge to `main`, and treated as a priority item in any audit or test
  pass — the checklist is in `.claude/docs/git-workflow.md` ("Security Gate"),
  the enforced-coverage table in `.claude/docs/security.md`.
  - **🔴 `/api/web` and `/api/admin` are NOT covered by the proxy limiter** (it
    tests only the two mobile prefixes), and Server-Action POSTs never reach it
    at all. A mutating route on those surfaces is unthrottled **by default** —
    so it must guard itself. This is TD-021, and it is the reason every upload
    route went unguarded for months.
  - Any new `/api/auth/*` route calls `checkAuthRateLimit`
    (`app/api/helpers/auth-rate-limit.ts`): per-IP 30/60s + per-account 8/300s.
  - Any new `/api/web/upload/**` route calls `checkUploadRateLimit`
    (`app/api/helpers/upload-rate-limit.ts`) after auth and **before
    `request.formData()`** — buffering the body and re-encoding it is the cost.
    One shared bucket across all upload doors; a contract sweep discovers routes
    from the filesystem, so a new one fails until guarded.
  - Any new Server Action that writes, uploads, emails or fans out limits per
    user id (30/60s, the `BUSINESS_ACTION_RATE_LIMIT` family).
  - Always 429 + `Retry-After`, keyed on a **verified** identity (never a
    client-supplied id), failing closed when the identity is missing, and
    matching the route's existing error shape — `tooManyRequestsResponse` emits
    `{ message }` while the upload routes emit `{ error }`, because their
    clients read `.error` and a body they cannot read reads as a generic
    failure and invites an immediate retry.
  - Doors that should share a budget **share a key namespace** (`auth:login:*`
    across the route and the Server Action; `web-upload:${userId}` across all
    seven upload routes) — otherwise rotating between them multiplies the
    allowance.
  - All of it is `rateLimit.ts`'s in-memory `Map`, so it is **per-instance**: a
    baseline flood guard, not a distributed quota (TD-007).
- **Storage delete paths** — `upload/[bucket]/[id]` rejects traversal-shaped /
  non-UUID-rooted paths (400) and enforces ownership per bucket (business
  buckets → `verifyBusinessOwner`; `avatars` → first segment must equal the
  caller's user id unless admin). Keep this pattern for new storage routes.
- **Caching (public mobile reads)** — cacheable public GETs use `unstable_cache`
  (error-safe: throw on DB error so failures aren't cached) or route-level
  `revalidate` (`business-types` 5min, business detail 120s, coupons 60s).
  Routes using the cookie client, `searchParams`-heavy routes, and
  header-reading routes stay dynamic. Tag invalidation not wired (Next 16
  `revalidateTag` profile-arg conflict) — keep windows short instead.
- **Cloud migrations via Supabase MCP** — `apply_migration` records its OWN
  timestamp as the version; after applying, UPDATE
  `supabase_migrations.schema_migrations` to the local file's version or the
  next `db push` re-applies everything.
- **Errors go to Sentry; product analytics does not.** Sentry answers "what
  broke and for whom"; pageviews, funnels and growth stay in `view_events` +
  the `analytics_*` RPCs. **A new Server Action must call `logActionError` in
  its catch** — actions return `{ success: false, error: { code } }` instead of
  throwing, so nothing reports them automatically. API 500s are already covered
  via `loggedServerError`. Never `sendDefaultPii: true`, and scrub through
  `lib/utils/monitoring.ts` rather than inline. Details:
  `.claude/docs/monitoring.md`.
- **One `<Toaster>` only** — sonner renders every toast in every mounted
  Toaster; the single instance lives in `app/layout.tsx` (top-right). Never
  mount another. Pending-action toasts use a stable id
  (`toast.loading(msg, { id })`) and dismiss on settle.

## Workflow

- Break work into a prioritized TODO checklist with acceptance criteria and risk level.
- High-risk changes (schema, API, auth) require human approval before merge.
- After each phase update `.claude/CHANGELOG.md`.
- Detect breaking changes (schema/API/type/perf) early — propose phased migration and rollback steps.

## Docs

Always loaded:
@.claude/docs/permanent-rules.md
@.claude/docs/mobile-api.md
@.claude/docs/protected-routes.md
@.claude/docs/auth-rate-limits.md
@.claude/CHANGELOG.md

Load on request (read when topic is relevant):
- `.claude/docs/architecture.md` — system design, auth flow diagrams
- `.claude/docs/folder-structure.md` — where to put new files
- `.claude/docs/authentication.md` — auth flows, signup/login/session detail
- `.claude/docs/protected-routes-strategy.md` — proxy and route guard strategy
- `.claude/docs/security.md` — headers, cookies, CSP, threat model
- `.claude/docs/frontend-patterns.md` — **start here** for data fetching and mutation patterns (Server Components, Server Actions, lib/api vs lib/services)
- `.claude/docs/server-actions.md` — when to use Server Actions vs API routes
- `.claude/docs/session-management.md` — role-based timeouts, activity detection
- `.claude/docs/rbac-model.md` — permission tiers, audit logging
- `.claude/docs/api-wrapper.md` — isomorphic service layer, client vs server imports
- `.claude/docs/tech-debt.md` — universal debt/roadmap doc: audit findings log (TD-NNN), active refactors, protected-route audit phases, and enforcement map
- `.claude/docs/api-strategy.md` — **ARCHIVED** March-2026 status snapshot. Its endpoint list and "480 tests passing" figure are historical; several endpoints it marks ✅ (billing, subscriptions) were deleted 2026-07-17. Read for intent, never for current state.
- `.claude/docs/coupon-rules.md` — coupon claim rules, redeem gates, error codes
- `.claude/docs/testing.md` — untested routes matrix (**partly stale** — lists deleted subscription/billing surfaces; see its banner) + test templates
- `.claude/docs/analytics-dashboard.md` — analytics panel ideas, RFM segments, retention queries, automation nudges
- `.claude/docs/DESIGN.md` — **brand v1.0**: palette, measured contrast ledger, OKLCH token tables (light/dark/sidebar/chart), type system, radius scale. Read before any significant visual work — the "Design system" section above is only the trap list.
- `.claude/docs/caching-strategy.md` — Next.js App Router caching layers, Supabase data-fetching rules
- `.claude/docs/monitoring.md` — **Sentry**: which funnel reports what, the PII scrubbing rules, the `/monitoring` tunnel. Read before adding a Server Action (its catch must call `logActionError` — nothing is automatic there) or editing the CSP
- `.claude/docs/code-principles.md` — TypeScript rules, naming conventions, anti-patterns
- `.claude/docs/component-standards.md` — file structure, naming, shadcn/ui usage rules
- `.claude/docs/git-workflow.md` — conventional commits format, branch naming, PR process
- `.claude/docs/ui-standards.md` — approved UI toolset, responsive strategy, visual consistency rules
- `.claude/docs/business-owner-flow.md` / `business-owner-flow-simple.md` — the owner journey end to end (registration → dashboard), long and short forms
- `.claude/docs/media-and-feed-scaling.md` — the write-time WebP pipeline, the `mobile_deals` RPC, and the notification outbox/pg_cron fan-out
- `.claude/docs/live-db-snapshot.md` — a point-in-time dump of live table shapes; **historical**, re-derive from `lib/types/database.ts` before trusting it
