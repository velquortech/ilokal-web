# Server Actions Architecture Decision Guide

**Context:** Next.js 16 (App Router) + Supabase + TypeScript Strict Mode

---

## Three Architectural Approaches

### Approach 1: ❌ Client Calls API Endpoints Directly

```typescript
// Form Component (Client-Side)
'use client';
const handleSubmit = async (formData: UpdateProfileInput) => {
  const response = await fetch('/api/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await response.json();
};
```

**Pros:**

- Simple, traditional REST approach
- Works for external API consumers
- Clear separation of concerns (client/server)

**Cons:**

- ❌ CSRF vulnerability (requires manual token management)
- ❌ Extra network round-trip needed
- ❌ Need manual error handling & loading states
- ❌ Requires useActionState workaround (useQuery + useState + useTransition)
- ❌ TypeScript loose (response types inferred from JSON)
- ❌ Session validation bypass risk (client could manipulate headers)
- ❌ Credentials exposed in network tab (if not HTTP-only)

**Use Case:** External API consumers only (mobile apps, third-party integrations)

---

### Approach 2: ✅ Client Calls Server Actions (RECOMMENDED)

```typescript
// 1. Define Server Action
// app/(auth)/actions.ts
'use server';

export async function updateCurrentUserProfileAction(
  data: UpdateUserProfileInput,
): Promise<ApiResponse<User>> {
  // All code runs on server
  // Database & secrets never exposed to client
  // Session automatically verified by Supabase
}

// 2. Use in Form Component
// components/auth/ProfileForm.tsx
'use client';

import { useActionState } from 'react';
import { updateCurrentUserProfileAction } from '@/app/(auth)/actions';

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(
    updateCurrentUserProfileAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="text" name="full_name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Profile'}
      </button>
      {state?.error && <p className="error">{state.error.message}</p>}
    </form>
  );
}
```

**Pros:**

- ✅ Built-in CSRF protection (automatic)
- ✅ No extra network calls (direct server execution)
- ✅ Credentials never exposed to client (stay on server)
- ✅ Type-safe by default (same TS context)
- ✅ useActionState hook handles loading/error states
- ✅ Direct session access (no network overhead)
- ✅ Database transactions guaranteed atomic
- ✅ Error messages can be detailed server-side (logged)
- ✅ Secrets stay server-side (env variables)
- ✅ BEST for user-initiated mutations (forms, buttons)

**Cons:**

- Limited to Next.js full-stack (not external APIs)
- Not ideal for high-frequency updates (real-time sync)
- Slightly larger JS bundle (but worth it)

**Use Case:** All user-initiated mutations (forms, profile updates, business actions)

**Current Implementation:** ✅ We use this approach for `loginAction()`, `signupAction()`, admin actions

---

### Approach 3: 🟢 Hybrid (API Routes + Server Actions)

```typescript
// 1. API Route handles external calls & webhooks
// app/api/users/[id]/route.ts
export async function PUT(request: NextRequest, { params }) {
  // External integrations, third-party services
  // Mobile apps, external APIs
}

// 2. Server Action delegates to API route (DRY principle)
// app/(auth)/actions.ts
('use server');

export async function updateCurrentUserProfileAction(
  data: UpdateUserProfileInput,
): Promise<ApiResponse<User>> {
  // Option A: Call API endpoint internally
  const response = await fetch('http://localhost:3000/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { Cookie: request.cookies.toString() }, // Pass session
  });
  return response.json();

  // Option B: Call shared business logic directly (BETTER)
  return updateUserService(userId, data);
}

// 3. Component uses Server Action only
// components/auth/ProfileForm.tsx
const [state, formAction] = useActionState(
  updateCurrentUserProfileAction,
  null,
);
```

**Pros:**

- ✅ DRY - Shared business logic via API routes
- ✅ External API + internal server actions both supported
- ✅ Can reuse validation schemas & queries

**Cons:**

- ⚠️ Extra complexity (two execution paths)
- ⚠️ Need to manage shared logic carefully
- ⚠️ Can lead to duplicate error handling

**Use Case:** When you genuinely need both external API + internal server actions

**Current Implementation:** Business actions use this pattern (they call API client)

---

## Recommendation for ilokal-web

### 🏆 Best Approach: **Use Server Actions for mutations, API routes for external**

```
User Form Submission
        ↓
   Server Action ← Current user profile update
        ↓
   Shared Service (business logic)
        ↓
  Supabase Client (database)
```

**Implementation Strategy:**

```
/app/(auth)/actions.ts              ← Server actions for user auth & profile
  └─ loginAction()
  └─ signupAction()
  └─ logoutAction()
  └─ updateCurrentUserProfileAction() ← NEW (you wanted to add)

/app/api/users/me/route.ts          ← API endpoint (for external use, webhooks)
  └─ API route calls same service as server action
  └─ Or: Server action fetches via API if needed

/lib/api/users/                     ← Shared business logic
  └─ userService.ts (updateProfile, loginUser, etc.)
  └─ queries.ts (database queries)
```

