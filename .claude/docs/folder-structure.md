# Folder Structure

---

## 🏗️ Root Level Files & Directories

### Configuration Files

- **`package.json`** - Project dependencies, scripts, and metadata
- **`tsconfig.json`** - TypeScript compiler configuration with path aliases (@/\*)
- **`next.config.ts`** - Next.js configuration settings
- **`components.json`** - shadcn/ui components configuration
- **`postcss.config.mjs`** - PostCSS configuration for Tailwind
- **`eslint.config.mjs`** - ESLint configuration for code quality
- **`Makefile`** - Build and database management commands

### Documentation Files

- **`README.md`** - Project setup and usage guide
- **`ARCHITECTURE.md`** - ✅ System architecture (updated March 21)
- **`AUTHENTICATION.md`** - ✅ Authentication implementation (updated March 21)
- **`SECURITY.md`** - ✅ Complete security guide (updated March 21)
- **`SESSION_MANAGEMENT.md`** - ✅ Session configuration (updated March 21)
- **`RBAC_MODEL.md`** - ✅ Role-based access control (updated March 21)
- **`API_IMPLEMENTATION_STRATEGY.md`** - ✅ Phase 1-2 completion (updated March 21)
- **`IMPLEMENTATION_COMPLETE.md`** - ✅ Feature completion (updated March 21)
- **`FOLDER_STRUCTURE.md`** - This file; folder organization guide

### Other

- **`proxy.ts`** - Middleware for route protection and role-based access
- **`database.types.ts`** - Supabase-generated database types

---

## 🎯 `/app` - Next.js App Router Directory

### `app/(auth)` - Authentication Routes

Protected routes for login and signup pages outside admin/business namespaces.

```
(auth)/
├── actions/                   # Server Actions for authentication (folder-based for scalability)
│   ├── authActions.ts         # Core auth actions
│   │                           # - loginAction()
│   │                           # - signupAction()
│   │                           # - logoutAction()
│   │                           # - redirectByRole()
│   │                           # - verifySessionAction()
│   ├── userActions.ts         # User profile actions
│   │                           # - updateCurrentUserProfileAction()
│   └── index.ts               # Barrel exports (backward compatib)
├── layout.tsx                 # Auth layout wrapper
├── login/                      # Login page route
└── signup/                     # Signup page route
```

**Rationale:** Folder-based structure allows parallel development without merge conflicts

### `app/admin` - Admin Dashboard

Administrative interface for user and business management.

```
admin/
├── page.tsx                    # Admin dashboard homepage
├── layout.tsx                  # Admin layout with navigation
├── actions/                    # Server Actions for admin operations (folder-based)
│   ├── userActions.ts          # User management actions
│   │                           # - createAdminAction()
│   │                           # - updateAdminAction()
│   │                           # - deleteAdminAction()
│   │                           # - createBusinessOwnerAction()
│   │                           # - updateConsumerAction()
│   │                           # - restoreUserAction()
│   ├── businessActions.ts      # Business management actions
│   │                           # - createBusinessAction()
│   │                           # - updateBusinessAction()
│   │                           # - verifyBusinessAction()
│   │                           # - suspendBusinessAction()
│   ├── categoryActions.ts      # Category management actions
│   │                           # - createCategoryAction()
│   │                           # - updateCategoryAction()
│   │                           # - deleteCategoryAction()
│   └── index.ts                # Barrel exports (backward compatible)
├── users/                      # User management section
│   ├── page.tsx                # Users table and management UI
│   ├── tabs/                   # Tab components for different user types
│   │   ├── index.ts            # Exports AdminTab, ConsumersTab, BusinessOwnerTab
│   │   ├── AdminTab/
│   │   │   └── AdminTab.tsx    # Admin user management tab
│   │   ├── ConsumerTab/
│   │   │   └── ConsumersTab.tsx # Consumer management tab
│   │   └── BusinessOwnerTab/
│   │       └── BusinessOwnerTab.tsx # Business owner management tab
│   └── components/
│       ├── shared/             # Shared components (Sidebar, UsersTable, etc.)
│       └── forms/              # Form components for user creation/editing
│           ├── UserFormModal.tsx
│           ├── UserEditForm.tsx
│           ├── fields/         # Individual form fields
│           └── inputs/         # Custom input components
│
├── components/                 # Reusable admin components
│   ├── forms/                  # Form components
│   │   ├── UserFormModal.tsx   # Modal for creating/editing users
│   │   ├── UserEditForm.tsx    # User edit form
│   │   ├── fields/
│   │   │   ├── FormFields.tsx  # Form field renderer
│   │   │   └── [other fields]
│   │   └── inputs/
│   │       ├── PhoneNumberInput.tsx
│   │       └── AvatarUpload.tsx
│   ├── shared/                 # Shared components
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── UsersTable.tsx      # Users data table
│   │   └── UserSearchFilter.tsx
│   ├── index.ts                # Exports all components
│   └── ...
│
├── schemas/                    # Form validation schemas
│   └── userFormSchema.ts       # Zod schemas for user forms
│
├── config/                     # Admin-specific configuration
│   ├── tabsConfig.tsx          # Tab navigation configuration
│   ├── adminConfig.ts          # Admin settings and constants
│   └── formFields.ts           # Form field configurations
│
└── constants/                  # Admin-specific constants
    └── [various constants]
```

