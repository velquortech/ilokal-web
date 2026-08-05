'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';
import {
  CravingSearchBar,
  CravingSpread,
  useCravingRotation,
} from '../CravingSwitcher';
import { Eyebrow, Wrap } from '../primitives';

/**
 * The thesis, in the brand's own words, and then demonstrated.
 *
 * No photography. The first pass filled the right column with the identity
 * deck's stock frames — two people laughing on a seamless backdrop, a
 * black-gloved hand holding a phone — and it read as exactly what it was: an
 * agency mockup, not Iloilo. The honest options were a real photograph of a
 * real shop, which nobody has yet, or none at all. So the column carries the
 * live product instead: the same hand of shops the search is finding, dealt
 * out and re-dealt every few seconds as the craving changes.
 *
 * That also makes the hero ONE idea rather than two competing ones. The
 * question sits on the left, the answer on the right, and they are the same
 * machine — see `useCravingRotation`.
 *
 * When real photography of real Ilonggo shops exists, it belongs in this
 * column and the fan moves under the search bar on the left.
 */

const HEADLINE = ['The best spots', 'aren’t always', 'on Google.'];

/**
 * One orchestrated entrance, driven by CSS (`.il-rise` in landing.css) rather
 * than motion. Motion's `initial` writes `opacity:0` into the SERVER HTML, so
 * the thesis of the page was invisible until JS hydrated — and stayed
 * invisible if it never did. A keyframe runs on first paint and cannot fail
 * that way.
 */
const rise = (i: number) => ({ '--i': i }) as React.CSSProperties;

export function Hero() {
  const rotation = useCravingRotation();

  return (
    <section id="top" className="pt-14 pb-20 sm:pt-20 sm:pb-24">
      <Wrap className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)] lg:gap-12">
        <div>
          <div className="il-rise" style={rise(0)}>
            <Eyebrow>Iloilo City · discover through experience</Eyebrow>
          </div>

          {/* Two ramps on purpose. Below lg the headline owns the full width
              and can scale with the viewport. From lg it shares the row AND
              the wrap caps at 1200px, so the column stops growing while
              `8.5vw` keeps going — at 1440 that pushed "The best spots" onto
              its own two lines. The lg ramp is sized off the column. */}
          <h1 className="mt-5 text-[clamp(2.75rem,8.5vw,6.75rem)] leading-[0.9] font-bold tracking-[-0.045em] text-[#1A1A1A] lg:text-[clamp(3rem,4.4vw,3.75rem)] dark:text-[#F7F5EF]">
            {HEADLINE.map((line, i) => (
              <span key={line} className="il-rise block" style={rise(i + 1)}>
                {/* The turn lands on the last line, so it gets the brand red. */}
                <span
                  className={
                    i === 2 ? 'text-[#D70005] dark:text-[#EF5143]' : undefined
                  }
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            style={rise(4)}
            className="il-rise mt-7 max-w-xl text-[1.0625rem] leading-[1.65] text-[#4A403E] dark:text-[#B8B0A6]"
          >
            Verified Ilonggo shops, the deals they’re running today, and a code
            you show at the counter. No delivery fee, because you walk there.
          </p>

          <div className="il-rise mt-8 flex flex-wrap gap-3" style={rise(5)}>
            <Link
              href={ROUTES.EXPLORE.HOME}
              className="group inline-flex items-center gap-2 rounded-full bg-[#D70005] px-7 py-4 text-base font-semibold text-[#FEF8D6] shadow-[0_10px_30px_-10px_rgba(215,0,5,.7)] transition-colors hover:bg-[#A80004] focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Start exploring
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {/* The explainer, not the wizard: `/business` is a protected
                prefix, so this button bounced a logged-out reader to /sign-in
                with nothing explained. */}
            <Link
              href={ROUTES.PUBLIC.FOR_BUSINESS}
              className="inline-flex items-center rounded-full border border-[#1A1A1A]/15 bg-white/70 px-7 py-4 text-base font-semibold text-[#1A1A1A] backdrop-blur-sm transition-colors hover:border-[#D70005] hover:text-[#D70005] focus-visible:ring-2 focus-visible:ring-[#D70005] focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/15 dark:bg-white/8 dark:text-[#F7F5EF]"
            >
              List your business
            </Link>
          </div>

          <CravingSearchBar
            {...rotation}
            className="il-rise mt-10"
            style={rise(6)}
          />
        </div>

        {/* The fan needs height a phone does not have, so below lg the spread
            drops under the bar as a plain row instead. */}
        <div className="il-rise hidden lg:block" style={rise(3)}>
          <CravingSpread {...rotation} layout="fan" />
        </div>
      </Wrap>

      <Wrap className="il-rise mt-10 lg:hidden" style={rise(7)}>
        <CravingSpread {...rotation} layout="row" />
      </Wrap>
    </section>
  );
}
