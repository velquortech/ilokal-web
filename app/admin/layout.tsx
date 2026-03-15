import { getAdminUserOrRedirect } from '@/lib/api/getAdminUser';
import { AdminLayoutClient } from '@/app/admin/components/AdminLayoutClient';

/**
 * Admin Layout - Server Component
 *
 * This layout:
 * - Verifies user is authenticated and is admin (server-side)
 * - Redirects to auth/home if not authorized
 * - Fetches user data from database (SSR)
 * - Renders interactive UI as client component
 *
 * Benefits:
 * - No client-side auth checks needed (middleware handles this too)
 * - Fresh user data on each page load
 * - Can add Suspense boundaries for streaming
 * - Server can fetch admin-specific data if needed
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ This will redirect if not authenticated or not admin
  const user = await getAdminUserOrRedirect();

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
