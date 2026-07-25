import { PROTECTED_ROUTES } from '@/config/routeConfig';

// Page-level prefixes middleware should match (static prefixes)
export const PROTECTED_ROUTE_PREFIXES = [
  PROTECTED_ROUTES.ADMIN,
  PROTECTED_ROUTES.BUSINESS,
  PROTECTED_ROUTES.CUSTOMER,
] as const;

export type ProtectedPrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number];

export function isProtectedPath(pathname: string): boolean {
  if (!pathname) return false;
  const trimmed = pathname.split('?')[0];
  return PROTECTED_ROUTE_PREFIXES.some((p) => trimmed.startsWith(p));
}

export function roleAllowedForPath(
  role: string | null | undefined,
  pathname: string,
): boolean {
  if (!isProtectedPath(pathname)) return true;

  const trimmed = pathname.split('?')[0];

  if (trimmed.startsWith(PROTECTED_ROUTES.ADMIN)) return role === 'admin';

  if (trimmed.startsWith(PROTECTED_ROUTES.BUSINESS))
    return role === 'business_owner' || role === 'admin';

  // Customer area is app_user-only: admins and owners have their own portals,
  // and every query inside is auth.uid()-scoped anyway.
  if (trimmed.startsWith(PROTECTED_ROUTES.CUSTOMER)) return role === 'app_user';

  return false;
}

export default {
  PROTECTED_ROUTE_PREFIXES,
  isProtectedPath,
  roleAllowedForPath,
};
