# Explore ⇄ Landing navigation parity

> Branch: `feat/explore-public-nav` (cut from `origin/main` @ `c368e31`).
> Scope: **presentational only** — no schema, no API, no auth change.
> Delete this file and its `CLAUDE.md` note when the work merges.

## Problem

Navigation between the landing page and the public explore surface is
**one-directional**.

- Landing → Explore: **exists.** `navLinks[0]` in
  `app/home/components/landing/data.ts:44` is `{ href: '/explore', label: 'Explore Shops' }`,
  rendered by `LandingNav` (desktop row + mobile overlay).
- Explore → Landing: **missing.** `components/customer/CustomerHeader.tsx` has
  `NAV_LINKS = [Explore, Nearby, Deals]` only, the brand lockup links to
  `ROUTES.EXPLORE.HOME` (`CustomerHeader.tsx:59`), and `app/explore/layout.tsx`
  renders **no footer**. Once a visitor lands on `/explore` there is no in-page
  route back to `/home` — only the browser Back button.

## Surfaces involved

| Surface | Chrome | Styling system | File |
| --- | --- | --- | --- |
| `/` + `/home` | `LandingNav` + `BetaBanner` + `LandingFooter` | self-contained: `[data-ilokal-root]` + `rootStyle(dark)` tokens + `landing.css`, inline `styleFromString` | `app/home/components/landing/*` |
| `/explore`, `/explore/nearby`, `/explore/deals`, `/explore/[businessId]` | `CustomerHeader`, no footer | app-wide shadcn/Tailwind tokens + `next-themes` | `app/explore/layout.tsx`, `components/customer/CustomerHeader.tsx` |

---

## Why "just reuse `LandingNav` on /explore" does not work as-is

Mounting `LandingNav` inside `app/explore/layout.tsx` verbatim fails on five
counts. Each is a hard blocker, not a nit:

1. **Its styling only exists inside the landing wrapper.** Every value it reads
   (`var(--bg)`, `--text`, `--border`, `--surface`, `--brand`, `--tint`) is set by
   `rootStyle()` on the `[data-ilokal-root]` element, and every class it uses
   (`.wrap`, `.navlinks`, `.navactions`, `.hamb`) is scoped under
   `[data-ilokal-root]` in `landing.css`. Outside that wrapper the header renders
   with no layout, no background, no responsive collapse.
2. **Adding the wrapper to /explore imports a second theme system.** The explore
   body is shadcn components on `bg-background`/`text-foreground` driven by
   `next-themes` (`attribute="class"`, `app/layout.tsx:37`). `rootStyle(dark)` is
   a hard-coded token set toggled by a local `useState` that never touches the
   `.dark` class. Both on one page = the header and the body can disagree about
   light/dark, and the toggle in the header silently does nothing to the content.
3. **5 of the 6 nav links are landing-only hash anchors.** `#shoppers`,
   `#businesses`, `#how`, `#deals`, `#about` resolve to nothing on `/explore` —
   they no-op. Same for the logo's `href="#top"` (`LandingNav.tsx:51`).
4. **`LandingNav` is session-blind.** It always renders "Log In" + "List Your
   Business". A signed-in customer on `/explore` would lose the avatar menu,
   Wallet, Following and Log out that `CustomerHeader` gives them, and be shown a
   login button while logged in.
5. **Height/width mismatch on cross-navigation.** Landing header is 72px tall on
   a 1200px `.wrap`; explore header is 64px (`h-16`) on `max-w-6xl` (1152px).
   Swapping chrome mid-flow makes the logo jump.

### Decision

**Keep `CustomerHeader` as the explore chrome and give it the missing landing
affordances** (Option B below). It already owns session state, active-route
highlighting, and the app token system; what it lacks is a route home and the
landing's conversion CTA.

| Option | Cost | Verdict |
| --- | --- | --- |
| A — mount `LandingNav` on `/explore` | needs `data-ilokal-root` wrapper + hash-link rewrite + a session-aware fork of the component | ❌ rejected — dual theme systems, see blockers 1–5 |
| **B — extend `CustomerHeader` + add a slim public footer** | ~4 files, no visual regression risk to the landing | ✅ **recommended** |
| C — extract one shared `PublicNav` for both surfaces, restyled to shadcn tokens | rewrites the landing chrome, which is a deliberate 1:1 port of the design export | ⏸ defer — revisit if the landing is ever migrated off `landing.css` |

