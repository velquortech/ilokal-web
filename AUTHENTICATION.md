# 🔐 Authentication Implementation & Security Guide

> Last Updated: March 6, 2026  
> Status: Production-Ready ✅

Complete guide to the authentication and authorization system for Ilokal, built with Next.js Server Actions, Supabase SSR, and TypeScript.

---

## 🏗️ Architecture Overview

### Technology Stack

- **Next.js 16.1.6** - App Router and Server Actions
- **Supabase SSR** - Backend with HTTP-only cookies and RLS
- **React 19+** - `useTransition` hook for pending states
- **TypeScript** - Full type safety
- **Zod** - Schema validation (client & server)
- **React Hook Form** - Form management
- **Zustand** - Client-side state management
- **shadcn/ui & Radix UI** - UI components

### Project Structure

```
app/
├── auth/                     # Authentication routes
│   ├── actions.ts            # ✅ Server Actions (main auth logic)
│   ├── layout.tsx
│   ├── login/page.tsx        # Login page
│   └── signup/page.tsx       # Signup page
│
├── api/
│   ├── auth/                 # Legacy auth endpoints (can be removed)
│   └── admin/profiles/       # ✅ Secured admin user management
│       ├── route.ts          # GET (list), POST (create)
│       └── [id]/route.ts     # GET, PUT, DELETE individual profiles
│
├── admin/                    # Admin dashboard
├── business/                 # Business owner dashboard
└── layout.tsx                # Root layout with SessionWarningDialog

lib/
├── auth/
│   └── sessionConfig.ts      # ✅ Session timeout configuration
├── api/
│   └── verifyAdminAccess.ts  # ✅ Shared admin authorization utility
├── stores/
│   └── authStore.ts          # Zustand auth state
└── validation/
    └── auth.ts               # Zod validation schemas

components/
├── auth/
│   ├── LoginForm.tsx         # ✅ Uses Server Actions + useTransition
│   ├── SignupForm.tsx        # ✅ Uses Server Actions + useTransition
│   └── SessionWarningDialog.tsx # ✅ Session expiration warning
└── providers/
    └── AuthProvider.tsx      # ✅ Session monitoring initialization

hooks/
├── useSessionMonitor.ts      # ✅ Session monitoring hook
└── useAuth.ts                # Auth hook from Zustand store
```

---

## 🔑 Authentication Flows

### Sign Up Flow

```
1. User navigates to /signup
        ↓
2. Fills signup form (role, email, password, name, phone, avatar)
        ↓
3. Form validates client-side with Zod schema
        ↓
4. handleSubmit triggers: startTransition(signupAction(data))
        ↓
5. signupAction() on server:
   ├─ Validates input again (server-side Zod validation)
   ├─ Creates Supabase auth user via signUp()
   ├─ Creates profile record in database
   ├─ Sets HTTP-only secure cookie
   └─ Returns { user, message, error }
        ↓
6. Form updates via useTransition (isPending, error states)
        ↓
7. On success: redirectByRole(user.role) called
        ↓
8. User redirected to role-based dashboard:
   ├─ admin → /admin
   ├─ business_owner → /business
   └─ user → /home
```

### Login Flow

```
1. User navigates to /login
        ↓
2. Enters email and password
        ↓
3. Form validates with Zod schema (client-side)
        ↓
4. handleSubmit triggers: startTransition(loginAction(email, pwd))
        ↓
5. loginAction() on server:
   ├─ Validates inputs (server-side)
   ├─ Calls Supabase signInWithPassword()
   ├─ Sets HTTP-only secure cookie
   ├─ Fetches user profile with role
   └─ Returns { user, message, error }
        ↓
6. Form updates (pending state, errors, success message)
        ↓
7. On success: redirectByRole(user.role) called
        ↓
8. User logged in and redirected
```

### Session Verification Flow

```
Every 60 seconds:
1. useSessionMonitor() calls verifySessionAction()
        ↓
2. verifySessionAction() on server:
   ├─ Checks if HTTP-only cookie exists
   ├─ Verifies with Supabase backend
   ├─ Fetches fresh user profile
   └─ Returns { valid: boolean, user: User | null }
        ↓
3. If expired:
   ├─ Clear auth store
   ├─ Redirect to /login
   └─ Show logout message
        ↓
4. If valid but expiring soon (within 5 min):
   ├─ Set isExpiring = true
   ├─ Show SessionWarningDialog
   └─ Allow user to click "Continue" to extend session
        ↓
5. If user active (mouse, keyboard, scroll, touch):
   └─ Call refreshSession() → resets expiration timer
```

### Logout Flow

