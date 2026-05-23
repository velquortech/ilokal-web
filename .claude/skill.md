# Feature Development Workflow — iLokal Web

This document defines the step-by-step process for developing any feature in this codebase. Follow every phase in order. Do not skip phases.

---

## Phase 1 — Types First

Before writing any implementation code, define the TypeScript types for the feature.

### 1a. Domain types

Create or update the domain type file at `lib/types/[domain].ts`:

```ts
// lib/types/product.ts
export type MyNewThing = {
  id: string;
  name: string;
  created_at: string;
};
```

Add all new types to the re-export index at `lib/types/index.ts`. Never import directly from `lib/types/[domain].ts` — always go through the index.

```ts
// lib/types/index.ts
export type { MyNewThing } from './[domain]';
```

### 1b. Zod validation schema

Add a Zod schema in `lib/validation/[domain].ts` for any input that crosses a trust boundary (form submit, API request body, query params):

```ts
// lib/validation/[domain].ts
import { z } from 'zod';

export const createMyThingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

export type CreateMyThingInput = z.infer<typeof createMyThingSchema>;
```

---

## Phase 2 — API Layer (DRY Check First)

Before creating anything new, check if the endpoint or service already exists.

```bash
# Check existing API routes
find app/api -name "route.ts" | sort

# Check existing server actions
find app -name "*Actions.ts" -o -name "*actions.ts" | grep -v node_modules

# Check existing query/service layer
find lib/api -name "*.ts" | sort
```

If the endpoint or logic already exists — **reuse it**. Only create new files when there is no suitable existing path.

### 2a. Query layer (direct DB access, server-only)

`lib/api/[domain]/[domain]Query.ts` — raw Supabase queries. No business logic. Called only from server actions or server components.

```ts
import { createServerSupabaseClient } from '@/supabase/server';

export async function getMyThingById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('my_things')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return { error: error.message };
  return { data };
}
```

### 2b. Service layer (business logic, server-only)

`lib/api/[domain]/[domain]Service.ts` — wraps query layer with validation and error shaping. Returns `ApiResponse<T>`.

### 2c. Server actions (mutations from client components)

`app/[area]/actions/[domain]Actions.ts` — `'use server'` functions called from client components. Always call `verifyBusinessOwner()` or the relevant auth guard first.

```ts
'use server';

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import type { ApiResponse } from '@/lib/types';

export async function createMyThingAction(
  input: CreateMyThingInput,
): Promise<ApiResponse<MyNewThing>> {
  const validation = createMyThingSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: '...' } };
  }
  const verify = await verifyBusinessOwner();
  if (!verify.authorized) return { success: false, error: verify.error };
  // ...
}
```

### 2d. REST API route (for mobile or external consumers)

`app/api/[domain]/route.ts` — only create this when the endpoint is needed by mobile clients or third parties. Use response helpers from `app/api/helpers/response.ts`. Never construct `NextResponse` manually.

### 2e. Client service (isomorphic HTTP wrapper)

`lib/services/[domain]Service.ts` — wraps the REST API route for client-side calls. Follow the pattern in existing services (e.g., `lib/services/ratingService.ts`). Re-export from `lib/services/index.ts`.

---

## Phase 3 — Page Structure (SSR Pattern)

Every page in `app/` must follow this structure. The **main page file is always a Server Component** — no `'use client'` directive.

### 3a. Page file (Server Component)

```ts
// app/business/[feature]/page.tsx
// NO 'use client'
import { getMyThingAction } from '../actions/myThingActions';
import { MyFeatureContent } from './components/my-feature-content';
import type { MyNewThing } from '@/lib/types';

export default async function MyFeaturePage() {
  const result = await getMyThingAction();
  const items = (result.success ? result.data ?? [] : []) as MyNewThing[];

  return <MyFeatureContent initialItems={items} />;
}
```

### 3b. Client content component

Extract all client interactivity to `components/[feature]-content.tsx`:

```ts
'use client';

import { useRouter } from 'next/navigation';
// ...

interface MyFeatureContentProps {
  initialItems: MyNewThing[];
}

export function MyFeatureContent({ initialItems }: MyFeatureContentProps) {
  const router = useRouter();

  return (
    // ...
    // On successful mutation: router.refresh() re-runs the Server Component
    // and delivers fresh data — no manual client-side re-fetch
    <AddDialog onSuccess={() => router.refresh()}>
    // ...
  );
}
```

