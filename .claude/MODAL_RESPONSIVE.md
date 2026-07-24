# Modal responsiveness rework — parities + action items

**Status:** plan only, no code written yet. Awaiting go-ahead.
**Trigger:** Add Product modal (`add-product.tsx`) renders taller than the
viewport on a short laptop screen — title clipped off the top, footer buttons
clipped off the bottom, no scrollbar reachable. Same class of bug affects most
long-form modals.

---

## 1. Root cause

`components/ui/dialog.tsx` → `DialogContent` base class:

```
fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)]
translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg
... sm:max-w-lg
```

Three structural gaps:

1. **No `max-height`.** Content taller than the viewport just renders taller.
2. **No overflow handling.** With `translate-y-[-50%]` centering, the excess
   spills off the top *and* bottom equally — so the clipped top region is
   unreachable by any scroll (the overflow is on the ancestor, not the dialog).
3. **No responsive padding.** `p-6` (24px) on every breakpoint eats ~48px of a
   320px-wide screen.

Individual modals then paper over it inconsistently — the audit below shows
five different homegrown strategies, three of which are themselves broken.

---

## 2. Audit — 26 files, 28 `DialogContent` + 2 `SheetContent`

Legend: 🔴 breaks today · 🟡 fragile · 🟢 fine

### 🔴 Fixed pixel height — overflows any viewport shorter than the value

| File | className | Notes |
|---|---|---|
| `product-catalogues/components/add-product.tsx:165` | `h-200 overflow-auto sm:max-w-lg` | 800px tall, always. **The reported bug.** `h-200` also *forces* 800px even when content is short |
| `coupons/components/add-coupon.tsx:189` | `h-200 overflow-auto sm:max-w-xl` | same |
| `coupons/components/update-coupon.tsx:168` | `h-200 overflow-auto sm:max-w-xl` | same |
| `home/components/TourDialog.tsx:49` | `flex h-140 max-w-5xl! flex-row gap-8` | 560px tall + 1024px wide + `flex-row` never collapses to a column on mobile |

### 🔴 Fixed min-width — overflows narrow screens horizontally

| File | className | Notes |
|---|---|---|
| `registration/components/application-success-dialog.tsx:37` | `min-w-3xl p-10` | `min-width: 48rem` (768px) beats the base `max-w-[calc(100%-2rem)]`; horizontal clipping on every phone |

### 🟡 Content-sized width — unbounded

| File | className | Notes |
|---|---|---|
| `product-catalogues/components/update-product.tsx:140` | `sm:max-w-max` | width follows content; a long product name can exceed the viewport |
| `components/custom/Masonry.tsx:139` | `w-max ... sm:max-w-max` | lightbox; large images push past the viewport |

### 🟡 Viewport height, but the wrong element scrolls

| File | className | Notes |
|---|---|---|
| `branches/components/edit-branch.tsx:157` | `h-[80vh] overflow-y-auto sm:max-w-lg` | closest to correct, but the *whole* dialog scrolls (header + footer scroll away) and `h-` forces 80vh even for short content. `vh` also ignores mobile browser chrome |
| `registration/components/legal-dialog.tsx:198` | `max-h-[85vh] sm:max-w-2xl` + inner `ScrollArea h-[60vh]` | best current pattern; two hardcoded vh values must be kept in sync by hand |

### 🟢 Short dialogs — no height issue, but inherit the missing base guard

`UserFormModal.tsx` (×2, `sm:max-w-106.25`), `view-documents.tsx`,
`DangerZoneTab.tsx` (×2), `delete-coupon.tsx`, `admin-branches-client.tsx`,
`SessionWarningDialog.tsx`, `disapprove-documents.tsx`, `approve-documents.tsx`,
`DeleteConfirmationDialog.tsx`, `SignupForm.tsx`, `view-product.tsx`,
`delete-product.tsx`, `MFAEnrollDialog.tsx`, `ChangeEmailDialog.tsx`,
`ChangePasswordDialog.tsx`, `delete-branch.tsx`, `apply-sale.tsx`

Risk: these are short *today*. A validation-error list or a longer body makes
them overflow with no guard. `view-documents.tsx` embeds a document viewer and
is the most likely next victim.

### Sheets

| File | className | Verdict |
|---|---|---|
| `components/ui/sheet.tsx:65` | `inset-y-0 h-full w-3/4 sm:max-w-sm` | 🟢 full-height by construction |
| `product-catalogues/components/manage-catalogue.tsx:81` | `flex w-full flex-col p-4 sm:max-w-md md:max-w-lg` | 🟢 already flex-column |

