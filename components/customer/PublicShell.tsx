import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { resolvePublicAvatarUrl } from '@/lib/api/customer/customerQuery';
import { getBookingsEnabled, getEventsEnabled } from '@/lib/api/appSettings';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';

/**
 * Chrome for every public discovery surface — /explore and /events.
 *
 * Extracted when the second surface appeared: both need the same session
 * lookup, the same avatar resolution, the same feature flags and the same
 * header/footer, and two copies of that is two places for the nav to drift.
 *
 * Server component. No auth gate — anonymous visitors read through the anon
 * RLS policies; the header adapts to whatever session exists.
 */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Real registrations store raw in-bucket avatar paths — resolve before
  // handing to next/image.
  const [avatarUrl, bookingsEnabled, eventsEnabled] = await Promise.all([
    user ? resolvePublicAvatarUrl(user.avatar_url) : null,
    getBookingsEnabled(),
    getEventsEnabled(),
  ]);

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
        flags={{
          enable_bookings: bookingsEnabled,
          enable_events: eventsEnabled,
        }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      {/* `flex-1` on <main> pins this to the viewport bottom on short pages
          (e.g. an empty search result). */}
      <CustomerFooter flags={{ enable_events: eventsEnabled }} />
    </div>
  );
}
