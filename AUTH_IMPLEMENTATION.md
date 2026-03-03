# Authentication Implementation Guide

Complete guide to the authentication system implemented for Ilokal using Next.js, Server Actions, Supabase, and TypeScript.

## 🏗️ Architecture Overview

The authentication system is built with:

- **Next.js 15+** - App Router and Server Actions
- **Server Actions** - Secure server-side authentication
- **Supabase SSR** - Backend with HTTP-only cookies
- **React 19+** - useTransition hook for pending states
- **Zustand** - Client-side state management for user data
- **React Hook Form** - Form handling and validation
- **Zod** - Schema validation
- **shadcn/ui & Radix UI** - UI components
- **TypeScript** - Full type safety

## 📁 Project Structure

```
app/
├── auth/
│   ├── actions.ts            # ✅ Server Actions (NEW)
│   │   ├── loginAction()
│   │   ├── signupAction()
│   │   ├── redirectByRole()
│   │   ├── logoutAction()
│   │   └── verifySessionAction()
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── signup/page.tsx
├── api/auth/                 # Legacy (can be removed)
│   ├── login/route.ts
│   ├── signup/route.ts
│   ├── logout/route.ts
│   └── verify/route.ts
└── layout.tsx                # ✅ SessionWarningDialog integrated

lib/
├── auth/
│   └── sessionConfig.ts      # ✅ NEW - Session timeouts
├── api/
│   ├── apiClient.ts
│   └── authService.ts        # (Legacy - use actions.ts instead)
├── stores/
│   └── authStore.ts          # Zustand auth state
└── validation/
    └── auth.ts               # Zod schemas

components/
├── auth/
│   ├── LoginForm.tsx         # ✅ Uses Server Actions + useTransition
│   ├── SignupForm.tsx        # ✅ Uses Server Actions + useTransition
│   ├── SessionWarningDialog.tsx # ✅ NEW - Shows before logout
│   └── ProtectedRoute.tsx
└── providers/
    └── AuthProvider.tsx      # ✅ Uses sessionConfig + monitoring

hooks/
├── useSessionMonitor.ts      # ✅ NEW - Session monitoring
└── useAuth.ts
```

## 🔐 Authentication Flow

### Sign Up Flow

```
1. User fills signup form (role, email, password, name, etc.)
        ↓
2. Form validates with Zod schema (client-side)
        ↓
3. handleSubmit triggers startTransition(signupAction(data))
        ↓
4. signupAction() runs on server:
   - Validates input again (server)
   - Creates Supabase auth user
   - Creates user profile in database
   - Sets HTTP-only secure cookie
        ↓
5. signupAction returns { user, message, error }
        ↓
6. SignupForm updates UI via useTransition isPending
        ↓
7. redirectByRole() is called (server-side)
        ↓
8. User is redirected to role-based dashboard
```

### Login Flow

```
1. User fills login form (email, password)
        ↓
2. Form validates with Zod schema (client-side)
        ↓
3. handleSubmit triggers startTransition(loginAction(email, pwd))
        ↓
4. loginAction() runs on server:
   - Validates input
   - Authenticates with Supabase
   - Fetches user profile with role
   - Sets HTTP-only secure cookie
        ↓
5. loginAction returns { user, message, error }
        ↓
6. LoginForm updates UI via useTransition isPending
        ↓
7. redirectByRole() is called (server-side)
        ↓
8. User is redirected to role-based dashboard
```

### Session Expiration Flow

```
AuthProvider mounts
    ↓
useSessionMonitor() hook initializes
    ↓
Session timeout calculated based on user role:
  - Admin: 60 minutes
  - Business Owner: 240 minutes (4 hours)
  - Regular User: 1440 minutes (24 hours)
    ↓
Activity listener added (mouse, keyboard, scroll, touch)
    ↓
Every 60 seconds:
  - Periodic verification call to verifySessionAction()
  - Server checks if session still valid
  - If activity detected, session extended
    ↓
When session expiring (within 5 minutes):
  - SessionWarningDialog shows
  - User sees time remaining
  - Can click "Continue Session" to reset timeout
  - Or click "Logout" to end session immediately
    ↓
If no action and timeout reached:
  - Auto logout (logoutAction fired)
  - User redirected to login page
```

## 📋 Core Server Actions (app/auth/actions.ts)

### loginAction(email, password)

Authenticates user and returns session data.

**Parameters:**

```typescript
email: string; // User email
password: string; // User password
```

**Returns:**

