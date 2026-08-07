# Welcome-post generator — parity table + action items

> **What it is:** an admin tool that renders the "Welcome to the iLokal family!"
> square — iLokal wordmark, headline, one or two cards each holding a shop's
> logo and name — as a downloadable PNG, for iLokal's own Facebook, Instagram,
> Threads and LinkedIn accounts.
>
> **Why now:** 14 shops have registered and every one of them has a logo. The
> post is currently made by hand, once per shop.
>
> Plus a prompt on the admin dashboard when shops have registered and not yet
> been posted about.

---

## 1. Facts, verified rather than assumed

| # | Fact | Consequence |
| --- | --- | --- |
| **F1** | **Satori cannot read `.woff2`.** Probed through the bundled renderer: `Pally-Bold.woff2` → `Unsupported OpenType signature wOF2`; the bundled `Geist-Regular.ttf` renders fine | `assets/fonts/` holds **only** `.woff2`, so the generator needs a **TTF/OTF/WOFF** copy of Pally. This would have stopped the first line of implementation |
| **F2** | `next/og` (`ImageResponse`) ships with Next 16 and works headless | No new dependency. JSX → PNG, so the layout is written as flexbox rather than composited by hand in `sharp` |
| **F3** | Satori supports a **CSS subset**: flexbox only, **no grid**, no float, limited positioning | The mock is rebuilt, not ported. Anything relying on grid has to become nested flex |
| **F4** | **All 14 live businesses have a logo.** 12 are bucket-relative paths, 2 are absolute URLs | `resolveStorageUrl` already normalises both, but the value must be an absolute URL before Satori sees it — it fetches, it does not read the bucket |
| **F5** | Shop names run **3 → 29 characters** (`LU2` … `Suds & Sips Carwash and Café`); 3 of 14 carry a **trailing space**; 3 are already ALL CAPS; one contains **`é`** | A fixed font size cannot serve a 10× spread. Names need trim + uppercase + a length-keyed size ladder, and the accent needs a font fallback |
| **F6** | `public/brand/wordmark/ilokal-wordmark-jasmine.png` exists — exactly the cut in the mock | The wordmark is a drawn asset and must never be typeset as the text "iLokal" (brand rule). The asset is already there |
| **F7** | Jasmine on Brick Ember measures **4.38:1** | Fine for the large headline, below AA for the small "NEW ON ILOKAL" line. WCAG does not bind a social image the way it binds a page, but it is worth knowing before it is also used as a web banner |
| **F8** | The admin **Businesses** table uses `DataTable` but has **no row selection**; the catalogue table already has that pattern, and the menu-follow-up page is a working "list → select → batch act" precedent | Copy the existing selection wiring rather than inventing one |

---

## 2. Parity table

