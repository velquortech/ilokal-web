import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Shared dashboard loading skeletons (business + admin). Rendered by route-level
 * `loading.tsx` files inside the padded content area; the sidebar + header
 * persist. Each top-level skeleton is a `role="status"` region for a11y.
 */

function StatusRegion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      className={cn('flex flex-1 flex-col space-y-6', className)}
    >
      {/* The live region announces only the label — the placeholders below are
          decorative, so assistive tech skips them instead of traversing dozens
          of empty boxes. */}
      <div role="status" className="sr-only">
        Loading…
      </div>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      {action && <Skeleton className="h-9 w-32" />}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      {/* header row */}
      <div className="bg-muted/40 flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b px-4 py-4 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Header + search/filter toolbar + table — for list/table routes. */
export function TablePageSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <StatusRegion>
      <PageHeaderSkeleton />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      <TableSkeleton rows={rows} cols={cols} />
    </StatusRegion>
  );
}

/** Header + stat cards + two content blocks — for dashboard routes. */
export function DashboardSkeleton() {
  return (
    <StatusRegion>
      <PageHeaderSkeleton action={false} />
      <StatCardsSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </StatusRegion>
  );
}

/** Header + stacked form fields — for form/settings routes. */
export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <StatusRegion>
      <PageHeaderSkeleton action={false} />
      <div className="max-w-2xl space-y-5 rounded-xl border p-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </StatusRegion>
  );
}
