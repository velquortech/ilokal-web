# DESIGN.md — iLokal Color System & Visual Language

Derived from `app/globals.css` (Tailwind CSS v4, OKLCH color space, shadcn/ui New York style).

Brand: **identity v1.0**, "Presented Brand Identity" (2026-08-01). It replaced
the v0.2 green "Hablon Weave" in full — see `public/brand/README.md` for the
asset rules. This is the standing direction, not a phase; `CLAUDE.md` carries
the short list of rules that cause defects when unknown.

### Open items

Three tokens below are **derived, not specified by the deck** — the deck gives
no dark-mode value, no destructive, and no chart ramp. They are reasoned and
measured, but they still want designer sign-off:

- dark-mode primary `#DD2920` (the deck red fails AA on Charcoal),
- destructive `#8E0B14` / `#BD3855` (the brand red occupies `--primary`),
- the five-step chart ramp (Jasmine and Petal are ~1.8:1 on white).

Also outstanding: **no vector logo source exists.** Both marks were matted from
the supplied raster, so 1128px is the ceiling — enough for every web use, not
enough for large print. The Illustrator/Figma file is still needed.

---

## Brand Colors

The six colours off the deck, exposed as raw tokens (`--brand`, `bg-brand`,
`text-brand-jasmine`, …). Use them for brand moments; use the semantic tokens
below for everything else.

| Name | Hex | Token | Role |
| --- | --- | --- | --- |
| Brick Ember | `#D70005` | `--brand` | Primary. Buttons, links, focus ring, mark tile. |
| Jasmine | `#FEE87B` | `--brand-jasmine` | Accent. Highlights, the `ilo` inside the mark. |
| Cornsilk | `#FEF8D6` | `--brand-cornsilk` | Tint surfaces, secondary fills. |
| Petal Frost | `#FCD9F7` | `--brand-petal` | Secondary accent. |
| Porcelain | `#FBFAF6` | `--brand-porcelain` | App background. |
| Charcoal | `#1A1A1A` | `--brand-charcoal` | Text, dark-mode background. |

### Contrast rules that are NOT optional

- **Brick Ember on Charcoal is 3.23:1 — never use it on a dark surface.** Dark
  mode lifts the same red to `oklch(0.58 0.215 28.8)` (`#DD2920`, "flame").
  `--brand` already switches under `.dark`; hardcoding `#D70005` bypasses that.
- **Jasmine on Brick Ember is 4.38:1** — large text only (≥24px, or ≥18.7px
  bold). That covers the logo lockup, not body copy.
- White / Porcelain on Brick Ember is 5.4:1 ✅, Brick Ember on Porcelain 5.2:1 ✅,
  Charcoal on Jasmine 14.1:1 ✅.

---

## Color Tokens

All colors are CSS custom properties consumed via Tailwind's `@theme inline` mapping.
Use the semantic token names (`text-primary`, `bg-muted`, etc.) — never hardcode raw OKLCH values.

### Light Mode

| Token                    | OKLCH                        | Role                                            |
| ------------------------ | ---------------------------- | ----------------------------------------------- |
| `--background`           | `oklch(0.985 0.005 95.098)`  | Page background (Porcelain)                     |
| `--foreground`           | `oklch(0.218 0 90)`          | Primary body text (Charcoal)                    |
| `--card`                 | `oklch(1 0 0)`               | Card surface — white, one step above Porcelain  |
| `--card-foreground`      | `oklch(0.218 0 90)`          | Text on cards                                   |
| `--primary`              | `oklch(0.552 0.226 28.828)`  | **Brick Ember** — buttons, active states, links |
| `--primary-foreground`   | `oklch(0.985 0.005 95.098)`  | Text on primary (Porcelain, 5.2:1)              |
| `--secondary`            | `oklch(0.975 0.045 98.909)`  | Cornsilk surface (tabs, chips)                  |
| `--secondary-foreground` | `oklch(0.218 0 90)`          | Text on secondary                               |
| `--muted`                | `oklch(0.962 0.008 95)`      | Disabled / subdued backgrounds                  |
| `--muted-foreground`     | `oklch(0.52 0.015 30)`       | Placeholder text, captions (5.3:1)              |
| `--accent`               | `oklch(0.927 0.132 98.148)`  | Jasmine — hover highlights, selected rows       |
| `--accent-foreground`    | `oklch(0.218 0 90)`          | Text on accent (14.1:1)                         |
| `--destructive`          | `oklch(0.412 0.161 26)`      | Error / delete — deep maroon, see note below    |
| `--border`               | `oklch(0.905 0.008 60)`      | Dividers, input outlines                        |
| `--input`                | `oklch(0.905 0.008 60)`      | Input border                                    |
| `--ring`                 | `oklch(0.552 0.226 28.828)`  | Focus ring (Brick Ember)                        |

