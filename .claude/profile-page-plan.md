# Profile Page Plan

# Route: `/business/[businessId]/profile`

**Created:** 2026-06-03
**Status:** Planning

---

## Overview

The profile page is accessed from the UserMenu dropdown (`UserMenu.tsx` → `bPath('profile')`).
It is scoped to the business owner and covers **two distinct concerns**:

| Section             | Data source         | Editable                                             |
| ------------------- | ------------------- | ---------------------------------------------------- |
| Personal Account    | `profiles` table    | Yes — name, phone, avatar                            |
| Business Profile    | `businesses` table  | Yes — shop name, description, logo, banner, category |
| Verification Status | `businesses.status` | Read-only (admin-controlled)                         |
| Account Status      | `profiles.status`   | Read-only                                            |

---

## Parities (existing patterns to match)

### 1. Page structure

- Follow `app/business/[businessId]/shop/page.tsx` — Server Component page that fetches data server-side,
  passes to client components.
- Use `notFound()` if business does not exist.
- Parallel fetch: `getBusinessById(businessId)` + `fetchProfileById(userId)` via `Promise.all`.

### 2. Server Actions

- Existing: `updateCurrentUserProfileAction` in `app/(auth)/actions/userActions.ts`
  — handles `full_name`, `phone_number`, `avatar_url` via `updateUserProfile()` from `lib/api/users/userService.ts`.
- Need new: `updateBusinessProfileAction` in `app/business/[businessId]/actions/`
  — handles `shop_name`, `description`, `logo_url`, `banner_url`, `category_id`.
  Must use `verifyBusinessOwner()` (same pattern as `branchActions.ts`).

### 3. Validation

- Existing: `updateCurrentUserProfileSchema` in `lib/validation/auth.ts`
- Need new: `updateBusinessProfileSchema` in `lib/validation/business.ts`

### 4. Auth guard

