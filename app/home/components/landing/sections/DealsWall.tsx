'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routeConfig';
import { categories, dealAvatarColor, filterDeals, type Deal } from '../data';
import { Eyebrow, SectionTitle, Wrap } from '../primitives';
import { EASE } from '../motion';
import { StrokeIcon } from '../icons';

/**
 * The deals wall — a pinboard, not a table.
 *
 * The tilt is deterministic per index so the wall reads as hand-placed;
 * randomising it would read as noise. Cards straighten on hover AND on
 * keyboard focus, so the gesture is not mouse-only.
 */

const TILT = [
  '-rotate-1',
  'rotate-1',
  'rotate-2',
  '-rotate-2',
  'rotate-1',
  '-rotate-1',
];

export function DealsWall() {
  const reduced = useReducedMotion();
  const [category, setCategory] = useState('All');
  // Same reason as the craving spread: motion's `initial` lands in the server
  // HTML, so the first render must not be hidden.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = filterDeals(category);

  return (
    <section id="deals" className="py-20 sm:py-28">
      <Wrap>
        <div className="il-reveal">
          <Eyebrow>Live today</Eyebrow>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <SectionTitle className="max-w-2xl text-[#1A1A1A] dark:text-[#F7F5EF]">
              Skip the chains.
              <br />
              Explore local.
            </SectionTitle>
            <Link
              href={ROUTES.EXPLORE.DEALS}
              className="group inline-flex items-center gap-2 text-base font-semibold text-[#D70005] hover:underline dark:text-[#EF5143]"
            >
              All deals
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Category filter. `aria-pressed` rather than a tablist: these filter a
            grid in place, they do not switch panels. */}
        <div className="mt-10 flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setCategory(c.name)}
              aria-pressed={category === c.name}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:ring-2 focus-visible:ring-[#D70005] focus-visible:ring-offset-2 focus-visible:outline-none',
                category === c.name
                  ? 'bg-[#1A1A1A] text-[#FBFAF6] dark:bg-[#FBFAF6] dark:text-[#1A1A1A]'
                  : 'bg-white/70 text-[#1A1A1A] ring-1 ring-[#1A1A1A]/10 hover:bg-white dark:bg-white/8 dark:text-[#F7F5EF] dark:ring-white/12 dark:hover:bg-white/15',
              )}
            >
              <StrokeIcon size={15} paths={c.icon} />
              {c.name}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((deal, i) => (
              <motion.div
                key={deal.name}
                layout
                initial={
                  mounted && !reduced ? { opacity: 0, scale: 0.96 } : false
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <DealCard deal={deal} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {shown.length === 0 && (
          <p className="mt-10 rounded-2xl border border-dashed border-[#1A1A1A]/20 p-8 text-center text-sm text-[#4A403E] dark:border-white/20 dark:text-[#B8B0A6]">
            Nothing live in {category} right now. Try another category, or
            browse everything on the deals page.
          </p>
        )}
      </Wrap>
    </section>
  );
}

function DealCard({ deal, index }: { deal: Deal; index: number }) {
  return (
    <article
      tabIndex={0}
      className={cn(
        'group flex h-full flex-col justify-between rounded-2xl bg-white/85 p-6 backdrop-blur-sm',
        'shadow-[0_10px_30px_-14px_rgba(60,10,10,.3)] ring-1 ring-[#1A1A1A]/8 outline-none',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:rotate-0 hover:shadow-[0_24px_50px_-18px_rgba(60,10,10,.42)] focus-visible:rotate-0',
        'focus-visible:ring-2 focus-visible:ring-[#D70005]',
        'motion-safe:hover:-translate-y-1.5 motion-safe:focus-visible:-translate-y-1.5',
        'dark:bg-[#272422]/85 dark:ring-white/10',
        TILT[index % TILT.length],
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
          style={{ background: dealAvatarColor(deal.color) }}
        >
          {deal.initials}
        </span>
        <div className="min-w-0">
          <p className="font-display truncate text-lg leading-tight font-bold tracking-tight text-[#1A1A1A] dark:text-[#F7F5EF]">
            {deal.name}
          </p>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#4A403E] uppercase dark:text-[#B8B0A6]">
            {deal.cat}
          </p>
        </div>
        {deal.hot && (
          <span className="ml-auto shrink-0 rounded-full bg-[#FEE87B] px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-[#1A1A1A] uppercase">
            Hot
          </span>
        )}
      </div>

      <p className="font-display mt-5 text-2xl leading-tight font-bold tracking-tight text-[#D70005] dark:text-[#EF5143]">
        {deal.text}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-[#1A1A1A]/10 pt-4 text-xs font-medium text-[#4A403E] dark:border-white/10 dark:text-[#B8B0A6]">
        <span>{deal.expiry}</span>
        {deal.unlock && <span>Follow to unlock</span>}
      </div>
    </article>
  );
}
