# Standards audit — parity table and action items

> **Status:** plan + fix. Branch `chore/standards-debt`, cut from `main` @
> `5424983`.
>
> **The ask (2026-08-05):** check this session's work against `CLAUDE.md`, then
> fix the debt it exposed.
>
> **Result of the audit: the CODE is compliant.** 76 files across 11 commits
> were swept and no standard is broken by them. What the sweep found is that
> **`CLAUDE.md` now describes a database and a feature set the repo no longer
> has** — which matters more than a style nit, because that file is loaded as
> standing instructions on every session and its "Schema state" section is the
> thing people read *instead of* checking the database.
>
> **Delete this file when the work merges.** Log what landed in
> `.claude/CHANGELOG.md`.

---

## 0. What was checked, and what passed

Swept: every file touched by `28cba2c`, `c30a0fb`, `bc76377`, `5ef61c5`,
`b3d18a7`, `fe01734`, `b245a64`, `75c4cbd`, `69e80d5` (76 files, excluding
`.claude/`).

| Rule | Result |
|---|---|
| Stack frozen — no new dependency | ✅ `package.json` / `yarn.lock` untouched in all 11 commits |
| yarn only — no `npm`/`npx` | ✅ none |
| No retired v0.2 green | ✅ no `#65A30D` / `#84CC16` / `rgba(101,163,13…)` |
| Never hardcode `#D70005` on a dark surface | ✅ — one violation introduced, caught at PR #29 review, now `bg-primary` |
| No `font-display` on headings | ✅ none added (one PRE-EXISTING, see SD5) |
| Reveals are CSS, never `whileInView` | ✅ none |
| One `<Toaster>` | ✅ still only `app/layout.tsx` |
| No Supabase in components | ✅ no `@supabase/ssr` / `createBrowserClient` in any `.tsx` |
| Routes from `config/routeConfig.ts` | ✅ no literal route strings; three new helpers added there |
| `z.guid()`, never `z.uuid()` | ✅ `businessIdSchema` uses `z.guid()` |
| Head-only counts, no fetch-then-`.length` | ✅ 5 of 5 in `onboardingQuery` |
| Server Actions: validate → verify owner → rate limit | ✅ both new actions, with the **segment** id |
| No driver text in a client response | ✅ — `business.ts:122` interpolates a storage `error.message`, but its only route catches it and returns a generic "Failed to upload file", so nothing leaks |
| SECURITY DEFINER: pinned `search_path` + REVOKE/GRANT | ✅ both new migrations |
| New FK / hot filter column indexed | ✅ `idx_branches_business_id_live` |
| RLS wraps `auth.uid()` | ✅ n/a — no new policies |
| Unique migration timestamps | ✅ no duplicates |
| Types in `lib/types`, re-exported from the barrel | ✅ `OnboardingState` / `OnboardingProgress` |
| Tests: happy-dom + `react-dom/client`, no `any` | ✅ no `@testing-library` import, no `any` |
| CHANGELOG updated per phase | ✅ every phase |

---

## 1. PARITY TABLE — what the docs say vs. what is true

| # | Area | Doc says | Reality | Risk | Effort |
|---|---|---|---|---|---|
| SD1 | `CLAUDE.md:219` migration state | "local and cloud are fully in sync through `20260717082537` — **no pending migrations**" | **16 migrations** exist past that point, none confirmed on cloud. Two are ours; the rest arrived with events, offerings, product sections and bookings | 🔴 HIGH | S |
| SD2 | `CLAUDE.md` §Schema state | Records nothing after 2026-07-17 | Missing: `business_settings.onboarding_tour_completed_at` / `onboarding_checklist_dismissed_at`, `app_settings.enable_onboarding_tour`, the widened **4-column** `public_feature_flags()`, `idx_branches_business_id_live` | 🟡 MED | S |
| SD3 | `CLAUDE.md` active-work notes | Two notes for Events and Offerings, each ending "Delete this note when merged" | Both merged. Neither deleted. Onboarding and `/for-business` shipped with no note at all | 🟡 MED | XS |
| SD4 | `tech-debt.md` TD-011 | "Migration drift — code depends on un-applied migrations" | Still open and now much larger — it should name the actual queue, or nobody can act on it | 🟡 MED | S |
| SD5 | `tech-debt.md` coverage | No entry for `safeNext` | `safeNext` is customer-scoped, so an owner who signs up from `/for-business` is not returned to the wizard — a known gap with no ticket | 🟢 LOW | XS |
| SD6 | Plan docs | `ONBOARDING.md` / `HOW_TO_REGISTER.md` held the ON1–ON20 and HR1–HR17 parity tables | Both gone from disk after their features merged. The CHANGELOG carries the reasoning; the tables themselves are unrecoverable | 🟢 LOW | — |
| SD7 | Landing `Hero.tsx:59` | "`h1`–`h6` get Pally automatically from `@layer base` — do not add `font-display` to headings" | The landing's `<h1>` carries `font-display`. Pre-existing, verified redundant (`globals.css:238`) | ⚪ NIT | XS |

**Not a finding, recorded so it is not re-raised:** `RegistrationStepId` and
`stepMeta` live under `app/business/registration/data/` rather than
`lib/types/`. The letter of the rule puts domain types in `lib/types`, but the
pre-existing `RegistrationStep` interface has always lived there, and splitting
the pair across two trees would be worse than either placement.

---

## 2. ACTION ITEMS

### Phase 1 — make `CLAUDE.md` true again (SD1, SD2, SD3)

- **A1.1** Replace the migration-state paragraph with the real queue: every
  migration after `20260717082537`, flagged as **not confirmed on cloud**, and
  the standing instruction to apply in timestamp order.
- **A1.2** Add the four new schema facts to §Schema state, each with the
  reasoning that makes it a *fact worth knowing* rather than a changelog line —
  in particular that `public_feature_flags()`'s return list is the public
  contract and `enable_onboarding_tour` is deliberately outside it.
- **A1.3** Replace the two dead active-work notes with one accurate pointer.
- *Acceptance:* nothing in `CLAUDE.md` contradicts `supabase/migrations/` or the
  live schema.

### Phase 2 — the debt log (SD4, SD5)

- **A2.1** Rewrite TD-011 to name the pending queue and the two-step apply.
- **A2.2** New TD-019: `safeNext` is customer-scoped.
- **A2.3** New TD-020: verification backlog — the surfaces this session shipped
  that no browser has opened.
- *Acceptance:* every deferred item from this session's CHANGELOG entries has a
  TD id.

### Phase 3 — the one code nit (SD7)

- **A3.1** Drop `font-display` from the landing `<h1>`; `@layer base` already
  applies it.
- *Acceptance:* `yarn build` clean, landing renders unchanged.

### Explicitly NOT in scope

Applying the migrations to cloud (needs credentials and human approval — that
is what SD1 exists to make visible), and the browser sweeps themselves.