---

## Parities

Checkable target state. ✅ = already true, ❌ = gap this branch closes,
➖ = deliberately left different.

| # | Parity | Current | Target |
| --- | --- | --- | --- |
| P1 | Navigation is bidirectional between landing and explore | ❌ landing→explore only | explore header exposes a **Home** entry (desktop row + mobile row) pointing at the landing |
| P2 | Brand lockup is the same mark on both | ✅ `BrandMark` both sides (`palette` pinned on landing because it never sets `.dark`) | unchanged |
| P3 | Logo destination is unambiguous | ❌ explore logo → `/explore` (looks like "home" but is not) | anon visitor → landing; signed-in customer → `/explore` (their home). Explicit **Home** link exists either way, so the logo is never the only route back |
| P4 | Anon visitors see the business-acquisition CTA on both surfaces | ❌ explore anon shows only "Log in" + "Sign up" | explore anon also shows **List Your Business** → `ROUTES.BUSINESS.registration` |
| P5 | Sign-in door is the unified one | ✅ both use `ROUTES.AUTH.SIGN_IN` | unchanged |
| P6 | A theme control is reachable from every public surface | ❌ explore header has none; landing's is local-state only | explore gets `ThemeToggle` (`components/custom/ThemeTogge.tsx`, real `next-themes`). Landing's local toggle stays as-is and is **documented** as intentionally page-local |
| P7 | Mobile: every desktop nav entry is reachable on small screens | ✅ both patterns work | new **Home** entry must appear in the explore mobile scroll row, not just the `md:` row |
| P8 | Public surfaces end in a footer with cross-surface links | ❌ explore has no footer | slim `CustomerFooter` on the explore layout: Home / Explore / Nearby / Deals / List your business / © line |
| P9 | Route strings come from `config/routeConfig.ts` | ❌ `data.ts:44` hardcodes `'/explore'`; `footerColumns` hardcodes hash links | use `ROUTES.EXPLORE.*`; landing footer "Shops"/"Deals" point at `/explore` and `/explore/deals` |
| P10 | Cross-surface anchors are absolute | ❌ n/a today | any explore→landing-section link must be `/home#about`, never bare `#about` |
| P11 | Header geometry ➖ | landing 72px / 1200px `.wrap`; explore 64px / `max-w-6xl` | left different on purpose (different chrome density). Horizontal padding already matches at `px-4 sm:px-6` vs `.wrap` 24px — no change |
| P12 | One canonical URL for the landing ➖ | `app/page.tsx` renders `<HomePage/>` inline, so `/` **and** `/home` both serve the landing (duplicate content) | out of scope. Flagged below; this branch links to a single constant so a later canonical decision is a one-line change |

---

## Action items

Prioritized. Every item is LOW risk unless stated — no schema, API, auth, or RLS
surface is touched.

### Phase 0 — route constants (blocker for the rest) ✅ DONE

- [x] **A0.1** `ROUTES.PUBLIC.LANDING`. `DASHBOARD.HOME` kept (it is the no-role
      redirect used by `proxy.ts`, `getCurrentUser`, the auth callback — renaming
      it is an auth-adjacent diff for no gain), but both now derive from one
      module-level `LANDING_PATH` so they cannot drift.
- [x] **A0.2** `landingSectionPath(section: LandingSection)` +
      the `LandingSection` union (`top | shoppers | businesses | how | deals |
      about`) — a typo'd anchor is now a type error (P10).
- [x] **A0.3** `data.ts:44` → `ROUTES.EXPLORE.HOME`, plus a file-header note that
      route links belong in `routeConfig` (P9).
- **Acceptance:** ✅ `grep -rn "'/explore'" app/home` clean; +5 tests in
  `config/__tests__/routeConfig.test.ts`.

### Phase 1 — Home link on explore (the actual ask) ✅ DONE

- [x] **A1.1** `CustomerHeader.NAV_LINKS` now leads with
      `{ href: ROUTES.PUBLIC.LANDING, label: 'Home', icon: Home }`.
- [x] **A1.2** Active state is `pathname === href` (exact, not `startsWith`), so
      `/home` never highlights while on explore — asserted by test.
- [x] **A1.3** Both rows render from the same `NAV_LINKS` array, so Home is in
      the `md:hidden` row too — asserted (exactly 2 Home anchors). The 320px
      scroll check is manual (A5.5).
