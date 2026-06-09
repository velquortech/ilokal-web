import { getAdminUserOrRedirect } from '@/lib/api/getCurrentUser';

// This route uses cookies for authentication, must be dynamic
export const dynamic = 'force-dynamic';

/**
 * Thin admin auth wrapper — mirrors `app/business/layout.tsx`.
 * The real shell + dynamic-segment guard live in `[adminId]/layout.tsx`;
 * the index resolver (`page.tsx`) redirects to `/admin/[adminId]`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getAdminUserOrRedirect();
  return <>{children}</>;
}
