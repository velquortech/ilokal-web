import { cn } from '@/lib/utils';
import type { CardTone, CravingResult } from './data';

/**
 * A shop, as a card you could have pinned to a corkboard.
 *
 * The tilt is deterministic per index, not random — a pinboard is hand-placed,
 * and random rotation reads as noise. It straightens on hover.
 *
 * NOT focusable. These are a fixture spread demonstrating what search finds,
 * with nothing behind them to activate; a `tabIndex={0}` here put three (and
 * nine more on the deals wall) dead stops in the keyboard path whose only
 * effect was to un-tilt a card. When these become real shops they should be
 * links, and the focus stop comes back with a destination attached.
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
  tone = 'base',
  className,
}: {
  result: CravingResult;
  index: number;
  /** `large` is the hero fan, where each card carries the whole column. */
  tone?: 'base' | 'large';
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl',
        tone === 'large' ? 'h-48 p-6' : 'min-h-44 p-5',
        'shadow-[0_10px_30px_-12px_rgba(60,10,10,.35)]',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:rotate-0 hover:shadow-[0_22px_50px_-16px_rgba(60,10,10,.45)]',
        'motion-safe:hover:-translate-y-1.5',
        TILT[index % TILT.length],
        TONE[result.tone],
        className,
      )}
    >
      <div>
        <p
          className={cn(
            'font-display leading-tight font-bold tracking-tight',
            tone === 'large' ? 'text-2xl' : 'text-xl',
          )}
        >
          {result.name}
        </p>
        <p
          className={cn(
            'mt-1 opacity-75',
            tone === 'large' ? 'text-[0.9375rem]' : 'text-sm',
          )}
        >
          {result.note}
        </p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[var(--rule)] pt-3 text-xs font-semibold tracking-[0.14em] uppercase">
        <span>{result.area}</span>
        <span className="tabular-nums opacity-80">{result.walk} walk</span>
      </div>
    </article>
  );
}