### `app/business` - Business Owner Dashboard

Dashboard for business owner role users.

```
business/
├── page.tsx                    # Business dashboard homepage
├── layout.tsx                  # Business layout wrapper
├── actions/                    # Server Actions for business operations (folder-based)
│   ├── productActions.ts       # Product management actions
│   │                           # - createProductAction()
│   │                           # - updateProductAction()
│   │                           # - deleteProductAction()
│   │                           # - getBusinessProductsAction()
│   │                           # - getCategoriesAction()
│   ├── branchActions.ts        # Branch management actions
│   │                           # - createBranchAction()
│   │                           # - updateBranchAction()
│   │                           # - deleteBranchAction()
│   ├── couponActions.ts        # Coupon & deal actions
│   │                           # - createCouponAction()
│   │                           # - redeemCouponAction()
│   │                           # - createFeaturedDealAction()
│   └── index.ts                # Barrel exports (backward compatible)
├── components/                 # Business-specific components
├── config/                     # Business configuration
├── constants/                  # Business constants
└── schemas/                    # Business validation schemas
```

**Rationale:** Folder-based structure allows parallel development without merge conflicts

### `app/home` - Public Landing Page

Public-facing homepage and marketing pages.

```
home/
├── page.tsx                    # Landing page component
├── layout.tsx                  # Home layout
├── components/                 # Home page sections
│   ├── hero.tsx                # Hero section
│   ├── partners.tsx            # Partners showcase
│   ├── objectives.tsx          # Features/objectives section
│   ├── ai-agents.tsx           # AI agents introduction
│   ├── pricing.tsx             # Pricing section
│   └── Skeleton.tsx            # Animation skeletons
├── helpers/                    # Helper functions/constants
│   └── constants.ts            # Pricing plans and content
└── ...
```

### `app/api` - API Routes

Backend API endpoints for data operations.

```
api/
├── auth/                       # Authentication endpoints
│   ├── [...auth]/route.ts      # Catch-all auth routes
│   ├── login/                  # POST /api/auth/login
│   ├── logout/                 # POST /api/auth/logout
│   ├── signup/                 # POST /api/auth/signup
│   └── verify/                 # POST /api/auth/verify
│
├── admin/                      # Admin-only endpoints
│   └── profiles/               # Admin profile management
│       ├── route.ts            # GET/POST: /api/admin/profiles
│       │                        # GET: List profiles (paginated, filtered)
│       │                        # POST: Create new profile
│       └── [id]/               # Dynamic profile operations
│           └── route.ts        # GET/PUT/DELETE: /api/admin/profiles/[id]
│                                # GET: Fetch single profile
│                                # PUT: Update profile
│                                # DELETE: Delete profile
│
├── upload/                     # File upload endpoints
│   └── avatar/                 # POST /api/upload/avatar
│
└── helpers/                    # API utilities
    └── [helper functions]
```

### `app/layout.tsx`

Root layout wrapper with:

- SessionWarningDialog for session expiration warnings
- Global providers and styles

### `app/page.tsx`

Redirect logic to direct users to appropriate pages (home, dashboard, etc.)

---

## 🎨 `/components` - Shared React Components

Reusable components used across the entire application.

