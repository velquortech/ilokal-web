import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';
import { bizPoints, bizSteps } from '../data';
import { Eyebrow, Lede, SectionTitle, Wrap } from '../primitives';

/**
 * The owner's block — one section, not a mirror of the shopper's.
 *
 * This is the only place on the page that numbers anything, and it earns it:
 * register → verify → post is a real sequence where the order is information
 * the reader needs. The old page ran a second numbered 3-step for shoppers,
 * where the "steps" were just a description of the product.
 */
export function ForBusiness() {
  return (
    <section id="businesses" className="py-20 sm:py-28">
      <Wrap>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="il-reveal">
              <Eyebrow>For businesses</Eyebrow>
              <SectionTitle className="mt-5 text-[#1A1A1A] dark:text-[#F7F5EF]">
                Local businesses deserve the spotlight.
              </SectionTitle>
              <Lede className="mt-6 max-w-md">
                Get seen by locals, tourists, and food explorers nearby. Post
                what you have, run a deal when it’s quiet, and see who actually
                walked in.
              </Lede>
            </div>

            <ul className="il-reveal-stagger mt-9 space-y-3.5">
              {bizPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-[0.9375rem] leading-snug text-[#1A1A1A] dark:text-[#F7F5EF]"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#D70005] text-[#FEF8D6]"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="il-reveal mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={ROUTES.PUBLIC.FOR_BUSINESS}
                className="group inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-4 text-base font-semibold text-[#FBFAF6] transition-colors hover:bg-[#D70005] focus-visible:ring-2 focus-visible:ring-[#D70005] focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-[#FBFAF6] dark:text-[#1A1A1A] dark:hover:bg-[#FEE87B]"
              >
                List your business
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {/* This block answers "should I?"; the page answers "how?" —
                  and unlike the wizard it is readable without an account. */}
              <Link
                href={ROUTES.PUBLIC.FOR_BUSINESS}
                className="text-[0.9375rem] font-semibold text-[#1A1A1A] underline underline-offset-4 hover:text-[#D70005] focus-visible:ring-2 focus-visible:ring-[#D70005] focus-visible:outline-none dark:text-[#F7F5EF] dark:hover:text-[#FEE87B]"
              >
                What you&rsquo;ll need
              </Link>
            </div>
          </div>

          {/* The one honest sequence on the page. */}
          <ol className="il-reveal-stagger space-y-4">
            {bizSteps.map((step, i) => (
              <li
                key={step.num}
                className="flex gap-5 rounded-2xl bg-white/80 p-6 ring-1 ring-[#1A1A1A]/8 backdrop-blur-sm dark:bg-[#272422]/80 dark:ring-white/10"
              >
                <span
                  aria-hidden
                  className="font-display text-4xl leading-none font-bold text-[#D70005]/35 tabular-nums dark:text-[#EF5143]/40"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block text-xs font-semibold tracking-[0.18em] text-[#D70005] uppercase dark:text-[#EF5143]">
                    {step.num}
                  </span>
                  <span className="mt-1.5 block text-[0.9375rem] leading-snug text-[#1A1A1A] dark:text-[#F7F5EF]">
                    {step.text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Wrap>
    </section>
  );
}
