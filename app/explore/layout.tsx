import { PublicShell } from '@/components/customer/PublicShell';

/**
 * Public shop-discovery shell. The chrome itself lives in `PublicShell`,
 * shared with /events — see that file for why.
 */
export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