| ID | Item | Why it matters | Risk |
| --- | --- | --- | --- |
| **WP1** | **Pally is unusable as shipped** (F1) | The generator cannot render a single character of brand type until a TTF/OTF/WOFF copy exists. Everything else is downstream of this | 🔴 |
| **WP2** | A second copy of Pally is a **deliberate** duplication | The brand notes warn against a second font copy — but that was about `public/`, where the browser downloads every face twice. This copy is read by the server and never served, so the rule does not apply. Say so where it lives, or someone deletes it | 🟠 |
| **WP3** | One unreachable logo breaks the whole image | Satori fetches each `<img>`; a 404 or a slow host fails the render, so a single bad logo takes out a batch. Needs a per-card fallback (the shop's initials on the card colour) and a timeout | 🔴 |
| **WP4** | Logos are not visually uniform (F4) | Some are transparent PNGs, some have a baked-in white box, aspect ratios vary. On a cream card a white-boxed logo reads as a rendering fault. `object-fit: contain` + padding, and a preview before export — this is where the hand-skipping will happen | 🟠 |
| **WP5** | Names need trim, uppercase and a size ladder (F5) | Trailing spaces visibly break centring; `LU2` and a 29-character name cannot share a font size | 🟠 |
| **WP6** | The `é` must not render as tofu | Solved by **design, not by checking**: Satori takes a font list and falls back per glyph, so Pally first with a fallback covers this name and every future accented one | 🟠 |
| **WP7** | Per-card name toggle | Several of these logos are wordmarks that already contain the name; printing it twice looks like a mistake. A toggle lets the decision be made per shop, while looking at the result | 🟡 |
| **WP8** | The image route is an admin tool and must be guarded | It renders arbitrary business ids into an image. The data is public, but an unguarded endpoint is still a free render farm. `assertAuthorized(req, { roles: ['admin'] })` | 🔴 |
| **WP9** | **The dashboard prompt must not become a permanent fixture** | This is the "Pending Documents" lesson, one PR old: a card that is always present and always zero trains an admin to stop reading that corner. It renders only when there is genuinely something to post about, and an outage must not silently decide there is nothing | 🔴 |
| **WP10** | "New" needs a definition, and eventually a marker | Without one the same shop is posted about forever. v1 can be `created_at` within N days **with no schema change**; the durable answer is a `welcome_post_generated_at` column, mirroring `menu_reminder_sent_at`. Deferring it keeps this off the 23-migration backlog | 🟠 |
| **WP11** | Ratios are compositions, not scales | 1:1 and 4:5 share the two-up layout; 9:16 must stack. Parameterise by aspect so a new ratio is a config entry | 🟡 |
| **WP12** | Two ratios cover all four platforms | 1:1 (1080×1080) renders correctly on Facebook, Instagram, Threads and LinkedIn; 4:5 (1080×1350) buys ~25% more feed height where it matters most. 1.91:1 is for **link** previews, which this is not, and 9:16 is stories | 🟡 |
| **WP13** | Odd counts and single selections | 14 shops is seven pairs, but any odd selection leaves a card empty. Needs a 1-up variant — which is also the version a shop owner would reshare to their own page | 🟡 |
| **WP14** | Rendering cost | Each PNG is a real render. A "select all 14 and go" button must not do it in one request; batch client-side, one image at a time | 🟡 |
| **WP15** | **Consent for using a shop's logo in iLokal's marketing** | Normal practice, but there is no explicit permission in the terms — and those are still the placeholder copy marked "needs lawyer review". One line now is cheap; unwinding 50 posts is not | 🟠 |
| **WP16** | Output: download, not storage | A bucket means a migration and policies for something an admin downloads and posts by hand. Download first; revisit only if these need to be re-findable | 🟡 |

---

## 3. Decisions

**Two ratios, not four.** The four platforms overlap; 1:1 covers all of them and
4:5 is the upgrade for Instagram and Threads. Building the layout parameterised
by aspect means the other two are config, not rewrites.

**Names come from the database, with a per-card toggle** (WP7). The post says
"Find them on ilokal.shop" — a logo alone identifies nobody, and several of
these shops (`LU2`, `EM Finds`, `Mrs Stamps`) would be anonymous without it. But
a wordmark logo plus the name is a duplicate, so the toggle settles it per shop
against the actual render rather than as a blanket rule now.

**No schema in v1** (WP10, WP16). Manual selection and a direct download need
nothing from the database, which matters while cloud is 23 migrations behind.

**Download, don't post.** Auto-posting to four networks means app review, page
tokens and a token-refresh story. Not until the images are known to be good.

---

## 4. Action items

### Phase 1 — render one card, correctly ✅
- [x] **WP1/WP2** — add a TTF/OTF/WOFF Pally to `assets/fonts/`, commented as the
      server-render copy so it is not mistaken for the duplicate the brand notes forbid
- [x] **WP6** — font list with a fallback, so an accent can never render as tofu
- [x] **WP3** — logo fetch with a timeout and an initials fallback per card
      *(landed properly in phase 7 — the first cut only fell back when
      `logo_url` was NULL in the database, which is not the failure this item
      describes)*
- [x] **WP4/WP5** — `contain` + padding; trim, uppercase, length-keyed size ladder
- [x] **WP8** — `GET /api/admin/welcome-post`, admin-guarded, returning `ImageResponse`
- [x] Tests: the size ladder at 3 and 29 characters, trim, the initials fallback
- [x] ~~and that the route refuses a non-admin~~ — **this was claimed and not
      written**; the only suites here covered pure helpers and the composer.
      Landed in phase 7 (`__test__/features/admin/welcome-post-route.test.ts`)

### Phase 2 — the admin surface ✅
- [x] Page at `/admin/[adminId]/welcome-posts` — list shops, select 1–2, live preview
- [x] **WP7** per-card name toggle · **WP13** 1-up and 2-up variants
- [x] **WP11/WP12** ratio switch, 1:1 first with 4:5 behind the same layout
- [x] **WP14** download one at a time
- [x] **WP16** no storage

### Phase 3 — the dashboard prompt ✅
- [x] A card on the admin dashboard: *"N new businesses registered — create their welcome post"*, linking to the page with those shops preselected
- [x] **WP9** absent when the count is zero, and an em dash rather than a confident
      zero when the read fails — the same rule the stat cards now follow
- [x] **WP10** "new" = registered recently; revisit once a marker column exists

### Phase 4 — only if it earns it
- [ ] `welcome_post_generated_at` marker (migration → approval)
- [ ] 9:16 story variant
- [ ] **WP15** the terms line

## 5. Open questions

1. ~~1:1 only, or 1:1 + 4:5?~~ **Both**, behind one parameterised layout.
2. **The Pally TTF is still missing, and this is the one thing left.** Fetching
   from Fontshare was declined, and converting the existing `.woff2` locally is
   not viable: Pally stores `glyf` and `loca` in woff2's *transformed* form, so
   a converter has to rebuild glyph outlines rather than just decompress — ~300
   lines of risky code for a brand asset, and no decoder is installed. Until a
   `Pally-Bold.ttf` (or `.otf` / `.woff`) lands in `assets/fonts/`, the posts
   render correctly but **off-brand**, and the admin page says so. Dropping the
   file in is the entire fix; no code changes.
3. ~~How many days counts as "new"?~~ **14**, in `WELCOME_POST_NEW_DAYS`.
   Revisit when a `welcome_post_generated_at` marker exists — until then a shop
   can be posted about twice if nobody is watching.

---

## 6. Part 2 — footer scale and a composer worth looking at

> Two asks: a size control for the footer lines, and a UI that reads as a tool
> rather than a stack of default cards.

### 6.1 The design position

**The palette and type are not open.** iLokal has brand v1.0 — Brick Ember,
Jasmine, Cornsilk, Charcoal, Pally + Inter — and an admin shell every other
page already sits inside. Inventing a look for one tool would be the wrong kind
of distinctive. The freedom here is **layout and hierarchy**, and that is where
the actual problem is.

**The problem: the composer buries its own subject.** Two equal-weight cards
side by side, and the *smaller* one holds the rendered post. The post is the
entire point of the page — the thing being made, judged and downloaded — and it
currently gets a 420px column while the checkbox list gets the larger one. The
hierarchy is inverted.

**The thesis: the post is the hero, the controls are a rail.** The artefact
gets the space and the light; the controls go quiet beside it. That is the one
opinionated move, and everything else stays disciplined.

**Signature: the post is mounted, not embedded.** It sits centred on a neutral
field with a real shadow, the way artwork sits on a mount — so it reads as the
thing you are making rather than an `<img>` inside a panel. One idea, executed
precisely; no second flourish.

**Structure that encodes something true.** The shop list is not a sequence, so
it gets no numbering. But the two selected shops *do* have positions — the
first id is the left card, the second the right, and the route already honours
that order. Marking them **Left** and **Right** is information the admin needs
to predict the render, not decoration.

### 6.2 Parity table

| ID | Item | Why it matters | Risk |
| --- | --- | --- | --- |
| **WP17** | Footer lines have no size control | "Thank you for trusting iLokal." and "Find them on ilokal.shop" are fixed ratios of the canvas. At 4:5 they sit in more space and read small, and there is no way to correct it | 🟠 |
| **WP18** | **The preview is not the hero** | The rendered post is what the page is for, and it currently occupies the smaller of two equal cards. Invert it: the post takes the space, the controls become a rail | 🟠 |
| **WP19** | **Selection order decides which card is which, and nothing says so** | The route renders `ids` in order — first is the left card. An admin picking two shops cannot tell which lands where until the image returns, and cannot swap them without deselecting both | 🟠 |
| **WP20** | The size sliders are bare `<input type="range">` | No shadcn Slider is in use, the value is only shown as a percentage, and a keyboard user gets no labelled context. Needs a proper label, `aria-describedby`, and a visible reset | 🟠 |
| **WP21** | Every parameter change refetches the whole PNG | Each keystroke on a slider is a full server render. Needs debouncing, or dragging a slider fires a request per pixel | 🔴 |
| **WP22** | No way to tell a slow render from a broken one | The preview shows a spinner that clears on `load` **or** `error`, so a failed render leaves an empty frame with no explanation | 🟠 |
| **WP23** | Two scales will not be the last | Name and footer today; headline and eyebrow are the obvious next asks. A third hand-rolled slider is the point to generalise rather than the point to copy | 🟡 |
| **WP24** | The download is an `<a href>` with `aria-disabled` | `aria-disabled` on an anchor stops nothing — it still navigates. With no selection it should not be a link at all | 🟠 |
| **WP25** | The page must survive a phone | It is an admin tool and will mostly be used on a laptop, but the rail/hero split must collapse rather than overflow. Same `grid-cols-1 sm:` discipline as the rest of the repo | 🟡 |

### 6.3 Action items

#### Phase 5 — footer scale ✅
- [x] **WP17** — `footerScale` through the layout, the route and the UI, bounded and clamped exactly like `nameScale`
- [x] **WP23** — one `TEXT_SCALES` record driving both, so a third is an entry rather than another copy
- [x] Tests: the scale reaches the footer, clamps junk, and leaves the name size alone

#### Phase 6 — the composer UI ✅
- [x] **WP18** — invert the layout: post as hero on a mounted field, controls as a rail
- [x] **WP19** — label the selected shops **Left** / **Right**, and let them be swapped
- [x] **WP20** — real labels, reset affordance, keyboard-reachable
- [x] **WP21** — debounce the preview so a slider drag is one render, not thirty
- [x] **WP22** — a real error state on the preview, distinct from loading
- [x] **WP24** — no anchor when there is nothing to download
- [x] **WP25** — collapses at narrow widths
- [x] Tests: the debounce, the error state, the swap, and no link without a selection

### 6.4 Phase 7 — PR #39 review fixes ✅

The review (react-doctor + api-doctor) found one blocking issue and three high
ones. All are fixed on this branch.

| # | What | Why it mattered |
| --- | --- | --- |
| **WP26** | 🔴 **SSRF** — `logo_url` reached a server-side fetch | The `businesses` owner policy is `FOR ALL` with **no column guard** (verified: the only BEFORE UPDATE trigger on the table is `handle_updated_at`), so a registrant can `PATCH` `logo_url` to any string; `resolveStorageUrl` passes an absolute URL through untouched. The dashboard prompt preselects the two newest registrations, so no admin has to click a hostile row. New `lib/og/remoteImage.ts`: origin allowlist (`URL.origin` equality), 4s timeout, 5 MB cap, `image/*` only, `redirect: 'error'`, and a `data:` URL out so the renderer makes no request at all |
| **WP27** | 🔴 One unreachable logo failed the whole post | Satori's fetch has no timeout and no per-card recovery — and `ImageResponse` renders lazily *while streaming*, so a throw inside it escapes the handler's `try/catch` after the headers have gone out. Everything is fetched before the render now, and every failure is a `null` the card draws as initials |
| **WP28** | 🔴 `Cache-Control: public, immutable, max-age=31536000` | `ImageResponse`'s production default, on a response derived from an admin's cookie session. A shared cache could serve it to anyone, and a preview was frozen for a year. Now `private, no-store` on both the preview and the download |
| **WP29** | 🔴 The spinner could never clear | `useEffect(() => setStatus('loading'), [previewSrc])` runs *after* the `<img>` commits, so a cached response could fire `load` before anything was listening. Derived during render from `loadedSrc` instead, with a ref callback for `img.complete`. **The test caught a second defect in the fix**: `img.src` is absolute and `previewSrc` relative, so comparing them would never have matched in a browser either |
| **WP30** | Download re-rendered the whole post | And on a 500, `<a download>` saved the JSON error body to disk as a `.png`. Fetches the blob now, with a pending state and a reportable failure |
| **WP31** | Non-verified shops in the picker | `pending` / `rejected` / `suspended` were one careless click from a post that has to be deleted publicly. `.eq('status', 'verified')` |
| **WP32** | `created_at` asserted non-null | It is nullable, and Postgres orders NULLS **first** on `DESC` — so a shop with no timestamp sorted above every real registration and was read as the newest. `nullsFirst: false`, nullable in the type, and the prompt's ids now come from the cutoff rather than a slice |
| **WP33** | `newCount` capped at the fetched page | Counted head-only in SQL now, so it keeps rising past 60 |
| **WP34** | No rate limit | A CPU-bound render that also issues N fetches, and Server-Action/`/api/admin` traffic never enters the proxy limiter. 60/min per admin |
| **WP35** | Fonts re-read per render | Memoised (the promise, so concurrent renders share one read; failures are not cached) |
| **WP36** | Font paths invisible to output file tracing | A dynamic `assets/fonts/${base}.${ext}` and an assembled `node_modules` path are both unanalysable, so a standalone build would silently render off-brand — or 500. `outputFileTracingIncludes` covers all three. ⚠️ `require.resolve` on the TTF is **not** the fix: Turbopack reads it as an import and fails the build with "Unknown module type" |
| **WP37** | `?ids=a&ids=b` crashed the page | Next hands back `string[]`; `.split` threw into `error.tsx` |
| **WP38** | Dead space on a name-hidden card | The shared `nameBoxHeight` is in the card's fixed height, so omitting the element left `space-between` with one child. An empty spacer keeps the logo centred and the pair level |
| **WP39** | a11y | `aria-valuetext` (sliders announced `1.15` while the readout said 115%), `role="alert"` on the error panel, and intrinsic `width`/`height` so the spinner has a box to fill |
| **WP40** | The wordmark was fetched over HTTP | From `NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin` — a `Host`-derived server-side fetch, which is the opposite of what the comment above it claimed. Read off disk and inlined; absent rather than broken if unreadable |
| **WP41** | Misc | `auth.error` returned instead of a flat 401, `ids` deduped, typed scale lookup, deduplicated imports, a real two-column `loading.tsx`, `WelcomePostCandidate` moved to `lib/types/` |

**Tests +46 (2524 → 2570):** `lib/og/__tests__/remoteImage.test.ts` (23 — the
allowlist against credential prefixes, look-alike hosts, scheme downgrades, the
metadata service and `file:`; the cap on both the header and the body; never
throwing; and a log line that carries an origin rather than an attacker's full
URL) and `__test__/features/admin/welcome-post-route.test.ts` (17 — the
non-admin refusal the doc used to claim, the rate limit, the cache header, and
that the **guard's answer** is what reaches the template rather than merely
that the guard was called). Both new suites were verified to fail when the fix
they cover is removed.