Sheets are structurally fine — no action beyond confirming inner scroll regions.

---

## 3. Parities (the rules every modal must satisfy after this work)

| # | Parity | Rationale |
|---|---|---|
| **P1** | A modal never exceeds `100dvh - 2rem` tall or `100vw - 2rem` wide, at any viewport | The reported bug. `dvh` not `vh` so mobile URL-bar collapse doesn't clip |
| **P2** | Overflow scrolls **inside the body region**; header and footer stay pinned and visible | Today the title and the submit button are the first things clipped |
| **P3** | Height is content-driven — `max-h`, never `h-` — so a 3-field modal doesn't render 800px tall | `h-200` / `h-[80vh]` force dead whitespace on short forms |
| **P4** | No `min-w-*` above `100vw - 2rem`; no unbounded `max-w-max`/`w-max` | horizontal clipping |
| **P5** | Padding steps down on small screens (`p-4 sm:p-6`) | 48px of 320px is 15% of the screen |
| **P6** | Multi-column modal layouts collapse to one column below `sm` | `TourDialog` `flex-row` |
| **P7** | Modal footers stack vertically below `sm`, full-width buttons | already `flex-col-reverse sm:flex-row` in `DialogFooter` — verify per call site |
| **P8** | Scroll region uses `overscroll-contain` so scroll doesn't chain to the page behind | iOS scroll-through |
| **P9** | Focused input inside a scrolled body stays visible when the mobile keyboard opens | `dvh` + `scroll-margin` on fields |
| **P10** | One shared mechanism — no per-file height math | keeps the two `vh` numbers in `legal-dialog` from drifting |

---

## 4. Action items — phased

### Phase 1 — base primitive (LOW risk, fixes all 28 at once) — ✅ DONE

- [x] `components/ui/dialog.tsx` → `DialogContent`:
  - `grid` → `flex flex-col`
  - add `max-h-[calc(100dvh-2rem)]`
  - add `overflow-y-auto overscroll-contain` (**not** `overflow-hidden` — see
    decision below)
  - `p-6` → `p-4 sm:p-6`
  - kept `gap-4`, `sm:max-w-lg`; all existing per-file overrides still win via
    `tailwind-merge`
- [x] New exported `DialogBody`: `-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:-mx-6 sm:px-6`
- [x] `DialogHeader` / `DialogFooter` get `shrink-0`
- [x] Verified no `DialogContent` child uses `col-span`/`row-span`/`place-*` —
      the `grid` → `flex` swap has no layout dependents

**Decision changed during implementation — `overflow-y-auto`, not
`overflow-hidden`.** The plan called for `overflow-hidden` on the base, but that
would leave the 20 not-yet-migrated modals clipped *and unscrollable* if their
content ever exceeds the new `max-h`. `overflow-y-auto` means every unmigrated
modal degrades to whole-dialog scrolling (header scrolls away, but nothing is
unreachable). Phase 2 modals opt into pinned header/footer by adding
`overflow-hidden` alongside `DialogBody`, which `tailwind-merge` resolves in
their favour.

**Side fix required by the responsive padding.** `tailwind-merge` treats
`sm:p-6` as a different modifier scope from `p-0`, so a bare padding override no
longer beat the base at `sm+`. Patched the three call sites that override
padding:

- `components/custom/Masonry.tsx` — `p-0` → `p-0 sm:p-0`
- `product-catalogues/components/view-product.tsx` — `p-0` → `p-0 sm:p-0`
- `registration/components/application-success-dialog.tsx` — `p-10` → `p-6 sm:p-10`
  (also the Phase 3 target for this file)

**Free wins from `max-h` alone** (CSS `max-height` beats `height`, and
`tailwind-merge` keeps both since `h-*` and `max-h-*` are separate groups): the
four fixed-pixel-height modals — `add-product` / `add-coupon` / `update-coupon`
(`h-200`) and `TourDialog` (`h-140`) — are now capped to the viewport and scroll
via their own `overflow-auto`. **The reported Add Product bug is fixed.**

**Known gap, closes in Phase 2:** the ✕ close button is `absolute top-4 right-4`
inside the scroll container, so on a whole-dialog scroll it scrolls out of view.
Esc and overlay-click still close. Migrating a modal to `DialogBody` +
`overflow-hidden` pins it again.

**Still broken after Phase 1 (as expected):** `application-success-dialog`'s
`min-w-3xl` — CSS `min-width` beats `max-width`, so it needs the Phase 3 edit.

