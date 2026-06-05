# Business Settings — Parities & Action Items

**Created:** 2026-06-05  
**Branch:** `feat/business-settings`  
**Scope:** Full business settings page accessible from the UserMenu dropdown (Profile → Settings link), plus Supabase TOTP/MFA login hardening.

---

## 1. Parities — What Exists vs. What Needs to Be Built

### Already Exists

| Artifact                                                | Location                                               | Notes                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| UserMenu dropdown with Settings link                    | `app/business/[businessId]/components/UserMenu.tsx:87` | Link goes to `bPath('settings')` — **no page behind it yet**            |
| Profile page (personal + business info)                 | `app/business/[businessId]/profile/`                   | PersonalInfoForm, BusinessInfoForm, AccountStatusCard                   |
| `NotificationPreferences` type                          | `lib/types/notification.ts`                            | `{ user_id, email, push, digest }`                                      |
| `notificationsQuery` getPreferences / upsertPreferences | `lib/api/notifications/notificationsQuery.ts`          | Queries `notification_preferences` table — **no migration exists**      |
| Auth validation schemas (login, signup, updateProfile)  | `lib/validation/auth.ts`                               | No `changePassword` or `changeEmail` schema                             |
| `verifyBusinessOwner` guard                             | `lib/api/verifyBusinessOwner.ts`                       | Used as the standard action auth guard                                  |
| `updateBusinessProfileAction`                           | `app/business/[businessId]/actions/profileActions.ts`  | Business name/logo/description — **not** operating hours / social links |
| Supabase SSR client setup                               | `config/index.ts`, `supabase/bearer.ts`                | Browser client at `config/client.ts` — needed for MFA client calls      |
| `businessPath` helper                                   | `config/routeConfig.ts`                                | Used to build all business sub-routes                                   |

### Does NOT Exist — Must Build

| Feature                                    | Gap                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `app/business/[businessId]/settings/` page | Entire route is missing                                                          |
| `notification_preferences` DB table        | Type/query exist but no migration                                                |
| `business_settings` DB table               | No operating hours, social links, public contact, allow_reviews columns anywhere |
| Change-password server action              | No action; Supabase `auth.updateUser({ password })` not wired                    |
| Change-email server action                 | No action; Supabase `auth.updateUser({ email })` not wired                       |
| TOTP / MFA enrollment flow                 | Zero MFA code in repo                                                            |
| MFA challenge step at login                | Business login page has no second-factor step                                    |
| Active sessions list + revoke              | Not implemented                                                                  |
| Operating hours CRUD                       | No schema or UI                                                                  |
| Social / contact links                     | No schema or UI                                                                  |
| Danger zone (deactivate / delete)          | No action or UI                                                                  |
| Settings-specific Zod schemas              | `lib/validation/settings.ts` does not exist                                      |
| `lib/api/settings/` query + service        | Missing entirely                                                                 |

---

## 2. Settings Page Structure

The settings page (`/business/[businessId]/settings`) will be a **single tabbed page** following the same visual pattern as the profile page (Card-based sections, Server Components for data load, Client Components for forms).

### Tabs

| Tab                      | Sections                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| **Security**             | Change Password · Change Email · Two-Factor Authentication (TOTP) · Active Sessions |
| **Notifications**        | Email notification toggles · Push notification toggle · Digest frequency            |
| **Business Preferences** | Operating Hours · Public Contact (website, phone) · Social Links · Allow Reviews    |
| **Danger Zone**          | Deactivate Business · Delete Account                                                |

---

## 3. Action Items

### Phase 1 — Database Migrations

**Risk: Medium — schema changes require `make migrate-up` before any code that reads these tables.**

- [ ] **`20260605000000_notification_preferences.sql`**
  - Create `notification_preferences` table:
    ```sql
    CREATE TABLE notification_preferences (
      user_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email    boolean NOT NULL DEFAULT true,
      push     boolean NOT NULL DEFAULT false,
      digest   text    NOT NULL DEFAULT 'daily'
                        CHECK (digest IN ('daily', 'weekly', 'none')),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users manage own preferences"
      ON notification_preferences FOR ALL USING (auth.uid() = user_id);
    ```
  - Acceptance: `make migrate-up` succeeds; `make generate-types` outputs the table.

