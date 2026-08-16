# Release — Business Dashboard Revamp & Category Management (2026-08-16)

> Window: 2026-08-14 → 2026-08-16 · 28 commits, 128 files, +7,700/−1,841
> Landed via PRs **#51, #52, #53 (merged to main)** and **#54 (pending merge —
> category picker scoping + the admin Categories page; NOT yet on main)**.

## What's new — by surface

### 🛠️ Admin

- **Categories page** (`/admin/<id>/categories`, new sidebar entry) — full create /
  edit / delete for the offering taxonomy. Before this there was **no admin path
  to add a category** (seed/SQL only) and the existing actions gated on a
  `super_admin` role that cannot exist.
  - **Kind selector** — Product / Service / Either — so a service-only category
    never appears in a product picker.
  - **Business Type selector** — Global or one of the 8 verticals — so a new
    category can be pinned to one vertical instead of showing everywhere.
  - Slug auto-derives from the name; stored slugs are never overwritten on
    rename; delete is refused while offerings still use the category.

### 🧑‍💼 Business owner dashboard

- **Coupons & Deals**
  - **Buy 1 Get 1 (BOGO) and FREE** discount types added to the model
    (schema, types, validation, migration) — no longer percent-only.
  - **Template-first promo dialog**: pick a preset (5 / 10 / 15 %, ₱, FREE,
    Buy 1 Take 1), duplicate an existing promo, toggle it on/off.
- **Dashboard home**: checklist-first layout, KPI captions that explain each
  number, real empty states, and a clear call-to-action when the shop isn't live yet.
- **Tables**: coupons and redemptions unified onto the shared data table with a
  **mobile card-view fallback** and **44px touch targets**; same treatment for
  the owner's event list.
- **Navigation / IA**:
  - Sidebar labels are vocabulary-driven per vertical (e.g. "My Shop" / "Deals").
  - Shop identity + verification badge in the header; notifications on mobile.
  - New **Manage** sidebar group (Profile, Settings); the avatar menu no longer
    duplicates those links.
- **Account**: pending-verification banner, Insights primer, owner copy map.
- **Registration wizard**: strict location validation with surfaced submit
  errors, honest copy, hidden lat/lng, category picker polish on mobile, deal
  presets wired into the Launch Deal step, and an `owner_events` funnel table
  to track where signups drop off.
- **Branding**: iLokal lockup in the dashboard shell, brand-red hover/accent
  feedback, neutral loading skeleton.
- **Product catalogues** (PR #54):
  - Kind-scoped category options — a "both" business adding a service no longer
    sees product categories.
  - The **Update** dialog gained an editable **Category** field (was add-only).
  - Server-side scope validation — a mismatched category is rejected on
    create/update through any entry point.

### 👤 Users & customers

- **Shop pages**: product thumbnails render again — the gallery mosaic and
  product cards were blank because the image optimizer didn't serve the
  write-time WebP; images now load directly.
- **Landing mobile menu**: a **Log In** link now sits under the "List Your
  Business" CTA — phone visitors could sign up but had no way back into an
  existing account.

### 🗄️ Data & infrastructure

- 4 additive migrations (none destructive): `categories.kind`, coupon
  BOGO/FREE, `owner_events` funnel, per-vertical shop-label nouns.
- Dev tooling: `make dev-cloud` to run the app against the cloud DB.

---

## Social posts

### Facebook / Instagram

> 📦 Big update for iLokal! 🎉
>
> We've given the business dashboard a major refresh, and admins got a brand-new
> tool. Here's what's new:
>
> 🧑‍💼 **For business owners**
> - Create deals the easy way — presets for 5/10/15% off, fixed prices, FREE
>   items, and **Buy 1 Take 1** 🎁
> - A smarter home page: a setup checklist, clearer numbers, and guided next steps
> - Cleaner menus and tables that work great on your phone 📱
> - A fresh iLokal look with our new branding
>
> 🛠️ **For admins**
> - A brand-new **Categories** page to manage what shoppers filter by —
>   with product/service and business-type scoping so the right options show up
>
> 👤 **For shoppers**
> - Shop photos load properly again, and mobile visitors can now **Log In**
>   straight from the menu
>
> The right categories, the right tools, and a better experience for everyone.
> Update and take a look! ✨

### In-app news feed

> **New: smarter deals, a cleaner dashboard, and admin category management**
>
> - **Business owners**: build promos from presets — 5/10/15% off, fixed price,
>   FREE, or Buy 1 Take 1 — duplicate them, and switch them on/off in one tap.
>   Your dashboard home now leads with a setup checklist and explains your
>   numbers, and every table has a mobile card view.
> - **Admins**: a new Categories page to create and edit the taxonomy, scoped by
>   product/service kind and business type.
> - **Shoppers**: shop photos load correctly again, and the mobile menu has a
>   Log In link.
>
> Categories now match reality: a service shop is never offered product
> categories, and a wrong pick can be fixed after the fact.

### Play Store "What's new" — live on main today

> • Buy 1 Take 1 and FREE promo types, with preset-based creation and duplication
> • Revamped owner dashboard: setup checklist, clearer KPIs, mobile-friendly tables
> • Improved registration flow with stricter location validation
> • Fixed shop photo thumbnails and added Log In to the mobile menu

### Coming soon (PR #54, not yet on main)

> • New admin Categories page with product/service and business-type scoping
> • Kind-scoped category pickers — a "both" business adding a service never sees
>   product categories, and the Update dialog can change a category after the fact
>
> When #54 merges, fold these into the live list above.
