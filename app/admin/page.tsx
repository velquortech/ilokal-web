import { redirect } from 'next/navigation';
import { getAdminUserOrRedirect } from '@/lib/api/getCurrentUser';
import { adminPath } from '@/config/routeConfig';

export const dynamic = 'force-dynamic';

/**
 * Admin index resolver — mirrors `app/business/page.tsx`.
 * Resolves the authenticated admin and redirects to their `/admin/[adminId]`
 * space. `getAdminUserOrRedirect` already handles the unauthenticated /
 * non-admin cases.
 */
export default async function AdminIndexPage() {
  const user = await getAdminUserOrRedirect();
  redirect(adminPath(user.id));
}
