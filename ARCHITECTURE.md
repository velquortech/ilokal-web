# 🔐 Authentication Architecture & Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Root Layout (layout.tsx)                  │   │
│  │         Wraps app with AuthProvider                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           AuthProvider Component                      │   │
│  │  - Verifies session on mount                          │   │
│  │  - Manages user state with Zustand                    │   │
│  │  - Provides auth context to children                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     Zustand Auth Store (authStore.ts)                │   │
│  │                                                       │   │
│  │  State:                                               │   │
│  │  ├─ user: User | null                                │   │
│  │  ├─ isAuthenticated: boolean                         │   │
│  │  ├─ isLoading: boolean                               │   │
│  │  └─ error: string | null                             │   │
│  │                                                       │   │
│  │  Actions:                                             │   │
│  │  ├─ setUser(user)                                    │   │
│  │  ├─ logout()                                         │   │
│  │  ├─ setError(error)                                  │   │
│  │  └─ clearError()                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
│     ┌─────────────────────┼────────────────────────┐         │
│     │                     │                        │         │
│     ▼                     ▼                        ▼         │
│  ┌──────────┐         ┌──────────┐            ┌──────────┐  │
│  │ Login    │         │ Signup   │            │Dashboard │  │
│  │ Page     │         │ Page     │            │ Page     │  │
│  └──────────┘         └──────────┘            └──────────┘  │
│     │                     │                                   │
│     └─────────────────┬───┘                                  │
│                       │                                       │
│                       ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React Hook Form + Zod Validation              │   │
│  │                                                       │   │
│  │  Form Components:                                     │   │
│  │  ├─ LoginForm.tsx                                    │   │
│  │  └─ SignupForm.tsx                                   │   │
│  │                                                       │   │
│  │  Validation Schemas (auth.ts):                        │   │
│  │  ├─ loginSchema                                      │   │
│  │  └─ signupSchema                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                       │                                       │
│                       ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Axios HTTP Client (apiClient.ts)             │   │
│  │                                                       │   │
│  │  Features:                                            │   │
│  │  ├─ Automatic credential handling                    │   │
│  │  ├─ Response transformations                         │   │
│  │  ├─ Error handling & 401 redirect                    │   │
│  │  └─ Request/Response interceptors                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                       │                                       │
│                       ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │       Authentication Service (authService.ts)         │   │
│  │                                                       │   │
│  │  Methods:                                             │   │
│  │  ├─ signup(data)                                     │   │
│  │  ├─ login(data)                                      │   │
│  │  ├─ logout()                                         │   │
│  │  └─ verifySession()                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │                                       │
        │     Next.js API Routes                │
        │     /api/auth/*                       │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ POST /auth/signup               │ │
        │  │ - Validate input                │ │
        │  │ - Create Supabase auth user     │ │
        │  │ - Create user profile           │ │
        │  │ - Return user data              │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ POST /auth/login                │ │
        │  │ - Validate credentials          │ │
        │  │ - Authenticate with Supabase    │ │
        │  │ - Fetch user profile            │ │
        │  │ - Return user data              │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ POST /auth/logout               │ │
        │  │ - Sign out from Supabase        │ │
        │  │ - Clear session                 │ │
        │  │ - Return success message        │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ GET /auth/verify                │ │
        │  │ - Check current session         │ │
        │  │ - Return user if authenticated  │ │
        │  │ - Return null if not            │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │                                       │
        │       Supabase Backend                │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ Authentication Service           │ │
        │  │ - User registration              │ │
        │  │ - User login                     │ │
        │  │ - Session management             │ │
        │  │ - Secure password handling       │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ Profiles Table                   │ │
        │  │ - id (UUID)                      │ │
        │  │ - email (TEXT)                   │ │
        │  │ - name (TEXT)                    │ │
        │  │ - created_at (TIMESTAMP)         │ │
        │  │ - updated_at (TIMESTAMP)         │ │
        │  └─────────────────────────────────┘ │
        │                                       │
        └─────────────────────────────────────┘
```

## Authentication Flow: Sign Up

```
User                Browser                API                 Supabase
  │                   │                     │                      │
  │ 1. Visit /signup  │                     │                      │
  ├──────────────────→│                     │                      │
  │                   │ 2. Render Form      │                      │
  │                   │ (LoginForm.tsx)     │                      │
  │←──────────────────┤                     │                      │
  │                   │                     │                      │
  │ 3. Enter Data     │                     │                      │
  │ Name, Email,      │                     │                      │
  │ Password          │                     │                      │
  ├──────────────────→│                     │                      │
  │                   │ 4. Validate with    │                      │
  │                   │ Zod Schema          │                      │
  │                   │ (signupSchema)      │                      │
  │                   │                     │                      │
  │                   │ 5. POST to API      │                      │
  │                   │ /api/auth/signup    │                      │
  │                   │────────────────────→│                      │
  │                   │                     │ 6. Validate Input    │
  │                   │                     │    Check if User     │
  │                   │                     │    Exists            │
  │                   │                     │                      │
  │                   │                     │ 7. Create Auth User  │
  │                   │                     │────────────────────→│
  │                   │                     │                      │
  │                   │                     │ 8. Auth User Created │
  │                   │                     │←────────────────────│
  │                   │                     │                      │
  │                   │                     │ 9. Create Profile    │
  │                   │                     │────────────────────→│
  │                   │                     │                      │
  │                   │                     │ 10. Profile Created  │
  │                   │                     │←────────────────────│
  │                   │                     │                      │
  │                   │ 11. Success Response│                      │
  │                   │←────────────────────│                      │
  │                   │                     │                      │
  │                   │ 12. Set User State  │                      │
  │                   │ (Zustand Store)     │                      │
  │                   │                     │                      │
  │ 13. Success Page  │                     │                      │
  │←──────────────────┤                     │                      │
  │                   │                     │                      │
  │ 14. Redirect      │                     │                      │
  │ to /home          │                     │                      │
  ├──────────────────→│                     │                      │
```

## Authentication Flow: Login

```
User                Browser                API                 Supabase
  │                   │                     │                      │
  │ 1. Visit /login   │                     │                      │
  ├──────────────────→│                     │                      │
  │                   │ 2. Render Form      │                      │
  │                   │ (LoginForm.tsx)     │                      │
  │←──────────────────┤                     │                      │
  │                   │                     │                      │
  │ 3. Enter Email    │                     │                      │
  │ & Password        │                     │                      │
  ├──────────────────→│                     │                      │
  │                   │ 4. Validate with    │                      │
  │                   │ Zod Schema          │                      │
  │                   │ (loginSchema)       │                      │
  │                   │                     │                      │
  │                   │ 5. POST to API      │                      │
  │                   │ /api/auth/login     │                      │
  │                   │────────────────────→│                      │
  │                   │                     │ 6. Validate Input    │
  │                   │                     │    Authenticate User │
  │                   │                     │────────────────────→│
  │                   │                     │                      │
  │                   │                     │ 7. Auth Successful   │
  │                   │                     │←────────────────────│
  │                   │                     │                      │
  │                   │                     │ 8. Fetch Profile     │
  │                   │                     │────────────────────→│
  │                   │                     │                      │
  │                   │                     │ 9. Return Profile    │
  │                   │                     │←────────────────────│
  │                   │                     │                      │
  │                   │ 10. Success Response│                      │
  │                   │←────────────────────│                      │
  │                   │                     │                      │
  │                   │ 11. Set User State  │                      │
  │                   │ (Zustand Store)     │                      │
  │                   │                     │                      │
  │ 12. Redirect      │                     │                      │
  │ to /home          │                     │                      │
  ├──────────────────→│                     │                      │
```

## Session Verification Flow (On App Mount)

```
User                Browser                API                 Supabase
  │                   │                     │                      │
  │ 1. Open App       │                     │                      │
  ├──────────────────→│                     │                      │
  │                   │ 2. AuthProvider     │                      │
  │                   │ useEffect runs      │                      │
  │                   │                     │                      │
  │                   │ 3. Call verify      │                      │
  │                   │ /api/auth/verify    │                      │
  │                   │────────────────────→│                      │
  │                   │                     │ 4. Check Session     │
  │                   │                     │────────────────────→│
  │                   │                     │                      │
  │                   │                     │ 5. If Valid, Get     │
  │                   │                     │ User Profile         │
  │                   │                     │←────────────────────│
  │                   │                     │                      │
  │                   │ 6. Return User      │                      │
  │                   │ Data or null        │                      │
  │                   │←────────────────────│                      │
  │                   │                     │                      │
  │                   │ 7. Update Zustand   │                      │
  │                   │ Store with user     │                      │
  │                   │ (if authenticated)  │                      │
  │                   │                     │                      │
  │ 8. App Loaded     │                     │                      │
  │ with Auth State   │                     │                      │
  │←──────────────────┤                     │                      │
```

## State Management: Zustand Store

```
┌─────────────────────────────────────┐
│     Zustand Auth Store              │
│  (lib/stores/authStore.ts)          │
├─────────────────────────────────────┤
│                                     │
│  State Variables:                   │
│  ├─ user: {                         │
│  │   id: string                     │
│  │   email: string                  │
│  │   name?: string                  │
│  │ } | null                         │
│  │                                  │
│  ├─ isAuthenticated: boolean        │
│  ├─ isLoading: boolean              │
│  └─ error: string | null            │
│                                     │
│  Actions:                           │
│  ├─ setUser(user)                   │
│  │  └─> Updates user & auth state   │
│  │                                  │
│  ├─ setError(error)                 │
│  │  └─> Sets error message          │
│  │                                  │
│  ├─ clearError()                    │
│  │  └─> Clears error message        │
│  │                                  │
│  ├─ setIsLoading(loading)           │
│  │  └─> Sets loading state          │
│  │                                  │
│  └─ logout()                        │
│     └─> Clears all auth state       │
│                                     │
└─────────────────────────────────────┘
        │
        │ Used by
        ▼
    ┌──────────────────┐
    │  useAuth Hook    │
    │  (hooks/useAuth) │
    │                  │
    │  Returns:        │
    │  ├─ user         │
    │  ├─ isLoading    │
    │  ├─ error        │
    │  ├─ logout()     │
    │  └─ clearError() │
    └──────────────────┘
        │
        │ Used by
        ▼
    ┌──────────────────┐
    │ Any Component    │
    │ (Client-side)    │
    └──────────────────┘
```

## Validation Flow: React Hook Form + Zod

```
┌─────────────────────────────────────────┐
│        LoginForm.tsx Component          │
└─────────────────────────────────────────┘
              │
              │ Uses
              ▼
┌─────────────────────────────────────────┐
│   React Hook Form (useForm)             │
│                                         │
│  - Manages form state                   │
│  - Handles form submission              │
│  - Tracks form touched fields           │
│  - Provides form methods                │
└─────────────────────────────────────────┘
              │
              │ Validates with
              ▼
┌─────────────────────────────────────────┐
│   Zod Validation Schema                 │
│   (lib/validation/auth.ts)              │
│                                         │
│   loginSchema = z.object({              │
│     email: z.string().email(),          │
│     password: z.string().min(6)         │
│   })                                    │
└─────────────────────────────────────────┘
              │
              │ Result
              ▼
┌─────────────────────────────────────────┐
│   Validation Result                     │
│                                         │
│   ✓ Valid → Send to API                 │
│   ✗ Invalid → Show error in form        │
└─────────────────────────────────────────┘
```

## API Request Flow with Axios

```
┌─────────────────────────────────────────┐
│   authService.login(credentials)        │
│   (lib/api/authService.ts)              │
└─────────────────────────────────────────┘
              │
              │ Uses
              ▼
┌─────────────────────────────────────────┐
│   Axios Instance (apiClient)            │
│   (lib/api/apiClient.ts)                │
│                                         │
│  - Base URL: /api                       │
│  - Credentials: withCredentials=true    │
│  - Headers: Content-Type: application   │
│    /json                                │
└─────────────────────────────────────────┘
              │
              │ Request Interceptor
              ▼
┌─────────────────────────────────────────┐
│   Request prepared & sent                │
│   POST /api/auth/login                  │
│   { email, password }                   │
└─────────────────────────────────────────┘
              │
              │ Network
              ▼
┌─────────────────────────────────────────┐
│   Next.js API Route                     │
│   /api/auth/login/route.ts              │
└─────────────────────────────────────────┘
              │
              │ Response
              ▼
┌─────────────────────────────────────────┐
│   Response Interceptor                  │
│                                         │
│   - Transform response data              │
│   - Handle errors                       │
│   - Redirect on 401                     │
└─────────────────────────────────────────┘
              │
              │ Return to Component
              ▼
┌─────────────────────────────────────────┐
│   Component receives response             │
│   - Update Zustand store                │
│   - Redirect to home                    │
│   - Show success/error message          │
└─────────────────────────────────────────┘
```

## Protected Route Flow

```
┌─────────────────────────────────────────┐
│   Component wrapped with                 │
│   <ProtectedRoute>                      │
│   (components/auth/ProtectedRoute.tsx)  │
└─────────────────────────────────────────┘
              │
              │ useEffect on Mount
              ▼
┌─────────────────────────────────────────┐
│   Check Zustand Auth State              │
│                                         │
│   ├─ isLoading?                         │
│   │  └─> Show Loading Spinner           │
│   │                                     │
│   ├─ isAuthenticated?                   │
│   │  ├─> YES → Render children ✓        │
│   │  └─> NO → Redirect to /login ✗      │
└─────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Type-safe authentication
- ✅ Proper error handling
- ✅ Session persistence
- ✅ Protected routes
- ✅ Responsive user feedback