> **Why destructive is maroon, not red.** The brand red *is* `--primary` now, so
> the stock destructive would make Delete read as a brand CTA. `--destructive`
> is deepened to `#8E0B14` (light) and hue-shifted to a crimson `#BD3855`
> (dark) so it stays distinguishable from the primary in both modes.

### Dark Mode (`.dark`)

| Token           | OKLCH                       | Notes                                                |
| --------------- | --------------------------- | ---------------------------------------------------- |
| `--background`  | `oklch(0.218 0 90)`         | Charcoal                                             |
| `--foreground`  | `oklch(0.97 0.008 95)`      | Warm off-white                                       |
| `--card`        | `oklch(0.262 0.006 60)`     | Slightly lifted surface                              |
| `--primary`     | `oklch(0.58 0.215 28.8)`    | **Lifted** Brick Ember — the deck value fails AA here |
| `--muted`       | `oklch(0.305 0.008 60)`     | Darker warm grey                                     |
| `--accent`      | `oklch(0.34 0.028 90)`      | Warm hover surface                                   |
| `--destructive` | `oklch(0.545 0.17 12)`      | Crimson — hue-separated from the lifted primary      |
| `--border`      | `oklch(1 0 0 / 12%)`        | Translucent white border                             |
| `--input`       | `oklch(1 0 0 / 16%)`        | Translucent white input                              |
| `--ring`        | `oklch(0.58 0.215 28.8)`    | Matches dark primary                                 |

### Sidebar Tokens

The sidebar carries its own token set to allow independent theming.

| Token               | Light                       | Dark                     |
| ------------------- | --------------------------- | ------------------------ |
| `--sidebar`         | `oklch(0.972 0.008 95)`     | `oklch(0.262 0.006 60)`  |
| `--sidebar-primary` | same as `--primary`         | same as dark `--primary` |
| `--sidebar-accent`  | Cornsilk                    | warm hover surface       |
| `--sidebar-border`  | same as `--border`          | `oklch(1 0 0 / 12%)`     |

### Chart Palette

Five-step **categorical** ramp derived from the brand hues (Recharts). It is
not a light→dark sequence — each step is a distinct series colour, so pick by
series index, not by intensity.

Jasmine and Petal Frost at their native lightness measure ~1.8:1 on white and
are unusable as data marks, so the ramp keeps the hue and drops the lightness.

| Token       | Light OKLCH                 | Approx hex | Family              |
| ----------- | --------------------------- | ---------- | ------------------- |
| `--chart-1` | `oklch(0.552 0.226 28.828)` | `#D70005`  | Brick Ember         |
| `--chart-2` | `oklch(0.68 0.18 52)`       | `#EB7000`  | warm orange         |
| `--chart-3` | `oklch(0.72 0.145 92)`      | `#C8A32C`  | deepened Jasmine    |
| `--chart-4` | `oklch(0.66 0.145 335)`     | `#C76DB5`  | deepened Petal      |
| `--chart-5` | `oklch(0.43 0.1 20)`        | `#7E3638`  | oxblood             |

Dark mode lifts each step by ~0.1 L (see `.dark` in `globals.css`).

### Green is still correct — for success

