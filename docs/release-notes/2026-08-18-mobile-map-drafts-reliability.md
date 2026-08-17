# Release — Mobile Map Pinning, Place Search & Form Drafts (2026-08-18)

> Window: this session · 11 commits, 49 files, +2,645/−157
> Commits `de4435a` → `b3e8550` — **merged to `main` via PR #61** ✅

## What's new — by surface

### 📍 Location & maps (business owner dashboard)

- **Search for a place instead of hunting on the map** — every location step
  (registration wizard, branch wizard, edit-branch dialog) now has a search box
  above the map: type a place name and pick a result to pin it instantly.
- **Maps work on mobile** — the map was hidden on small screens in the
  registration and branch wizards; it now renders, and the pin can be **tapped
  or dragged** to set exact coordinates (drag precision verified at high zoom).
- **The pin survives wizard steps** — set your location, go Back, come forward
  again, and the pin (and its coordinates) are still there.

### 🛍️ Shops & categories

- **"General" fallback category** for every business type — shops that fit none
  of the existing categories now get a last-resort option instead of being left
  out (added for all active business types via a seed migration; verified
  against a fresh DB and dry-run on the cloud DB).

### 🎟️ Coupons, Deals & product catalogues

- **Your in-progress forms are saved** — close the Add Item or Coupons & Deals
  dialog by accident (or on purpose) and your draft is restored when you reopen
  it. The draft clears once you save.
- **Sensible promo defaults** — new promos default to **100 redemptions total /
  3 per customer** instead of "Unlimited", so you're never accidentally
  over-committing (and the expiry default pattern still applies).

### 🐛 Fixes

- **Signup form typed characters in reverse** — the document is now pinned to
  `lang="en" dir="ltr"` (root layout + error page), fixing reversed text while
  typing.
- **Forms no longer reject valid input with stray spaces** — values are trimmed
  before length checks across signup, branches, business, coupon, and product
  forms (with tests).
- **Back / Next buttons can't submit the form** — wizard navigation is now
  explicit `type="button"`, so tapping Back no longer fires the form early.
- **Consistent field spacing** — every wizard step and dialog body now keeps a
  uniform 24px rhythm between fields on mobile **and** desktop, pinned by a
  contract test so a regression can't sneak back in.

---

## Social posts

### Facebook / Instagram

> 📍 **Big update for iLokal!**
>
> We've been busy fixing and polishing — here's what's new for our business
> owners:
>
> 🗺️ **Put your shop on the map — easier than ever**
> - Type a place name to find your location — no more pinching and panning
> - Drag or tap the pin to set your exact spot, right from your phone
> - Your location stays saved as you go through the steps
>
> 🗂️ **Every shop has a home** — new "General" category for businesses that
> don't fit the existing ones, so nothing gets left out
>
> 💾 **No more lost work** — accidentally closed the Add Item or Coupons &
> Deals form? Your draft is saved and comes right back when you reopen it
>
> 🎟️ **Smarter promos** — new deals default to 100 redemptions / 3 per
> customer instead of Unlimited, so you're never over-committing
>
> 🔧 **Fixes** — signup forms no longer type in reverse, valid inputs with
> stray spaces are accepted, Back/Next buttons won't submit your form early,
> and all forms now have consistent, comfortable spacing on mobile and desktop
>
> Update and take a look! ✨

### In-app news feed

> **New: map pinning with place search, saved form drafts, and a General
> category**
>
> - Set your shop's location by **searching a place name** or dragging the pin
>   on the map — fully working on mobile now, and your pin stays put as you
>   move between wizard steps.
> - **Add Item and Coupons & Deals forms auto-save** — close the dialog by
>   accident and your draft is restored on reopen; it clears once you save.
> - A **General category** is now available for every business type, for shops
>   that fit none of the existing ones.
> - New promos default to **100 redemptions / 3 per customer** instead of
>   Unlimited.
> - Fixed: reversed characters while typing in signup, forms rejecting valid
>   inputs with stray spaces, and Back/Next accidentally submitting the form.
> - All wizard steps now share a consistent 24px field spacing on mobile and
>   desktop.

### Play Store "What's new"

> • Location search box on every map step — type a place name to pin your shop
> • Maps now work on mobile with tap and drag pinning; pin survives back/next
> • Add Item and Coupons & Deals forms keep your draft if the dialog is closed
> • New promos default to 100 total redemptions / 3 per customer
> • General fallback category added for every business type
> • Fixed signup text reversing, space-only input rejection, and Back/Next
>   submitting forms early
> • Consistent field spacing across all wizard steps on mobile and desktop
