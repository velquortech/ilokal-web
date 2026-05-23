import { getBusinessUserOrRedirect } from '@/lib/api/getCurrentUser';

export const dynamic = 'force-dynamic';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getBusinessUserOrRedirect();
  return <>{children}</>;
}
