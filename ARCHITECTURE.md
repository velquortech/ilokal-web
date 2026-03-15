# 🔐 Authentication Architecture & Flow

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 15+ Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │           App Root Layout (app/layout.tsx)                   │ │
│ │  - Wraps app with AuthProvider                              │ │
│ │  - Includes SessionWarningDialog component                  │ │
│ │  - Initializes session monitoring                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │          AuthProvider Component                              │ │
│ │  (components/providers/AuthProvider.tsx)                    │ │
│ │                                                             │ │
│ │  - Wraps SessionTracker (initializes session on mount)      │ │
│ │  - Initializes useSessionMonitor hook for monitoring        │ │
│ │  - User data managed via React Context (UserContext)       │ │
│ │  - No sensitive auth data stored on client                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │       Session Monitor Hook (hooks/useSessionMonitor)        │ │
│ │                                                             │ │
│ │  - Periodic verification (60 second intervals)             │ │
│ │  - Activity detection (mouse, keyboard, scroll, touch)     │ │
│ │  - Auto-refresh on activity                               │ │
│ │  - Warning dialog trigger (5 min before expiration)        │ │
│ │  - Auto-logout at expiration                              │ │
│ │  - Returns: isExpiring, timeRemaining, refreshSession      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │    Session Configuration (config/sessionConfig.ts)          │ │
│ │                                                             │ │
│ │  Role-Based Timeouts:                                      │ │
│ │  ├─ Admin: 60 minutes                                      │ │
│ │  ├─ Business Owner: 240 minutes (4 hours)                  │ │
│ │  └─ App User: 1440 minutes (24 hours)                      │ │
│ │                                                             │ │
│ │  Config:                                                   │ │
│ │  ├─ SESSION_CHECK_INTERVAL: 60 seconds                     │ │
│ │  ├─ ACTIVITY_DEBOUNCE_DELAY: 5 seconds                     │ │
│ │  └─ SESSION_WARNING_THRESHOLD: 5 minutes                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│     ┌────────────────────┼────────────────────────┐             │
│     │                    │                        │             │
│     ▼                    ▼                        ▼             │
│  ┌─────────┐         ┌─────────┐          ┌───────────┐       │
│  │ Login   │         │ Signup  │          │Dashboard  │       │
│  │ Page    │         │ Page    │          │ Page      │       │
│  └─────────┘         └─────────┘          └───────────┘       │
│     │                    │                                      │
│     └────────────┬───────┘                                     │
│                  │                                              │
│                  ▼                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │    Form Components + useActionState                          │ │
│ │                                                             │ │
│ │  Forms:                                                     │ │
│ │  ├─ LoginForm.tsx (Server Action: loginAction)            │ │
│ │  └─ SignupForm.tsx (Server Action: signupAction)          │ │
│ │                                                             │ │
│ │  Features:                                                  │ │
│ │  ├─ useActionState() for Server Action state (React 19+)  │ │
│ │  ├─ React Hook Form for form management                   │ │
│ │  ├─ Zod validation schemas (client-side)                  │ │
│ │  └─ Error handling & loading states                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │        Server Actions (app/auth/actions.ts)                │ │
│ │              🔐 Secure Server-Side Code                    │ │
│ │                                                             │ │
│ │  Actions:                                                   │ │
│ │  ├─ loginAction(email, password)                           │ │
│ │  ├─ signupAction(data)                                     │ │
│ │  ├─ redirectByRole(role)                                   │ │
│ │  ├─ logoutAction()                                         │ │
│ │  └─ verifySessionAction()                                  │ │
│ │                                                             │ │
│ │  Security:                                                  │ │
│ │  ├─ Server-side password validation                        │ │
│ │  ├─ Credentials never exposed to client                    │ │
│ │  ├─ HTTP-only secure cookie handling                       │ │
│ │  ├─ Input validation (Zod schemas server-side)            │ │
│ │  └─ Generic error messages (prevents enumeration)          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │                                      │
        │   Next.js Security Layer             │
        │   (next.config.ts)                   │
        │                                      │
        │  HTTP Headers:                       │
        │  ├─ X-Content-Type-Options: nosniff  │
        │  ├─ X-Frame-Options: DENY            │
        │  ├─ X-XSS-Protection: 1; mode=block  │
        │  ├─ Strict-Transport-Security (prod) │
        │  ├─ Content-Security-Policy (dynamic)│
        │  ├─ Access-Control-Allow-* (CORS)    │
        │  └─ Referrer-Policy: strict-no-refer │
        │                                      │
        │  Image Configuration:                │
        │  ├─ Remote patterns (dev + prod)     │
        │  ├─ Dynamic CSP img-src              │
        │  └─ No hardcoded domains             │
        │                                      │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │                                      │
        │    Supabase SSR Backend              │
        │   (config/server.ts)                 │
        │                                      │
        │  Cookie Security:                    │
        │  ├─ httpOnly: true                   │
        │  ├─ secure: true (prod)              │
        │  ├─ sameSite: 'lax'                  │
        │  └─ path: '/'                        │
        │                                      │
        │  Database:                           │
        │  ├─ Auth users table                 │
        │  ├─ User profiles table              │
        │  ├─ Role-based access control        │
        │  └─ Session management               │
        │                                      │
        └──────────────────────────────────────┘
