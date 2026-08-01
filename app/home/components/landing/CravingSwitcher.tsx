'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cravings, type Craving } from './data';
import { ShopCard } from './ShopCard';
import { EASE } from './motion';

/**
 * The page's signature: search, demonstrated rather than described.
 *
 * The bar types out a real Iloilo craving and the spread re-deals, like laying
 * a new hand on a table. Clicking a chip jumps straight to it and stops the
 * rotation — once someone has taken control, a page that keeps moving on its
 * own is fighting them.
 *
 * The type-out steps whole characters through React state rather than
 * animating a CSS width, so it reflows correctly at any font size and the
 * caret never lands mid-glyph.
 *
 * Split into a hook plus two views because the hero puts the query on one side
 * of the fold and the answer on the other, and they have to stay one machine.
 */

const TYPE_MS = 65;
const HOLD_MS = 2600;

export type CravingRotation = {
  craving: Craving;
  index: number;
  typed: string;
  pick: (next: number) => void;
  /**
   * True only after mount. Motion writes `initial` into the SERVER HTML, so
   * hiding the first hand would ship `opacity:0` for the page's signature —
   * invisible with JS blocked or slow. The first hand is already brought in by
   * the hero's CSS entrance; only switches animate.
   */
  mounted: boolean;
  reduced: boolean;
};

export function useCravingRotation(): CravingRotation {
  const reduced = !!useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(reduced ? cravings[0].query : '');
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const craving = cravings[index];

  useEffect(() => setMounted(true), []);

  const pick = useCallback((next: number) => {
    setPaused(true);
    setIndex(next);
  }, []);

  // Type the current query out one character at a time.
  useEffect(() => {
    if (reduced) {
      setTyped(craving.query);
      return;
    }
    setTyped('');
    let char = 0;
    const id = setInterval(() => {
      char += 1;
      setTyped(craving.query.slice(0, char));
      if (char >= craving.query.length) clearInterval(id);
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [craving.query, reduced]);

  // Advance once the current query has been readable for a beat.
  const advance = useRef(() => {});
  advance.current = () => setIndex((i) => (i + 1) % cravings.length);
  useEffect(() => {
    if (reduced || paused) return;
    const dwell = craving.query.length * TYPE_MS + HOLD_MS;
    const id = setTimeout(() => advance.current(), dwell);
    return () => clearTimeout(id);
  }, [craving.query, reduced, paused]);

  return { craving, index, typed, pick, mounted, reduced };
}

/** The bar and the craving chips — the question half. */
export function CravingSearchBar({
  craving,
  index,
  typed,
  pick,
  reduced,
  className,
  style,
}: CravingRotation & { className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={style}>
      {/* No `aria-live`: this is a demo, and announcing every keystroke would
          make the page unusable with a screen reader. */}
      <div
        className={cn(
          'flex items-center gap-3 rounded-full bg-white/85 py-4 pr-4 pl-5 backdrop-blur-md',
          'shadow-[0_16px_44px_-18px_rgba(60,10,10,.5)] ring-1 ring-[#1A1A1A]/8',
          'dark:bg-[#272422]/85 dark:ring-white/12',
        )}
      >
        <Search
          className="size-5 shrink-0 text-[#D70005] dark:text-[#DD2920]"
          aria-hidden
        />
        <p className="font-display min-w-0 flex-1 truncate text-lg font-medium sm:text-xl">
          <span className="text-[#1A1A1A] dark:text-[#F7F5EF]">{typed}</span>
          {!reduced && (
            <motion.span
              aria-hidden
              className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[0.13em] rounded-full bg-[#D70005] dark:bg-[#DD2920]"
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                times: [0, 0.5, 0.5, 1],
              }}
            />
          )}
          <span className="sr-only">
            Example search on iLokal: {craving.query}
          </span>
        </p>
        <span className="hidden shrink-0 rounded-full bg-[#D70005] px-4 py-2 text-sm font-semibold text-[#FEF8D6] sm:inline-block">
          Near me
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {cravings.map((c, i) => (
          <button
            key={c.query}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={i === index}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:ring-2 focus-visible:ring-[#D70005] focus-visible:ring-offset-2 focus-visible:outline-none',
              i === index
                ? 'bg-[#1A1A1A] text-[#FBFAF6] dark:bg-[#FBFAF6] dark:text-[#1A1A1A]'
                : 'bg-white/70 text-[#1A1A1A] hover:bg-white dark:bg-white/10 dark:text-[#F7F5EF] dark:hover:bg-white/20',
            )}
          >
            {c.query}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The spread — the answer half.
 *
 * `fan` stacks the three overlapping and hand-tilted, the way you would drop
 * cards on a table; `row` lays them side by side. The hero uses the fan beside
 * the headline from lg and the row underneath below it, because a fan needs
 * height a phone does not have.
 */
export function CravingSpread({
  craving,
  mounted,
  reduced,
  layout = 'row',
  className,
}: CravingRotation & { layout?: 'row' | 'fan'; className?: string }) {
  const fan = layout === 'fan';

  return (
    <div
      className={cn(
        fan ? 'relative h-[34rem]' : 'grid grid-cols-1 gap-4 sm:grid-cols-3',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {craving.results.map((result, i) => (
          <motion.div
            key={`${craving.query}-${result.name}`}
            layout={!fan}
            initial={mounted && !reduced ? { opacity: 0, y: 26 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -14 }}
            transition={{
              duration: 0.42,
              delay: reduced ? 0 : i * 0.08,
              ease: EASE,
            }}
            className={fan ? FAN[i] : undefined}
          >
            <ShopCard result={result} index={i} tone={fan ? 'large' : 'base'} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hand-placed, not generated.
 *
 * The step is 11rem against a 12rem card, so each card covers only the last
 * 1rem of the one behind it. Anything tighter ate the district and the walk
 * time — the two facts that make the spread worth reading rather than
 * decoration. Steps are fixed rem, not percentages, because a percentage of
 * the container does not track the card's own height.
 */
const FAN = [
  'absolute top-0 left-0 z-10 w-[78%]',
  'absolute top-[11rem] left-[12%] z-20 w-[78%]',
  'absolute top-[22rem] left-[24%] z-30 w-[78%]',
] as const;
