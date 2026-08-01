# iLokal — brand assets (v1.0)

Identity: **"Presented Brand Identity"**, delivered 2026-08-01.
Supersedes v0.2 "Hablon Weave" (green woven tile) in full — nothing from that
set survives.

The identity was delivered as raster only. Both marks here were matted out of
the supplied files (flat two-colour art projected onto the background →
foreground colour line, giving a true antialiased alpha) and re-tinted per
colourway, so every PNG is a clean transparent asset.

---

## Folders

```
mark/       Square app mark — rounded tile + the `ilo` submark. 512px.
submark/    The bare `ilo` ligature, no tile. 1036 × 507.
wordmark/   The drawn `ilokal` lettering. 1128 × 244.
lockup/     Wordmark on a Brick Ember field, with clearspace baked in.
icon/       Store icons + favicons.
```

## Which file

| Use | File |
| --- | --- |
| App header, sidebar, any square slot | `mark/ilokal-mark-brick.png` |
| Same, on a dark surface | `mark/ilokal-mark-flame.png` |
| Store / launcher icon | `icon/app-icon-1024.png` |
| Horizontal lockup, light surface | `wordmark/ilokal-wordmark-brick.png` |
| Horizontal lockup, dark surface | `wordmark/ilokal-wordmark-porcelain.png` |
| On a Brick Ember field | `wordmark/ilokal-wordmark-jasmine.png` |
| Social / OG card | `lockup/ilokal-lockup-on-brick.png` |
| Browser tab | `app/favicon.ico`, `app/icon.png` (Next.js app dir) |

In the app, do not reference these paths directly — use
`components/custom/BrandLogo.tsx` (`BrandMark`, `BrandWordmark`, `BrandLogo`).
It picks the colourway per surface and handles the light/dark swap.

## Colour

| Name | Hex | Use |
| --- | --- | --- |
| Brick Ember | `#D70005` | Primary. Mark tile, buttons, links, focus ring. |
| Jasmine | `#FEE87B` | Accent. The `ilo` inside the mark, highlights on red. |
| Cornsilk | `#FEF8D6` | Tint surfaces, secondary fills. |
| Petal Frost | `#FCD9F7` | Secondary accent. |
| Porcelain | `#FBFAF6` | App background, wordmark on dark. |
| Charcoal | `#1A1A1A` | Text, dark-mode background. |

Two derived values, not in the deck:

| Name | Hex | Why |
| --- | --- | --- |
| Flame | `#DD2920` | Dark-mode primary. Brick Ember on Charcoal is **3.23:1** and fails AA; this is the same red lifted to L 0.58. |
| Brick Deep | `#A80004` | Hover/pressed, and link colour in the transactional email. |

### Contrast, measured

- White or Porcelain on Brick Ember — **5.4:1** ✅ AA
- Brick Ember on Porcelain — **5.2:1** ✅ AA
- Charcoal on Jasmine — **14.1:1** ✅ AAA
- **Jasmine on Brick Ember — 4.38:1** ⚠️ large text only (≥24px, or ≥18.7px
  bold). That covers the logo lockup; it does **not** cover body copy.
- **Brick Ember on Charcoal — 3.23:1** ❌ never. Use Flame.

## Typeface

- **Pally** — display, headings, brand moments. Self-hosted from
  `public/fonts/Pally-{Regular,Medium,Bold}.woff2` (Fontshare, free personal +
  commercial licence), wired through `app/fonts.ts` as `--font-display`.
- **Inter** — body and UI, via `next/font/google` as `--font-sans`.

The wordmark is **drawn lettering, not a Pally setting** — rounded terminals,
the two-people `ilo` ligature, the 350° `a`. Never re-set it as text.

## Rules

- Clearspace: one `ilo` counter-width on all four sides.
- Minimum: mark 20px, wordmark 96px wide.
- Never rotate, stretch, skew, add a gradient, or place the Brick Ember cut on
  a dark surface.

## Known gap

There is **no vector source**. 1128px covers every web use (the nav renders at
roughly 120 CSS px, ~9× headroom) but not large-format print. Request the
Illustrator/Figma file from the designer — an SVG needs the real outlines, not
an autotrace of these PNGs.
