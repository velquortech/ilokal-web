import { Skeleton } from '@/components/ui/skeleton';
import { StatusRegion } from '@/components/custom/skeletons';

/**
 * Customer-portal loading skeletons (public /explore + protected /customer).
 * Same a11y contract as the dashboard set: one sr-only status label, the
 * placeholders themselves aria-hidden (see components/custom/skeletons.tsx).
 */

function BusinessCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function ExploreGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <StatusRegion>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-8 w-44" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-full sm:w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <BusinessCardSkeleton key={i} />
        ))}
      </div>
    </StatusRegion>
  );
}

export function BusinessProfileSkeleton() {
  return (
    <StatusRegion>
      <Skeleton className="h-40 w-full rounded-xl sm:h-56" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </StatusRegion>
  );
}

export function WalletSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <StatusRegion>
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </StatusRegion>
  );
}

export function FollowingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <StatusRegion>
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border p-4"
          >
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </StatusRegion>
  );
}
