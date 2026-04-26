# Service Layer Quick Reference

## For Client Code (Browser & Server Components)

### ✅ Safe to import from `@/lib/services`

```typescript
// ✅ ALLOWED - These are in the client-facing barrel
import {
  userService, // User profile & list queries
  http, // Generic HTTP client
  ratingService, // Rating read queries
  featuredDealService,
  branchService,
  uploadService, // File uploads
  trendingService,
} from '@/lib/services';

// Use in: Components, any file, browser-safe
const profiles = await userService.getProfiles();
const data = await http.get('/some-endpoint');
```

### ❌ Do NOT import server-only services in client code

```typescript
// ❌ WRONG - Will fail at build time (Turbopack catches this)
import paymentService from '@/lib/services/paymentService';
import authService from '@/lib/services/authService';

// These are for server-only contexts only!
```

---

## For Server Code (Server Actions, API Routes, Server Components)

### ✅ Direct import from service module

```typescript
// Inside app/api/route.ts or a Server Component only:
import paymentService from '@/lib/services/paymentService';
import authService from '@/lib/services/authService';
import subscriptionService from '@/lib/services/subscriptionService';

// Server-only imports work here - Turbopack won't bundle them
const payment = await paymentService.confirm(id);
```

---

## Creating New Public Wrappers

If you need to expose server-side logic to the browser:

1. **Location**: `lib/services/public/<featureName>Wrapper.ts`
2. **Pattern**: Server fast-path + browser HTTP fallback
3. **Step-by-step guide**: See [lib/services/public/README.md](./public/README.md)
4. **Example**: [paymentsPublicWrapper.example.ts](./public/paymentsPublicWrapper.example.ts)

```typescript
// lib/services/public/exampleWrapper.ts
export const exampleWrapper = {
  async doSomething(input: Input): Promise<Output> {
    // Server: Fast path (no HTTP round-trip)
    if (typeof window === 'undefined') {
      const serverModule = await import('@/lib/services/exampleService');
      return serverModule.default.doSomething(input);
    }
    // Browser: HTTP fallback
    return http.post('/api/example', input);
  },
};
```

---

## Core Services Reference

| Service               | Type           | Use For              | Import From                        |
| --------------------- | -------------- | -------------------- | ---------------------------------- |
| `userService`         | Client ✅      | User profiles, lists | `@/lib/services`                   |
| `http`                | Client ✅      | Generic HTTP calls   | `@/lib/services`                   |
| `ratingService`       | Client ✅      | Rating queries       | `@/lib/services`                   |
| `featuredDealService` | Client ✅      | Featured deals       | `@/lib/services`                   |
| `branchService`       | Client ✅      | Branch data          | `@/lib/services`                   |
| `uploadService`       | Client ✅      | File upload          | `@/lib/services`                   |
| `trendingService`     | Client ✅      | Trending items       | `@/lib/services`                   |
| `paymentService`      | Server only ⛔ | Payments             | Direct module import (server-only) |
| `authService`         | Server only ⛔ | Auth checks          | Direct module import (server-only) |
| `subscriptionService` | Server only ⛔ | Subscriptions        | Direct module import (server-only) |
| `notificationService` | Server only ⛔ | Notifications        | Direct module import (server-only) |
| `analyticsService`    | Server only ⛔ | Analytics            | Direct module import (server-only) |
| `businessService`     | Server only ⛔ | Business ops         | Direct module import (server-only) |

---

## Common Errors & Fixes

### ❌ Error: "Cannot find module '@/lib/services/paymentService'"

**Cause:** Trying to import server-only service from client code
**Fix:**

- Move logic to a Server Action or API route
- Create a public wrapper if you need browser access

### ❌ Error: "Build fails with server-only code in bundle"

**Cause:** Importing a service that uses `next/headers`, `createServerSupabaseClient`, etc.
**Fix:** Check the service - if it imports server helpers, use it only in server contexts

### ✅ Solution: Use API routes for browser requests

```typescript
// Browser code
const data = await http.post('/api/protected-action', payload);

// app/api/protected-action/route.ts (Server)
import protectedService from '@/lib/services/protectedService';

export async function POST(req: Request) {
  const result = await protectedService.doThing(...);
  return Response.json(result);
}
```

---

## Pre-Commit Validation

Before committing, run:

```bash
yarn check:imports
```

This validates that:

- Client files don't import server-only services
- Server-only imports don't leak to client bundle
- All imports follow the pattern guidelines

Failing this check? See the error message - it will point to the exact line and file.

---

## Summary Checklist

| Task                               | How                                            | Where                           |
| ---------------------------------- | ---------------------------------------------- | ------------------------------- |
| **Query user data**                | `import { userService } from '@/lib/services'` | Components, any file            |
| **Make API call**                  | `import { http } from '@/lib/services'`        | Components, any file            |
| **Confirm payment**                | `import paymentService from '@/lib/services'`  | Server Actions, API routes only |
| **Create business**                | `import businessService from '@/lib/services'` | Server Action code only         |
| **Browser access to server logic** | Create `public/<name>Wrapper.ts`               | See public/README.md            |
| **Validate imports**               | `yarn check:imports`                           | Before committing               |

---

**Need more details?** See [lib/services/README.md](./README.md)
