# LANDING_PAGE.md — iLokal marketing landing (1:1 rebuild)

> **Active work:** Port the design-tool export `iLokal Landing.html` into the app
> 1:1 as a React/`motion` client page. Copy **all** content verbatim now; swap in
> real data/links later. Delete this file when the page ships and real data is wired.

## Source

Bundled design export (self-extracting HTML) decoded into:

- **9 sections** + sticky nav + mobile menu + footer, single cohesive page.
- Inline-style design driven by CSS custom properties on a `[data-ilokal-root]`
  wrapper (light/dark token sets), brand `#65A30D` / hover `#15803D`.
- Client interactions: **dark-mode toggle**, **category filter** (deals),
  **mobile menu**, **scroll-triggered count-up** (Shops→120, Deals→500, cubic
  ease-out, `IntersectionObserver`), card/button **hover** transitions, plus CSS
  `fadeUp` (hero) and `floaty` (phone) keyframes.

## Placement decision

- Lives at **`/home`** (the `/` → `${NEXT_PUBLIC_DESTINATION}` redirect target), so
  it becomes the public landing with no env change.
- Built under `app/home/components/landing/`. `app/home/page.tsx` renders
  `<LandingPage/>`; the old demo sections (`hero/partners/objectives/ai-agents/
  pricing`) are left in the repo but no longer imported (reversible).
- `app/home/layout.tsx` simplified to a pass-through: the design ships its **own**
  nav + footer, and the nested `<html><body>` it declared duplicated the root
  layout — dropped. Root `app/layout.tsx` (Geist + `next-themes` + Toaster) stays.
- The landing's dark mode is **self-contained** (its own CSS-var tokens on
  `[data-ilokal-root]`), independent of the app-wide `next-themes` `.dark` class —
  no conflict, and it won't leak into `/business` or `/admin`.

## Design ↔ implementation parity

| Design element | Source detail | Implementation |
| --- | --- | --- |
| Root theme | `--bg/--text/--muted/--surface/--border/--chip/--tint/--shadow` per mode; `--brand/--brandhover` constant | `tokens.ts`; token object spread onto root `style` from `dark` state (mirrors `applyTheme`) |
| Utility layout | `.wrap/.herogrid/.featgrid/.bizgrid/.howgrid/.stepsrow/.catrow/.dealsgrid/.testigrid/.footgrid/.dashshell/.dashstats/.dashsplit` + 2 breakpoints (960/640) | `landing.css`, every rule scoped under `[data-ilokal-root]` so generic names don't leak |
| Keyframes | `fadeUp`, `floaty` | `landing.css` (floaty on phone); `fadeUp` replaced by `motion` reveals |
| Nav + mobile menu | sticky blur header, `toggleDark/toggleMenu/closeMenu` | `LandingPage` state (`dark`, `menuOpen`) |
| Count-up stats | `runCounters()` → 120 / 500, `1 - (1-p)^3` easing, IO threshold .35 | `useCountUp` hook + `motion` `whileInView` trigger |
| Category filter | `catDefs` (7) → active chip restyle → `filteredDeals` | `category` state; `deals.filter(cat)` |
| Deals decorate | `#86EFAC`→`#22C55E`, `badgeLabel` by `pct`/`fix`, `hot` header pad, `unlock`, `dealStyle` soft/ticket | ported in `Deals` (default `soft`; `ticket` supported) |
| Animations | static `fadeUp`/`floaty` only | `motion`: per-section `whileInView` fade-up + **stagger** on grids (features/deals/testimonials/steps), hero on load, phone `floaty` kept |

## Data (copied verbatim now — swap later)

All in `data.ts`: `avatarStack`, `features` (4), `bizPoints` (5), `shopperSteps`/
`bizSteps` (3 ea), `categories` (7), `deals` (6), `testimonials` (3), `dashNav` (6),
`dashStats` (4), `dashCoupons` (3). Placeholder / to-replace later:

- Phone hero **collage** → 5 `image-slot`s → placeholder gradient blocks (swap for
  `next/image` local photos).
- All `href="#"` CTAs (Get the App / Log In / List Your Business / store badges /
  socials) → real routes/links.
- Stat targets (120 / 500), dashboard mock numbers, deal/testimonial copy → real
  values once available.

## Action items

- [x] **A0** Decode the bundle; extract markup, CSS, data, interactions.
- [x] **A1** Plan + parities (this doc).
- [x] **A2** `data.ts` + `tokens.ts` — all content + light/dark token sets (verbatim).
- [x] **A3** `landing.css` — scoped utilities, keyframes, hover states, responsive.
- [x] **A4** `icons.tsx` — 1:1 SVGs (categories, features, verified seal, lock,
      store badges, socials, phone chips, sun/moon/menu).
- [x] **A5** `useCountUp` + `motion` variants (fade-up, stagger).
- [x] **A6** `LandingPage.tsx` — client root (state + theme) composing all 9
      sections 1:1 with motion reveals.
- [x] **A7** Wire `app/home/page.tsx` + simplify `app/home/layout.tsx`.
- [x] **A8a** `yarn lint --fix && yarn build` green; `/home` renders 200 with all
      content in SSR.
- [ ] **A8b** Manual visual/interaction pass vs source at 1280/375 (dark toggle,
      category filter, mobile menu, count-up, hovers).
- [ ] **A9** (later) Replace placeholder media + `#` links + mock numbers with real
      data/routes; add real store links; hook Log In / List Your Business to
      `ROUTES.AUTH.LOGIN` / `ROUTES.BUSINESS.registration`.

## Risk

Low — additive, self-contained, no schema/API/auth. Only behavior change is what
`/home` renders (reversible: re-import the old sections in `page.tsx`).
