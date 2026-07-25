/**
 * Route Configuration
 *
 * Centralized route definitions for the application.
 * Used throughout the app for redirects, navigation, and route protection.
 */

export const ROUTES = {
  // Authentication routes
  AUTH: {
    // Unified sign-in door (customer + business, role-routed after auth).
    // Admin keeps its own gated door under the same segment. The legacy
    // /login* URLs 307-redirect here (next.config.ts).
    SIGN_IN: '/sign-in',
    ADMIN_SIGN_IN: '/sign-in/admin',
    SIGNUP: '/signup',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },

  // Dashboard/Protected routes by role
  DASHBOARD: {
    ADMIN: '/admin',
    BUSINESS: '/business',
    HOME: '/home',
  },

  // Public shop-discovery surface (customer-facing, anon-readable)
  EXPLORE: {
    HOME: '/explore',
    NEARBY: '/explore/nearby',
    DEALS: '/explore/deals',
  },

  // Protected customer (role app_user) area
  CUSTOMER: {
    HOME: '/customer',
    WALLET: '/customer/wallet',
    FOLLOWING: '/customer/following',
  },

  // API routes
  API: {
    ADMIN: {
      PROFILES: '/api/admin/profiles',
    },
    AUTH: {
      LOGIN: '/api/auth/login',
      SIGNUP: '/api/auth/signup',
      LOGOUT: '/api/auth/logout',
      RESET_PASSWORD: '/api/auth/reset-password',
    },
    UPLOAD: '/api/upload',
    ADMIN_BASE: '/api/admin',
  },
  BUSINESS: {
    home: '/business',
    registration: '/business/registration',
  },
} as const;

/**
 * Protected routes that require authentication
 * Used by middleware to determine which routes need auth verification
 */
export const PROTECTED_ROUTES = {
  ADMIN: '/admin',
  BUSINESS: '/business',
  CUSTOMER: '/customer',
};

/**
 * Role-based route mapping
 * Determines which dashboard route each role is redirected to after login
 */
export const ROLE_ROUTES = {
  admin: ROUTES.DASHBOARD.ADMIN,
  business_owner: ROUTES.DASHBOARD.BUSINESS,
  app_user: ROUTES.EXPLORE.HOME,
} as const;

/**
 * Get the dashboard route for a given role
 * @param role - User role (admin, business_owner, app_user)
 * @returns The corresponding dashboard route
 */
export function getDashboardRoute(role?: string): string {
  if (!role) return ROUTES.DASHBOARD.HOME;
  return ROLE_ROUTES[role as keyof typeof ROLE_ROUTES] ?? ROUTES.DASHBOARD.HOME;
}

/**
 * Pick the sign-in page matching the portal a pathname belongs to.
 *
 * Used by logout flows. Admin pages keep their own gated door; everyone else
 * (business, customer, public) uses the unified /sign-in, which role-routes
 * after auth.
 */
export function loginPathForPathname(pathname?: string | null): string {
  if (pathname?.startsWith(ROUTES.DASHBOARD.ADMIN))
    return ROUTES.AUTH.ADMIN_SIGN_IN;
  return ROUTES.AUTH.SIGN_IN;
}

/**
 * Build the public business profile path under /explore.
 */
export function explorePath(businessId: string): string {
  return ['/explore', businessId].join('/');
}

/**
 * Build any path under /business/[businessId].
 * Pass additional segments as rest args, e.g. businessPath(id, 'shop').
 */
export function businessPath(
  businessId: string,
  ...segments: string[]
): string {
  return ['/business', businessId, ...segments].filter(Boolean).join('/');
}

export function businessShopPath(businessId: string): string {
  return businessPath(businessId, 'shop');
}

export function businessProductCataloguesPath(businessId: string): string {
  return businessPath(businessId, 'product-catalogues');
}

export function businessCouponsPath(businessId: string): string {
  return businessPath(businessId, 'coupons');
}

export function businessRedeemedCouponsPath(businessId: string): string {
  return businessPath(businessId, 'redeemed-coupons');
}

export function businessBranchesPath(businessId: string): string {
  return businessPath(businessId, 'branches');
}

export function businessBranchesCreatePath(businessId: string): string {
  return businessPath(businessId, 'branches', 'create');
}

export function businessBranchPath(
  businessId: string,
  branchId: string,
): string {
  return businessPath(businessId, 'branches', branchId);
}

export function businessProfilePath(businessId: string): string {
  return businessPath(businessId, 'profile');
}

export function businessSettingsPath(businessId: string): string {
  return businessPath(businessId, 'settings');
}

/**
 * Build any path under /admin/[adminId].
 * Pass additional segments as rest args, e.g. adminPath(id, 'users').
 */
export function adminPath(adminId: string, ...segments: string[]): string {
  return ['/admin', adminId, ...segments].filter(Boolean).join('/');
}

export function adminUsersPath(adminId: string): string {
  return adminPath(adminId, 'users');
}

export function adminBranchesPath(adminId: string): string {
  return adminPath(adminId, 'branches');
}

export function adminAccountStatusPath(adminId: string): string {
  return adminPath(adminId, 'account-status');
}
