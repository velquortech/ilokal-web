import { notFound } from 'next/navigation';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { PublicShell } from '@/components/customer/PublicShell';

/**
 * Public events surface. Same chrome as /explore, and the kill switch is
 * enforced HERE rather than page by page — every route under this segment is
 * gated by one check, so a new page cannot ship reachable by accident.
 */
export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getEventsEnabled())) notFound();

  return <PublicShell>{children}</PublicShell>;
}
