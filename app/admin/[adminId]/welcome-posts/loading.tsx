import { Skeleton } from '@/components/ui/skeleton';

/**
 * A rail plus a preview — the page's actual shape.
 *
 * `FormPageSkeleton` was the wrong answer here: there is no form on this page,
 * and a skeleton that promises stacked field cards and then paints a two-column
 * composer is the mismatch the shop/settings/profile skeletons were split out
 * to fix.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div
        role="status"
        aria-label="Loading the welcome post composer"
        className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]"
      >
        <div className="space-y-6" aria-hidden>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>

        <div className="space-y-4" aria-hidden>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="mx-auto aspect-square w-full max-w-125 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
