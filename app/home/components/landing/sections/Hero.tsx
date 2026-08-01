import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';
import { CravingSwitcher } from '../CravingSwitcher';
import { HeroCollage } from '../HeroCollage';
import { Eyebrow, Wrap } from '../primitives';

/**
 * The thesis, stated in the brand's own words, and then demonstrated.
 *
 * No phone mockup. Every local-discovery landing puts one here, and a phone in
 * a hero asks for an app install — but the button we want pressed is /explore,
 * on the web, now. The deck's mockups are all "a search pill and a result", so
 * the hero IS the search, at page scale.
 */

const HEADLINE = ['The best spots', 'aren’t always', 'on Google.'];

/**
 * One orchestrated entrance, driven by CSS (`.il-rise` in landing.css) rather
 * than motion. Motion's `initial` writes `opacity:0` into the SERVER HTML, so
 * the thesis of the page was invisible until JS hydrated — and stayed invisible
 * if it never did. A keyframe runs on first paint and cannot fail that way,
 * which also lets this whole section be a server component.
 */
const rise = (i: number) => ({ '--i': i }) as React.CSSProperties;

export function Hero() {
  return (
    <section id="top" className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <Wrap className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-10">
        <div>
          <div className="il-rise" style={rise(0)}>
            <Eyebrow>Iloilo City · discover through experience</Eyebrow>
          </div>

          {/* Two ramps on purpose. Below lg the headline owns the full width and
            can scale with the viewport. From lg it shares the row with the
            collage AND the wrap caps at 1200px, so the column stops growing
            while `8.5vw` keeps going — at 1440 that pushed "The best spots"
            onto its own two lines. The lg ramp is sized off the column. */}
          <h1 className="font-display mt-5 text-[clamp(2.75rem,8.5vw,6.75rem)] leading-[0.9] font-bold tracking-[-0.045em] text-[#1A1A1A] lg:text-[clamp(3rem,4.4vw,3.75rem)] dark:text-[#F7F5EF]">
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
            <Link
              href={ROUTES.BUSINESS.registration}
              className="inline-flex items-center rounded-full border border-[#1A1A1A]/15 bg-white/70 px-7 py-4 text-base font-semibold text-[#1A1A1A] backdrop-blur-sm transition-colors hover:border-[#D70005] hover:text-[#D70005] focus-visible:ring-2 focus-visible:ring-[#D70005] focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/15 dark:bg-white/8 dark:text-[#F7F5EF]"
            >
              List your business
            </Link>
          </div>
        </div>

        {/* `hidden lg:block` on the WRAPPER, not just on the collage: below lg
            an always-rendered wrapper is still a grid cell, so it became an
            empty second row and contributed the grid's gap as dead space
            between the CTAs and the search demo. */}
        <div className="il-rise hidden lg:block" style={rise(3)}>
          <HeroCollage />
        </div>
      </Wrap>

      {/* The search demo spans the full width — it is the signature, and
          boxing it into the text column would make it read as a form field. */}
      <Wrap className="il-rise mt-14" style={rise(6)}>
        <CravingSwitcher />
      </Wrap>
    </section>
  );
}