```
components/
├── auth/                       # Authentication-specific components
│   ├── LoginForm.tsx           # Login form with useActionState
│   ├── SignupForm.tsx          # Signup form with useActionState
│   ├── SessionWarningDialog.tsx # Session expiration warning (5 min before logout)
│   └── SessionTracker.tsx       # Initializes useSessionMonitor hook on mount
│
├── custom/                     # Custom branded components
│   ├── Header.tsx              # Global header/navbar
│   ├── Footer.tsx              # Global footer
│   ├── Navigation.tsx          # Navigation menu
│   ├── Sidebar.tsx             # Global sidebar
│   ├── AvatarImage.tsx         # Avatar display utility
│   ├── CustomButton.tsx        # Custom button component
│   ├── FadeInAnimation.tsx      # Fade-in animation wrapper
│   ├── FadeInOnScroll.tsx       # Fade-in on scroll animation
│   ├── pricing.tsx             # Pricing card components
│   ├── socialIcons.tsx         # Social media icons
│   └── ...
│
├── providers/                  # React Context & Provider Wrappers
│   ├── AuthProvider.tsx        # Wraps SessionTracker + UserContext
│   ├── UserContext.tsx         # Provides user data via React Context
│   └── SonnerProvider.tsx       # Toast notification provider
│
├── ui/                         # shadcn/ui & Radix UI components
│   ├── button.tsx              # Base button component
│   ├── card.tsx                # Card UI component
│   ├── dialog.tsx              # Modal/dialog component
│   ├── input.tsx               # Text input component
│   ├── form.tsx                # Form wrapper (react-hook-form)
│   ├── label.tsx               # Form label component
│   ├── dropdown-menu.tsx       # Dropdown menu component
│   ├── select.tsx              # Select dropdown component
│   ├── radio-group.tsx         # Radio buttons component
│   ├── table.tsx               # Data table component
│   ├── tooltip.tsx             # Tooltip component
│   ├── card-stack.tsx          # Animated card stack
│   ├── resizable-navbar.tsx    # Responsive navbar
│   └── ...
│
└── index.ts                    # Component exports
```

---

## ⚙️ `/config` - Application Configuration

Central configuration files for routing, environment, and app-wide settings.

```
config/
├── routeConfig.ts              # ✅ **Single source of truth for all routes**
│                                # Defines: ROUTES object and PROTECTED_ROUTES
│
├── adminConfig.ts              # Admin-specific settings
├── phoneConfig.ts              # Phone number validation config
└── sidebarConfig.ts            # Sidebar navigation configuration
```

---

## 🔧 `/hooks` - Custom React Hooks

Custom hooks for authentication, data fetching, and state management.

```
hooks/
├── useAuth.ts                  # Logout only (no auth state)
│                                # - Get user, isAuthenticated
│                                # - logout() function
│
├── useAdminMutations.ts        # Admin CRUD operations with Server Actions
│                                # - useCreateAdmin(onSuccess?, onError?)
│                                # - useUpdateAdmin(onSuccess?, onError?)
│                                # - useDeleteAdmin(onSuccess?, onError?)
│                                # - useCreateConsumer() / useUpdateConsumer() / useDeleteConsumer()
│                                # - useCreateBusinessOwner() / useUpdateBusinessOwner() / useDeleteBusinessOwner()
│                                # - useUpdateAdminStatus()
│                                # Uses useTransition for pending state
│                                # Callbacks receive updated/deleted profile data
│
├── useProfiles.ts              # Profile data fetching (manual state management)
│                                # - useProfilesByRole(role, options?)
│                                #   Pagination, search, filtering, sorting
│                                #   Returns: { data, isLoading, error, refetch }
│
├── useSessionMonitor.ts        # Session expiration monitoring
│                                # - Periodic verification (every 60s)
│                                # - Activity detection (debounced 5s)
│                                # - Expiration warning (5 min before logout)
│                                # - Auto-logout on expiration
│
└── ...
```

---

## 📚 `/lib` - Utility Functions & Type Definitions

Core library code organized by functionality.

```
lib/
├── utils.ts                    # **Main utility functions**
│                                # - cn() for className merging
│
├── api/                        # **API utilities & middleware**
│   └── verifyAdminAccess.ts    # Shared admin authorization utility
│                                # - verifyAdminAccess() - Check if user is admin
│
├── types/                      # **TypeScript type definitions**
│   ├── user.ts                 # User/Profile types
│   │   - Profile, User, AuthUser, UserRole types
│   ├── database.ts             # Supabase database types (auto-generated)
│   ├── forms.ts                # Form-related types
│   │   - FormFieldConfig, SelectFieldConfig, UserFormModalProps
│   ├── middleware.ts           # Middleware types
│   ├── phoneInput.ts           # Phone input types
│   └── ...
│
├── validation/                 # **Validation schemas & utilities**
│   └── auth.ts                 # Auth validation
│       - loginSchema, signupSchema, serverSignupSchema
│       - Validation utility functions
│
├── schemas/                    # ✅ **Form validation schemas**
│   └── userFormSchema.ts       # User form Zod schemas
│       - userFormSchema, adminEditSchema
│       - UserFormData, AdminEditFormData types
│
├── utils/                      # **Utility helper functions**
│   ├── dateFormatter.ts        # Date formatting utilities
│   ├── errorHandler.ts         # Error extraction and handling
│   ├── roleMapper.ts           # Role mapping utilities
│   └── ...
│
├── stores/                     # ❌ **LEGACY** (Moved to services/)
│
└── auth/                       # **Auth-specific utilities**
    └── sessionConfig.ts        # Session timeout configuration
```

