# 🔐 Authentication Architecture & Flow

---

## Key Architecture Decisions

1. **No HTTP Loops:** Server actions never call API routes; both call the shared service layer directly.
2. **Centralized Types:** All response types exported from `/lib/types/index.ts`.
3. **Standardized Errors:** 6 canonical error codes across all endpoints (`ApiResponse<T>`).
4. **DRY Services:** Shared service functions in `lib/api/` prevent duplication across Server Actions and API routes.

---

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
│ │        Server Actions (app/(auth)/actions/)                │ │
│ │              🔐 Secure Server-Side Code                    │ │
│ │                                                             │ │
│ │  Folder Structure (prevents merge conflicts):               │ │
│ │  ├─ authActions.ts (core auth actions)                     │ │
│ │  │  ├─ loginAction(email, password)                        │ │
│ │  │  ├─ signupAction(data)                                  │ │
│ │  │  ├─ redirectByRole(role)                                │ │
│ │  │  ├─ logoutAction()                                      │ │
│ │  │  └─ verifySessionAction()                               │ │
│ │  ├─ userActions.ts (profile actions)                       │ │
│ │  │  └─ updateCurrentUserProfileAction(data)               │ │
│ │  └─ index.ts (barrel exports)                              │ │
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
        │   (supabase/server.ts)               │
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

## Authentication Flows

See `authentication.md` for detailed sign-up, login, session verification, and logout flow diagrams.

## Component Architecture: Server Actions + useActionState

```
┌────────────────────────────────────────────────────┐
│         LoginForm / SignupForm.tsx                  │
│              'use client'                           │
│                                                    │
│  import { useActionState } from 'react'            │
│  import { loginAction } from '@/app/(auth)/actions'  │
│  import { useForm } from 'react-hook-form'         │
│                                                    │
│  const [state, formAction, isPending] =            │
│    useActionState(handleLogin, initialState)       │
│                                                    │
│  return (                                          │
│    <form action={formAction}>                      │
│      <input disabled={isPending} />                │
│      {state.error && (                             │
│        <span>{state.error}</span>                  │
│      )}                                            │
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
│      app/(auth)/actions/authActions.ts             │
│       'use server'                                 │
│                                                    │
│  export async function loginAction(                │
│    prevState,                                      │
│    formData                                        │
│  ) {                                               │
│    // All code runs on server only                 │
│    // Never exposed to client                      │
│                                                    │
│    const email = formData.get('email')             │
│    const supabase = createServerSupabaseClient()   │
│    const { data, error } = await supabase.auth...  │
│                                                    │
│    if (error) {                                    │
│      return { error: 'Invalid credentials' }       │
│    }                                               │
│                                                    │
│    redirectByRole(user.role)                       │
│  }                                                 │
└────────────────────────────────────────────────────┘
         │
         │ Uses
         ▼
┌────────────────────────────────────────────────────┐
│    Supabase SSR Client                             │
│    (supabase/server.ts)                            │
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
│  Manages:                        │
│  ├─ isExpiring: warning visible? │
│  ├─ timeRemaining: seconds left  │
│  ├─ Session expiration (ms)      │
│  └─ refreshSession: extend time  │
│                                  │
│  Storage:                        │
│  ├─ HTTP-only cookie (server)    │
│  ├─ localStorage for UI timing   │
│  └─ No sensitive data on client  │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  On Hook Initialize:             │
│                                  │
│  1. Init activity detection:     │
│     ├─ mousemove listener        │
│     ├─ keydown listener          │
│     ├─ scroll listener           │
│     ├─ touchstart listener       │
│     └─ All debounced (5s)        │
│                                  │
│  2. Init verification loop:      │
│     └─ Every 60s call            │
│        verifySessionAction()     │
│                                  │
│  3. Init countdown:              │
│     └─ Every 1s check if         │
│        expiring soon             │
│                                  │
│  4. Init activity handler:       │
│     └─ On activity: refresh      │
│        session (debounced)       │
└──────────────────────────────────┘
         │
         ┌─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   Activity Handler   Verification Loop  Countdown
   (Debounced 5s)    (Every 60 sec)    (Every 1 sec)
         │                 │                 │
         ├─────────────────┼─────────────────┤
         │                 │                 │
         ▼                 ▼                 ▼
    Detected?          Valid?          Expiring Soon?
  (no debounce)           │          (< 5 min left)
         │            Call               │
         YES        Verification         YES
         │           Action              │
         ▼             │                 ▼
   Queue        Returns:              Show Dialog
 refreshSession ├─ user            (Countdown)
               ├─ role             │
   If already  └─ success          ├─ Continue →
   queued,         │               │  refreshSession
   don't queue  Updates            │
   again        localStorage       └─ Logout →
    (5s debounce)                     logoutAction

              Auto-logout
              (time expired)
                  │
                  ▼
              Call logoutAction()
              Redirect to /login
```

## Security Architecture

```
Client-Side Security              Server-Side Security
─────────────────────────────────────────────────────

useActionState Hook      ←→    Server Actions
  ├─ Pending state            ├─ No credential exposure
  └─ Form state management    ├─ Input validation
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
  ├─ Client localStorage is UI-only (can't fake)
  ├─ Activity-based refresh (debounced)
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
│  • useActionState pending state │
│  • Disabled inputs during request
└─────────────────────────────────┘
         │
         │ form action={formAction}
         │
         ▼
┌─────────────────────────────────┐
│  Server - Next.js Action        │
│  (app/(auth)/actions/)          │
│                                 │
│  • Validate input (server)      │
│  • Supabase authentication      │
│  • Fetch user profile + role    │
│  • Set HTTP-only cookie         │
│  • Return user, role, message   │
└─────────────────────────────────┘
         │
         │ Response
         │
         ▼
┌─────────────────────────────────┐
│  Browser - Component Updates    │
│                                 │
│  • isPending = false            │
│  • Receive state from           │
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
│  • SessionTracker initializes   │
│  • useSessionMonitor started    │
│  • Dashboard content loaded     │
│  • SessionWarningDialog mounted │
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