- [x] **A1.4** Brand lockup: `isCustomer ? EXPLORE.HOME : PUBLIC.LANDING`, with
      the `aria-label` following the destination.
- **Acceptance:** from any `/explore/**` page, one click reaches the landing on
  desktop **and** mobile; signed-in customer chrome is unchanged apart from the
  new entry.
- **Risk:** LOW. `CustomerHeader` is also mounted by the protected `/customer`
  layout — check that surface renders the new entry sensibly before merge.

### Phase 2 — CTA + theme parity ✅ DONE

- [x] **A2.1** Anon branch of `CustomerHeader` gained
      `List Your Business` → `ROUTES.BUSINESS.registration`, `variant="outline"`
      + `hidden sm:inline-flex` so the 320px row can't overflow (P4).
- [x] **A2.2** `<ThemeToggle />` mounted first in the header actions, outside the
      auth branches, so every visitor (anon, customer, owner) gets it (P6).
      Filename typo `components/custom/ThemeTogge.tsx` left alone on purpose —
      renaming it touches unrelated call sites; separate mechanical commit.
- [x] **A2.3** `tokens.ts` + `LandingNav` header comments spell out that the
      landing toggle is page-local React state: it doesn't persist, doesn't
      follow the OS preference, and neither toggle affects the other's surface.
- **Acceptance:** ✅ anon `/explore` renders theme toggle · Log in · Sign up ·
  List Your Business; signed-in customer keeps toggle · Wallet · avatar menu and
  loses all three anon CTAs (asserted). Theme persistence across navigation is
  inherent to `next-themes` — manual check folded into A5.5.

### Phase 3 — public footer on explore ✅ DONE

