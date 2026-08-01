import { cn } from '@/lib/utils';
import { testimonials } from '../data';
import { Eyebrow, SectionTitle, Wrap } from '../primitives';

/**
 * Voices — hand-placed, not a 3-up grid of equal cards.
 *
 * Each quote gets a different brand surface and a slightly different vertical
 * offset, so the block reads as three people rather than three slots. The
 * offsets only apply from `lg` up; stacked on mobile they would just look like
 * broken spacing.
 */

const SURFACE = [
  'bg-[#FEE87B] text-[#1A1A1A]',
  'bg-[#FCD9F7] text-[#1A1A1A]',
  'bg-[#FEF8D6] text-[#1A1A1A]',
];

const OFFSET = ['lg:mt-10', '', 'lg:mt-16'];

export function Voices() {
  return (
    <section id="voices" className="py-20 sm:py-28">
      <Wrap>
        <div>
          <div className="il-reveal">
            <Eyebrow>Voices</Eyebrow>
            <SectionTitle className="mt-5 max-w-2xl text-[#1A1A1A] dark:text-[#F7F5EF]">
              The city tastes better local.
            </SectionTitle>
          </div>

          <div className="il-reveal-stagger mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure
                key={t.name}
                className={cn(
                  'flex h-max flex-col rounded-3xl p-7 shadow-[0_14px_40px_-20px_rgba(60,10,10,.45)]',
                  SURFACE[i % SURFACE.length],
                  OFFSET[i % OFFSET.length],
                )}
              >
                <blockquote className="font-display text-xl leading-snug font-medium tracking-tight">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3 border-t border-[#1A1A1A]/15 pt-5">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1A1A1A] text-xs font-bold text-[#FEF8D6]"
                  >
                    {t.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {t.name}
                    </span>
                    <span className="block truncate text-xs opacity-70">
                      {t.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
