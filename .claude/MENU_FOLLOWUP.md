# Menu follow-up emails — parity table + action items

> Admin nudges owners who registered a shop but never gave it a **menu** (no
> offerings), and optionally those with **no live deal/coupon**. A page lists
> those shops; a button emails one or all of them. New branded email, copied
> from the forgot-password design with feature-appropriate content.
>
> Local doc, not committed (add to `.gitignore` with the others).

---

## 0. What "menu" means here, precisely

- A shop's **menu** = its rows in `products` (the offering catalogue — the same
  table `product-catalogues` edits). "No menu" = **zero live offerings**, where
  live means `status = 'active'` and `archived_at IS NULL`. An owner with only
  `unlisted`/`disabled`/archived rows has a public page that renders empty, so
  they count as "no menu" too — that is what the shopper sees.
- The word on screen is **not always "menu"**. `business_types.offering_profile`
  drives the vocabulary: a café's is "Menu", a retail shop's "Product
  Catalogue", a salon's "Service Menu" (`lib/utils/offeringVocabulary.ts`). The
  page header and the email must read the shop's own noun, or a salon owner is
  told to add a "menu" they do not have. This is the same rule the dashboard
  already follows via `useOfferingVocabulary()`.
- **Deals/coupons** = `coupons` rows. "Has a deal" is narrower than "has a row":
  the coupon-access invariant (`status='published'`, `archived_at IS NULL`,
  `start_date <= now`, and not past `expiry_date`) is what reaches a shopper. A
  draft or expired coupon is not a deal. Two derived facts, then, per shop:
  `has_live_menu` and `has_live_deal`.

---

## 1. What exists to build on

| Thing | Where | Note |
| --- | --- | --- |
| Email template (renderer) | `app/api/emails/templates/resetPassword.ts` | Pure `render…() → {subject, html, text}`, table-based, inline-styled, mso-conditional, HTML-escaped. **The design to copy.** |
| Email sender | `app/api/emails/sendResetEmail.ts` | Resend-over-axios; sandbox-logs when `RESEND_API_KEY` is absent/placeholder; **never throws**; logs Resend's body on failure |
| Dev preview | `app/api/dev/email-preview/route.ts` | `?template=reset` → renders HTML in the browser, 404 in prod. Add the new template to its map |
| Admin businesses page | `app/admin/[adminId]/businesses/page.tsx` | The pattern to mirror: searchParams → admin-guarded action → stats + `DataTable`, `dynamic = 'force-dynamic'` |
| Admin sidebar | `app/admin/[adminId]/config/sidebarConfig.ts` | Base hrefs, `injectAdminId` at render; add the new entry here |
| Admin auth | `verifyCurrentUserIsAdmin()` (`lib/api/admin/adminActionHelpers`) | Every admin action's first line |
| Owner email | `businesses.owner_id → auth.users / profiles.email` | The recipient. The admin list already embeds `owner:owner_id(email, full_name)` |
| Shared table | `components/custom/data-table/DataTable.tsx` | Takes `emptyState`; distinguish outage from "none" |

---

## 2. Parity table — the gaps and traps

