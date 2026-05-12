# Creating New Public Wrappers

This guide explains how to create browser-safe isomorphic wrappers for operations that need both server-side speed and browser fallback.

## When to Create a Public Wrapper

Create a public wrapper when you have an operation that:

- ✅ Needs to run on the server (has auth, DB access, business logic)
- ✅ Also needs to be callable from browser code (client components, hooks)
- ✅ Should use a fast server path when available
- ✅ Falls back to HTTP when in browser or when server fast-path unavailable

**Don't create a wrapper if:**

- ❌ Operation is server-only and never called from browser (use API route directly)
- ❌ Operation is browser-only (use axios directly or create a simple service)
- ❌ Operation is read-only and safe (just export from barrel, e.g., `userService`)

## Template Structure

```ts
/**
 * TEMPLATE: Browser-safe public wrapper for [FEATURE_NAME]
 *
 * Pattern:
 * 1. Server-fast-path: dynamically import server module when runtime is server
 * 2. Browser fallback: POST to `/api/[feature]/[action]` route in browser
 * 3. No top-level server imports: prevents Turbopack from bundling server code
 */

import http from '../client';
import type { ApiResponse } from '@/lib/types';

// Define your input and output types
type InputType = Record<string, unknown>; // TODO: Replace
type OutputType = Record<string, unknown>; // TODO: Replace

export async function camelCaseAction(
  input: InputType,
): Promise<ApiResponse<OutputType>> {
  // Server-fast-path: when on server and not in test, use server helpers directly
  if (typeof window === 'undefined' && !process.env.VITEST) {
    try {
      const serverMod = await import('@/lib/api/[feature]/[module]');
      const result = await serverMod.camelCaseAction(input);
      return { success: true, data: result } as ApiResponse<OutputType>;
    } catch (err: unknown) {
      console.error('[camelCaseAction] server-fast-path error', err);
    }
  }

  // Browser fallback: POST to public API route
  try {
    const res = await http.post<OutputType>('/[feature]/[action]', input);
    return { success: true, data: res } as ApiResponse<OutputType>;
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : String(err),
      },
    } as ApiResponse<OutputType>;
  }
}

export default { camelCaseAction };
```

## Using the Template

### 1. Copy and Rename

Create a new file following the naming pattern: `[featureName]Wrapper.ts`

```bash
# Example: business verification wrapper
cp lib/services/public/paymentsPublicWrapper.example.ts \
   lib/services/public/businessVerificationWrapper.ts
```

### 2. Replace Placeholders

Replace these patterns throughout your new file:

- `[FEATURE_NAME]` → descriptive name (e.g., "Business Verification")
- `[feature]` → snake_case folder (e.g., "business-verification")
- `[module]` → server module name (e.g., "verificationService")
- `camelCaseAction` → your action name (e.g., "submitVerification")
- `InputType`/`OutputType` → your actual types

## Using the Template

### 1. Copy the Template

```bash
cp lib/services/public/TEMPLATE.newFeatureWrapper.ts \
   lib/services/public/[featureName]Wrapper.ts
```

### 2. Replace All Placeholders

The template uses the following placeholder format:

- `[FEATURE_NAME]` — Descriptive name (e.g., "Business Verification")
- `[feature]` — snake_case folder name (e.g., "business-verification")
- `[module]` — Module name (e.g., "service" or "verificationService")
- `[ACTION_NAME]` — Operation name (e.g., "verify", "submit")
- `[CapitalizedActionName]` — PascalCase version
- `[camelCaseActionName]` — camelCase version
- `[ACTION_DESCRIPTION]` — Full description
- `[functionName]` — Server function to call

**Example: Creating a business verification wrapper**

```bash
# Copy
cp lib/services/public/TEMPLATE.newFeatureWrapper.ts \
   lib/services/public/businessVerificationWrapper.ts
```

Then replace:

- `[FEATURE_NAME]` → "Business Verification"
- `[feature]` → "business-verification"
- `[module]` → "verificationService"
- `[ACTION_NAME]` → "submitVerification"
- `[CapitalizedActionName]` → "SubmitVerification"
- `[camelCaseActionName]` → "submitVerification"
- `[functionName]` → "submitVerification"

### 3. Implement Types

Define input and output types for your operation:

```ts
interface SubmitVerificationInput {
  businessId: string;
  documents: File[];
  notes?: string;
}

interface SubmitVerificationOutput {
  verificationId: string;
  status: 'pending' | 'approved' | 'rejected';
}
```

### 4. Implement Server Fast-Path

Create the server-side implementation at `lib/api/business-verification/service.ts`:

