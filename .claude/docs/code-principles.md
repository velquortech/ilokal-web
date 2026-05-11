# Code Principles — iLokal Web

## TypeScript

- Strict mode enabled. No `any`. No `@ts-ignore` without an inline comment explaining why.
- Prefer `type` over `interface` for props and local types. Use `interface` for extendable contracts.
- All async functions must have explicit return types.
- Zod for runtime validation at API and Server Action boundaries — parse, don't trust. Schemas live in `lib/validation/`.
- Do not use `any` in tests — use concrete types from `lib/types` or a focused `lib/types/test.ts` helper.

## File & Folder Structure

```
app/                        # Next.js App Router — pages, layouts, Server Actions
  (auth)/                   # Auth group (login, signup)
  admin/                    # Admin panel
  api/                      # API routes (mobile + internal)
  business/                 # Business owner dashboard
  business-registration/    # Multi-step registration flow
  home/                     # Public landing page
components/
  ui/                       # shadcn/ui primitives — no domain knowledge
  custom/                   # Composite components (domain-aware)
  auth/                     # Auth-specific components
hooks/                      # Custom hooks (prefixed use*)
lib/
  api/                      # Supabase query/service helpers, one file per domain
  services/                 # Isomorphic HTTP service wrappers
  types/                    # TypeScript types, re-exported from lib/types/index.ts
  utils/                    # Pure utility functions
  validation/               # Zod schemas
providers/                  # React context providers
config/                     # Supabase client factories, route config
proxy/                      # Next.js middleware stack
supabase/                   # Supabase client helpers, migrations, seeds
```

## State Management (Zustand)

- One store per domain (e.g., a business store, a UI/filter store).
- Keep stores flat — avoid deeply nested state.
- Derive computed values with selectors, not stored redundantly.
- Form state belongs in `react-hook-form` — never mix with Zustand.
- Reset user-scoped store state on logout.

## Component Rules

- No business logic inside components. Extract to custom hooks.
- No direct Supabase calls in Client Components. Use Server Actions, API routes, or service wrappers.
- Named exports for all components. Default exports only for Next.js page files (`app/**/page.tsx`, `app/**/layout.tsx`).
- Prefer composition over prop drilling past two levels — use context or a Zustand store.

## General

- Avoid `useEffect` for data fetching — prefer Server Components, Server Actions, or Zustand actions triggered on user events.
- Keep files under 200 lines. Split when a file has more than one reason to change.
- No barrel exports (`index.ts`) for large feature folders — Webpack/Turbopack tree-shakes at the import level.

---

## Modular Architecture Strategy

### The real split signal: responsibilities, not line count

200 lines is a lagging indicator. A file is already too big before it hits the limit if it has more than one reason to change. Use these triggers instead:

**Extract to a custom hook when:**
- A component has more than two `useState` calls
- Any `useEffect`, derived value, or async call lives in a component
- The same state shape is needed in more than one component

**Extract to a sub-component when:**
- A JSX section has its own distinct props shape (you can type it independently)
- A section has independent local state (e.g., a collapsible, a counter)
- You can give the section a meaningful domain name (`<LocationFields />`, `<PricingTier />`)
- A section appears — or is likely to appear — in more than one parent

**Keep together when:**
- Two pieces always change at the same time (co-location over premature splitting)
- A sub-component would need 4+ props to mirror the parent's state — the split is wrong

**Extract to `lib/utils/` when:**
- A function is pure (no React, no side effects)
- The same logic appears in two or more files (validation, error mapping, formatters)

---

### Where things live

```
components/ui/          Zero domain knowledge. shadcn primitives + generic atoms.
                        Nothing business-specific here.

components/custom/      Knows about one or more domains.
                        Composed of ui/ primitives + domain data shapes.

hooks/                  All stateful client logic. One concern per file.
                        useFormCache.ts, useDashboardTour.ts — never useEverything.ts.

lib/utils/              Pure functions only. No React imports.
                        dateFormatter.ts, errorHandler.ts, protectedRoutes.ts.

lib/validation/         Zod schemas only. No runtime logic.

lib/api/                Supabase query and service helpers. One file per domain.
                        businessQuery.ts, branchService.ts — no React, no hooks.

lib/services/           Isomorphic HTTP wrappers for the service layer.
                        Called from Client Components or API routes via axios.

providers/              React context providers only. No business logic.

config/                 Supabase client factories, route strings. No logic.
```

---

### Composition over configuration

Prefer small focused components composed at the page level over a single component with many conditional props.

```tsx
// Avoid — one component doing three jobs via props
<BusinessCard variant="spotlight" showMenu showPosts featured />

// Prefer — each component has one job, page decides the layout
<SpotlightCard business={b} />
<MenuHighlights items={b.menuHighlights} />
<PostGrid posts={b.posts} />
```

---

### File size targets

| File type | Soft limit | Hard limit | Action when exceeded |
|---|---|---|---|
| `components/ui/` | 80 lines | 120 lines | Split into sub-components |
| `components/custom/` | 120 lines | 200 lines | Extract sub-components or move logic to hook |
| `hooks/` | 80 lines | 150 lines | Split into smaller focused hooks |
| `app/**/page.tsx` | 150 lines | 250 lines | Extract section components, move logic to hook |
| `lib/utils/` | 100 lines | 200 lines | Split by concern |
| `lib/api/` service files | 100 lines | 150 lines | Split by resource |

These are guides, not laws. A 260-line page that is pure JSX composition (no logic, no state) is fine. A 100-line hook with three unrelated concerns is not.
