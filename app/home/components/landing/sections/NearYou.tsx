import { Eyebrow, Lede, SectionTitle, Wrap } from '../primitives';
import { nearYouFacts } from '../data';

/**
 * Proximity — the reason iLokal is not a delivery app.
 *
 * The three figures are structural, not decorative: each is a real property of
 * the product (districts covered, the length of a claim code, the delivery fee)
 * rather than an invented growth stat. The old stats strip counted up fake shop
 * and deal totals; those are gone.
 */
export function NearYou() {
  return (
    <section id="near-you" className="py-20 sm:py-28">
      <Wrap>
        <div className="il-reveal-stagger">
          <div>
            <Eyebrow>Near you</Eyebrow>
          </div>
          <div>
            {/* Not "…probably five minutes away": the phone in the hero
                carries that exact line on its screen, and running it twice on
                one page reads as an accident. This is the deck's other
                proximity line. */}
            <SectionTitle className="mt-5 max-w-3xl text-[#1A1A1A] dark:text-[#F7F5EF]">
              Your next craving is{' '}
              <span className="text-[#D70005] dark:text-[#EF5143]">
                closer than you think
              </span>
              .
            </SectionTitle>
          </div>
          <div>
            <Lede className="mt-6 max-w-xl">
              iLokal sorts verified shops by how far you actually have to walk,
              not by who paid the most. Follow the ones you like and you’ll hear
              first when they post something new.
            </Lede>
          </div>

          <dl className="il-reveal-stagger mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-[#1A1A1A]/10 sm:grid-cols-3 dark:bg-white/10">
            {nearYouFacts.map((fact) => (
              <div
                key={fact.label}
                className="bg-[#FEF8D6]/80 p-7 backdrop-blur-sm dark:bg-[#272422]/80"
              >
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <span className="font-display block text-6xl leading-none font-bold tracking-tight text-[#D70005] tabular-nums dark:text-[#EF5143]">
                    {fact.figure}
                  </span>
                  <span className="mt-4 block text-sm leading-relaxed text-[#4A403E] dark:text-[#B8B0A6]">
                    {fact.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Wrap>
    </section>
  );
}
