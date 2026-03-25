import { PROTECTED_ROUTES, ROUTES } from '@/config/routeConfig';

// Page-level prefixes middleware should match (static prefixes)
export const PROTECTED_ROUTE_PREFIXES = [
  PROTECTED_ROUTES.ADMIN,
  PROTECTED_ROUTES.BUSINESS,
  `${PROTECTED_ROUTES.ADMIN}/settings`,
  `${PROTECTED_ROUTES.BUSINESS}/settings`,
] as const;

// API prefixes that should be treated as protected (handler guards required)
export const API_PROTECTED_PREFIXES = [
  ROUTES.API.ADMIN_BASE,
  ROUTES.API.BILLING_BASE,
  ROUTES.API.PAYMENTS_BASE,
  ROUTES.API.SUBSCRIPTIONS_BASE,
  ROUTES.API.USERS_BASE,
];

export type ProtectedPrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number];

export function isProtectedPath(pathname: string): boolean {
  if (!pathname) return false;
  const trimmed = pathname.split('?')[0];

  // Page prefixes
  if (PROTECTED_ROUTE_PREFIXES.some((p) => trimmed.startsWith(p))) return true;

  // API prefixes
  if (API_PROTECTED_PREFIXES.some((p) => trimmed.startsWith(p))) return true;

  return false;
}

export function roleAllowedForPath(
  role: string | null | undefined,
  pathname: string,
): boolean {
  if (!isProtectedPath(pathname)) return true;

  const trimmed = pathname.split('?')[0];

  // Admin pages require admin
  if (trimmed.startsWith(PROTECTED_ROUTES.ADMIN)) return role === 'admin';

  // Business pages allow business_owner and admin
  if (trimmed.startsWith(PROTECTED_ROUTES.BUSINESS))
    return role === 'business_owner' || role === 'admin';

  // API prefixes: require authenticated users by default; handlers should enforce finer-grained checks
  if (API_PROTECTED_PREFIXES.some((p) => trimmed.startsWith(p))) return !!role;

  // Default deny
  return false;
}

export default {
  PROTECTED_ROUTE_PREFIXES,
  API_PROTECTED_PREFIXES,
  isProtectedPath,
  roleAllowedForPath,
};
