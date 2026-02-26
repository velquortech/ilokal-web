# Authentication Implementation Guide

This guide outlines the authentication system implemented for the Ilokal application using Next.js, Supabase, and the specified libraries.

## 🏗️ Architecture Overview

The authentication system is built with:
- **Zustand** - Client-side state management for user session
- **React Hook Form** - Form handling and validation
- **Zod** - Schema validation
- **Axios** - HTTP client for API calls
- **shadcn/ui & Radix UI** - UI components
- **Supabase** - Backend authentication and database

## 📁 Project Structure

```
lib/
├── api/
│   ├── apiClient.ts          # Axios instance with interceptors
│   └── authService.ts        # Authentication service functions
├── stores/
│   └── authStore.ts          # Zustand store for auth state
└── validation/
    └── auth.ts               # Zod schemas for login/signup

components/
├── auth/
│   ├── LoginForm.tsx         # Login form component
│   ├── SignupForm.tsx        # Signup form component
│   └── ProtectedRoute.tsx    # Route protection wrapper
└── providers/
    └── AuthProvider.tsx      # Auth context provider

app/
├── auth/
│   ├── layout.tsx            # Auth layout
│   ├── login/page.tsx        # Login page
│   └── signup/page.tsx       # Signup page
└── api/auth/
    ├── signup/route.ts       # Signup endpoint
    ├── login/route.ts        # Login endpoint
    ├── logout/route.ts       # Logout endpoint
    └── verify/route.ts       # Session verification endpoint

hooks/
└── useAuth.ts                # Auth hook for easy access
```

## 🔐 Authentication Flow

### Sign Up Flow
1. User fills signup form with email, password, name, and confirm password
2. Form validates with Zod schema
3. Axios sends request to `/api/auth/signup`
4. Backend creates Supabase auth user
5. Backend creates user profile in database
6. User is added to Zustand store
7. User is redirected to home page

### Login Flow
1. User fills login form with email and password
2. Form validates with Zod schema
3. Axios sends request to `/api/auth/login`
4. Backend authenticates with Supabase
5. Backend fetches user profile
6. User is added to Zustand store
7. User is redirected to home page

### Session Verification
1. On app mount, AuthProvider calls verify endpoint
2. Backend checks Supabase session
3. If valid, user data is restored to Zustand store
4. If invalid, user state remains empty

## 📋 Available Components

### LoginForm
Located at `components/auth/LoginForm.tsx`

```tsx
import LoginForm from '@/components/auth/LoginForm';

// Use in your login page
<LoginForm />
```

### SignupForm
Located at `components/auth/SignupForm.tsx`

```tsx
import SignupForm from '@/components/auth/SignupForm';

// Use in your signup page
<SignupForm />
```

### ProtectedRoute
Wrapper component for routes that require authentication

```tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected Content</div>
    </ProtectedRoute>
  );
}
```

## 🎯 Using the Auth Hook

Access authentication state and methods anywhere in your client components:

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function UserProfile() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

## 📝 API Endpoints

All endpoints are prefixed with `/api/auth/`

### POST /signup
Sign up a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "message": "Account created successfully. Please verify your email."
}
```

### POST /login
Log in a user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "message": "Logged in successfully"
}
```

### POST /logout
Log out the current user

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /verify
Verify current session

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
// or
{
  "user": null
}
```

## 🔧 Zustand Store API

Access the auth store directly if needed:

```tsx
'use client';

import { useAuthStore } from '@/lib/stores/authStore';

export default function Component() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  return <div>{/* Use state */}</div>;
}
```

## 🌐 Axios Configuration

Axios is configured in `lib/api/apiClient.ts` with:

- Base URL pointing to `/api`
- Request credentials enabled
- Automatic response error handling
- 401 redirects to login page

To make API calls:

```tsx
import apiClient from '@/lib/api/apiClient';

// GET request
const response = await apiClient.get('/endpoint');

// POST request
const response = await apiClient.post('/endpoint', { data });

// PUT request
const response = await apiClient.put('/endpoint', { data });

// DELETE request
const response = await apiClient.delete('/endpoint');
```

## 🔑 Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY=your_service_secret_key
NEXT_PUBLIC_SUPABASE_TOKEN=your_token
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 🚀 How to Use

### 1. Set up Supabase profiles table
The system expects a `profiles` table with the following schema:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Create login and signup routes
Already implemented at:
- `/auth/login`
- `/auth/signup`

### 3. Protected routes
Wrap any route/component that needs authentication:

```tsx
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

## 📚 Libraries Used

- **react-hook-form** - Form state management
- **@hookform/resolvers** - Form validation resolvers
- **zod** - Schema validation
- **zustand** - State management
- **axios** - HTTP client
- **shadcn/ui** - UI components
- **@radix-ui/react-label** - Label primitive

All components use Tailwind CSS for styling and are fully customizable.

## 🔒 Security Notes

1. **Passwords** are handled securely by Supabase Auth
2. **Session cookies** are HTTP-only and secure
3. **API endpoints** have proper error handling
4. **Protected routes** redirect to login if not authenticated
5. **Credentials** are included in API requests automatically

## 🆘 Troubleshooting

### Issue: 401 Unauthorized errors
- Ensure Supabase environment variables are correctly set
- Check that the user is properly authenticated
- Verify session with `/api/auth/verify` endpoint

### Issue: Form validation not working
- Ensure Zod validation schemas are properly defined
- Check that react-hook-form is properly integrated
- Verify field names match schema definitions

### Issue: User state not persisting
- Ensure AuthProvider is wrapping your app in layout.tsx
- Check browser console for errors
- Verify `/api/auth/verify` endpoint is working

## 📖 Additional Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Axios Documentation](https://axios-http.com)