| ID | Item | Why it matters | Risk |
| --- | --- | --- | --- |
| **MF1** | No query for "shops with no live menu" | The whole feature's data source. Must aggregate `products` per business **in SQL**, not fetch-all-then-count: PostGREST caps at 1000 rows, so a JS count silently under-reports past that. Precedent: every `analytics_*` RPC | 🔴 |
| **MF2** | The count RPC bypasses RLS, so it must be **admin-only** | It reads every shop's offering counts and owner email. `GRANT EXECUTE TO service_role` only, and the caller proves admin BEFORE the RLS-bypassing call — the standing analytics rule | 🔴 |
| **MF3** | Nothing records that a nudge was sent | Without it the admin re-emails the same owner every visit, and "send to all" becomes a spam cannon. Needs a stored `menu_reminder_sent_at` (+ maybe `deal_reminder_sent_at`). **This is a schema migration → HIGH risk, human approval** | 🔴 |
| **MF4** | Re-emailing a shop that has since added a menu | The list is derived and the send is a separate click; between them an owner may act. The send action must **re-check `has_live_menu` at send time** and refuse — the list is a hint, the server is the gate. Same shape as the coupon redeem re-check | 🔴 |
| **MF5** | `z.string().url()` / raw interpolation into the email | Every value in the email (shop name, owner name, CTA link) must be HTML-escaped by the renderer, exactly as `resetPassword.ts` does. The CTA link is app-owned (`NEXT_PUBLIC_APP_URL` + a route), never request-derived — the reset-link-poisoning lesson | 🟠 |
| **MF6** | Only **verified, non-archived** shops should be nudged | A pending or rejected shop being told to "finish your menu" is wrong, and an archived one is gone. Filter `status='verified' AND archived_at IS NULL` in the RPC | 🔴 |
| **MF7** | Vocabulary in the email | A salon reading "add your menu" (MF0). The RPC returns the shop's `offering_profile` noun, and the template takes it as a prop; the copy is built around a generic "listings/offerings" fallback when none resolves | 🟡 |
| **MF8** | The owner has no email, or an unconfirmed one | `owner_id` is NOT NULL but the email could be unverified. The RPC returns it; the send action skips a blank/unconfirmed address and reports it as skipped, not failed | 🟠 |
| **MF9** | "Send to all" with no per-send throttle | Server-Action POSTs never hit the proxy limiter, and this one fans out N emails. Per-admin flood guard (`rateLimit`) + a hard per-run cap (e.g. 100), and **log what was capped** — a silent truncation reads as "emailed everyone" | 🟠 |
| **MF10** | Bulk send partial failure | Resend can 4xx one address mid-run. The action must report `{ sent, skipped, failed }` counts, never throw, and never mark a row nudged whose send failed (or the owner is never reminded) | 🟠 |
| **MF11** | Unsubscribe / CAN-SPAM footer | This is **unsolicited-ish transactional-marketing** mail, unlike the reset (which the user asked for). The footer needs a physical address (the reset template already has one) and ideally an unsubscribe line. Flag for a real decision — do not invent a working unsubscribe link that goes nowhere | 🟡 |
| **MF12** | Outage-vs-empty on the table | "No shops need a nudge 🎉" and "we couldn't load the list" are different. The RPC failing must not render as an empty, celebratory table | 🟡 |
| **MF13** | No `loading.tsx` for the new route | Every admin route has one; the shell would freeze on navigation | 🟡 |
| **MF14** | Idempotency of a single send | A double-click must not send twice. The action is guarded by the same `menu_reminder_sent_at` re-check (MF4) within a short window, plus a client `useRef` latch on the button | 🟡 |

---

## 3. Action items (phased)

### Phase 1 — the email (safe, no schema, do now)

