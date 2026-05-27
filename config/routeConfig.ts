/**
 * Route Configuration
 *
 * Centralized route definitions for the application.
 * Used throughout the app for redirects, navigation, and route protection.
 */

export const ROUTES = {
  // Authentication routes
  AUTH: {
    LOGIN: '/login',
    ADMIN_LOGIN: '/login/admin',
    BUSINESS_LOGIN: '/login/business',
    SIGNUP: '/signup',
  },

  // Dashboard/Protected routes by role
  DASHBOARD: {
    ADMIN: '/admin',
    BUSINESS: '/business',
    HOME: '/home',
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
};

/**
 * Role-based route mapping
 * Determines which dashboard route each role is redirected to after login
 */
export const ROLE_ROUTES = {
  admin: ROUTES.DASHBOARD.ADMIN,
  business_owner: ROUTES.DASHBOARD.BUSINESS,
  app_user: ROUTES.DASHBOARD.HOME,
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
