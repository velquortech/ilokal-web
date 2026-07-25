import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { CustomerHeader } from '@/components/customer/CustomerHeader';

/**
 * Public shop-discovery shell. No auth gate — anonymous visitors browse
 * through the anon RLS policies; the header adapts to the session.
 */
export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="font-giest bg-background flex min-h-screen flex-col">
      <CustomerHeader
        user={
          user
            ? {
                id: user.id,
                full_name: user.full_name ?? null,
                avatar_url: user.avatar_url ?? null,
                role: user.role,
              }
            : null
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