- [ ] **`20260605000001_business_settings.sql`**
  - Create `business_settings` table:
    ```sql
    CREATE TABLE business_settings (
      business_id             uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
      operating_hours         jsonb,       -- { mon: {open:'09:00',close:'18:00',closed:false}, ... }
      social_links            jsonb,       -- { facebook, instagram, tiktok, website }
      contact_website         text,
      contact_phone_public    text,
      allow_reviews           boolean NOT NULL DEFAULT true,
      coupon_default_expiry_days int NOT NULL DEFAULT 30,
      updated_at              timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Owner manages own business settings"
      ON business_settings FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM businesses b
          WHERE b.id = business_id AND b.owner_id = auth.uid()
        )
      );
    ```
  - Acceptance: `make migrate-up` succeeds; `make generate-types` outputs the table.

- [ ] **Run `make generate-types`** after both migrations are applied to refresh `lib/types/database.ts`.

---

### Phase 2 — Types & Validation

- [ ] **`lib/types/settings.ts`** — add `BusinessSettings` domain type:

  ```ts
  export type OperatingHoursDay = {
    open: string; // 'HH:mm'
    close: string;
    closed: boolean;
  };
  export type OperatingHours = Record<
    'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
    OperatingHoursDay
  >;
  export type SocialLinks = {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
  };
  export type BusinessSettings = {
    business_id: string;
    operating_hours: OperatingHours | null;
    social_links: SocialLinks | null;
    contact_website: string | null;
    contact_phone_public: string | null;
    allow_reviews: boolean;
    coupon_default_expiry_days: number;
  };
  ```

- [ ] **Export from `lib/types/index.ts`** — add `BusinessSettings`, `OperatingHours`, `SocialLinks`.

- [ ] **`lib/validation/settings.ts`** — Zod schemas:
  - `changePasswordSchema` — `{ currentPassword, newPassword, confirmPassword }` with strength rules
  - `changeEmailSchema` — `{ newEmail, password }` (require password to confirm identity)
  - `updateNotificationPreferencesSchema` — `{ email, push, digest }`
  - `updateBusinessSettingsSchema` — `{ operating_hours?, social_links?, contact_website?, contact_phone_public?, allow_reviews?, coupon_default_expiry_days? }`
  - `deactivateBusinessSchema` — `{ confirmation: 'DEACTIVATE' }`
  - `deleteAccountSchema` — `{ password, confirmation: 'DELETE' }`

---

### Phase 3 — Server Layer (Query + Service + Actions)

- [ ] **`lib/api/settings/settingsQuery.ts`**
  - `getBusinessSettings(businessId)` → `BusinessSettings | null`
  - `upsertBusinessSettings(businessId, data)` → `BusinessSettings`
  - `getNotificationPreferences(userId)` → `NotificationPreferences | null`
  - `upsertNotificationPreferences(userId, data)` → `NotificationPreferences`

- [ ] **`lib/api/settings/settingsService.ts`**
  - Wrap query functions with `ApiResponse<T>` envelope.
  - `getBusinessSettingsService(businessId)`
  - `upsertBusinessSettingsService(businessId, data)`
  - `getNotificationPreferencesService(userId)`
  - `upsertNotificationPreferencesService(userId, data)`

- [ ] **`app/business/[businessId]/actions/settingsActions.ts`** — Server Actions:
  - `changePasswordAction(businessId, data)` — calls `supabase.auth.updateUser({ password })` via server client; validates `currentPassword` by re-authenticating with `supabase.auth.signInWithPassword`.
  - `changeEmailAction(businessId, data)` — calls `supabase.auth.updateUser({ email })`; Supabase sends confirmation to new address.
  - `upsertBusinessSettingsAction(businessId, data)` — writes to `business_settings` table; revalidates settings path.
  - `updateNotificationPreferencesAction(businessId, data)` — upserts `notification_preferences` for the user.
  - `deactivateBusinessAction(businessId)` — sets `businesses.status = 'inactive'`; requires typed confirmation.
  - `deleteAccountAction(businessId)` — sets `profiles.archived_at = now()`, `status = 'inactive'`; then calls `supabase.auth.admin.deleteUser` via service-role client. **Requires human approval before merge.**

- [ ] **MFA Server Actions** — `app/business/[businessId]/actions/mfaActions.ts`:
  - `getMFAFactorsAction()` — calls `supabase.auth.mfa.listFactors()` (client-side call; server just fetches enrolled factor list via admin API for display).
  - `unenrollMFAAction(factorId)` — calls `supabase.auth.mfa.unenroll({ factorId })` via server.
  - Note: Enroll and verify steps use **Supabase browser client** calls (`supabase.auth.mfa.enroll`, `supabase.auth.mfa.challengeAndVerify`) — these must happen client-side in a `'use client'` component.

---

### Phase 4 — UI Pages & Components