**Why This Works Best:**

| Concern          | Solution                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Client mutations | Use server actions (CSRF protected, type-safe)                   |
| External APIs    | Use API routes (webhooks, mobile apps)                           |
| Code reuse       | Shared service layer (both call same functions)                  |
| Security         | Server actions secure by default; API routes validate explicitly |
| Performance      | Server actions faster (no extra network call)                    |
| Type safety      | Server actions inherit client TS context                         |
| Session          | Supabase SSR cookie handling automatic in server actions         |

---

## Decision Matrix

Choose your approach based on requirements:

| Scenario                             | Approach              | Rationale                                |
| ------------------------------------ | --------------------- | ---------------------------------------- |
| "User updates profile via form"      | Server Action         | Type-safe, CSRF protected, fast          |
| "Mobile app updates profile"         | API Route + SDK       | Need REST for external clients           |
| "Admin batch operations"             | Server Action         | Internal, handles multiple operations    |
| "Webhook from payment provider"      | API Route             | External event, signature verification   |
| "Real-time data sync"                | API Route + WebSocket | Streaming data, not suitable for actions |
| "Form with progression (multi-step)" | Server Action         | Shared state, validation across steps    |

---

## What We Currently Do (And It's Good!)

### Phase 1-2 Current Pattern:

```typescript
// Auth - Uses Server Actions ✅
loginAction()      → Form login → Direct DB access
signupAction()     → Form signup → Direct DB access

// Admin - Uses Hybrid Approach...
updateAdminAction() → Server Action
  ↓
calls updateUserAPIClient() → calls PUT /api/admin/users/:id
  ↓
API route validates & executes

// This works but has friction:
// Server Action → HTTP Fetch → API Route → Database
// Extra network call when not needed!
```

### Better Pattern (Recommended):

```typescript
// Shared Logic Layer
/lib/api/admin/userService.ts
  export async function updateUser(id, data) { ... }

// Server Actions
/app/admin/actions/userActions.ts
  export async function updateAdminAction(id, data) {
    return updateUser(id, data); // Direct call
  }

// API Routes
/app/api/admin/users/:id/route.ts
  export async function PUT(request) {
    const data = validateRequest(request);
    return updateUser(paramId, data); // Same function!
  }
```

**This eliminates the unnecessary fetch() call!**

---

## Implementation Steps for updateCurrentUserProfileAction()

**Given your current architecture, here's what to do:**

### Step 1: Create shared service (if not exists)

```typescript
// lib/api/users/userService.ts

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileInput,
): Promise<User> {
  const supabase = await createServerSupabaseClient();

  // Validate & update
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select();

  if (error) throw new Error(error.message);
  return mapProfileToUser(updated);
}
```

### Step 2: Create server action

```typescript
// app/(auth)/actions.ts

export async function updateCurrentUserProfileAction(
  data: UpdateUserProfileInput,
): Promise<ApiResponse<User>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: { code: 'AUTHENTICATION_ERROR' } };
    }

    const updated = await updateUserProfile(user.id, data);
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR' } };
  }
}
```

### Step 3: Update PUT /api/users/me route

```typescript
// app/api/users/me/route.ts

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const updated = await updateUserProfile(user.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

### Step 4: Use in component

```typescript
// components/auth/ProfileForm.tsx
'use client';

const [state, formAction, isPending] = useActionState(
  updateCurrentUserProfileAction,
  null,
);

return (
  <form action={formAction}>
    <input type="text" name="full_name" />
    <button disabled={isPending}>Save</button>
    {state?.error && <p>{state.error.message}</p>}
  </form>
);
```

---

## Final Recommendation

**For ilokal-web:**

✅ **USE THIS PATTERN:**

1. **Server Actions for all user-initiated mutations** (forms, buttons, requests)
   - Profile updates
   - Admin actions
   - Business operations
2. **API Routes for:**
   - External integrations (webhooks, third-party APIs)
   - Mobile app endpoints
   - Public endpoints that need REST

3. **Keep shared business logic in `/lib/api/[domain]/`**
   - Used by both server actions AND API routes
   - No duplication
   - Single source of truth

4. **Never have Server Action call API endpoint** (unnecessary network call)
   - Exception: If you genuinely need to call external API

---

## Summary

| Question                                  | Answer                                   |
| ----------------------------------------- | ---------------------------------------- |
| Should client call API endpoint directly? | ❌ No (for mutations)                    |
| Should client call server action?         | ✅ Yes (mutations, authentication)       |
| Should server action call API route?      | ❌ No (unless external API)              |
| Should we keep API routes?                | ✅ Yes (external integrations, webhooks) |
| Best for security?                        | ✅ Server Actions                        |
| Best for performance?                     | ✅ Server Actions                        |
| Best for type safety?                     | ✅ Server Actions                        |
| Best for CSRF protection?                 | ✅ Server Actions (automatic)            |

**Bottom line:** Server Actions > API Routes for internal mutations. Use API routes for external access.
