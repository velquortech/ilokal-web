import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { resolvePublicAvatarUrl } from '@/lib/api/customer/customerQuery';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';

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
  // Real registrations store raw in-bucket avatar paths — resolve before
  // handing to next/image.
  const avatarUrl = user ? await resolvePublicAvatarUrl(user.avatar_url) : null;

  return (
    <div className="font-giest bg-background flex min-h-screen flex-col">
      <CustomerHeader
        user={
          user
            ? {
                id: user.id,
                full_name: user.full_name ?? null,
                avatar_url: avatarUrl,
                role: user.role,
              }
            : null
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      {/* `flex-1` on <main> pins this to the viewport bottom on short pages
          (e.g. an empty search result). */}
      <CustomerFooter />
    </div>
  );
}