- [ ] **`app/business/[businessId]/settings/page.tsx`** — Server Component
  - Load: `verifyBusinessOwner`, `getBusinessSettings`, `getNotificationPreferences`, current user's MFA factors via admin client.
  - Render a `<Tabs>` (shadcn `Tabs` component) with four tabs: Security · Notifications · Business Preferences · Danger Zone.
  - Pass server-loaded data as props to each tab client component.

- [ ] **`app/business/[businessId]/settings/components/SecurityTab.tsx`** (`'use client'`)
  - `<ChangePasswordForm>` — controlled form; calls `changePasswordAction`.
  - `<ChangeEmailForm>` — controlled form; calls `changeEmailAction`.
  - `<MFASection>` — shows enrolled factors list + Enroll/Unenroll buttons.
    - If no factor: "Enable Two-Factor Authentication" button opens `<MFAEnrollDialog>`.
    - If enrolled: shows factor name + last-used date + "Remove" button (calls `unenrollMFAAction`).

- [ ] **`app/business/[businessId]/settings/components/MFAEnrollDialog.tsx`** (`'use client'`)
  - Step 1: Call `supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'iLokal', friendlyName: 'Authenticator App' })` → get `totp.qr_code` (SVG) and `totp.secret`.
  - Display QR code + manual entry secret in a dialog.
  - Step 2: OTP input field → call `supabase.auth.mfa.challengeAndVerify({ factorId, code })`.
  - On success: revalidate + show success toast.
  - On error: show inline error; allow retry.

- [ ] **`app/business/[businessId]/settings/components/NotificationsTab.tsx`** (`'use client'`)
  - Toggle switches for `email`, `push`.
  - RadioGroup for `digest` (`daily` / `weekly` / `none`).
  - Auto-save on change (debounced) via `updateNotificationPreferencesAction`.

- [ ] **`app/business/[businessId]/settings/components/BusinessPreferencesTab.tsx`** (`'use client'`)
  - `<OperatingHoursForm>` — 7-row table (Mon–Sun) with open/close time pickers + closed toggle.
  - `<SocialLinksForm>` — inputs for Facebook URL, Instagram URL, TikTok URL, Website.
  - `<PublicContactForm>` — website URL, public phone number.
  - Switch for `allow_reviews`.
  - Number input for `coupon_default_expiry_days`.
  - Single Save button; calls `upsertBusinessSettingsAction`.

- [ ] **`app/business/[businessId]/settings/components/DangerZoneTab.tsx`** (`'use client'`)
  - "Deactivate Business" — confirmation dialog with typed input `DEACTIVATE`; calls `deactivateBusinessAction`.
  - "Delete Account" — confirmation dialog with password + typed input `DELETE`; calls `deleteAccountAction`. Labeled as **irreversible**.

- [ ] **Update `config/routeConfig.ts`** — add `businessSettingsPath(businessId)` helper.

---

### Phase 5 — MFA Login Challenge (Business Login)

