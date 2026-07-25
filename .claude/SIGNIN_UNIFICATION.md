# Sign-in Unification — one `/sign-in` door for customer + business

> **Status:** PLANNED — parities + action items. Delete this file and the
> CLAUDE.md note when finished.
>
> **Risk: HIGH (auth surface + routing).** Changes the login doors, a
> publicly-invocable Server Action, and every redirect-to-login site. Needs
> human approval before merge per Workflow rules. **No schema migration** —
> roles, RLS, rate-limit buckets, and `redirectByRole` targets are unchanged.

## Goal

One centralized login page at **`/sign-in`** for customers (`app_user`) and
business owners (`business_owner`). The form doesn't ask "which portal?" — it
signs the user in and routes by the account's role:

| Role             | Post-login destination                                             |
| ---------------- | ------------------------------------------------------------------ |
| `app_user`       | validated `?next=` deep link, else `/explore` (customer portal)    |
| `business_owner` | `/business/[businessId]` (or `/business/registration` if no business yet) |
| `admin`          | `/admin` (resolver → `/admin/[adminId]`)                           |

All buttons/links/redirects that currently point at `/login` or
`/login/business` point at `/sign-in`. Old URLs 308-redirect so bookmarks and
in-flight emails keep working.

## Decisions (defaults chosen — flag disagreement before Phase 1)

1. **Admin keeps its own door.** The ask covers customer + business only. The
   admin page moves to **`/sign-in/admin`** (so the `/login` segment can be
   deleted entirely) and keeps `loginAsAdmin`'s role gate + distinct branding.
   An admin who signs in at `/sign-in` is NOT rejected — role routing sends
   them to `/admin` (no more "wrong portal" dead end).
2. **MFA step runs for every role on the unified form.**
   `checkMFARequiredAction()` is a no-op unless a TOTP factor is enrolled
   (today: business settings only), so this is behavior-preserving for
   customers and future-proof if customer MFA ever ships.
3. **`?next=` stays customer-only** (current `safeNext` contract). Extending
   deep-links to business/admin is a separate follow-up — it needs role-scoped
   validation so a crafted `next` can't bounce an owner into another portal's
   URL space.
