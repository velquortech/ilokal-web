import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { ROUTES, getDashboardRoute } from '@/config/routeConfig';

/**
 * Protected customer shell. The proxy already gates /customer to app_user;
 * this repeats the check server-side (defense in depth) so a proxy-matcher
 * regression can't expose the pages.
 */
export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect(ROUTES.AUTH.LOGIN);
  if (user.role !== 'app_user') redirect(getDashboardRoute(user.role));

  return (
    <div className="font-giest bg-background flex min-h-screen flex-col">
      <CustomerHeader
        user={{
          id: user.id,
          full_name: user.full_name ?? null,
          avatar_url: user.avatar_url ?? null,
          role: user.role,
        }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
