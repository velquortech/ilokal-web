# Ilokal-web Installation Guide

This guide outlines how to set up and manage the Ilokal-wb repository using Make commands and Supabase.

---

## 🚀 Getting Started

Make sure the following are installed on your machine:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (ensure it's running)

### Installation Steps

1. Install dependencies:

   ```bash
   yarn
   ```

2. Set up Supabase (ensure Docker is running):

   ```bash
   make setup-supabase
   ```

3. Run the development server:
   ```bash
   make run-dev
   ```

---

## 🔧 Cleaning and Stopping

- Clean all configurations and stop running containers:

  ```bash
  make clean
  ```

- Stop the database only:
  ```bash
  make stop-db
  ```

---

## ✅ Build and Lint

- Check builds and run linters:
  ```bash
  make build-app
  ```

---

## 👀 Production Preview (Local)

- Start the app in production mode locally:
  ```bash
  make start-app
  ```

---

## 🛠️ Supabase Configuration

### 📦 Create a Migration

- Create a new migration:
  ```bash
  make migrate-new name=[file-name]
  ```

### ⬆️ Apply Migrations

- Apply all pending migrations:
  ```bash
  make migrate-up
  ```

### 🔍 Migration Diff

- Check differences between local DB and migration files:
  ```bash
  make migrate-diff
  ```

### ♻️ Reset Database

- Reset and reapply migrations:
  ```bash
  make migrate-reset
  ```

---

## 📌 Notes

- Replace `[file-name]` with a descriptive name for the migration.
- Ensure Docker is running before executing any Supabase-related commands.

---

## 🔐 Authentication Setup

The application includes a complete authentication system with login and signup functionality.

### Setting Up Profiles Table

1. Create the `profiles` table in Supabase:

   ```sql
   CREATE TABLE profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     email TEXT UNIQUE NOT NULL,
     name TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Or run the existing migration:
   ```bash
   make migrate-up
   ```

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY=your_supabase_service_secret_key_here
NEXT_PUBLIC_SUPABASE_TOKEN=your_supabase_token_here

# API Configuration (optional)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Authentication Features

- ✅ User registration with email and password
- ✅ User login with credentials
- ✅ Session persistence
- ✅ Protected routes
- ✅ Form validation with react-hook-form and Zod
- ✅ Beautiful UI with shadcn/ui components
- ✅ State management with Zustand

### Available Pages

- **Login Page**: `/auth/login`
- **Signup Page**: `/auth/signup`

### Using Authentication

Access the auth hook in any client component:

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <>
      {isAuthenticated && <p>Welcome, {user?.name}</p>}
      <button onClick={logout}>Sign Out</button>
    </>
  );
}
```

Protect routes by wrapping with ProtectedRoute:

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

For detailed authentication documentation, see [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md)
