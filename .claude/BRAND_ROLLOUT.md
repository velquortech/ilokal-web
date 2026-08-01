# Brand rollout — "Presented Brand Identity" (v1.0)

Source of truth: `Presented Brand Identity.png` (3734 × 32768 deck) +
`Secondary Color+Primary Color Background.png` (1920 × 1080 primary logo render).
Both supplied 2026-08-01. Delete this file and its `CLAUDE.md` note when the
rollout is merged.

---

## 0. The headline

**This is a rebrand, not a palette tweak.** The app currently ships the
"Hablon Weave" identity (v0.2): a lime-green woven tile mark, Geist 800
wordmark, `#65A30D` primary. The presented identity replaces every part of
that — mark, wordmark, palette, and both typefaces.

| | Shipped (v0.2 "Hablon Weave") | Presented (v1.0) |
| --- | --- | --- |
| Mark | Woven-strip tile, `#65A30D` | `ilo` ligature submark, Brick Ember |
| Wordmark | HTML text "iLokal", Geist 800 | Drawn `ilokal` lettering (rounded, 350° `a`) |
| Primary | Lime `#65A30D` | Brick Ember `#D70005` |
| Accent | Tint `#ECFCCB` | Jasmine `#FEE87B`, Petal Frost `#FCD9F7` |
| Display face | Geist | **Pally** |
| Body face | Geist | **Inter** |
| Surface | `oklch(1 0 0)` pure white | Porcelain `#FBFAF6` |

Nothing about the green identity survives. Every asset under `public/brand`
and every `#65A30D` / `#84CC16` / `#15803D` / `#ECFCCB` literal is replaced.

---

## 1. Palette parity

Hexes read off the deck's Colors page. OKLCH is the canonical form in
`globals.css` (Tailwind v4 tokens); hex is kept in the docs and in the email
template, which can't use OKLCH.

| Brand name | Hex | OKLCH | Role in the app |
| --- | --- | --- | --- |
| Brick Ember | `#D70005` | `oklch(0.552 0.226 28.828)` | `--primary`, `--ring`, brand mark |
| Jasmine | `#FEE87B` | `oklch(0.927 0.132 98.148)` | `--accent` (light), highlight fills, logo-on-red |
| Cornsilk | `#FEF8D6` | `oklch(0.975 0.045 98.909)` | `--muted`/tint surfaces |
| Petal Frost | `#FCD9F7` | `oklch(0.923 0.055 330.734)` | secondary accent, chart-4 family |
| Porcelain | `#FBFAF6` | `oklch(0.985 0.005 95.098)` | `--background`, `--card` |
| Charcoal | `#1A1A1A` | `oklch(0.218 0 90)` | `--foreground`, dark `--background` |

### Derived tokens (not in the deck — engineering additions)

The deck has no dark mode, no destructive state, and no chart ramp. These are
derived from the six brand colors and are called out so a designer can veto
them individually.

| Token | Value | Why |
| --- | --- | --- |
| dark `--primary` | `oklch(0.58 0.215 28.8)` `#DD2920` | Brick Ember on Charcoal is **3.23:1** — fails AA. Lifted to L 0.58: white label 4.76:1 ✅, fill-vs-background 3.66:1 ✅. |
| `--destructive` | `oklch(0.412 0.161 26)` `#8E0B14` | Brand red **is** the primary now, so the stock red destructive would make Delete look like Save. Deepened to maroon; white label 9.51:1. |
| `--chart-1..5` | brick → orange → gold → petal-deep → oxblood | Brand-derived categorical ramp. Jasmine/Petal at their native lightness are ≥ 1.75:1 on white, unusable as data marks, so hues are kept and lightness is dropped. |

### Contrast ledger (WCAG 2.1, measured not assumed)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| White on Brick Ember | 5.40 | ✅ AA normal text — primary button is safe |
| Brick Ember on Porcelain | 5.17 | ✅ AA — brand text on app background |
| Charcoal on Jasmine | 14.12 | ✅ AAA |
| Charcoal on Petal Frost | 13.60 | ✅ AAA |
| Cornsilk on Brick Ember | 5.04 | ✅ AA |
| **Jasmine on Brick Ember** | **4.38** | ⚠️ **fails AA for body copy.** Large text (≥24px, or ≥18.7px bold) only — which is exactly the logo lockup, so the brand asset is fine. Do not set body copy in Jasmine on red. |
| **Brick Ember on Charcoal** | **3.23** | ❌ never use — this is why dark mode gets its own primary |

---

## 2. Typography parity

Deck: **Primary = Pally**, **Secondary = Inter**. Shipped: Geist for both.

| Slot | Shipped | Presented | Delivery |
| --- | --- | --- | --- |
| Display / headings / wordmark | Geist 800 | Pally 400/500/700 | `next/font/local`, self-hosted `public/fonts/Pally-*.woff2` |
| Body / UI | Geist | Inter | `next/font/google` |
| Mono | Geist Mono | (unspecified) | keep Geist Mono |

Pally is not on Google Fonts. Files pulled once from Fontshare (free
personal + commercial license) and committed, so there is **no runtime
third-party font request** — matches the repo's self-host posture and keeps
`next/font` doing the preload + `size-adjust` fallback metric work.

Pally ships Regular/Medium/Bold only — there is no 800. The wordmark is a
**drawn PNG**, not live text, so the missing weight does not affect the logo.