### 3c. Component classification

| Component type | Rule |
|---|---|
| Pure display (no hooks, no state) | Server Component — no `'use client'` |
| Reads context or uses hooks | Client Component — add `'use client'` |
| Has `useState` / `useEffect` / browser API | Client Component |
| Wraps a Client Component | Can stay Server Component |

Never add `'use client'` to a component unless it actually uses a client-only API. Push the client boundary as deep as possible.

### 3d. Reusable UI patterns

**Filter Popover (Popover + RadioGroup)**

For table column filters, copy the pattern from `filter-products.tsx` / `filter-coupons.tsx`:
- Use `Popover` + `PopoverContent` from `@/components/ui/popover`
- Use `RadioGroup` + `RadioGroupItem` from `@/components/ui/radio-group`
- Show an active-filter badge count when a filter is active
- Always include a "Reset" ghost button to clear the filter
- File naming: `filter-[domain].tsx`, props: `{ selected[Field]: string; on[Field]Change: (v: string) => void }`

**Expandable Table Rows (TanStack Table)**

When you need expandable rows in a table (e.g., to show linked products under a coupon):
- Do NOT use the shared `DataTable` component — build the table directly with `useReactTable`
- Add `getExpandedRowModel: getExpandedRowModel()` to `useReactTable` config
- Add `getRowCanExpand: (row) => boolean` to control which rows expand
- Track state explicitly: `const [expanded, setExpanded] = React.useState<ExpandedState>({})`
- Include `state: { ..., expanded }` and `onExpandedChange: setExpanded`
- Render expanded rows using `React.Fragment` so the expanded row sits immediately below its parent
- The chevron column must call `row.getToggleExpandedHandler()` and `row.getCanExpand()` — never `row.toggleExpanded()` or a custom flag

**Product Picker inside a Dialog Form**

When rendering a multi-select product list inside a `react-hook-form` form inside a Dialog:
- Do NOT use Radix `<Checkbox>` — it renders a hidden `<button>` which breaks form submission
- Use a pure CSS visual checkbox: a `<div>` with border + bg + `<Check>` icon, toggled via `onClick`
- Wrap the product list in `role="listbox"` + `aria-multiselectable="true"` (required for `role="option"` children to be valid)
- Each row: `role="option"` + `aria-selected={checked}` + `tabIndex={0}` + `onKeyDown` for Space/Enter
- File: `components/product-picker.tsx`, controller-wrapped via `react-hook-form` `Controller`

**Stats Cards**

Use `<StatCard>` from `@/components/custom/StatCard` in a `grid grid-cols-N gap-4` layout.
- Use stable string keys (e.g., `key={item.title}`) — never `key={index}`
- Stats component stays a Server Component (no hooks needed)

---

## Phase 4 — Testing

### 4a. Decide what to test

| Changed file | What to add |
|---|---|
| `lib/api/[domain]/[domain]Query.ts` | Unit test: `lib/api/[domain]/__tests__/[domain]Query.test.ts` |
| `lib/api/[domain]/[domain]Service.ts` | Unit test: `lib/api/[domain]/__tests__/[domain]Service.test.ts` |
| `app/api/[domain]/route.ts` | Integration test: `app/api/[domain]/__tests__/[domain].integration.test.ts` |
| `app/api/mobile/**/route.ts` | Integration test: same folder `__tests__/[name].integration.test.ts` |
| `app/[area]/actions/[domain]Actions.ts` | Unit test: `app/[area]/actions/__tests__/[domain]Actions.test.ts` |
| UI-only change (no logic change) | Update existing tests if behaviour changed; otherwise leave as-is |
| New feature end-to-end | Integration test: `lib/__tests__/integration/[domain].integration.test.ts` |

**Important:** Changing a mobile API route always requires a corresponding integration test — even for "small" changes like adding a filter. Mobile routes are the contract with the mobile app and any silent breakage is high-impact.

If tests already exist for the file being changed:
- UI-only change with no logic change → no test changes needed
- Logic change (new field, new validation, new error path) → update the existing test file