```ts
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { submitVerificationSchema } from '@/lib/validation/businessVerification';

export async function submitVerification(
  input: SubmitVerificationInput,
): Promise<SubmitVerificationOutput> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Validate input
  const validated = submitVerificationSchema.parse(input);

  // Process verification
  const result = await db
    .from('business_verifications')
    .insert({
      business_id: validated.businessId,
      user_id: user.id,
      status: 'pending',
      documents: validated.documents,
    })
    .single();

  return {
    verificationId: result.id,
    status: result.status,
  };
}
```

### 5. Implement API Route

Create the HTTP fallback at `app/api/business-verification/submit/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { submitVerification } from '@/lib/api/business-verification/service';
import { submitVerificationSchema } from '@/lib/validation/businessVerification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = submitVerificationSchema.parse(body);

    const result = await submitVerification(input);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 400 },
    );
  }
}
```

### 6. Implement Wrapper

Update `lib/services/public/businessVerificationWrapper.ts` with:

- Correct server import path
- Correct API route path
- Proper error handling

```ts
export async function submitVerification(
  input: SubmitVerificationInput,
): Promise<ApiResponse<SubmitVerificationOutput>> {
  if (typeof window === 'undefined' && !process.env.VITEST) {
    try {
      const mod = await import('@/lib/api/business-verification/service');
      const result = await mod.submitVerification(input);
      return { success: true, data: result };
    } catch (err: unknown) {
      console.error('[submitVerification] server-fast-path error:', err);
    }
  }

  try {
    const res = await http.post<SubmitVerificationOutput>(
      '/business-verification/submit',
      input,
    );
    return { success: true, data: res };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
```

### 7. Add Tests

Create `lib/services/__tests__/businessVerificationWrapper.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { submitVerification } from '../public/businessVerificationWrapper';

describe('businessVerificationWrapper', () => {
  it('should return success response with verification ID', async () => {
    const input = {
      businessId: 'biz-123',
      documents: [new File(['content'], 'doc.pdf')],
    };

    const result = await submitVerification(input);

    expect(result.success).toBe(true);
    expect(result.data?.verificationId).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const input = { businessId: '', documents: [] };

    const result = await submitVerification(input);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 8. Use in Client Code

Import and use the wrapper in components:

```ts
import businessVerificationPublicService from '@/lib/services/public/businessVerificationWrapper';

export function VerificationForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(input: SubmitVerificationInput) {
    setLoading(true);
    try {
      const result = await businessVerificationPublicService.submitVerification(
        input,
      );

      if (result.success) {
        console.log('Verification submitted:', result.data);
      } else {
        console.error('Verification failed:', result.error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(/* get values from form */);
    }}>
      {/* form fields */}
    </form>
  );
}
```

## Validation & Build Checks

Before opening a PR:

```bash
# Check for import violations
node WORKFLOW/tools/validateServiceImports.js

# Run full lint and build
yarn lint --fix
yarn test --run
yarn build
```

If you get a Turbopack error about server-only code in the build, ensure:

1. No top-level imports of `@/lib/api/...` or server helpers in the wrapper
2. Server imports are inside the `if (typeof window === 'undefined')` block
3. Server imports are dynamically imported: `await import(...)`

## Checklist

- [ ] Created wrapper file at `lib/services/public/[name]Wrapper.ts`
- [ ] Implemented server fast-path with dynamic imports
- [ ] Implemented browser HTTP fallback
- [ ] Created server implementation at `lib/api/[feature]/...`
- [ ] Created API route at `app/api/[feature]/[action]/route.ts`
- [ ] Added types in `lib/types/` (if new domain)
- [ ] Added validation schemas in `lib/validation/` (if new domain)
- [ ] Created tests for wrapper and server implementation
- [ ] Ran `yarn build` successfully
- [ ] Ran `yarn test --run` successfully
- [ ] Updated `WORKFLOW/api-wrapper-inventory.md` with new route
- [ ] Updated `API_WRAPPER_FOR_FRONTEND.md` with usage example
- [ ] Added JSDoc comments explaining wrapper behavior

## See Also

- [API_WRAPPER_FOR_FRONTEND.md](../../API_WRAPPER_FOR_FRONTEND.md) — Frontend developer guide
- [lib/services/README.md](../../lib/services/README.md) — Isomorphic pattern details
- [lib/services/public/paymentsPublicWrapper.example.ts](paymentsPublicWrapper.example.ts) — Real example
- [WORKFLOW/api-wrapper-inventory.md](../../WORKFLOW/api-wrapper-inventory.md) — Route inventory
