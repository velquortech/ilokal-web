import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';
import Image from 'next/image';
import { Wrap } from '../primitives';

/**
 * Last beat: the wordmark at full volume on a Brick Ember field, which is the
 * identity's own primary lockup, and one thing to do.
 *
 * The Jasmine cut of the wordmark on Brick Ember measures 4.38:1 — under AA for
 * body copy, fine for large display type, which is exactly what this is.
 */
export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[#D70005] py-24 text-center sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/2 left-1/2 -z-10 h-[80vh] w-[90vw] -translate-x-1/2 rounded-full opacity-25 [background:radial-gradient(circle,#FCD9F7,transparent_62%)]"
      />
      <Wrap>
        <div className="il-reveal">
          <div className="flex justify-center text-[7rem] sm:text-[11rem]">
            {/* Jasmine on Brick Ember is the deck's own primary lockup.
                It measures 4.38:1 — under AA for body copy, fine for display
                type, which at 7–11rem this certainly is. */}
            <Image
              src="/brand/wordmark/ilokal-wordmark-jasmine.png"
              alt="iLokal"
              width={1128}
              height={244}
              priority
              className="h-[0.34em] w-auto max-w-full"
            />
          </div>
          <p className="font-display mx-auto mt-10 max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] font-bold tracking-[-0.03em] text-[#FEE87B]">
            Less searching. More eating.
          </p>
          <p className="mx-auto mt-5 max-w-md text-[1.0625rem] leading-[1.6] text-[#FEF8D6]/80">
            Free to browse, free to claim. Start with whatever’s closest.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href={ROUTES.EXPLORE.HOME}
              className="group inline-flex items-center gap-2 rounded-full bg-[#FEF8D6] px-8 py-4 text-base font-semibold text-[#1A1A1A] transition-colors hover:bg-[#FEE87B] focus-visible:ring-2 focus-visible:ring-[#FEF8D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#D70005] focus-visible:outline-none"
            >
              Explore shops
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={ROUTES.BUSINESS.registration}
              className="inline-flex items-center rounded-full border border-[#FEF8D6]/45 px-8 py-4 text-base font-semibold text-[#FEF8D6] transition-colors hover:border-[#FEF8D6] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#FEF8D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#D70005] focus-visible:outline-none"
            >
              List your business
            </Link>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
