# Server Actions Architecture Decision Guide

**Context:** Next.js 16 (App Router) + Supabase + TypeScript Strict Mode

---

## Approach comparison

| Approach | Use when | Notes |
|---|---|---|
| **Client → API route directly** | Mobile apps, webhooks, external integrations | CSRF must be handled manually; responses are loosely typed |
| **Client → Server Action** ✅ | All internal mutations (forms, buttons) | Built-in CSRF, type-safe, no extra network hop |
| **Hybrid (API route + Server Action share a service)** | You need both external REST and internal action | Both call `lib/api/[domain]/service.ts` directly — no server-action-calls-fetch anti-pattern |

**Rule:** Server Actions for internal mutations. API routes for external access. Both call the same shared service layer in `lib/api/`.

```
Form → Server Action → lib/api/users/userService.ts → Supabase
Mobile/Webhook → API route → lib/api/users/userService.ts → Supabase
```

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
