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
    <div aria-busy="true" className={cn('flex flex-1 flex-col', className)}>
      {/* The live region announces only the label — the placeholders below are
          decorative, so assistive tech skips them instead of traversing dozens
          of empty boxes. `aria-busy` stays on the CONTAINER: on the live region
          itself it tells AT to defer the very announcement this exists to make,
          and it never flips to false (the node unmounts when loading ends). */}
      <div role="status" className="sr-only">
        Loading…
      </div>
      {/* The layout classes live HERE, not on the parent: Tailwind v4 compiles
          `space-y-*` to `:where(& > :not(:last-child))`, which only matches DOM
          direct children — so spacing declared on the parent would never reach
          the blocks inside this wrapper. */}
      <div aria-hidden="true" className="flex flex-1 flex-col space-y-6">
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

/** A bordered card of stacked label + input placeholders. */
function FormCardSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-5 rounded-xl border p-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

/** Header + one narrow stacked form — for single-form routes. */
export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <StatusRegion>
      <PageHeaderSkeleton action={false} />
      <div className="max-w-2xl">
        <FormCardSkeleton fields={fields} />
      </div>
    </StatusRegion>
  );
}

/**
 * Header + two-column forms with a side card — matches the profile route
 * (`lg:grid-cols-3`, forms spanning two columns, status card in the third).
 * Carries the page's own `p-6` so the fallback→content swap doesn't shift.
 */
export function ProfilePageSkeleton() {
  return (
    <StatusRegion className="gap-6 p-6">
      <PageHeaderSkeleton action={false} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <FormCardSkeleton fields={4} />
          <FormCardSkeleton fields={3} />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </StatusRegion>
  );
}

/**
 * Header + tab strip + full-width panel — for tabbed routes (business settings).
 * Full width on purpose: `FormPageSkeleton`'s `max-w-2xl` mismatches a Tabs
 * surface in both width and structure.
 */
export function TabsPageSkeleton({ tabs = 4 }: { tabs?: number }) {
  return (
    <StatusRegion className="gap-6 p-6">
      <PageHeaderSkeleton action={false} />
      <div className="flex items-center gap-6 border-b pb-3">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      <FormCardSkeleton fields={4} />
    </StatusRegion>
  );
}

/**
 * Full-bleed banner + spaced content sections — for the public-facing shop
 * route, which has no page header and is not a form.
 */
export function ShopPageSkeleton() {
  return (
    <StatusRegion className="pb-8">
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="mt-8 flex flex-1 flex-col space-y-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </StatusRegion>
  );
}
