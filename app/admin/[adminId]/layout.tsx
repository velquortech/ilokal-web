import { redirect } from 'next/navigation';
import { getAdminUserOrRedirect } from '@/lib/api/getCurrentUser';
import { adminPath } from '@/config/routeConfig';
import { AdminProvider } from '@/providers/AdminProvider';
import AdminLayout from './components/AdminLayout';

// This route uses cookies for authentication, must be dynamic
export const dynamic = 'force-dynamic';

type Params = Promise<{ adminId: string }>;

/**
 * Admin [adminId] Layout — Server Component
 *
 * Mirrors the business `[businessId]` layout:
 * - Verifies the user is authenticated and an admin (server-side)
 * - Guards the dynamic segment: a mismatched `adminId` is redirected to the
 *   caller's own admin space (defense against tampering with the URL)
 * - Renders the interactive shell as a client component
 */
export default async function AdminIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { adminId } = await params;

  // ✅ Redirects if not authenticated or not admin
  const user = await getAdminUserOrRedirect();

  // The segment must match the authenticated admin's own id
  if (adminId !== user.id) redirect(adminPath(user.id));

  return (
    <AdminProvider adminId={user.id}>
      <AdminLayout user={user}>{children}</AdminLayout>
    </AdminProvider>
  );
}