```

## Authentication Flow: Server Actions Pattern

### Sign Up Flow

```
User enters signup form (role selection + details)
         │
         ▼
Client validates with Zod schema
         │
         ▼
handleSubmit triggers startTransition(signupAction)
         │
         ▼
signupAction() runs on server (never exposed to client):
  1. Validate input (server-side)
  2. Check if user exists
  3. Create Supabase auth user
  4. Create user profile
  5. Set HTTP-only secure cookie
  6. Return { user, message, error }
         │
         ▼
useTransition isPending updated (form UI disabled)
         │
         ▼
SignupForm receives result
  - If error: show message
  - If success: call redirectByRole
         │
         ▼
Server-side redirect to role dashboard
  - /dashboard/admin (admin)
  - /dashboard/business (business_owner)
  - /home (user)
```

### Login Flow

```
User enters credentials (email + password)
         │
         ▼
Client validates with Zod schema
         │
         ▼
handleSubmit triggers startTransition(loginAction)
         │
         ▼
loginAction() runs on server:
  1. Validate input
  2. Authenticate with Supabase
  3. Fetch user profile with role
  4. Set HTTP-only secure cookie
  5. Return { user, message, error }
         │
         ▼
useTransition isPending updated
         │
         ▼
LoginForm receives result
  - If error: show error message
  - If success: call redirectByRole
         │
         ▼
Server-side redirect to dashboard
```

### Session Monitoring & Expiration Flow

```
App loads
    │
    ▼
AuthProvider mounts
    │
    ├─ Calls verifySessionAction() to restore session
    │
    └─ Initializes useSessionMonitor hook
         │
         ▼
Session timeout calculated from role:
  Admin (60 min) → Business (240 min) → User (1440 min)
         │
         ▼
Activity listeners attached:
  (mouse, keyboard, scroll, touch events)
         │
         ├─────────────────────────────────┐
         │                                 │
    Activity detected?             No activity
         │                              │
         ▼                              ▼
Session extended              Every 60 seconds:
(timer reset)                 Call verifySessionAction()
                                   │
                                   ▼
                          Session still valid?
                          ├─ YES: continue
                          └─ NO: logout

         Time remaining < 5 min?
                 │
                 ├─ YES: Show SessionWarningDialog
                 │        ├─ "Continue Session" → refreshSession
                 │        └─ "Logout" → logoutAction
                 │
                 └─ NO: continue monitoring

         Time expired?
                 │
                 └─ YES: Auto-logout (logoutAction)
                          Redirect to /auth/login
```

## Component Architecture: Server Actions + useTransition

```
┌────────────────────────────────────────────────────┐
│         LoginForm / SignupForm.tsx                  │
│              'use client'                           │
│                                                    │
│  import { useTransition } from 'react'             │
│  import { loginAction } from '@/app/auth/actions'  │
│  import { useForm } from 'react-hook-form'         │
│                                                    │
│  const [isPending, startTransition] = useTransition()
│  const { register, handleSubmit } = useForm()      │
│                                                    │
│  const onSubmit = (data) => {                      │
│    startTransition(async () => {                   │
│      const result = await loginAction(...)         │
│      if (!result.error) {                          │
│        // Redirect happens server-side             │
│      }                                             │
│    })                                              │
│  }                                                 │
│                                                    │
│  return (                                          │
│    <form onSubmit={...}>                           │
│      <input disabled={isPending} />                │
│      <button disabled={isPending}>                 │
│        {isPending ? 'Loading...' : 'Submit'}       │
│      </button>                                     │
│    </form>                                         │
│  )                                                 │
└────────────────────────────────────────────────────┘
         │
         │ Calls
         ▼
┌────────────────────────────────────────────────────┐
│      app/auth/actions.ts                           │
│       'use server'                                 │
│                                                    │
│  export async function loginAction(email, pwd) {   │
│    // All code runs on server only                 │
│    // Never exposed to client                      │
│                                                    │
│    const supabase = createServerSupabaseClient()   │
│    const { data, error } = await supabase.auth...  │
│                                                    │
│    if (error) {                                    │
│      return { error: 'Generic error message' }     │
│    }                                               │
│                                                    │
│    const cookies = cookieStore.set({ /* ... */ }) │
│    redirectByRole(user.role)                       │
│  }                                                 │
└────────────────────────────────────────────────────┘
         │
         │ Uses
         ▼