- **A1.** New `app/api/emails/templates/menuFollowUp.ts` — pure renderer,
  design copied from `resetPassword.ts`, content per §4. Props: `shopName`,
  `ownerName?`, `offeringNoun` (e.g. "menu" / "service menu"), `ctaUrl` (the
  owner's catalogue page), `appName?`. HTML-escapes every prop.
- **A2.** Add it to `app/api/dev/email-preview/route.ts`'s template map
  (`?template=menu-followup`) so the design can be iterated in a browser.
- **A3.** Tests mirroring `resetPassword.template.test.ts`: subject, non-empty
  html+text, the CTA url appears in both, the shop name is escaped, the noun
  flows into the copy, and the fallback noun renders when none is given.

### Phase 2 — the read side (needs the RPC; MF1, MF2, MF6, MF7)

- **A4.** Migration: `admin_businesses_missing_menu(p_search text, p_only_no_deal boolean)`
  — SECURITY DEFINER, pinned `search_path`, REVOKE from public/anon/authenticated,
  GRANT to `service_role`. Returns per verified non-archived shop: `id`,
  `shop_name`, `owner_email`, `owner_name`, `offering_noun`, `has_live_menu`,
  `has_live_deal`, `menu_reminder_sent_at`, `created_at`. Filtered to
  `has_live_menu = false` (and `has_live_deal = false` when `p_only_no_deal`).
  **HIGH risk (SECURITY DEFINER, reads every shop's owner email) — approval +
  `make migrate-cloud` + ledger reconcile.**
- **A5.** `getBusinessesMissingMenu` in `lib/api/admin/…` calling the RPC via
  the service-role client, AFTER `verifyCurrentUserIsAdmin()`. Returns
  `{ rows, failed }` (MF12).

### Phase 3 — the storage of "nudged" (MF3; **HIGH risk, gates everything else**)

- **A6.** Migration adding `businesses.menu_reminder_sent_at timestamptz` (and
  `deal_reminder_sent_at` if deals are in scope). Nullable, no backfill, no new
  policy (the existing owner/admin policies cover it; admin writes via
  service-role anyway). Additive. **HIGH risk by policy — approval.**

### Phase 4 — the send actions (MF4, MF8, MF9, MF10, MF14)

- **A7.** `sendMenuFollowUpAction(businessId)` — admin-guarded; **re-reads the
  shop and refuses if it now has a live menu** (MF4); skips a
  blank/unconfirmed owner email (MF8); renders + sends via a new
  `sendMenuFollowUpEmail` (thin wrapper over the shared Resend/axios path);
  on a real send, stamps `menu_reminder_sent_at = now()`; per-admin rate limit.
  Returns `{ ok, skipped?, reason? }`.
- **A8.** `sendMenuFollowUpBatchAction(businessIds[])` — cap the list
  (MF9), loop A7's core, return `{ sent, skipped, failed }` with the capped
  count logged. Never throws.

### Phase 5 — the admin surface (MF12, MF13)

- **A9.** `/admin/[adminId]/menu-follow-up` (or fold into the existing
  businesses page as a second tab — decide): stat cards (shops with no menu / no
  deal / nudged this week), a `DataTable` (shop, owner, offering noun, created,
  last nudged, per-row **Send reminder**), a header **Send to all** button with
  a confirm dialog stating the count, and the outage-vs-empty split.
- **A10.** Sidebar entry (`sidebarConfig.ts`) + `loading.tsx` + a
  `PageHeader`.

### Deferred / decisions needed

- **MF11** unsubscribe + CAN-SPAM stance — a product/legal call, not a code one.
- Whether "no deal" is in scope for v1 or menu-only.
- Whether this is its own page or a tab on Business Documents.
- A cooldown ("don't nudge again within 14 days") vs one-shot.

---

## 4. Email content (what differs from the reset email)

Same shell — Brick Ember header, Jasmine "Made for Iloilo City" pill, 600px
card, rounded CTA, physical-address footer. Different content:

- **Icon tile:** 📋 (a menu/checklist), not 🔒.
- **Heading:** "Your shop is live — now give it a menu" (noun-swapped:
  "…a service menu", "…a product catalogue").
- **Body:** "Hi {owner}, {shop} is verified and visible on iLokal, but shoppers
  who open it see an empty {noun}. Add a few {listings} so people know what you
  offer — it takes a couple of minutes."
- **CTA:** "Add your {noun}" → the owner's catalogue page.
- **No security note.** Replace with a value line: "Shops with a full {noun} get
  opened far more often." (Kept honest — no invented statistic.)
- **Footer:** keep the address; **add an unsubscribe/permission line** once MF11
  is decided. Subject: "Add your {noun} on iLokal".

The renderer takes the noun and shop name as props and escapes them; the
`{listings}` fallback is "listings" when no `offering_profile` resolves.

---

## 5. Risk summary

Phase 1 is safe (a pure renderer + a dev-preview line + tests). Phases 2–4
carry **two HIGH-risk migrations** (a service-role RPC over every shop's owner
email, and a new column) that need human approval before merge, then
`make migrate-cloud` + a ledger reconcile. The email is **outbound unsolicited
mail**, so MF11 (unsubscribe/CAN-SPAM) is a real gate, not a nicety.