---

## 🎯 `/services` - Business Logic & API Layer

Core services for API calls and state management (moved from lib/).

```
services/
├── api/                        # **API service layer**
│   ├── apiClient.ts            # Fetch wrapper with request/response handling
│   │   - Enhanced error handling
│   │   - Generic error messages (prevents enumeration)
│   │   - Response transformation
│   │
│   ├── userService.ts          # User profile API calls
│   │   - getProfilesByRole(role, pagination, filters)
│   │   - getProfileById(id)
│   │   - Works with useProfiles() hook
│   │   - All endpoints use /api/admin/profiles/* routes
│   │
│   ├── authService.ts          # Auth API calls (mostly legacy)
│   │   - Now handled via Server Actions primarily
│   │
│   └── paginationService.ts    # Pagination utilities
│       - Page calculation, offset handling, types
│
└── stores/                     # **Legacy state management** (mostly removed)
    └── authStore.ts            # Legacy - Mostly deprecated
        - Some UI state remains (not sensitive auth data)
```

---

## 🗂️ `/public` - Static Assets

Public files served directly by Next.js.

```
public/
└── images/                     # **Image assets**
    ├── dashboard-sample.png
    ├── logos/
    ├── icons/
    └── ... (partner logos, screenshots, etc.)
```

## 🌍 `/providers` - Legacy Providers

**Note:** Providers are now in `/components/providers/` (AuthProvider, UserContext, SonnerProvider).

```
providers/
├── AuthProvider.tsx            # (Moved to components/providers/)
├── UserContext.tsx             # (Moved to components/providers/)
└── SonnerProvider.tsx          # (Moved to components/providers/)
```

---

## 💾 `/supabase` - Database Configuration

Supabase-specific files for database management.

```
supabase/
├── config.toml                 # Local Supabase CLI configuration
├── client.ts                   # Client-side Supabase config (browser/anon key)
├── server.ts                   # Server-side Supabase helpers (session & admin clients)
├── index.ts                    # Barrel export for backward compatibility
├── migrations/                 # **Database migrations**
│   ├── 001_initial_schema.sql
│   ├── 002_profiles_table.sql
│   ├── 003_user_roles.sql
│   └── ... (numbered migrations)
│
├── seeders/                    # Database seed scripts
│   └── [seed data files]
│
└── snippets/                   # SQL snippets and examples
```

---

## 🛠️ `/helpers` - Root-Level Helper Functions

Utility functions used across the application.

```
helpers/
├── currency.tsx                # Currency formatting utilities
└── ... (other helpers)
```

---

## 📋 Summary Table

| Category            | Folder                            | Purpose                                       |
| ------------------- | --------------------------------- | --------------------------------------------- |
| **App Routes**      | `/app/*`                          | Next.js App Router pages and layouts          |
| **Components**      | `/components`                     | Reusable React components                     |
| **Config**          | `/config`                         | Central configuration (routes, env, settings) |
| **Hooks**           | `/hooks`                          | Custom React hooks                            |
| **Types**           | `/lib/types`                      | TypeScript type definitions                   |
| **Validation**      | `/lib/validation`, `/lib/schemas` | Input validation & Zod schemas                |
| **Utilities**       | `/lib/utils`                      | Helper functions                              |
| **Services**        | `/services`                       | API layer & state management                  |
| **UI Components**   | `/components/ui`                  | shadcn/ui & Radix elements                    |
| **Auth Components** | `/components/auth`                | Authentication UI components                  |
| **Database**        | `/supabase`                       | Database config & migrations                  |
| **Assets**          | `/public`                         | Static files (images, icons)                  |

---

## 🔄 Key Architectural Patterns

### Centralized Routing

- ✅ All routes defined in `config/routeConfig.ts`
- Used by `proxy.ts` middleware for protection
- Prevents hardcoded route strings throughout app

### Service Layer Pattern

- API calls isolated in `/services/api/`
- State management in `/services/stores/`
- Components don't call API directly
- Single responsibility principle

### Type Safety

- Shared types in `/lib/types/`
- Feature-specific schemas in feature folders
- Database types auto-generated in `/lib/types/database.ts`

### Form Validation

- Zod schemas in `/lib/schemas/`
- Client-side validation with react-hook-form
- Server-side validation in API endpoints

### Admin Feature Structure

- Feature code grouped in `/app/admin/`
- Reusable components in `/app/admin/components/`
- Configuration in `/app/admin/config/`
- Validation schemas in `/app/admin/schemas/`

---

---

## 📖 Related Documentation

- [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) - Authentication details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) - Initial setup guide