- [x] **A3.1** New `components/customer/CustomerFooter.tsx` — server component,
      Tailwind/shadcn tokens, **not** `LandingFooter` (which reads
      `[data-ilokal-root]` CSS vars + `.footgrid`/`.wrap` from `landing.css`;
      reusing it drags blocker #1 back in). Brand lockup + a labelled `Footer`
      nav (Home · Explore · Nearby · Deals · About · List your business) + the
      `© 2026 iLokal · Made in Iloilo City` line.
- [x] **A3.2** Mounted after `<main>` in `app/explore/layout.tsx`; the layout's
      `flex min-h-screen flex-col` + `flex-1` main already pins it to the bottom
      on short pages.
- [x] **A3.3** The About entry goes through `landingSectionPath('about')`, and a
      test asserts **no** footer href starts with `#` (P10).
- **Acceptance:** ✅ mounted on the layout, so it renders on all four explore
  routes; the landing keeps `LandingFooter` (untouched). Viewport-bottom
  behaviour on a short page is manual (A5.5).
- **Scope note:** the protected `/customer/**` layout shares `CustomerHeader`
  but did **not** get the footer — its pages are logged-in app surfaces, not
  public marketing ones. Revisit if that asymmetry reads as a bug.

### Phase 4 — landing-side link hygiene ✅ DONE

- [x] **A4.1** `footerColumns`: "Shops" `#shoppers` → `ROUTES.EXPLORE.HOME`,
      "Deals" `#deals` → `ROUTES.EXPLORE.DEALS` (P9). They were in-page anchors
      duplicating the nav; the real surfaces are the point of having /explore.
      "For Business" stays a hash — it advertises a landing section, not a route.
- [x] **A4.2** `LandingFooter` mirrors `LandingNav`'s split: `#`-prefixed hrefs
      stay `<a>`, everything else renders through `<Link>`. Style string
      extracted to a `linkStyle` const so the two branches can't drift.
- **Acceptance:** ✅ asserted by test — the two explore hrefs come out of the
  mocked `next/link`, hash anchors don't, and a catch-all case fails if any
  future non-hash href is added as a bare `<a>`. Network-tab confirmation of no
  document request is manual (A5.5).

### Phase 5 — tests + verification

- [x] **A5.1** `components/customer/__tests__/CustomerHeader.test.tsx` — new file,
      `@vitest-environment happy-dom` + `react-dom/client` per repo convention
      (**no `@testing-library/react`** — its `@testing-library/dom` peer isn't
      installed and the stack is frozen; precedent:
      `components/custom/__tests__/GlobalSearch.test.tsx`). 8 tests: Home link
      for anon + customer, present in both rows, explore entries survive, logo
      destination × 3 roles, active state. `next/link`, `next/navigation` and
      `useAuth` mocked. Phase 2 added 4 more: anon CTA set + its `sm:` gate,
      CTAs dropped for a signed-in customer (Wallet/avatar kept), theme toggle
      present for all three roles. 12 total.
- [x] **A5.2** `config/__tests__/routeConfig.test.ts` — landing constant,
      `DASHBOARD.HOME` parity, `landingSectionPath` shape + no-bare-hash guard.
- [x] **A5.3** `components/customer/__tests__/CustomerFooter.test.tsx` (5) —
      link set, two landing routes (nav entry + brand lockup), registration CTA,
      absolute landing anchor + no-bare-hash guard, labelled nav landmark.
- [x] **A5.4** `yarn lint --fix && yarn test:run && yarn build` green after every
      phase (**1326** tests as of phase 4).
- [ ] **A5.5** Manual sweep: `/` , `/home`, `/explore`, `/explore/nearby`,
      `/explore/deals`, `/explore/[businessId]` at 320 / 768 / 1280px, anon and
      signed-in-customer, light and dark. **Add after phase 6:** anon at 1280 /
      1440px specifically — the marketing row's `xl` gate is calculated, not
      measured; if it still crowds, either trim the button padding
      (`px-3` → `px-2`) or hide "Sign up" below `2xl`.

### Phase 6 — session-aware nav sets ✅ DONE (requested 2026-07-25)

**The ask:** the explore header should carry the **landing's marketing nav**
while nobody is signed in, and swap to the **app nav** once they are. One
header, two link sets, chosen by session — instead of today's single app-nav
set shown to everyone.

```
anon      iLokal | Explore Shops  For Shoppers  For Businesses  How It Works  Deals  About | ☾  Log In  [List Your Business]
signed in iLokal | Home  Explore  Nearby  Deals                                            | ☀  [Go to dashboard] / Wallet + avatar
```

Today's header shows the signed-in set to everyone: an anonymous first-time
visitor lands on /explore and gets Home/Explore/Nearby/Deals — app chrome for
someone who has no account yet, and none of the marketing surfaces that explain
what iLokal is.

#### Parities (continues the table above)

| # | Parity | Current | Target |
| --- | --- | --- | --- |
| P13 | Nav content matches the visitor's stage | ❌ one set for everyone | anon → marketing set; authenticated → app set. Single `CustomerHeader`, `NAV_LINKS` picked by `user` |
| P14 | An anonymous visitor on /explore can reach every landing section | ❌ only Home (the landing root) | For Shoppers / For Businesses / How It Works / About resolve via `landingSectionPath()` (P10) — absolute `/home#…`, never bare hashes |
| P15 | "Deals" means one thing | ⚠️ landing `#deals` is a marketing teaser; explore `/explore/deals` is the real feed | anon nav "Deals" → `ROUTES.EXPLORE.DEALS`, matching the phase-4 footer decision. The landing's own `#deals` anchor is untouched |
| P16 | Marketing entries disappear once signed in | ❌ n/a | a signed-in user has no use for "For Businesses"/"How It Works"; the set swaps wholesale, not merges |
| P17 | The row survives its own width | ❌ **the real risk** | 6 marketing links + logo + 3 actions needs ~1100px — the landing collapses to a hamburger below that (`landing.css` `@media (max-width:1100px)`). Explore's container is `max-w-6xl` (1152px) with `md:` (768px) as its only breakpoint, so between 768–1100px the anon row **will** overflow or wrap. Needs its own collapse strategy (below) |
| P18 | Anon actions match the landing's | ⚠️ explore has Log in · Sign up · List Your Business; landing has Log In · List Your Business | **open question** — see D2 |
| P19 | The landing nav reflects the session too ➖ | landing always shows "Log In", even to a signed-in user | out of scope here; the landing is a client page with no session read. Noted for a follow-up |

#### Decisions needed before building

- **D1 — where the marketing links point.** Proposal: "Explore Shops" →
  `ROUTES.EXPLORE.HOME`; "Deals" → `ROUTES.EXPLORE.DEALS`; the other four →
  `landingSectionPath('shoppers' | 'businesses' | 'how' | 'about')`. Clicking
  one leaves /explore for the landing — acceptable (they're marketing copy that
  only exists there), but worth confirming that's the intent rather than, say,
  scrolling in place.
- **D2 — does anon keep "Sign up"? → DECIDED: keep it** (2026-07-25). The
  landing offers only Log In + List Your Business because it sells to
  *businesses*; /explore is where a *customer* decides to join, so the button is
  that surface's only direct customer-conversion door. Anon actions therefore
  read `☾ Log in · Sign up · [List Your Business]` — deliberately one item wider
  than the landing's.
- **D3 — collapse strategy for P17 → DECIDED: `lg:` gate + mobile row**
  (2026-07-25). The marketing set renders at `lg` (1024px) and up; below that
  the existing horizontal scroll row carries the same links. Reuses machinery
  already in the header — no new UI. **Note the breakpoint move:** both rows are
  gated on `md:` today, so this phase shifts the desktop row to `lg:` and the
  scroll row to `lg:hidden`. The app (signed-in) set is only four short entries
  and fits at `md:` — but it must move too, or 768–1024px renders **both** rows
  at once. Rejected: a Sheet/hamburger (closer to the landing, but new UI to
  build and test) and trimming to 3–4 links (loses the parity that motivated
  the request).

#### Action items

- [x] **A6.1** `PUBLIC_NAV_LINKS` (marketing, per D1) + `APP_NAV_LINKS`
      (Home/Explore/Nearby/Deals), selected by `user`. Both rows still map one
      array — the set object carries the links AND its breakpoints together, so
      they can't be forked apart.
- [x] **A6.2** Marketing sections go through `landingSectionPath()`; the
      `LandingSection` union already covered all four (P10).
- [x] **A6.3** ⚠️ **Deviated from D3's `lg`, on measurement.** Six labels + logo
      + three actions is ~1060px of content; at the `lg` viewport (1024px) the
      container offers only 992 — it would have overflowed, which is the exact
      failure D3 existed to prevent. Each set now carries its own complementary
      pair: marketing = `hidden xl:flex` / `xl:hidden`, app = `hidden md:flex` /
      `md:hidden`. Because both rows read the same set, they stay complements by
      construction — the "both rows visible at once" trap D3 warned about can't
      occur. 3 tests pin this, including a loop asserting the pairing for every
      session state.
- [x] **A6.4** Anon actions unchanged per D2 — `Log in · Sign up ·
      [List Your Business]`, one item wider than the landing's on purpose.
- [x] **A6.5** "Home" dropped from the anon set; the brand lockup carries it
      (matching the landing's own nav). Signed-in keeps Home.
- [x] **A6.6** Asserted: an owner gets the app set, never "For Businesses". The
      same switch covers `/customer/**`, which shares this header.
- [x] **A6.7** Tests +8 (26 in the file): exact label list per session state,
      owner case, absolute anchors + no-bare-hash, marketing "Deals" → the real
      feed, and the three breakpoint cases.
- **Acceptance:** ✅ asserted for the link sets, the anchors, and the
  breakpoints. **Not** verified: actual pixel fit — the ~1060px figure is
  computed from label lengths and button padding, not measured in a browser.
  Folded into A5.5.
- **Risk:** LOW-MEDIUM. No auth, schema, or API change — but this is the first
  time `CustomerHeader` branches its *navigation* (not just its actions) on
  session, and it renders on the protected `/customer` surface too.

### Phase 7 — changelog

- [ ] **A7.1** Append a `.claude/CHANGELOG.md` entry (presentational, no
      migration, no approval gate).
- [ ] **A7.2** Delete this file and its `CLAUDE.md` note.

---

## Flagged, deliberately out of scope

- **Duplicate landing URL (P12).** `app/page.tsx` renders `<HomePage/>` directly
  rather than redirecting, so `/` and `/home` serve identical HTML — a
  duplicate-content signal with no `canonical` set. Fixing it means either a
  redirect or a `metadata.alternates.canonical`; both are SEO decisions, not
  navigation ones.
- **Session-aware landing nav (P19).** The landing always renders "Log In", even
  to a signed-in visitor. It is a client page that never reads the session, so
  fixing it means threading a server-read user into `LandingPage` — a separate
  change from phase 6, which only touches the explore header.
- **Landing theme migration to `next-themes`.** Would give real light/dark
  parity across all public surfaces, but rewrites a 1:1 design-export port —
  its own branch, with a visual diff review.
- **Option C (`PublicNav` extraction).** Blocked on the same migration.

## Rollback

`git revert` the branch — every change is presentational and additive. No data,
schema, or auth state is touched.