```
1. User clicks logout button
        ↓
2. Calls: startTransition(logoutAction())
        ↓
3. logoutAction() on server:
   ├─ Calls Supabase signOut()
   ├─ Clears HTTP-only cookie
   ├─ Clears Zustand auth store
   └─ Returns redirect to /login
        ↓
4. User redirected to login page
```

---

## 🔐 Security Implementation

### Server Actions Pattern (✅ Secure)

All sensitive operations use Server Actions, never client-side API calls:

```typescript
// app/auth/actions.ts
'use server';

export async function loginAction(email: string, password: string) {
  try {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // ✅ Generic error message (prevents account enumeration)
      return { error: 'Invalid email or password' };
    }

    // ✅ Credentials never exposed to client
    // ✅ HTTP-only cookie set automatically by Supabase SSR
    // ✅ Only return necessary user data
    return { user: data.user, message: 'Login successful' };
  } catch (error) {
    return { error: 'Internal server error' };
  }
}
```

**Why Server Actions?**

- ✅ Credentials never leave the server
- ✅ Automatic CSRF protection
- ✅ Direct database access (no network overhead)
- ✅ HTTP-only cookies managed server-side
- ✅ Type-safe with zero runtime overhead

### Input Validation

**Client-Side (UX):**

- Zod schemas for immediate feedback
- Shows validation errors in form
- Better user experience

**Server-Side (Security):**

- **Always** re-validate on server
- Never trust client input
- Return generic error messages

```typescript
// lib/validation/auth.ts
export const serverSignupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  full_name: z.string().min(2, 'Name required'),
});

// In signupAction()
const validation = serverSignupSchema.safeParse(input);
if (!validation.success) {
  return { error: 'Invalid input' }; // Generic message
}
```

### Password Security

- ✅ Never stored in application database (Supabase manages)
- ✅ Minimum 8 characters required
- ✅ Server-side validation enforced
- ✅ Encrypted in transit (HTTPS)
- ✅ HTTP-only cookie for session token

### Session Management

**Role-Based Timeouts:**

| Role               | Timeout            | Use Case                       |
| ------------------ | ------------------ | ------------------------------ |
| **Admin**          | 60 minutes         | Sensitive dashboard operations |
| **Business Owner** | 240 minutes (4h)   | Daily shop management          |
| **Regular User**   | 1440 minutes (24h) | Shopping & browsing            |

**Activity Detection:**

- Mouse movement, keyboard input, scrolling, touch events
- Automatically extends session when user is active
- Idle users get logged out (security)
- Active users never interrupted (UX)

### Cookie Security

```typescript
// config/server.ts
const secureOptions = {
  httpOnly: true, // ✅ JavaScript cannot access (XSS protection)
  secure: true, // ✅ HTTPS only (in production)
  sameSite: 'lax' as const, // ✅ CSRF protection
  path: '/', // ✅ Available app-wide
};
```

**What Each Flag Does:**

- **HttpOnly**: Even if attacker injects JavaScript, can't steal token
- **Secure**: Token can't be intercepted over plain HTTP
- **SameSite: Lax**: Prevents cross-site request forgery
- **Path**: Ensures token is available where needed

### Authorization

**Admin-Only Operations:**

All admin endpoints use `verifyAdminAccess()` utility:

```typescript
// lib/api/verifyAdminAccess.ts
export async function verifyAdminAccess(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    };
  }

  // ✅ Query database to verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const authorized = profile?.role === 'admin';

  return {
    authorized,
    error: authorized
      ? null
      : NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
  };
}
```

**All admin endpoints protected:**

```typescript
// app/api/admin/profiles/route.ts
export async function GET(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request);
  if (!authorized) return error;

  // ✅ Only proceed if verified admin
  // ... fetch and return profiles
}
```

### Public Signup Restrictions

**Critical Security Fix:**

The public signup endpoint can ONLY create 'user' role accounts:

```typescript
// app/api/auth/signup/route.ts
export async function POST(request: NextRequest) {
  const { email, password, full_name } = await validateInput(data);

  // ✅ SECURITY FIX: Force role='user', ignore client input
  const role = 'user';

  // Admin/Business accounts can ONLY be created via:
  // POST /api/admin/profiles (requires admin verification)
}
```

**Why?** Prevents privilege escalation where users self-assign admin role.

### Admin Profile Creation

Admins can create accounts with any role:

```typescript
// app/api/admin/profiles/route.ts
export async function POST(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request);
  if (!authorized) return error;

  const { email, password, full_name, role } = await request.json();

  // ✅ Create auth user with admin Supabase client
  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for admin-created accounts
    });

  if (authError)
    return NextResponse.json({ error: authError.message }, { status: 400 });

  // ✅ Create profile record
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name,
      role, // ✅ Admin specifies role (verified)
    })
    .select()
    .single();

  if (profileError) {
    // ✅ Cleanup: Delete auth user if profile creation fails
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json(profile, { status: 201 });
}
```

