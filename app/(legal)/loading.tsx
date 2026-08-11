import { StatusRegion } from '@/components/custom/skeletons';

/**
 * Shaped like a legal document: title, "last updated" line, intro, then a run
 * of heading + paragraph blocks.
 *
 * The pages themselves are static — this fills the content column only while
 * the shared shell's session lookup resolves, which is the whole reason the
 * chrome lives in a layout.
 *
 * Reuses `StatusRegion` so the announcement contract (one sr-only label,
 * decorative blocks `aria-hidden`) matches every other skeleton in the app.
 */
export default function Loading() {
  return (
    <StatusRegion>
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-3">
          <div className="bg-muted h-10 w-72 max-w-full animate-pulse rounded-lg" />
          <div className="bg-muted h-3 w-44 animate-pulse rounded" />
        </div>

        <div className="space-y-2">
          <div className="bg-muted h-4 w-full animate-pulse rounded" />
          <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
        </div>

        <div className="space-y-8">
          {[0, 1, 2, 3, 4].map((section) => (
            <div key={section} className="space-y-3">
              <div className="bg-muted h-6 w-56 max-w-full animate-pulse rounded" />
              <div className="bg-muted h-4 w-full animate-pulse rounded" />
              <div className="bg-muted h-4 w-11/12 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </StatusRegion>
  );
}
