import { cn } from '@/lib/utils';
import type { CardTone, CravingResult } from './data';

/**
 * A shop, as a card you could have pinned to a corkboard.
 *
 * The tilt is deterministic per index, not random — a pinboard is hand-placed,
 * and random rotation reads as noise. Hover and keyboard focus both straighten
 * it, so the "picking one up" gesture is not mouse-only.
 */

const TONE: Record<CardTone, string> = {
  brick: 'bg-[#D70005] text-[#FEF8D6] [--rule:rgba(254,248,214,.28)]',
  jasmine: 'bg-[#FEE87B] text-[#1A1A1A] [--rule:rgba(26,26,26,.16)]',
  petal: 'bg-[#FCD9F7] text-[#1A1A1A] [--rule:rgba(26,26,26,.16)]',
  cornsilk: 'bg-[#FEF8D6] text-[#1A1A1A] [--rule:rgba(26,26,26,.14)]',
};

/** −2°, +1.2°, −0.8°, +2° … repeating. Hand-placed, not shuffled. */
const TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

export function ShopCard({
  result,
  index,
  className,
}: {
  result: CravingResult;
  index: number;
  className?: string;
}) {
  return (
    <article
      tabIndex={0}
      className={cn(
        'group relative flex min-h-44 flex-col justify-between rounded-2xl p-5',
        'shadow-[0_10px_30px_-12px_rgba(60,10,10,.35)] outline-none',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:rotate-0 hover:shadow-[0_22px_50px_-16px_rgba(60,10,10,.45)] focus-visible:rotate-0',
        'focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2',
        'motion-safe:hover:-translate-y-1.5 motion-safe:focus-visible:-translate-y-1.5',
        TILT[index % TILT.length],
        TONE[result.tone],
        className,
      )}
    >
      <div>
        <p className="font-display text-xl leading-tight font-bold tracking-tight">
          {result.name}
        </p>
        <p className="mt-1 text-sm opacity-75">{result.note}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[var(--rule)] pt-3 text-xs font-semibold tracking-[0.14em] uppercase">
        <span>{result.area}</span>
        <span className="tabular-nums opacity-80">{result.walk} walk</span>
      </div>
    </article>
  );
}
