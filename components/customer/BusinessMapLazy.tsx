'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { PublicBranch } from '@/lib/types';

// Leaflet touches `window` at import time — client-only, no SSR.
const BusinessMap = dynamic(
  () => import('./BusinessMap').then((m) => m.BusinessMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
  },
);

export function BusinessMapLazy({ branches }: { branches: PublicBranch[] }) {
  return <BusinessMap branches={branches} />;
}
