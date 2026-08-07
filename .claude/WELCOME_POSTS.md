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

### Phase 1 — render one card, correctly
- [ ] **WP1/WP2** — add a TTF/OTF/WOFF Pally to `assets/fonts/`, commented as the
      server-render copy so it is not mistaken for the duplicate the brand notes forbid
- [ ] **WP6** — font list with a fallback, so an accent can never render as tofu
- [ ] **WP3** — logo fetch with a timeout and an initials fallback per card
- [ ] **WP4/WP5** — `contain` + padding; trim, uppercase, length-keyed size ladder
- [ ] **WP8** — `GET /api/admin/welcome-post`, admin-guarded, returning `ImageResponse`
- [ ] Tests: the size ladder at 3 and 29 characters, trim, the initials fallback,
      and that the route refuses a non-admin

### Phase 2 — the admin surface
- [ ] Page at `/admin/[adminId]/welcome-posts` — list shops, select 1–2, live preview
- [ ] **WP7** per-card name toggle · **WP13** 1-up and 2-up variants
- [ ] **WP11/WP12** ratio switch, 1:1 first with 4:5 behind the same layout
- [ ] **WP14** download one at a time
- [ ] **WP16** no storage

### Phase 3 — the dashboard prompt
- [ ] A card on the admin dashboard: *"N new businesses registered — create their welcome post"*, linking to the page with those shops preselected
- [ ] **WP9** absent when the count is zero, and an em dash rather than a confident
      zero when the read fails — the same rule the stat cards now follow
- [ ] **WP10** "new" = registered recently; revisit once a marker column exists

### Phase 4 — only if it earns it
- [ ] `welcome_post_generated_at` marker (migration → approval)
- [ ] 9:16 story variant
- [ ] **WP15** the terms line

## 5. Open questions

1. **1:1 only for v1, or 1:1 + 4:5 together?** The second is roughly 30% more
   work, not double.
2. Where does the Pally TTF come from — the Fontshare download, or converting
   the existing woff2? The licence covers both; the download is cleaner.
3. How many days counts as "new" for the dashboard prompt — 7? 14? Until a
   marker exists this is the only thing stopping a shop being posted twice.