┌────────────────────────────────────────────────────┐
│    Supabase SSR Client                             │
│    (config/server.ts)                              │
│                                                    │
│  - Creates server-only Supabase client             │
│  - Manages HTTP-only cookies                       │
│  - No client-side credential exposure              │
│  - Automatic session persistence                   │
└────────────────────────────────────────────────────┘
```

## Session Monitoring Hook Architecture

```
┌──────────────────────────────────┐
│  useSessionMonitor Hook          │
│  (hooks/useSessionMonitor.ts)    │
│                                  │
│  Exports:                        │
│  ├─ isExpiring: boolean          │
│  ├─ timeRemaining: number        │
│  ├─ refreshSession: function     │
│  └─ sessionExpiration: Date|null │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  On Hook Initialize:             │
│                                  │
│  1. Get session from localStorage│
│  2. Calculate timeout from role  │
│  3. Setup activity listeners     │
│  4. Setup 60s verification loop  │
│  5. Setup 1s countdown           │
└──────────────────────────────────┘
         │
         ┌─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   Check Activity    Periodic Verify   Countdown Timer
   (mouse, etc)     (Every 60 sec)      (Every 1 sec)
         │                 │                 │
         ├─────────────────┼─────────────────┤
         │                 │                 │
         ▼                 ▼                 ▼
    Detected?          Valid?            Expiring?
         │                 │                 │
         YES              YES               YES
         │                 │                 │
         ▼                 ▼                 ▼
   Reset Timer      Continue      Show Warning Dialog
   (extend session)               (5 min remaining)
         │
         ├─ "Continue Session" → refreshSession()
         └─ "Logout" → logoutAction()
```

## Security Architecture

```
Client-Side Security              Server-Side Security
─────────────────────────────────────────────────────

useTransition Hook       ←→    Server Actions
  ├─ Pending state            ├─ No credential exposure
  └─ Concurrent updates       ├─ Input validation
                              └─ Generic error messages

Form Validation (Zod)    ←→    Server Validation (Zod)
  ├─ Catch basic errors       ├─ Double-check all input
  └─ Better UX                └─ Security-critical

HTTP-Only Cookies
  ├─ Not accessible to JavaScript
  └─ Prevents XSS attacks

SameSite: Lax Cookie
  ├─ CSRF protection
  ├─ Sent with same-origin requests
  └─ Cross-origin requests blocked

Security Headers
  ├─ X-Frame-Options: DENY (clickjacking)
  ├─ X-Content-Type-Options: nosniff (MIME sniffing)
  ├─ CSP (dynamic img-src, no inline scripts)
  └─ HSTS (HTTPS enforcement in production)

Session Verification
  ├─ Server-side checks (verifySessionAction)
  ├─ Client cannot fake expiration
  ├─ Activity-based refresh
  └─ Automatic logout enforcement

HTTPS Enforcement
  ├─ Secure cookies only in production
  ├─ Strict-Transport-Security header
  └─ Client redirects to HTTPS
```

## Data Flow: User Authentication

```
┌─────────────────────────────────┐
│  Browser - Client Component     │
│  (LoginForm.tsx)                │
│                                 │
│  • User input                   │
│  • Zod validation               │
│  • useTransition pending state  │
│  • Disabled inputs during request
└─────────────────────────────────┘
         │
         │ startTransition(loginAction(...))
         │
         ▼
┌─────────────────────────────────┐
│  Server - Next.js Action        │
│  (app/auth/actions.ts)          │
│                                 │
│  • Validate input (server)      │
│  • Supabase authentication      │
│  • Fetch user profile           │
│  • Set HTTP-only cookie         │
│  • Return user data + message   │
└─────────────────────────────────┘
         │
         │ Response
         │
         ▼
┌─────────────────────────────────┐
│  Browser - Component Updates    │
│                                 │
│  • isPending = false            │
│  • Receive user + error from    │
│    Server Action                │
│  • Call redirectByRole          │
│  • Navigate to dashboard        │
└─────────────────────────────────┘
         │
         │ Server-Side Redirect
         │
         ▼
┌─────────────────────────────────┐
│  Browser - New Page Load        │
│                                 │
│  • AuthProvider verifies session│
│  • Zustand store updated        │
│  • useSessionMonitor started    │
│  • Dashboard content loaded     │
└─────────────────────────────────┘
```

---

## Architecture Benefits

✅ **Secure by Default**

- Server Actions keep credentials server-only
- No API routes to manage
- HTTP-only cookies prevent XSS

✅ **Modern React Patterns**

- useTransition for Server Actions
- Concurrent rendering
- Type-safe from end to end

✅ **Session Management**

- Automatic expiration by role
- Activity detection
- User notification before logout
- Server-verified (cannot be faked)

✅ **Comprehensive Security**

- Multiple security headers
- Dynamic CSP configuration
- CORS protection
- CSRF defense via SameSite

✅ **Better Performance**

- Fewer client components
- Less state management
- Optimized network calls
- Streaming support ready

✅ **Developer Experience**

- Clear code organization
- Type safety throughout
- Minimal boilerplate
- Easy to extend
