import { StatusRegion } from '@/components/custom/skeletons';

/**
 * Shaped like the page: hero, the warm prerequisites card, then the step spine.
 * Reuses the shared `StatusRegion` so the announcement contract (one sr-only
 * label, decorative blocks `aria-hidden`) is the same as every other skeleton.
 */
export default function Loading() {
  return (
    <StatusRegion>
      <div className="space-y-14">
        <div className="space-y-5 pt-6">
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
          <div className="bg-muted h-12 w-full max-w-2xl animate-pulse rounded-lg" />
          <div className="bg-muted h-4 w-full max-w-md animate-pulse rounded" />
          <div className="bg-muted h-12 w-48 animate-pulse rounded-full" />
        </div>

        <div className="bg-muted h-72 w-full animate-pulse rounded-3xl" />

        <div className="space-y-4">
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="bg-muted h-32 w-full animate-pulse rounded-2xl"
            />
          ))}
        </div>
      </div>
    </StatusRegion>
  );
}