### 4b. Test file conventions

```ts
// lib/api/products/__tests__/productQuery.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ApiResponse } from '@/lib/types';

vi.mock('@/supabase/server');

describe('productQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getProductsByBusinessId', () => {
    it('returns products for a valid business id', async () => { ... });
    it('returns empty array when no products exist', async () => { ... });
    it('returns error when supabase fails', async () => { ... });
  });
});
```

Rules:
- No `any` type in tests. Use concrete types from `@/lib/types`.
- When mocking `NextRequest` or Supabase client, cast at callsite: `supabaseMock as unknown as SupabaseClient`.
- Use `vi.mock('@/supabase/server')` for server-only Supabase code.
- One `describe` block per exported function.
- Name tests with the outcome: `'returns 400 when price is negative'` not `'price test'`.

### 4c. Add test run to CI workflow

Open `.github/workflows/pull-request-workflow.yml`. In the `Setup` job, add a test step **after lint**:

```yaml
- run: yarn run build
- run: yarn run lint
- run: yarn run test:run
```

If the feature has a large isolated test suite and you want it visible as a separate CI step, add a named step:

```yaml
- name: Run [feature] tests
  run: yarn test:run -- --reporter=verbose [domain]
```

Where `[domain]` matches the test file pattern (e.g., `product`, `branch`, `coupon`).

---

## Phase 5 — Code Review Checklist

Run every item before opening a PR. All must pass.

```bash
# 1. Fix linting and remove unused imports
yarn lint --fix

# 2. Confirm build succeeds (catches TypeScript errors)
yarn build

# 3. Run all tests
yarn test:run

# Or run all three in one shot
make review
```

Then verify manually:

- [ ] No `'use client'` on any page.tsx file
- [ ] All new types are exported from `lib/types/index.ts`
- [ ] All new Zod schemas are in `lib/validation/`
- [ ] Server actions call the appropriate auth guard (`verifyBusinessOwner`, `verifyAdminAccess`, etc.)
- [ ] No secrets or `.env` values hardcoded
- [ ] `ApiResponse<T>` shape used for all action and route returns
- [ ] Client components use `router.refresh()` for post-mutation refresh (not manual re-fetch)
- [ ] No `any` type in test files
- [ ] New test files added to the correct `__tests__` folder co-located with the source
- [ ] Integration test added for every changed mobile API route
- [ ] CI workflow updated with test step for new feature (if applicable)
- [ ] Migration files created for any schema changes (never modify existing migrations)
- [ ] No dynamic `import()` calls inside server actions — use static top-of-file imports
- [ ] No array index used as React `key` — use a stable unique identifier (e.g., `item.id` or `item.title`)
- [ ] No unused props in component interfaces — remove them from both the interface and call sites
- [ ] Mobile API routes that return time-sensitive data filter on BOTH `start_date <= now` AND `expiry_date >= now`
- [ ] Featured deal ownership checks use `getFeaturedDealById`, not `getCouponById`
- [ ] PR title follows Conventional Commits format: `feat(products): add category dropdown`

---

## Quick Reference — File Locations

| Concern | Path |
|---|---|
| Domain types | `lib/types/[domain].ts` → re-export in `lib/types/index.ts` |
| Validation schemas | `lib/validation/[domain].ts` |
| DB query layer | `lib/api/[domain]/[domain]Query.ts` |
| Service layer | `lib/api/[domain]/[domain]Service.ts` |
| Server actions | `app/[area]/actions/[domain]Actions.ts` |
| REST API routes | `app/api/[domain]/route.ts` |
| Client HTTP service | `lib/services/[domain]Service.ts` → re-export in `lib/services/index.ts` |
| Page (Server Component) | `app/[area]/[feature]/page.tsx` |
| Client content component | `app/[area]/[feature]/components/[feature]-content.tsx` |
| Unit tests | `lib/api/[domain]/__tests__/` or `app/[area]/actions/__tests__/` |
| Integration tests | `app/api/[domain]/__tests__/` or `lib/__tests__/integration/` |
| CI workflow | `.github/workflows/pull-request-workflow.yml` |
| DB migrations | `supabase/migrations/` |
