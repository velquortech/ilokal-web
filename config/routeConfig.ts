/**
 * Route Configuration
 *
 * Centralized route definitions for the application.
 * Used throughout the app for redirects, navigation, and route protection.
 */

/**
 * The public marketing landing. Declared once because it wears two hats: it is
 * the landing every public surface links back to (`ROUTES.PUBLIC.LANDING`) and
 * the no-role fallback redirect (`ROUTES.DASHBOARD.HOME`). Same URL — keep them
 * from drifting apart.
 */
const LANDING_PATH = '/home';

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

  // Public marketing surface (anonymous, no auth)
  PUBLIC: {
    LANDING: LANDING_PATH,
    /**
     * How to register, for owners who have not signed up yet.
     *
     * Deliberately NOT under `/business` — that whole prefix is protected
     * (`lib/utils/protectedRoutes.ts`), so a page for logged-out visitors
     * placed there would bounce the only audience it is written for to
     * `/sign-in`. Which is the bug this page exists to fix.
     */
    FOR_BUSINESS: '/for-business',
  },

  // Dashboard/Protected routes by role
  DASHBOARD: {
    ADMIN: '/admin',
    BUSINESS: '/business',
    HOME: LANDING_PATH,
  },

  // Public shop-discovery surface (customer-facing, anon-readable)
  EXPLORE: {
    HOME: '/explore',
    NEARBY: '/explore/nearby',
    DEALS: '/explore/deals',
  },

  // Public events surface. Plural collection + camelCase segment, matching
  // /explore/[businessId]; `/event/:id` redirects here (next.config.ts).
  EVENTS: {
    HOME: '/events',
    NEARBY: '/events/nearby',
  },

  // Protected customer (role app_user) area
  CUSTOMER: {
    HOME: '/customer',
    WALLET: '/customer/wallet',
    FOLLOWING: '/customer/following',
    BOOKINGS: '/customer/bookings',
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
 * Section anchors rendered by the landing page (`app/home/components/landing`).
 *
 * Keep this in lockstep with the `id`s the sections actually render — it is the
 * only thing stopping a cross-surface link from pointing at a section that was
 * renamed or deleted, which is exactly what happened to `/explore` when the
 * landing was redesigned.
 */
export type LandingSection =
  | 'top'
  | 'near-you'
  | 'deals'
  | 'voices'
  | 'businesses';

/**
 * Link to a section of the landing page from anywhere.
 *
 * Always absolute. A bare `#about` only works while already on the landing —
 * from /explore it silently scrolls nowhere, so every cross-surface anchor must
 * go through this helper.
 */
export function landingSectionPath(section: LandingSection): string {
  return `${ROUTES.PUBLIC.LANDING}#${section}`;
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

/**
 * Marks the one arrival we can PROVE is the post-registration landing.
 *
 * Only the registration success dialog appends it, and the dashboard strips it
 * with `router.replace` once consumed — so a refresh, a bookmark or a shared
 * link cannot replay the welcome. Deliberately not derived from
 * `businesses.created_at`: that is a heuristic with a clock in it, and a slow
 * first login or a re-registration both misfire.
 *
 * It must be appended to `businessPath(id)` directly, NOT to `/business` — the
 * resolver at `app/business/page.tsx` answers with `redirect(businessPath(id))`,
 * which drops every search param.
 */
export const ONBOARDING_WELCOME_PARAM = 'welcome';

/** The post-registration destination: the owner's dashboard, flagged once. */
export function businessWelcomePath(businessId: string): string {
  return `${businessPath(businessId)}?${ONBOARDING_WELCOME_PARAM}=1`;
}

/**
 * The same dashboard URL with the welcome marker dropped and every other param
 * kept — a branch selection must survive, or consuming the marker would
 * silently kick the owner back to all-branches mode.
 */
export function businessPathWithoutWelcome(
  businessId: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === ONBOARDING_WELCOME_PARAM || value === undefined) continue;
    if (Array.isArray(value))
      value.forEach((entry) => params.append(key, entry));
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${businessPath(businessId)}?${qs}` : businessPath(businessId);
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

/** A shop's own event proposals. */
export function businessEventsPath(businessId: string): string {
  return businessPath(businessId, 'events');
}

/** The public page for one event. */
export function eventPath(eventId: string): string {
  return [ROUTES.EVENTS.HOME, eventId].join('/');
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

/** The admin event-review queue. */
export function adminEventsPath(adminId: string): string {
  return adminPath(adminId, 'events');
}

export function adminBranchesPath(adminId: string): string {
  return adminPath(adminId, 'branches');
}

export function adminAccountStatusPath(adminId: string): string {
  return adminPath(adminId, 'account-status');
}