Brand red does **not** replace semantic green. `StatusBadge`, verification
badges, "active" pills and trend-up indicators stay green: success-green beside
brand-red is the signal, and repainting them destroys it.

### Semantic Utility Classes

Defined in `@layer base` — use these instead of raw color classes.

```css
.bg-app-color     /* gradient: Brick Ember → Jasmine, text clip */
.text-title       /* Pally, bold, tight tracking, responsive sm:3xl → xl:6xl */
.text-description /* max-w-1/2, text-xl, text-muted-foreground */
```

---

## Typography

Two faces, per the identity deck.

| Slot | Token | Face | Source |
| --- | --- | --- | --- |
| Display / headings | `--font-display` → `font-display` | **Pally** 400/500/700 | self-hosted, `assets/fonts/Pally-*.woff2` (build-time only, not served) |
| Body / UI | `--font-sans` → `font-sans` | **Inter** | `next/font/google` |
| Mono | `--font-mono` → `font-mono` | Geist Mono | `next/font/google` |

Wired in `app/fonts.ts`; the variables are mounted on `<body>` by the root
layout. Inter is the document default (Tailwind's `--default-font-family`
resolves to `--font-sans`), and **`h1`–`h6` get Pally automatically** from
`@layer base` — do not add `font-display` to individual headings.

Pally has no 800 weight; `font-extrabold` on a heading resolves to Bold.

`--font-giest` (sic) and `--font-geist` are kept as deprecated aliases of the
body face so the ~14 existing call sites keep working. New code should use
`font-sans` / `font-display`.

The wordmark is **drawn lettering**, not a Pally setting — never re-set it as
text. Use `components/custom/BrandLogo.tsx`.

---

## Border Radius

Base radius `--radius: 0.65rem`. All variants are derived:

| Token              | Calc               | Use                 |
| ------------------ | ------------------ | ------------------- |
| `radius-sm`        | `radius - 4px`     | Badges, chips       |
| `radius-md`        | `radius - 2px`     | Inputs, small cards |
| `radius-lg`        | `radius` (0.65rem) | Cards, modals       |
| `radius-xl`        | `radius + 4px`     | Sheets, drawers     |
| `radius-2xl`       | `radius + 8px`     | Hero sections       |
| `radius-3xl / 4xl` | `+12px / +16px`    | Full-bleed banners  |

---

## Business Registration UI Patterns

The registration form (`app/business-registration/`) is the primary design reference.

### Layout Shell

```
h-screen flex flex-col
  └── main: flex flex-row flex-1 min-h-0 overflow-hidden p-3
        ├── step-progress sidebar (fixed width)
        └── step content panel (flex-1, overflow-y-auto)
              └── register-nav (mt-auto, border-t)
```

### Form Fields

- **Label → Input/Select → FieldError** — always use `<Field>` wrapper from `components/ui/field.tsx`
- `data-invalid` attribute on `<Field>` drives red border state
- Spacing between fields: `space-y-6`
- Two-column layout for location + map: `grid grid-cols-2 gap-x-10`

### Status / Feedback Colours

| Scenario          | Class pattern                                                          |
| ----------------- | ---------------------------------------------------------------------- |
| Warning / note    | `border-amber-200 bg-amber-50 text-amber-900` (dark: amber-900/950/50) |
| Error state       | `text-destructive` / `border-destructive`                              |
| Success / active  | `text-primary` / `bg-primary`                                          |
| Pending / loading | `animate-pulse` on icon wrapper                                        |

### Step Progress Indicator

- Active step: `bg-primary text-primary-foreground`
- Completed step: checkmark icon, muted green tint
- Inactive step: `bg-muted text-muted-foreground`

---

## Scrollbar Styling

Custom thin scrollbar applied globally:

- Thumb: `bg-border` with transparent track
- Firefox: `scrollbar-width: thin`, `scrollbar-color: var(--border) transparent`
- Webkit: `h-2.5 w-2.5` dimensions, `rounded-full`

---

## Page Transitions

Global view-transition defined:

```css
::view-transition-new(root) {
  animation: slide-up 0.5s ease-in-out;
}
```
