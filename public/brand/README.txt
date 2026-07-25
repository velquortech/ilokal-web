iLokal — logo assets (v0.2, pre-soft-launch)
=============================================

MARK: "Hablon Weave" — interlaced strips from Iloilo handloom weaving.

FOLDERS
  svg/    Vector. Use these anywhere you can. Infinitely scalable.
  png/    Raster, for app stores and places that reject SVG.
  favicon.svg

WHICH FILE
  Web header / print          svg/ilokal-logo-horizontal.svg
  Dark backgrounds            svg/ilokal-logo-horizontal-on-dark.svg
  Social avatar / square      svg/ilokal-mark.svg
  Solid green background      svg/ilokal-mark-reversed.svg
  One-ink print, stamps       svg/ilokal-mark-mono-black.svg / -mono-white.svg
  Inherit a custom color      svg/ilokal-mark-transparent.svg
  Rendered at 32px or below   svg/ilokal-mark-small-32px.svg  (thicker strips, no rounding)
  iOS / Android store icon    svg/ilokal-app-icon-fullbleed.svg, png/app-icon-1024.png
  Browser tab                 favicon.svg, png/favicon-32.png, png/favicon-16.png

COLOR
  Primary green    #65A30D
  Hover / deep     #15803D
  On dark, mark    #84CC16   (#65A30D muddies on charcoal — always swap)
  Charcoal         #1A1A1A
  Tint             #ECFCCB

RULES
  Clearspace: keep margin equal to one strip width on all four sides.
  Minimum: mark 16px; horizontal lockup 88px wide.
  Never rotate, stretch, skew, recolor with a gradient, or set the wordmark
  in another typeface.

TYPEFACE
  Wordmark is Geist Sans 800, tracking -3.5%.
  The lockup SVGs use live <text>, so Geist must be available where they
  render (self-host, or Google Fonts). If you need a font-independent
  vector lockup, convert the text to outlines in Illustrator/Figma once and
  save alongside these. The PNG lockups are already rasterized.

FAVICON SNIPPET
  <link rel="icon" href="/brand/favicon.svg">
  <link rel="apple-touch-icon" href="/brand/png/apple-touch-icon-180.png">
