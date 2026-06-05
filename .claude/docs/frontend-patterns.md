# Frontend Data Patterns — iLokal Web

Single source of truth for how to fetch data and trigger mutations in business-owner and web features.

---

## The mental model

```
┌─────────────────────────────────────────────────────────┐
│  READ                                                   │
│  page.tsx (Server Component)                            │
│    └─ lib/api/[domain]/[domain]Query.ts  ←── direct     │
│         │                                               │
│         └─ passes data as props                         │
│              └─ <FeatureClient initialData={...} />     │
├─────────────────────────────────────────────────────────┤
│  WRITE (mutations from Client Components)               │
│  Client Component                                       │
│    └─ app/[feature]/actions/[domain]Actions.ts          │
│         └─ validate → verifyBusinessOwner()             │
│              └─ lib/api/[domain]/[domain]Service.ts     │
│                   └─ Supabase                           │
├─────────────────────────────────────────────────────────┤
│  MOBILE / EXTERNAL                                      │
│  app/api/mobile/          ← public, no auth             │
│  app/api/protected/mobile/ ← JWT-gated via getMobileUser│
└─────────────────────────────────────────────────────────┘
```

---

## Which layer do I use?

| Scenario                                       | Layer                                                   | Example                                    |
| ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Load initial page data                         | `lib/api/*/Query` in Server Component                   | `getProductsByBusinessId()`                |
| Create / update / delete from a button or form | Server Action in `app/.../actions/`                     | `createProductAction()`                    |
| Read from a Client Component after mutation    | `router.refresh()` re-runs the Server Component         | —                                          |
| Public mobile endpoint                         | `app/api/mobile/` route, `createBearerClient()`         | `GET /api/mobile/businesses/nearby`        |
| Authenticated mobile endpoint                  | `app/api/protected/mobile/` route, `getMobileUser(req)` | `POST /api/protected/mobile/redemptions`   |
| Admin panel (web, non-SA)                      | `lib/services/` barrel + axios client                   | `userService.getProfilesByRolePaginated()` |

---

## File locations

```
lib/api/[domain]/
  [domain]Query.ts    ← read-only DB queries (used by Server Components + actions)
  [domain]Service.ts  ← write/mutation DB logic (used by Server Actions only)

app/[feature]/actions/
  [domain]Actions.ts  ← 'use server' — validate, auth-check, call lib/api service

app/[feature]/
  page.tsx            ← Server Component: fetch via Query, pass props to client
  components/
    [Feature]Client.tsx  ← 'use client': renders UI, calls actions on mutation
```

---

## Code patterns

### Reading data (Server Component)

```ts
// app/business/[businessId]/product-catalogues/page.tsx
import { getProductsByBusinessId } from '@/lib/api/products/productQuery';

export default async function Page() {
  const { products } = await getProductsByBusinessId(businessId);
  return <ProductCataloguesClient initialProducts={products} />;
}
```

### Writing data (Server Action)

```ts
// app/business/[businessId]/actions/productActions.ts
'use server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as productService from '@/lib/api/products/productService';

export async function createProductAction(
  input: CreateProductRequest,
): Promise<ApiResponse<Product>> {
  const validation = createProductSchema.safeParse(input);
  if (!validation.success)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '...' },
    };

  const verify = await verifyBusinessOwner();
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  return await productService.createProduct(
    verify.business!.id,
    validation.data,
  );
}
```

### Calling an action from a Client Component

```ts
// Client Component
import { createProductAction } from '@/app/business/[businessId]/actions/productActions';

const handleSubmit = async (data: CreateProductRequest) => {
  const result = await createProductAction(data);
  if (result.success) {
    router.refresh(); // re-runs the Server Component, refreshes the list
  } else {
    setError(result.error?.message);
  }
};
```

---

## Rules

- **Static imports only** in Server Actions — no `await import(...)`. Server Actions always run on the server; dynamic imports add noise with no benefit.
- **Never call `lib/services/` from a Server Action** — those are axios HTTP wrappers that make a network round-trip back to an API route. Call `lib/api/` directly.
- **`lib/services/` is scoped to the admin panel** — the barrel (`lib/services/index.ts`) exports client-safe services for the admin UI. Do not use it for new business-owner features.
- **Never call a Server Action from another Server Action** — call the shared `lib/api/` function directly from both.
- **`router.refresh()` is the correct post-mutation pattern** — it re-runs the Server Component and pushes fresh data to the client without a full page reload.

---

## What NOT to do

```ts
// ❌ Dynamic import in a Server Action (no benefit, obscures call graph)
const api = await import('@/lib/api/products/productService');
return await api.createProduct(...);

// ✅ Static import
import * as productService from '@/lib/api/products/productService';
return await productService.createProduct(...);

// ❌ Calling lib/services HTTP wrapper from a Server Action
import branchService from '@/lib/services/branchService';
await branchService.update(id, data); // makes an HTTP call to /api/branches/:id

// ✅ Direct DB call
import * as branchService from '@/lib/api/branches/branchService';
return await branchService.updateBranch(id, data);

// ❌ Server Action calling another Server Action
export async function outerAction() {
  return await innerAction(); // unnecessary indirection
}

// ✅ Both call the shared lib/api function directly
export async function outerAction() {
  return await sharedService.doThing();
}
```

---

## See also

- `.claude/docs/server-actions.md` — deeper rationale for Server Actions vs API routes
- `.claude/docs/api-wrapper.md` — `lib/services/` barrel, admin panel usage
- `.claude/docs/mobile-api.md` — mobile endpoint conventions and response shapes
