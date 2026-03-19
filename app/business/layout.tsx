import { getBusinessUserOrRedirect } from '@/lib/api/getAdminUser';
import { BusinessLayoutClient } from './components/BusinessLayoutClient';

// This route uses cookies for authentication, must be dynamic
export const dynamic = 'force-dynamic';

/**
 * Business Layout - Server Component
 *
 * This layout:
 * - Verifies user is authenticated and is business owner (server-side)
 * - Verifies account is active (not suspended or inactive)
 * - Redirects to auth/home if not authorized
 * - Fetches user data from database (SSR)
 * - Renders interactive UI as client component
 *
 * Benefits:
 * - No client-side auth checks needed (middleware handles this too)
 * - Fresh user data on each page load
 * - Server can fetch business-specific data if needed
 * - Suspended accounts cannot access even with valid session
 */
export default async function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ This will redirect if not authenticated, not business owner, or not active
  const user = await getBusinessUserOrRedirect();

  return <BusinessLayoutClient user={user}>{children}</BusinessLayoutClient>;
}
