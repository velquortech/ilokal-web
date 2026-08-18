# Release — Category Search, Two Registration Crashes & Repo Guardrails (2026-08-18)

> Companion to [2026-08-18 — Mobile Map Pinning, Place Search & Form Drafts](./2026-08-18-mobile-map-drafts-reliability.md),
> which covered PR #61 and closed at commit `b3e8550`. **This report covers
> everything that landed after that window and was therefore not in it** —
> six merged PRs plus one still open.
>
> | PR | State | Size | What |
> | --- | --- | --- | --- |
> | #62 | ✅ merged | +60/−8 | CI applies out-of-order migrations (`--include-all`) |
> | #63 | ✅ merged | +125/−1 | CI automates the deploy-checklist smoke tests |
> | #60 | ✅ merged | +295/−1, 4 files | PII export guard |
> | #64 | ✅ merged | +214/−9, 7 files | Worktree cleanup tool + PII pre-commit hook + runbooks |
> | #65 | ✅ merged | +298/−118, 16 files | Documentation resync |
> | #66 | ✅ merged | +23/−20, 4 files | Dead booking code removed |
> | **#67** | 🔶 **OPEN** | +1,591/−134, 9 files, 3 commits | **Category search + two crash fixes** |
>
> ⚠️ **Everything user-facing in this report is in PR #67, which is not merged.**
> See the Go/No-Go at the bottom before posting anything.

## What's new — by surface

### 🔎 Business registration — finding your category

- **Search your trade instead of scrolling for it.** The category step now has
  a search box that looks across **every business type at once**. Previously
  the only way to find your category was to pick a business type and scroll its
  grid — which is how an owner gives up and picks something approximate.
- **Results tell you where they live.** Each result shows the vertical it
  belongs to, and picking one moves the type filter to match, so the filter
  never disagrees with what you selected.
- **Fully keyboard-driven** — arrows move through results, Enter picks, Escape
  clears, and the highlighted row is announced to screen readers.
- **"Recently chosen"** — the categories you've picked before appear above the
  grid, so registering a second shop (or coming back after abandoning halfway)
  doesn't mean hunting again.

## 🐛 Fixes

### Two crashes in the registration category step

Both were **live and reachable**, both took down the whole step — the category
grid is that page's entire content — and both came from the same root cause: a
database column that permits `NULL` while the app's own types promised a
`string`, so nothing warned anyone.

- **Typing in the new search box could crash the page.** The search compared
  against each category's description, and a category with no description made
  it fail on the very first keystroke.
- **A category with no picture could crash the page.** The grid rendered the
  image straight out of the database; a category saved without one brought the
  step down instead of showing a plain tile.

Both are fixed, and the fixes are deliberately **opposite**: the missing
description is normalised to empty text at the point the data enters the app,
while the missing image is *preserved* as absent and handled by the card, which
now draws a placeholder using the business type's own icon. (Blanking the image
would have been the tempting one-line fix and would have crashed identically —
an empty image address fails the same way a missing one does.) A category with
no picture is still fully selectable rather than quietly disappearing from the
taxonomy.

### Smaller

- **Clearing the category search no longer strands keyboard users.** The clear
  button vanishes once the box is empty — taking keyboard focus with it — so
  focus is now handed back to the search field.
- **Recent picks save correctly under React's development checks**, which ran
  the save twice.

## 🛡️ Guardrails & repo health (not user-facing)

None of this changes the product; all of it changes how likely we are to break
it.

- **User-data exports can no longer be committed.** A CI check plus a
  pre-commit hook now block PII export files before the commit exists (#60,
  #64). *Do not put this in a public post — see the note in the checklist.*
- **CI can deploy out-of-order migrations** (`--include-all`, #62). The
  previous report listed this as a prerequisite in its checklist; it is a
  shipped fix in its own right, and without it the "General" category rows
  never reach production.
- **The deploy checklist's smoke tests run themselves** (#63) instead of being
  a list somebody remembers to work through.
- **Worktree cleanup tool + runbooks** (#64) — a script that refuses to remove
  a worktree with open PRs, unmerged branches, dirty trees or live servers.
- **The documentation now matches the code** (#65). Six statements were
  actively wrong, not merely stale. The worst told developers that `events`,
  `booking_requests` and `product_sections` did not exist in production and
  that code selecting from them was broken — every one of those had been live
  for weeks. Also fixed: a migration banner claiming a verification that was 23
  migrations out of date, three documented mobile endpoints whose paths 404,
  and roughly fifteen links pointing at files that no longer exist.
- **Dead booking code removed** (#66) — an orphaned route folder left behind by
  the August removal, and a constant with no callers. The database schema and
  the mobile passthrough were deliberately left dormant so re-enabling booking
  stays a feature decision, not a migration.

---

## Social posts

> ⚠️ **Everything below describes PR #67 only, and #67 is not merged.** Nothing
> here is publishable until it is. The guardrails section above is deliberately
> absent from these posts.

### Facebook / Instagram

> 🔎 **Finding your shop category just got easier**
>
> Setting up your business on iLokal? You can now **search** for your category
> instead of scrolling through business types one at a time — type what you do
> and we'll find it, wherever it lives.
>
> - Search across every business type at once
> - See which type each result belongs to before you pick
> - Your recent picks are saved, so a second shop is faster to set up
>
> Plus a couple of crashes squashed on the way. 🛠️

### Play Store "What's new"

> • Search for your business category instead of browsing type by type
> • Results show which business type they belong to, and picking one sets it
> • Recently chosen categories appear at the top for returning owners
> • Full keyboard and screen-reader support in the category search
> • Fixed two crashes on the category step — one when typing in search, one on
>   categories saved without a picture

---

## Internal — deploy checklist (do NOT post)

1. **PR #67 must merge before any of the social copy is published.** Every
   user-facing item in this report is in that PR. The merged PRs (#60, #62–#66)
   are guardrails and documentation with no user-visible surface.
2. **Review commit `c4792eb` before merging #67 — it is unaudited.** The
   category-search work and both crash fixes were audited and are covered by
   tests; that third commit (a 233-line change to the shared
   `components/ui/searchable-select.tsx`, used by the admin categories page)
   was already uncommitted in the worktree and was committed so the branch
   wasn't left half-recorded. It has only ever been verified at whole-tree
   level.
3. **No migration and no schema change in this window.** Nothing to apply, and
   no ordering constraint against the app deploy — unlike the previous release,
   whose General-category rows gated its own post.
4. **Never publish the PII guard.** "We now block user-data exports from being
   committed" reads to an outside audience as a disclosure that they were
   previously being leaked. It is an internal hardening measure; the correct
   audience is the team.
5. **Post-merge smoke test** — open registration, type a partial trade name in
   the category search and confirm results appear from more than one business
   type; pick one and confirm the type filter follows; confirm a category with
   no image renders a placeholder tile and is still selectable; clear the
   search with the X and confirm focus returns to the input.

### Not verified

- **No browser pass on any of this.** These surfaces sit behind auth and this
  environment has no login path, so the dropdown, the recents strip, the
  placeholder tile and the focus return are proven by tests, not by being
  clicked. Step 5 above is the first time a human will see them.
- **The crash fixes are pinned by tests that cannot reproduce the original
  crash.** `next/image` is mocked in the suite, so what the tests prove is that
  the component never passes it a missing value — which is the invariant that
  prevents the crash, not the crash itself.

Go/No-Go for the social post: **hold until PR #67 is merged and step 5 passes.**