- **Verified:** `yarn lint` + **1084** tests + `yarn build` green.
- **Acceptance:** every existing modal still renders correctly at 1920×1080; no
  modal exceeds the viewport at 1366×**640**. ⚠️ Browser sweep not yet run —
  static verification only.

### Phase 2 — long-form modals adopt `DialogBody` (MEDIUM risk, visual) — ✅ DONE

Converted to pinned header + scrolling body + pinned footer; hand-rolled heights
deleted. Pattern applied: `DialogContent` gets `overflow-hidden` (overrides the
base `overflow-y-auto` so only the body scrolls), the `<form>` gets
`flex min-h-0 flex-1 flex-col gap-4`, the scroll region becomes `DialogBody`,
`DialogFooter`'s `mt-6` dropped (the form `gap-4` spaces it).

- [x] `add-product.tsx` — dropped `h-200 overflow-auto`
- [x] `add-coupon.tsx` — dropped `h-200 overflow-auto`
- [x] `update-coupon.tsx` — dropped `h-200 overflow-auto`
- [x] `update-product.tsx` — dropped `sm:max-w-max` → `sm:max-w-lg`; the inner
      `w-lg` width hack removed (content max-width now owns width). Header stays
      outside the form (its existing structure); form is the flex-1 child
- [x] `edit-branch.tsx` — dropped `h-[80vh] overflow-y-auto`
- [x] `legal-dialog.tsx` — dropped both `vh` values; `ScrollArea` is now the
      flex-1 body (`-mx-4 min-h-0 flex-1 px-4 sm:-mx-6 sm:px-6`). Radix
      `ScrollArea.Viewport` is `size-full`, so the flex-resolved height makes it
      scroll — no fixed `h-[60vh]` needed
- [x] `view-documents.tsx` — loading/list/empty states wrapped in `DialogBody`;
      long doc lists now scroll under a pinned header
- **Result:** the ✕ close button is pinned again in all seven (it lives in
  `DialogContent`, outside the scrolling `DialogBody`), closing the Phase-1 gap
  for these modals.
- **Verified:** `yarn lint` + **1084** tests + `yarn build` green. ⚠️ Browser
  sweep still pending.
- **Acceptance:** at 1366×640 and 390×844, header + footer always visible, body
  scrolls, submit button always reachable without zooming.

### Phase 3 — width + layout offenders (LOW risk) — ✅ DONE

- [x] `application-success-dialog.tsx` — `min-w-3xl` → `sm:max-w-2xl` (CSS
      `min-width` was beating the base `max-width` and clipping phones), padding
      already `p-6 sm:p-10` from Phase 1. Tall content scrolls via the Phase-1
      base `overflow-y-auto` (this modal has no header/footer to pin)
- [x] `TourDialog.tsx` — dropped `flex h-140`; now `flex-col gap-6` on mobile,
      `sm:h-140 sm:flex-row sm:gap-8` on desktop. Left illustration panel
      `w-1/2` → `w-full shrink-0 sm:w-1/2` with `py-8 sm:py-0` so it stacks
      above the content on phones instead of squeezing into a half-width column.
      `max-w-5xl!` kept (the `!` beats the base `sm:max-w-lg`). Base `max-h` caps
      the fixed `sm:h-140` on short viewports; base `overflow-y-auto` scrolls it
- [x] `Masonry.tsx` — lightbox inner frame `h-[85vh] w-4xl` → `h-[85dvh]
      w-[min(90vw,56rem)]` (was a fixed 896px that overflowed any screen
      narrower than that); image already `object-contain`. Content keeps
      `overflow-hidden` so the viewer never scrolls
- [~] Arbitrary-width normalization (`sm:max-w-106.25`, `sm:max-w-100`,
      `sm:w-sm`) — **skipped.** All are `sm:`-gated and smaller than the 640px
      `sm` breakpoint, so they fit at every viewport (base
      `max-w-[calc(100%-2rem)]` governs below `sm`). Pure cosmetic; renaming
      risks visual drift for no functional gain
- **Verified:** `yarn lint` + **1084** tests + `yarn build` green. ⚠️ Browser
  sweep still pending.

### Phase 4 — mobile ergonomics (LOW risk) — ✅ DONE

- [x] **P4 — below-`sm` full width.** Base `max-w-[calc(100%-2rem)]` already
      gives the 2rem margin, but `TourDialog`'s `max-w-5xl!` used `!important`,
      which beat the base at **every** breakpoint and removed the mobile margin.
      Replaced with `max-w-[calc(100%-2rem)] sm:max-w-5xl` — proper margin on
      phones, 64rem on desktop, no `!` needed (`tailwind-merge` lets the
      call-site class win over base `sm:max-w-lg`)
