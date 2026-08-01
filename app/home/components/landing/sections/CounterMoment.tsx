import { Eyebrow, SectionTitle, Wrap } from '../primitives';

/**
 * The one dark beat on the page, and the one place iLokal isn't a website.
 *
 * Everything else here happens on a screen. This happens at a counter, in
 * front of a person — which is the whole difference between iLokal and a
 * delivery app. The contrast break carries that meaning; it isn't rhythm for
 * its own sake.
 *
 * The code is a fixture. It's the shape of the real thing: six characters,
 * server-generated, shown to the cashier.
 */

const CODE = ['K', '7', 'M', '2', 'Q', '4'];

export function CounterMoment() {
  return (
    <section className="relative isolate overflow-hidden bg-[#D70005] py-20 text-[#FEF8D6] sm:py-28">
      {/* Jasmine bloom, so the flat red field has somewhere to breathe. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 -right-1/4 -z-10 h-[70vh] w-[70vw] rounded-full opacity-30 [background:radial-gradient(circle,#FEE87B,transparent_65%)]"
      />
      <Wrap>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <Eyebrow className="text-[#FEE87B] dark:text-[#FEE87B]">
              At the counter
            </Eyebrow>
            <SectionTitle className="mt-5">
              Show this.
              <br />
              That’s the whole thing.
            </SectionTitle>
            <p className="mt-6 max-w-md text-[1.0625rem] leading-[1.65] text-[#FEF8D6]/80">
              Claim a deal in the app and you get six characters. Read them out
              at the till. No screenshots, no printing, no QR code that won’t
              scan in the sun.
            </p>
          </div>

          {/* Ticket stub. The notches are the perforation. */}
          <div className="il-reveal relative mx-auto w-full max-w-md rounded-3xl bg-[#FEF8D6] p-8 text-[#1A1A1A] shadow-[0_30px_70px_-30px_rgba(0,0,0,.8)]">
            <div
              aria-hidden
              className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-[#D70005]"
            />
            <div
              aria-hidden
              className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-[#D70005]"
            />

            <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-60">
              Kap Ising’s Café · Molo
            </p>
            <p className="font-display mt-2 text-2xl leading-tight font-bold tracking-tight">
              20% off any specialty drink
            </p>

            <div className="mt-8 border-t border-dashed border-[#1A1A1A]/25 pt-8">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-60">
                Your code
              </p>
              <p
                className="mt-3 flex gap-2 sm:gap-3"
                aria-label="Example claim code K 7 M 2 Q 4"
              >
                {CODE.map((char, i) => (
                  <span
                    key={i}
                    aria-hidden
                    style={{ '--i': i + 2 } as React.CSSProperties}
                    className="il-rise font-display grid h-14 flex-1 place-items-center rounded-xl bg-[#1A1A1A] text-2xl font-bold text-[#FEE87B] tabular-nums sm:text-3xl"
                  >
                    {char}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
