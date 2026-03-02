# Authentication & Security Implementation Guide

> Last Updated: March 2, 2026

## Overview

This project now uses **Next.js Server Actions** for all authentication operations, following modern security best practices and Next.js 13+ standards.

## Security Architecture

### ✅ What We Use

- **Server Actions** (`app/auth/actions.ts`) for all auth operations
- **HTTP-only Cookies** for session management (via Supabase SSR)
- **`useTransition`** hook for pending UI states
- **Input Validation** on both client (Zod) and server
- **Generic Error Messages** to prevent account enumeration attacks
- **CSRF Protection** (automatic with Next.js Server Actions)

### ❌ What We Avoid

- Passing credentials through client-side API calls
- Storing sensitive data on client
- Revealing auth internals in error messages
- Direct use of client-side Supabase clients for auth
- Thread-unsafe redirects (use `redirect()` from server)

## Implementation Pattern

### Server Actions (Secure)

```typescript
// app/auth/actions.ts
'use server';

export async function loginAction(email: string, password: string) {
  // ✅ Credentials stay on server
  // ✅ Validation + error handling
  // ✅ HTTP-only cookie set automatically
  // ✅ Return minimal data to client
}
```

### Client Component (Safe)

```typescript
'use client';
import { useTransition } from 'react';
import { loginAction, redirectByRole } from '@/app/auth/actions';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (data) => {
    startTransition(async () => {
      const user = await loginAction(data.email, data.password);
      // Update state
      // Handle redirect (done by Server Action)
    });
  };
}
```

## Key Security Features

### 1. Account Enumeration Prevention

```typescript
// ❌ Bad: Reveals if email exists
throw new Error('Email already registered');

// ✅ Good: Generic error
throw new Error('Invalid email or password');
```

### 2. Session Management

- Sessions stored in **HTTP-only, secure cookies**
- Cannot be accessed by JavaScript
- Automatically sent with requests
- Safe from XSS attacks

### 3. Input Validation

```typescript
// Server-side validation in addition to client
if (!email?.trim() || !password?.trim()) {
  throw new Error('Required fields missing');
}

if (!email.includes('@')) {
  throw new Error('Invalid email format');
}
```

### 4. Data Minimization

Only return necessary user data to client:

```typescript
const userData: User = {
  id: profile.id,
  email: profile.email,
  full_name: profile.full_name,
  phone_number: profile.phone_number,
  role: profile.role,
  avatar_url: profile.avatar_url,
};
// ❌ Never return: password, auth tokens, etc.
```

## Migration Path for Existing API Routes

### Current Status

- ✅ Login: Uses Server Action
- ✅ Signup: Uses Server Action
- ⏳ Other routes: Can be migrated incrementally

### For New Features

1. Create Server Action in `app/auth/actions.ts`
2. Use `useTransition` in client component
3. Remove dependencies on API routes
4. Update error handling for Server Actions

### Example Migration

```typescript
// Before: Client-side API call
const response = await authService.login(data);

// After: Server Action
const response = await loginAction(data.email, data.password);
```

## Configuration

### Environment Variables

Ensure these are set:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-key>
NEXT_PUBLIC_APP_URL=<your-app-url>  # For CORS headers (e.g., http://localhost:3000)
```

### Cookie Security Settings

Configured in `config/server.ts` - All authentication cookies are created with:

```typescript
{
  httpOnly: true,        // 🔒 Prevents JavaScript access (XSS protection)
  secure: true,          // 🔒 Only sent over HTTPS
  sameSite: 'lax',       // 🔒 CSRF protection
  path: '/',             // Available to entire app
}
```

### HTTP Security Headers

Configured in `next.config.ts`:

| Header                        | Value                             | Purpose                                |
| ----------------------------- | --------------------------------- | -------------------------------------- |
| **X-Content-Type-Options**    | `nosniff`                         | Prevents MIME-type sniffing attacks    |
| **X-Frame-Options**           | `DENY`                            | Prevents clickjacking                  |
| **X-XSS-Protection**          | `1; mode=block`                   | XSS protection                         |
| **Strict-Transport-Security** | `max-age=31536000`                | HTTPS enforcement (production only)    |
| **Content-Security-Policy**   | Restrictive                       | Controls resource loading              |
| **Referrer-Policy**           | `strict-origin-when-cross-origin` | Referrer information control           |
| **Permissions-Policy**        | Denies dangerous APIs             | Blocks geolocation, microphone, camera |
| **CORS**                      | Configured origin                 | Allows requests from your domain       |

### Supabase Configuration

Server Actions use the **Supabase SSR client** for:

- Automatic HTTP-only cookie management
- Secure session persistence
- RLS-compliant queries
- CORS-safe communication

## Error Handling Guidelines

### Server Side (Detailed)

```typescript
try {
  // Operation
} catch (error) {
  // Log detailed error for debugging
  console.error('[actionName] Error:', error.message);
  // Throw generic error to client
  throw new Error('User-friendly message');
}
```

### Client Side (User-Facing)

```typescript
try {
  await serverAction();
} catch (error) {
  // Display safe error to user
  setError(error.message);
}
```

## Testing Checklist

When implementing new auth features:

- [ ] Input validation works (both client & server)
- [ ] Generic error messages (no account enumeration)
- [ ] Session persists across page navigations
- [ ] Logout clears session
- [ ] Redirect happens after auth change
- [ ] No sensitive data in console logs
- [ ] No credentials in network requests

## Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [useTransition Hook](https://react.dev/reference/react/useTransition)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Future Improvements

- [ ] Implement rate limiting for auth endpoints
- [ ] Add email verification flow
- [ ] Implement password reset with secure tokens
- [ ] Add multi-factor authentication (MFA)
- [ ] Monitor and log suspicious auth attempts
- [ ] Implement account lockout after failed attempts