4. **No "already signed in" bounce added.** Today an authenticated user can
   open a login page (proxy matcher doesn't cover `/login`); `/sign-in` keeps
   that parity. Optional follow-up, not in scope.

## Current state (what exists today)

**Pages** — `app/(auth)/login/page.tsx` → `CustomerLoginForm`;
`login/business/page.tsx` → `BusinessLoginForm` (`force-dynamic`);
`login/admin/page.tsx` → `AdminLoginForm`. All share the `(auth)` split-screen
layout.

**Forms** (`components/auth/`):

| Form                | Action           | Extras                                                                 |
| ------------------- | ---------------- | ---------------------------------------------------------------------- |
| `CustomerLoginForm` | `loginAction`    | `?next=` via `safeNext` (app_user only), typed 429 handling, Suspense for `useSearchParams`, cross-link to business login |
| `BusinessLoginForm` | `loginAsBusiness`| MFA elevation step (`checkMFARequiredAction` → `verifyMFALoginAction`), password show/hide, businessId → `redirectByRole` |
| `AdminLoginForm`    | `loginAsAdmin`   | password show/hide; NO MFA check; error match on message only (not `digest`) |
| `LoginForm`         | —                | **DEAD — zero importers.** Delete.                                     |
| `PortalSelector`    | —                | **DEAD — zero importers.** Delete.                                     |

**Actions** (`app/(auth)/actions/authActions.ts`): `loginAction` is already
role-agnostic — SEC-8 rate limits (buckets shared with `/api/auth/login`),
generic errors, archived/status gate, returns `{ user } | { rateLimited }`.
`loginAsBusiness` = loginAction + role gate + businessId lookup + throwing 429.
`loginAsAdmin` = loginAction + role gate + throwing 429. `redirectByRole`
already routes all three roles correctly.

**Route config** (`config/routeConfig.ts`): `ROUTES.AUTH.LOGIN='/login'`,
`ADMIN_LOGIN='/login/admin'`, `BUSINESS_LOGIN='/login/business'`.
`loginPathForPathname()` picks the door per portal for logout/session-expiry.

**Every redirect-to-login call site** (inventory, verified by grep):

Via `ROUTES.AUTH.LOGIN` (constant swap covers these):
- `proxy.ts:216,231` — unauthenticated / non-active status on protected pages
- `lib/api/getCurrentUser.ts` — 8 `redirect()` sites
- `app/customer/layout.tsx:19`, `customer/wallet/page.tsx:32`, `customer/following/page.tsx:41`
- `app/api/auth/callback/route.ts:12,46` — error redirects
- `components/customer/CustomerHeader.tsx:86` (Log in link), `:157` (logout)
- `components/customer/AuthNudgeDialog.tsx:62` — login CTA with `?next=` (signup CTA too)
- `components/custom/Header.tsx:147` — post-logout push
- `components/auth/SignupForm.tsx:439` — "Already have an account" link
- `hooks/useAuth.ts:36` — default logout destination
- `lib/services/utils/apiClient.ts:110` — 401 interceptor `window.location.href`
- `app/admin/[adminId]/users/page.tsx:120` — error-state re-login button

Via `ROUTES.AUTH.BUSINESS_LOGIN` (must become `/sign-in`):
- `app/home/components/landing/LandingNav.tsx:98` — landing "Log In" (desktop + mobile menu — check both render paths)
- `app/business/[businessId]/components/UserMenu.tsx:115` — business logout
- `components/auth/ForgotPasswordForm.tsx:155,232` — "Back to login" links
- `components/auth/ResetPasswordForm.tsx:53` (`?reset=1` redirect), `:209,315` — links
- `components/auth/CustomerLoginForm.tsx:173` — cross-link (dies with the form)

Via `ROUTES.AUTH.ADMIN_LOGIN` (becomes `/sign-in/admin`):
- `app/admin/[adminId]/components/AdminUserMenu.tsx:83` — admin logout
- `loginPathForPathname()` admin branch

Literal strings (NOT on the constant — must be rewritten to `ROUTES.*` per
protected-routes rule while touching them):
- `app/business/page.tsx:7` — `redirect('/login/business')`
- `app/business/[businessId]/product-catalogues/page.tsx:33` — `redirect('/login')`
- `app/business/[businessId]/settings/page.tsx:29`, `profile/page.tsx:24` — `redirect('/login')`
- `app/business/[businessId]/settings/components/DangerZoneTab.tsx:84` — `router.push('/login')`

Session monitor: `hooks/useSessionMonitor.ts` + `SessionWarningDialog` use
`loginPathForPathname` — covered by the function change. (⚠️ NOT MOUNTED in
prod, but keep correct.)

**Signup:** `SignupForm.getRouteForRole` mirrors role routing; its
"Already have an account" link → `/sign-in`; post-signup `?next=` (customer)
unchanged.

## Parities (must hold after unification)

| # | Parity | Source of truth |
| - | ------ | --------------- |
| P1 | Rate limits identical: per-IP 30/60s + per-account 8/300s, buckets `auth:login:*` shared with `POST /api/auth/login`; 429 shown as typed message, distinguishable from bad credentials | `loginAction` (unchanged) |
| P2 | Generic auth errors — no enumeration, no raw Supabase text | `loginAction` (unchanged) |
| P3 | Archived / non-`active` accounts rejected before session use | `loginAction` (unchanged) |
| P4 | MFA elevation flow: enrolled owner gets the 6-digit step before any dashboard navigation; wrong code inline + retryable; spinner survives redirect | port `BusinessLoginForm` MFA step verbatim |
| P5 | `?next=` deep link: `safeNext`-validated, honored for `app_user` only, `router.replace` + `refresh` | port from `CustomerLoginForm` |
| P6 | `redirectByRole` destinations unchanged (incl. business_owner-without-business → `/business/registration`) | `redirectByRole` (unchanged) |
| P7 | Redirect-error detection via `digest` marker (`NEXT_REDIRECT`), message fallback | `isRedirectError` — extract to ONE shared util, currently duplicated ×2 (+ AdminLoginForm's weaker message-only check) |
| P8 | Old URLs never 404: `/login`→`/sign-in`, `/login/business`→`/sign-in`, `/login/admin`→`/sign-in/admin`, query string preserved (`?next=`, `?reset=1`, `?error=`) | `next.config.ts` `redirects()` (permanent) |
| P9 | Admin door still role-gated: non-admin at `/sign-in/admin` is signed out + rejected | `loginAsAdmin` (unchanged) |
| P10 | Logout lands on the door for the portal you were in: business/customer → `/sign-in`, admin → `/sign-in/admin` | `loginPathForPathname` + menu call sites |
| P11 | No Supabase in components; route strings only via `config/routeConfig.ts` (fix the 5 literal-string sites while touching them) | CLAUDE.md / protected-routes.md |
| P12 | `useSearchParams` reader wrapped in `<Suspense>`; password show/hide kept; a11y + copy quality of existing forms | new `SignInForm` |
| P13 | `(auth)` layout, metadata pattern, motion entrance, one-Toaster rule untouched | existing layout |

## Action items

### Phase 0 — route scaffolding (LOW)
- [ ] `config/routeConfig.ts`: `ROUTES.AUTH.SIGN_IN = '/sign-in'`,
      `ADMIN_SIGN_IN = '/sign-in/admin'`. Delete `LOGIN` / `BUSINESS_LOGIN` /
      `ADMIN_LOGIN` **in the same PR** (compile errors = the migration
      checklist; no lingering aliases).
- [ ] `loginPathForPathname()`: admin prefix → `ADMIN_SIGN_IN`, everything
      else → `SIGN_IN`. Update its doc comment.
- [ ] `next.config.ts` `redirects()`: the three 308s (P8). Verify existing
      redirects array is merged, not replaced.
- **Acceptance:** routeConfig tests updated; redirect table hit-tested with
  `curl -I` in dev for all three old paths incl. query passthrough.

### Phase 1 — unified action + form (HIGH — auth core)
- [ ] `authActions.ts`: new `signInAction(email, password)` = `loginAction`
      result + `businessId` lookup when `role === 'business_owner'` (lift the
      `maybeSingle` from `loginAsBusiness`). Same return contract
      (`| LoginRateLimited`). Keep `loginAction` as the internal core; delete
      `loginAsBusiness` (unused after this). Keep `loginAsAdmin`.
- [ ] `components/auth/SignInForm.tsx`: merge of the two forms —
      CustomerLoginForm chrome/`?next=`/429 handling + BusinessLoginForm MFA
      step + password toggle. Submit: `signInAction` →
      `checkMFARequiredAction` (all roles, P4) → `app_user`+`next` branch (P5)
      → `redirectByRole(role, businessId)` (P6). Neutral copy ("Sign in to
      iLokal" — serves both audiences), links: Create account, Forgot
      password. No portal cross-links.
- [ ] Extract shared `isRedirectError` (e.g. `lib/utils/redirectError.ts`);
      AdminLoginForm adopts it too (fixes its message-only check).
- [ ] Pages: create `app/(auth)/sign-in/page.tsx` (metadata "Sign in – iLokal")
      + `git mv` admin page to `app/(auth)/sign-in/admin/page.tsx`. Delete
      `app/(auth)/login/` entirely. Carry over `force-dynamic` only if the
      unified page needs it (Suspense-wrapped `useSearchParams` usually
      suffices — verify at build).
- [ ] Delete dead `LoginForm.tsx` + `PortalSelector.tsx`;
      delete `CustomerLoginForm.tsx` + `BusinessLoginForm.tsx` after the swap.
- **Acceptance:** all P1–P7, P9, P12 hold; manual matrix: customer login,
  owner login (with + without business, with + without MFA), admin at
  `/sign-in` (routed to /admin), admin door gate, 429 path, archived account,
  `?next=` round-trip via AuthNudgeDialog.

### Phase 2 — call-site sweep (MEDIUM — broad but mechanical)
- [ ] Constant-swap sites compile clean after Phase 0 deletions (proxy,
      getCurrentUser, customer layout/pages, callback route, CustomerHeader,
      AuthNudgeDialog, Header, SignupForm, useAuth default, apiClient, admin
      users page).
- [ ] `BUSINESS_LOGIN` sites → `SIGN_IN`: LandingNav (both desktop + mobile
      menu), business UserMenu logout, ForgotPasswordForm ×2,
      ResetPasswordForm ×3 (keep `?reset=1`).
- [ ] `ADMIN_LOGIN` site → `ADMIN_SIGN_IN`: AdminUserMenu logout.
- [ ] Rewrite the 5 literal-string sites to `ROUTES.AUTH.SIGN_IN` (P11):
      `app/business/page.tsx`, product-catalogues page, settings page, profile
      page, DangerZoneTab.
- **Acceptance:** `grep -rn "'/login\|\"/login" app components lib hooks
  config proxy.ts` → 0 hits outside `next.config.ts` redirects; P10 verified
  by logging out from each portal.

### Phase 3 — tests (MEDIUM)
- [ ] Update: `config/__tests__/routeConfig.test.ts` (new constants +
      `loginPathForPathname` matrix), `hooks/__tests__/useAuth.test.tsx`,
      `UserMenu.test.tsx` / `AdminUserMenu.test.tsx` (logout destinations),
      `ResetPasswordForm.test.tsx` (`/sign-in?reset=1`), protectedRoutes tests
      if they assert login paths.
- [ ] New: `SignInForm` (happy-dom + react-dom/client, repo pattern — NO
      @testing-library): role routing ×3, `?next=` honored only for app_user,
      MFA step swap + wrong code, 429 rendered distinct from bad credentials.
- [ ] New: `signInAction` unit — businessId populated only for business_owner,
      rate-limited passthrough.
- **Acceptance:** `yarn lint --fix && yarn test:run && yarn build` green.

### Phase 4 — docs + changelog (LOW)
- [ ] `.claude/docs/authentication.md`, `protected-routes.md` mentions of
      `/login*`; `mobile-api.md` untouched (mobile uses SDK, no web door).
- [ ] `.claude/CHANGELOG.md` entry; delete this file + CLAUDE.md note.

## Testing plan (manual, pre-merge)

1. Each role at `/sign-in`: lands on `/explore` / `/business/[id]` / `/admin`.
2. Owner without business → `/business/registration`; owner with TOTP → MFA
   step → dashboard; wrong code stays retryable.
3. `/explore` coupon → auth nudge → `/sign-in?next=…` → back to the coupon.
4. Old URLs (`/login`, `/login/business`, `/login/admin`) 308 with query kept.
5. Logout from each portal lands on the right door (P10).
6. Rate limit: 9 rapid failures on one account → typed 429 message.
7. Password-reset E2E: forgot → email link → reset → `/sign-in?reset=1`.

## Rollback

Single revertable PR, no schema change: `git revert`. The 308s live in
`next.config.ts` inside the same commit, so revert restores `/login*` atomically.
Risk of stale 308 caching in browsers after a revert (permanent redirects are
cached) — if a fast rollback matters, ship the redirects as 307 (`permanent:
false`) first and flip to 308 in a follow-up once stable.