- [ ] **`app/login/business/`** — locate the business login page/component.
  - After `supabase.auth.signInWithPassword` succeeds, check `data.session?.user.factors` or call `supabase.auth.mfa.listFactors()`.
  - If user has an enrolled TOTP factor: render an OTP input step (don't complete login yet).
  - OTP step calls `supabase.auth.mfa.challenge({ factorId })` then `supabase.auth.mfa.verify({ factorId, challengeId, code })`.
  - On verify success: session is fully elevated; proceed to dashboard redirect.
  - On verify failure: show error with retry (max 3 attempts, then force logout).

---

### Phase 6 — Integration & Unit Tests

> All tests use Vitest. Follow the no-`any` rule — use types from `lib/types` and cast mocks via `unknown as`.

- [ ] **`lib/api/settings/__tests__/settingsQuery.test.ts`** — unit tests:
  - `getBusinessSettings` — returns null when no row; maps correctly when row exists.
  - `upsertBusinessSettings` — inserts on first call; updates on second call; returns updated data.
  - `getNotificationPreferences` / `upsertNotificationPreferences` — same pattern.

- [ ] **`lib/api/settings/__tests__/settingsService.test.ts`** — unit tests:
  - Wraps query results in `ApiResponse<T>` correctly.
  - Returns `{ success: false, error }` when query throws.

- [ ] **`app/business/[businessId]/actions/__tests__/settingsActions.test.ts`** — unit tests:
  - `changePasswordAction` — validates current password; rejects weak new password; returns success on valid input.
  - `changeEmailAction` — validates email format; returns `success: true` (Supabase sends confirmation).
  - `upsertBusinessSettingsAction` — validates operating hours shape; rejects invalid social URLs; calls query correctly.
  - `updateNotificationPreferencesAction` — rejects invalid `digest` value.
  - `deactivateBusinessAction` — requires `DEACTIVATE` confirmation; succeeds on match; rejects on mismatch.
  - Mock `verifyBusinessOwner` to return `{ authorized: true, user: { id: 'uid' } }` via `vi.mock`.

- [ ] **`app/business/[businessId]/actions/__tests__/mfaActions.test.ts`** — unit tests:
  - `unenrollMFAAction` — calls `supabase.auth.mfa.unenroll`; returns success; handles Supabase error.

- [ ] **`app/api/web/settings/__tests__/settings.endpoints.test.ts`** — integration tests (if web API routes are added for settings):
  - POST `/api/web/settings/notifications` — 401 without auth; 400 on invalid body; 200 on valid.
  - PATCH `/api/web/settings/business` — same pattern.
  - (Skip if using Server Actions exclusively.)

- [ ] **`lib/api/settings/__tests__/settingsQuery.mfa.test.ts`** — MFA-specific unit tests:
  - List factors: returns empty array when none enrolled.
  - Unenroll: calls Supabase SDK correctly; propagates errors.

---

## 4. Acceptance Criteria

| Item                 | Criteria                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Settings page loads  | `GET /business/[id]/settings` returns 200; all four tabs render server data                                               |
| Change password      | Correct current password + valid new password → Supabase updates user; wrong current password → 400 error shown           |
| Change email         | Valid new email → Supabase sends confirmation email; invalid format → Zod error shown                                     |
| TOTP enroll          | QR code renders; valid 6-digit code from authenticator app → factor created; Supabase `listFactors` returns 1 factor      |
| TOTP unenroll        | Removes factor; `listFactors` returns 0 factors                                                                           |
| MFA at login         | Business owner with TOTP enrolled sees OTP prompt after credential login; wrong OTP rejected; correct OTP completes login |
| Operating hours save | Valid schedule saved to `business_settings`; reloading page shows saved values                                            |
| Notification prefs   | Toggle email off → `notification_preferences.email = false`; toggling back restores                                       |
| Deactivate           | `DEACTIVATE` confirmation → `businesses.status = 'inactive'`; business no longer appears in verified list                 |
| Tests pass           | `yarn test:run` green; no `any` types in test files                                                                       |
| Lint                 | `yarn lint --fix && yarn build` clean                                                                                     |

---

## 5. Risk Register

| Risk                                                                | Level  | Mitigation                                                                  |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| MFA breaks existing login if improperly gated                       | High   | Feature-gate behind enrolled factor check; no impact if user has no factors |
| `deleteAccountAction` is irreversible                               | High   | **Requires human approval before merge**; add soft-delete path first        |
| `business_settings` migration CASCADE                               | Medium | Migration uses `ON DELETE CASCADE`; safe if `businesses` row is deleted     |
| `notification_preferences` table name conflicts with existing query | Low    | Query already references the correct table name — just needs the migration  |
| TOTP enroll QR code leaks                                           | Low    | QR only shown inside authenticated dialog; never stored server-side         |

---

## 6. File Map (new files to create)

```
supabase/migrations/
  20260605000000_notification_preferences.sql
  20260605000001_business_settings.sql

lib/
  types/
    settings.ts                            (new)
  validation/
    settings.ts                            (new)
  api/
    settings/
      settingsQuery.ts                     (new)
      settingsService.ts                   (new)
      __tests__/
        settingsQuery.test.ts              (new)
        settingsService.test.ts            (new)

app/business/[businessId]/
  settings/
    page.tsx                               (new — Server Component)
    components/
      SecurityTab.tsx                      (new)
      NotificationsTab.tsx                 (new)
      BusinessPreferencesTab.tsx           (new)
      DangerZoneTab.tsx                    (new)
      MFAEnrollDialog.tsx                  (new)
      ChangePasswordForm.tsx               (new)
      ChangeEmailForm.tsx                  (new)
      OperatingHoursForm.tsx               (new)
      SocialLinksForm.tsx                  (new)
  actions/
    settingsActions.ts                     (new)
    mfaActions.ts                          (new)
    __tests__/
      settingsActions.test.ts              (new)
      mfaActions.test.ts                   (new)

config/
  routeConfig.ts                           (update — add businessSettingsPath)
```

---

## 7. Implementation Order

1. Migrations → `make migrate-up` → `make generate-types`
2. `lib/types/settings.ts` + export from `lib/types/index.ts`
3. `lib/validation/settings.ts`
4. `lib/api/settings/settingsQuery.ts` + `settingsService.ts`
5. `settingsActions.ts` + `mfaActions.ts`
6. Settings page + all tab components
7. MFA login challenge in business login page
8. All unit + integration tests
9. `yarn lint --fix && yarn build` — confirm clean