---

## 📋 Best Practices Implemented

### ✅ Do's

- ✅ Keep credentials on server (use Server Actions)
- ✅ Validate on both client (UX) and server (security)
- ✅ Use HTTP-only cookies for sessions
- ✅ Use generic error messages (prevent enumeration)
- ✅ Verify authorization on every protected endpoint
- ✅ Auto-logout on session expiration
- ✅ Redirect with `redirect()` from server (prevent client attacks)
- ✅ Re-validate role on sensitive operations
- ✅ Log security events for monitoring

### ❌ Don'ts

- ❌ Never pass credentials through API calls
- ❌ Never store sensitive data in localStorage
- ❌ Never trust client input (always validate server-side)
- ❌ Never expose auth internals in error messages
- ❌ Never use client-side Supabase client for auth
- ❌ Never skip authorization checks
- ❌ Never allow public endpoints to modify roles
- ❌ Never extend sessions without verification

---

## 🛡️ Protected Against

| Threat                                | Prevention                                               |
| ------------------------------------- | -------------------------------------------------------- |
| **XSS (Cross-Site Scripting)**        | HttpOnly cookies, CSP headers                            |
| **CSRF (Cross-Site Request Forgery)** | SameSite cookies, Server Actions                         |
| **Privilege Escalation**              | Role forced in public signup, verified in admin creation |
| **Session Hijacking**                 | HTTPS, HttpOnly, SameSite cookies                        |
| **Account Enumeration**               | Generic error messages                                   |
| **Brute Force**                       | Not implemented (recommend: fail2ban, Supabase)          |
| **Man-in-the-Middle**                 | HTTPS + Secure cookie flag                               |
| **Token Steal via JS**                | HttpOnly flag prevents JavaScript access                 |
| **Clickjacking**                      | X-Frame-Options header                                   |
| **MIME Sniffing**                     | X-Content-Type-Options header                            |

---

## 📝 Environment Variables

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DESTINATION=/home
```

### Optional - Session Timeouts

```bash
# Minutes before auto-logout (default: 60, 240, 1440)
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=60
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=240
NEXT_PUBLIC_SESSION_USER_TIMEOUT=1440

# Minutes before warning shows (default: 5)
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=5
```

---

## 🧪 Testing

### Test Login

```bash
1. Navigate to http://localhost:3000/login
2. Enter any email/password (or test account)
3. Verify redirected to dashboard
4. Check DevTools → Application → Cookies
5. Verify sb-xxx-auth-token has:
   - HttpOnly: ✅ true
   - Secure: ✅ true (in HTTPS)
   - SameSite: ✅ Lax
```

### Test Session Expiration

```bash
1. Login as admin
2. Wait ~2 minutes (or set SHORT_TIMEOUT=2 for testing)
3. SessionWarningDialog should appear
4. Click "Continue Session"
5. Try logging out force (DevTools delete cookie)
6. Refresh page → redirected to login ✅
```

### Test Privilege Escalation Prevention

```bash
1. Try POST to /api/auth/signup with role: "admin"
2. Verify created user has role: "user" ✅
3. Try POST to /api/admin/profiles with non-admin account
4. Verify get 403 Forbidden ✅
5. As admin, create account with role: "business_owner"
6. Verify new account has correct role ✅
```

---

## ✅ Security Verification Checklist

- [ ] Login form works (email/password)
- [ ] Signup form works (all roles available during signup only for admin)
- [ ] Session expires after configured timeout
- [ ] Warning dialog appears 5 minutes before expiration
- [ ] Activity detection works (moving mouse extends session)
- [ ] HTTP-only cookie exists with Secure flag
- [ ] SameSite: Lax flag is set
- [ ] Public signup only creates 'user' role (even if client sends admin)
- [ ] Admin can create accounts with any role
- [ ] Non-admins can't access /api/admin/profiles
- [ ] Logout clears session
- [ ] Session is server-verified every check

---

## 📚 Related Files

- [SESSION_MANAGEMENT.md](SESSION_MANAGEMENT.md) - Session & expiration details
- [SECURITY.md](SECURITY.md) - Cookie/header security & verification
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview

---

## 🚀 Next Steps

1. **Configure environment variables** (.env.local)
2. **Test login/signup/logout flows**
3. **Verify session expiration works**
4. **Check cookies in DevTools**
5. **Test with different user roles**
6. **Deploy to production** (enable HTTPS)