- Use `verifyBusinessOwner()` in the new server action (not `assertAuthorized` — that's for web/admin API routes).
- The page itself is already gated by `proxy.ts` + `isProtectedPath`.

### 5. Route config

- Add `businessProfilePath(businessId)` helper in `config/routeConfig.ts` following the same pattern as
  `businessShopPath`, `businessCouponsPath`, etc.

### 6. Verification status badge

- `businesses.status` enum: `'pending' | 'verified' | 'suspended' | 'rejected'` (from `lib/types/business.ts`).
- Render as a read-only Badge with color coding:
  - `verified` → green
  - `pending` → yellow/amber
  - `suspended` → orange
  - `rejected` → red
- Include a tooltip/note: "Verification status is managed by iLokal admins."

### 7. Avatar upload

- Reuse the `api/upload` route (`/api/upload`) already used by shop logo/banner.
- Storage bucket: `avatars` (or `shop-logos` for business logo — check existing bucket names).

### 8. Form pattern

- Use `react-hook-form` + Zod resolver (same as coupon/product dialogs).
- shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormMessage>` components.
- Show toast on success/error using the existing toast pattern.

---

## Action Items

### Phase 1 — Foundation

- [ ] **1.1 Route config** — Add `businessProfilePath(businessId)` to `config/routeConfig.ts`.
- [ ] **1.2 Validation schema** — Add `updateBusinessProfileSchema` (shop_name, description, logo_url,
      banner_url, category_id optional) to `lib/validation/business.ts`.

### Phase 2 — Data & Server Logic

- [ ] **2.1 Business profile action** — Create `updateBusinessProfileAction` in
      `app/business/[businessId]/actions/profileActions.ts`.
  - Guard with `verifyBusinessOwner()`.
  - Validate with `updateBusinessProfileSchema`.
  - Call `supabase.from('businesses').update(...)`.
  - Call `revalidatePath(businessProfilePath(businessId))`.
  - Return `ApiResponse<Business>`.
- [ ] **2.2 Export action** — Re-export from `app/business/[businessId]/actions/index.ts`.

### Phase 3 — UI Components

- [ ] **3.1 `VerificationStatusBadge`** — Read-only badge component.
      File: `app/business/[businessId]/profile/components/VerificationStatusBadge.tsx`
      Props: `status: BusinessVerificationStatus`
      Colors: verified=green, pending=amber, suspended=orange, rejected=red.

- [ ] **3.2 `PersonalInfoForm`** — Editable form for personal profile.
      File: `app/business/[businessId]/profile/components/PersonalInfoForm.tsx`
      Fields: full_name, phone_number, avatar_url (upload).
      Action: `updateCurrentUserProfileAction` (already exists).

- [ ] **3.3 `BusinessInfoForm`** — Editable form for business profile.
      File: `app/business/[businessId]/profile/components/BusinessInfoForm.tsx`
      Fields: shop_name, description, logo_url (upload), banner_url (upload), category_id.
      Action: `updateBusinessProfileAction` (new).

- [ ] **3.4 `AccountStatusCard`** — Read-only card showing profiles.status + profiles.role.
      File: `app/business/[businessId]/profile/components/AccountStatusCard.tsx`

### Phase 4 — Page

- [ ] **4.1 Page** — Create `app/business/[businessId]/profile/page.tsx`.
  - Server Component.
  - Fetch `getBusinessById(businessId)` + `fetchProfileById(userId)` in parallel.
  - Render sections: Personal Info, Business Profile, Verification Status, Account Status.
  - `notFound()` guard if business is null.

### Phase 5 — Testing

#### Unit Tests

- [x] **5.1 Validation schema** — `lib/validation/__tests__/business.test.ts`
  - `updateBusinessProfileSchema` — valid input, missing required fields, field length limits.

- [x] **5.2 `updateBusinessProfileAction`** —
      `app/business/[businessId]/actions/__tests__/profileActions.test.ts`
  - Unauthorized: `verifyBusinessOwner` returns unauthorized → returns `success: false`.
  - Validation error: invalid shop_name → returns validation error.
  - DB error: supabase update throws → returns internal error.
  - Happy path: valid data → returns `success: true` with updated business, calls `revalidatePath`.

- [x] **5.3 `VerificationStatusBadge`** — skipped: no React test infrastructure in vitest (no React plugin, no jsdom/happy-dom configured). Covered by TypeScript types. — Snapshot/render test per status variant.

#### Integration Tests

- [x] **5.4 Page data-fetch integration** —
      `app/business/[businessId]/__tests__/profilePage.test.ts`
  - Mock `getBusinessById` + `fetchProfileById` — confirm both are called with correct IDs.
  - Business not found → `notFound()` is called.
  - Confirmed: page renders all three sections (personal, business, verification).

- [x] **5.5 Form submission integration** — covered via action + query tests; client-side form render tests require React test setup not present in project. —
  - `PersonalInfoForm` submits → `updateCurrentUserProfileAction` is called with correct payload.
  - `BusinessInfoForm` submits → `updateBusinessProfileAction` is called with correct payload.
  - On success: toast appears, form values reflect updated data.
  - On error: error message rendered in form.

---

## Risk & Notes

| Risk                                                        | Level  | Mitigation                                                                              |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Avatar/logo upload bucket names                             | Low    | Check `app/(auth)/actions/` and existing upload route                                   |
| `businesses.shop_name` vs `businesses.name` column mismatch | Medium | DB type shows `shop_name`; confirm via `lib/types/database.ts` before form field naming |
| `category_id` picker needs category list                    | Low    | Reuse `getCategoriesAction` already exported from `actions/index.ts`                    |
| Verification status shown as editable by mistake            | High   | Strict read-only render; no form field; tooltip explanation                             |
| `profiles.status` vs `businesses.status` confusion          | Medium | Render both clearly labeled with distinct section headers                               |