```typescript
{
  user?: {
    id: string
    email: string
    name: string
    avatar_url?: string
    role: 'admin' | 'business_owner' | 'user'
  },
  message?: string
  error?: string
}
```

**Usage:**

```tsx
'use client';

import { loginAction } from '@/app/auth/actions';
import { useTransition } from 'react';

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (email: string, password: string) => {
    startTransition(async () => {
      const result = await loginAction(email, password);
      if (result.error) {
        console.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### signupAction(data)

Creates new user account with profile.

**Parameters:**

```typescript
{
  email: string
  password: string
  confirmPassword: string
  name: string
  phone?: string
  role: 'admin' | 'business_owner' | 'user'
}
```

**Returns:**

```typescript
{
  user?: User,
  message?: string,
  error?: string
}
```

**Usage:**

```tsx
'use client';

import { signupAction } from '@/app/auth/actions';
import { useTransition } from 'react';

export default function SignupForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData) => {
    startTransition(async () => {
      const result = await signupAction(formData);
      if (result.error) {
        console.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={isPending}>
        {isPending ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### redirectByRole(role)

Navigates user to appropriate dashboard based on role.

**Parameters:**

```typescript
role: 'admin' | 'business_owner' | 'user';
```

**Usage:**

```tsx
// Called automatically after successful auth
// Redirects to:
// - admin → /dashboard/admin
// - business_owner → /dashboard/business
// - user → /home
```

### logoutAction()

Signs out user and clears session.

**Returns:**

```typescript
{
  message: string;
}
```

**Usage:**

```tsx
'use client';

import { logoutAction } from '@/app/auth/actions';
import { useTransition } from 'react';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button onClick={() => startTransition(logoutAction)} disabled={isPending}>
      {isPending ? 'Logging out...' : 'Logout'}
    </button>
  );
}
```

### verifySessionAction()

Server-side session verification.

**Returns:**

```typescript
{
  user?: User,
  isValid: boolean,
  remainingTime?: number
}
```

**Usage:**

```tsx
// Called by useSessionMonitor hook
// Checks if session still valid on server
// Returns user data and remaining session time
```

## ⏱️ Session Management

### Session Configuration (lib/auth/sessionConfig.ts)

```typescript
// Session timeouts by role (in minutes)
export const SESSION_TIMEOUTS = {
  admin: 60, // 1 hour
  business_owner: 240, // 4 hours
  user: 1440, // 24 hours
};

// Show warning 5 minutes before logout
export const SESSION_WARNING_INTERVAL = 5;

// Check session validity every 60 seconds
export const SESSION_CHECK_INTERVAL = 60000;

// Helper functions
getSessionTimeout(role); // Get timeout for role
getExpirationTime(role); // ISO string of expiration
isSessionExpired(expirationTime); // boolean
isSessionExpiring(expirationTime); // boolean (within 5 min)
getTimeRemaining(expirationTime); // seconds left
```

### Session Monitor Hook (hooks/useSessionMonitor.ts)

Automatically manages session lifecycle:

```tsx
'use client';

import { useSessionMonitor } from '@/hooks/useSessionMonitor';

// Use in layout or provider
export function Layout() {
  const { isExpiring, timeRemaining, refreshSession } = useSessionMonitor();

  return (
    <>
      {isExpiring && (
        <SessionWarningDialog
          timeRemaining={timeRemaining}
          onContinue={refreshSession}
        />
      )}
      {/* Page content */}
    </>
  );
}
```

**Features:**

- ✅ Periodic verification (every 60 seconds)
- ✅ Activity detection (mouse, keyboard, scroll, touch)
- ✅ Auto-extend on activity
- ✅ Warning at 5 minutes remaining
- ✅ Auto-logout at expiration
- ✅ Server-verified (cannot be faked)

## 🎨 Components

### LoginForm Component

Located at `components/auth/LoginForm.tsx`

**Features:**

- Server Action integration (loginAction)
- useTransition for pending state (not useState)
- Email/password validation
- Server-side error handling
- Role-based redirect

```tsx
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return <LoginForm />;
}
```

### SignupForm Component

Located at `components/auth/SignupForm.tsx`

**Features:**

- Server Action integration (signupAction)
- Two-step form (role selection → details)
- Client & server validation (Zod)
- useTransition for pending state
- Activity detection enabled
- Success feedback

```tsx
import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  return <SignupForm />;
}
```

### SessionWarningDialog

Located at `components/auth/SessionWarningDialog.tsx`

**Features:**

- Shows time remaining
- "Continue Session" button
- "Logout" button
- Cannot be dismissed
- Auto-closes on action

```tsx
// Used in app/layout.tsx
import { SessionWarningDialog } from '@/components/auth/SessionWarningDialog';

export default function RootLayout() {
  return (
    <html>
      <body>
        <AuthProvider>
          <SessionWarningDialog />
          {/* App content */}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 🔑 Using useTransition Hook

Modern way to handle Server Actions:

```tsx
'use client';

import { useTransition } from 'react';
import { loginAction } from '@/app/auth/actions';

export default function LoginForm() {
  // useTransition is built into React 19+
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (email: string, password: string) => {
    startTransition(async () => {
      const result = await loginAction(email, password);
      // Handle result
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(email, password);
      }}
    >
      <input type="email" disabled={isPending} />
      <button disabled={isPending}>{isPending ? 'Loading...' : 'Login'}</button>
    </form>
  );
}
```

**Why useTransition instead of useState?**

- ✅ Built for Server Actions
- ✅ Handles async automatically
- ✅ isPending reflects actual server state
- ✅ No manual state management needed
- ✅ Better performance (concurrent updates)

## 🔧 Authentication State (Zustand)

Access user data from anywhere:

```tsx
'use client';

import { useAuthStore } from '@/lib/stores/authStore';

export default function UserProfile() {
  const { user, isAuthenticated, setUser, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

**Store Methods:**

- `setUser(user)` - Set authenticated user
- `logout()` - Clear user data
- `user` - Current user object
- `isAuthenticated` - boolean

## 🌍 Environment Variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DESTINATION=/home
```

### Session Timeouts (Optional)

```bash
# Defaults to SESSION_TIMEOUTS in lib/auth/sessionConfig.ts
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=60
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=240
NEXT_PUBLIC_SESSION_USER_TIMEOUT=1440
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=5
```

### Images (Optional)

```bash
NEXT_IMAGE_PUBLIC_URL=https://your-storage-url
```

## 🚀 Implementation Steps

1. **Server Actions** (✅ Done)
   - All auth operations in `app/auth/actions.ts`
   - No API routes needed

2. **loginAction + LoginForm** (✅ Done)
   - Uses useTransition
   - Server-side validation
   - Secure cookie handling

3. **signupAction + SignupForm** (✅ Done)
   - Role-based onboarding
   - Profile creation
   - Server Actions

4. **Session Expiration** (✅ Done)
   - Role-based timeouts
   - Activity detection
   - Warning dialog

5. **Security** (✅ Done)
   - HTTP-only cookies
   - CORS headers
   - CSP configuration
   - Secure transport

## 🔒 Security Features

### Server-Side

- ✅ Passwords never exposed to client
- ✅ Generic error messages (prevents enumeration)
- ✅ Input validation (Zod schemas)
- ✅ Server-side verification (verifySessionAction)
- ✅ HTTP-only cookie management

### Client-Side

- ✅ HTTPS enforcement (production)
- ✅ SameSite cookie attribute (CSRF)
- ✅ CORS configuration
- ✅ CSP headers
- ✅ X-Frame-Options header

### Session

- ✅ Automatic expiration
- ✅ Activity-based refresh
- ✅ Server verification
- ✅ User notification before logout
- ✅ Role-based timeouts

## 🆘 Troubleshooting

### Issue: useTransition not recognized

**Solution:** Ensure React 19+ is installed and component uses `'use client'`

### Issue: Server Action not called

**Solution:** Check that function is in `app/auth/actions.ts` and has `'use server'` directive

### Issue: Session not expiring

**Solution:** Verify SESSION_TIMEOUTS in `lib/auth/sessionConfig.ts` are configured

### Issue: Warning dialog not showing

**Solution:** Check `SessionWarningDialog` is in `app/layout.tsx`

### Issue: Activity detection not working

**Solution:** Verify `useSessionMonitor` is called in `AuthProvider`

## 📚 Related Documentation

- [AUTHENTICATION_SECURITY.md](./AUTHENTICATION_SECURITY.md) - Security guide
- [SESSION_MANAGEMENT.md](./SESSION_MANAGEMENT.md) - Session config details
- [SESSION_EXPIRATION_SUMMARY.md](./SESSION_EXPIRATION_SUMMARY.md) - Expiration examples
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) - Security fixes
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - What's done

## 📖 External Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [React useTransition](https://react.dev/reference/react/useTransition)
- [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side)
- [Zod Validation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
