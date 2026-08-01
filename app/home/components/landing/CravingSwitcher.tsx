'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from './motion';
import { cravings } from './data';
import { ShopCard } from './ShopCard';

/**
 * The page's signature: search, demonstrated rather than described.
 *
 * The pill types out a real Iloilo craving and the spread beneath re-deals,
 * like laying a new hand on a table. Clicking a craving chip jumps straight to
 * it and stops the carousel — once someone has taken control, a page that keeps
 * moving on its own is fighting them.
 *
 * The type-out steps whole characters through React state rather than
 * animating a CSS width, so it reflows correctly at any font size and the
 * caret never lands mid-glyph.
 */
/**
 * `mounted` gates the enter animation to *switches*, never the first render.
 * Motion writes `initial` into the server HTML, so hiding the first hand meant
 * shipping `opacity:0` for the page's signature — invisible with JS blocked or
 * slow. The first hand is already brought in by the hero's own CSS entrance.
 */

const TYPE_MS = 65;
const HOLD_MS = 2600;

export function CravingSwitcher() {
  const reduced = useReducedMotion();
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

  return (
    <div className="w-full">
      {/* The pill. `aria-live` is off: this is a decorative demo, and
          announcing every keystroke would make the page unusable with AT. */}
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
        <p className="font-display min-w-0 flex-1 truncate text-lg font-medium sm:text-2xl">
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

      {/* Craving chips — the manual control for the carousel. */}
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

      {/* The spread. Keyed on the query so the whole hand swaps at once. */}
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {craving.results.map((result, i) => (
            <motion.div
              key={`${craving.query}-${result.name}`}
              layout
              initial={mounted && !reduced ? { opacity: 0, y: 26 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -14 }}
              transition={{
                duration: 0.42,
                delay: reduced ? 0 : i * 0.07,
                ease: EASE,
              }}
            >
              <ShopCard result={result} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