- [x] **P9 — keyboard doesn't hide the focused input.** Added `scroll-p-4
      sm:scroll-p-6` (scroll-**padding**) to base `DialogContent` **and**
      `DialogBody`. Scroll-padding on the scroll container is one class that
      covers every descendant field — no need to touch `Field` or the raw
      `Label`+`Input` dialogs (`ChangeEmailDialog`, `MFAEnrollDialog`, …) that
      don't use `Field`. When the mobile keyboard shrinks the viewport and the
      browser scrolls the focused control into view, it keeps this much gap from
      the scrollport edge
- [x] **P7 — footer buttons full-width on mobile.** No code change needed: base
      `DialogFooter` is `flex flex-col-reverse`, and flex's default
      `align-items: stretch` already makes stacked buttons fill the width.
      Audited every `DialogFooter className` override — only three
      (`SessionWarningDialog` `gap-3`, `DeleteConfirmationDialog` `gap-2 pt-6`,
      `apply-sale` `pt-2`) touch the footer, and all only add gap/padding; none
      override the column stack. A fixed `min-w-28` (add-product Save) is a
      *min*-width, so stretch still fills to 100%
- **Verified:** `yarn lint` + **1084** tests + `yarn build` green. ⚠️ Browser
  sweep still pending (esp. the keyboard behaviour — needs a real device or
  device-emulation with an on-screen keyboard).

### Phase 5 — guardrail + docs (LOW risk) — ✅ DONE

- [x] Contract test (`components/ui/__tests__/dialog.contract.test.ts`, +10).
      **Changed from the plan:** not a `react-dom/server` render test — Radix
      `Dialog` renders through a React Portal, which emits no markup under
      `renderToStaticMarkup` in the `node` test env, so the HTML can't be
      inspected. Asserts the base-primitive contract on the source instead
      (same guarantee, no DOM).
- [x] Repo-wide usage sweep in the same file: walks every `.tsx`, extracts each
      `<DialogContent>` className, and fails if any reintroduces a fixed `h-*`
      or a `min-w-*`. Includes a not-a-no-op guard (asserts >10 usages found).
- [x] Documented the header/body/footer contract in
      `.claude/docs/component-standards.md` ("Dialogs / Modals") +
      `.claude/docs/ui-standards.md` (responsive-layout section).
- [x] Updated `.claude/CHANGELOG.md`.
- **Verified:** `yarn lint` + **1094** tests + `yarn build` green.

---

## Status: all 5 phases complete

Remaining before merge:
1. **Manual browser sweep** across the §5 viewport matrix — nothing here was
   confirmed in a real browser, only statically + via unit tests. Priority:
   Add Product / Add Coupon at 1366×640 (the reported case) and the mobile
   keyboard behaviour (P9) on a real device or device-emulation.
2. Answer the §7 open questions if a follow-up pass is wanted (full-screen
   mobile modals, `AlertDialog` for confirms, bottom-sheet). None block this
   work — they're enhancements.

---

## 5. Testing plan

**Viewports:** 1920×1080 · 1440×900 · **1366×640** (the reported case) ·
1024×768 · 768×1024 · 390×844 (iPhone) · 360×640 (small Android).

**Per modal:** open → header visible → footer/submit visible and clickable →
body scrolls if needed → no horizontal scrollbar → tab through fields keeps
focus visible → close works.

**Priority manual sweep:** add-product, add-coupon, update-coupon,
update-product, edit-branch, TourDialog, application-success, legal-dialog,
view-documents, Masonry.

**Automated:** `yarn lint && yarn test:run && yarn build`.

---

## 6. Risk + rollback

- No schema, no API, no auth surface. Pure presentational.
- Highest risk is Phase 1's `grid` → `flex` regressing a modal's internal
  spacing; caught by the manual sweep.
- Rollback: `git revert` — phases are independently revertible if each is its
  own commit.

---

## 7. Open questions

1. Full-screen modals on phones (`< sm`), or keep the centered card with margins?
   Full-screen is better for the long forms; a mixed approach means two patterns.
2. Convert the six confirm-only dialogs (`delete-*`, `approve/disapprove`) to
   Radix `AlertDialog` for correct semantics, or leave as `Dialog`?
   Out of scope for responsiveness, but they'd be touched anyway in Phase 3.
3. Is a `Drawer`/bottom-sheet pattern wanted for mobile? Would need a new
   dependency (`vaul`) — **stack is frozen**, so default answer is no.