### Existing token debt this touches

- `--font-giest` (sic) is the declared Tailwind theme token; **`font-geist`
  is used at 2 call sites and resolves to nothing today**
  (`AdminLayout.tsx:18`, `BusinessLayout.tsx:29`). Both aliases are now
  declared so neither is a silent no-op.
- `BusinessHeader.tsx:78` has `font-font-giest-mono` — a typo that has never
  matched a class. Fixed.

---

## 3. Asset parity

| Need | Shipped | Presented |
| --- | --- | --- |
| Mark | `svg/ilokal-mark.svg` (green tile) | `submark/ilokal-submark-*.png` (`ilo`) |
| Wordmark | live `<text>` in Geist | `wordmark/ilokal-wordmark-*.png` |
| Lockup | `svg/ilokal-logo-horizontal.svg` | `lockup/ilokal-lockup-on-brick.png` |
| Favicon | `app/icon.svg` (green) | `app/icon.png`, `app/favicon.ico` |
| App icon | `png/app-icon-*.png` (green) | `icon/app-icon-*.png` (Porcelain tile, Brick `ilo`) |

The identity was delivered as raster only. Both marks were matted out of the
supplied files (flat two-colour art → antialiased alpha, projected onto the
background→foreground colour line) and re-tinted per colourway, so every PNG
is a clean transparent asset rather than a screenshot with a baked
background.

- Wordmark native **1128 × 244** (from the 1920×1080 primary render).
- Submark native **1036 × 507** (from the deck's Submark page).

**Known gap:** there is no vector source. At 1128px the wordmark covers every
web use (nav renders ~120 CSS px → 9× headroom) but not large print. Ask the
designer for the Illustrator/Figma file; converting to SVG needs the outlines,
not a trace.

---

## 4. Action items

Risk is UI-visual unless noted. No schema, API, or auth surface is touched by
any item here.

### Phase 0 — assets ✅

- [x] Extract wordmark + submark to transparent PNG, 5 and 4 colourways.
- [x] Generate app-icon set (1024/512/192/180) + favicons (32/16) + reversed
      store icon.
- [x] Replace `app/icon.svg` → `app/icon.png`, `app/apple-icon.png`,
      `app/favicon.ico`.
- [x] Delete the green `public/brand/{svg,png}`, `favicon.svg`, `index.html`.
- [x] Self-host `public/fonts/Pally-{Regular,Medium,Bold}.woff2`.
- [x] Rewrite `public/brand/README.md` for v1.0.

### Phase 1 — tokens ✅

- [x] `app/fonts.ts` — Pally (`--font-display`) + Inter (`--font-sans`) +
      Geist Mono.
- [x] `app/globals.css` — repaint `:root` and `.dark`; add `--brand-*` raw
      brand ramp; declare `--font-display`, keep `--font-giest`/`--font-geist`
      aliases.
- [x] `app/layout.tsx` — mount the new font variables, brand `metadata`
      (title/description/icons/themeColor/openGraph).

### Phase 2 — brand components ✅

- [x] `components/custom/BrandLogo.tsx` — `BrandMark` (submark PNG),
      `BrandWordmark` (wordmark PNG), `BrandLogo` lockup. Same exported API
      and prop names, so all 10 call sites keep working unchanged.

### Phase 3 — hardcoded green sweep ✅

- [x] `app/home/components/landing/tokens.ts` — `BRAND`/`BRAND_HOVER`, tint
      rgba, surface tokens.
- [x] `app/home/components/landing/{data,icons,LandingPage}.tsx` — 7 literals.
- [x] `components/customer/BusinessMap.tsx` — route polyline.
- [x] `app/api/emails/templates/resetPassword.ts` — 8 literals (hex, since
      email clients don't support OKLCH or CSS variables).

### Phase 4 — semantic colour audit ✅

Green stays where it means **success**, not brand: `StatusBadge`, verification
badges, branch/coupon "active" pills, `AutomationSuggestions`. Those 25 files
were reviewed and deliberately left green — success-green next to brand-red is
correct, and repainting them would destroy the status signal.

### Phase 5 — verification

- [x] `yarn lint`
- [x] `yarn test:run`
- [x] `yarn build`
- [ ] **Manual browser sweep — not done, needs a human.** 320 / 768 / 1280px ×
      light + dark × {landing, `/explore`, `/sign-in`, business dashboard,
      admin dashboard}. Specifically: the landing runs its own page-local
      token system, so it must be checked independently of the app's
      `next-themes` toggle.
- [ ] **Designer sign-off on the derived tokens** in §1 (dark-mode primary,
      destructive maroon, chart ramp) — the deck does not specify them.
- [ ] **Vector logo source** from the designer (see §3).

---

## 5. Deliberately not done

- **Landing dark-mode unification.** `app/home/components/landing` still
  drives its own `[data-ilokal-root]` custom properties from page-local React
  state, independent of `next-themes`. Repainting its tokens brand-red is in
  scope; migrating it onto the app's `.dark` class is not — that is a
  visual-diff-reviewed branch of its own (pre-existing note in `tokens.ts`).
- **Marketing copy from the deck** ("Discover through experience", "Eat where
  locals actually go", "The best food spots aren't always on Google") — brand
  voice, not a frontend change. Handed to product.
- **Repainting success/warning/info states.** See Phase 4.
