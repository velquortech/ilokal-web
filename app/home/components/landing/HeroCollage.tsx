import Image from 'next/image';

/**
 * The hero's right column: people, and the app in a hand.
 *
 * Both frames are the identity deck's own photography, so the faces, the
 * cropping and the Brick Ember backdrop are the brand's, not a stock library's
 * best guess at it.
 *
 * They are doing a specific job. The left column is the argument and the live
 * search demo — all product. Without this the argument sat next to nothing at
 * ≥1024px, and a page about going out and eating with people showed no people.
 *
 * Decorative: `alt=""`. The headline and the search demo already say what this
 * section is; describing the photographs would make a screen reader listen to
 * the same claim three times.
 */
export function HeroCollage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative hidden h-full min-h-[30rem] select-none lg:block"
    >
      {/* Back frame: the deck's cover photograph. Tilted the opposite way to
          the phone so the pair reads as two things set down, not one block. */}
      <div className="absolute top-[6%] right-0 w-[86%] -rotate-2 overflow-hidden rounded-3xl shadow-[0_30px_70px_-28px_rgba(90,10,10,.5)] ring-1 ring-black/5">
        <Image
          src="/landing/hero-laugh.webp"
          alt=""
          width={1400}
          height={670}
          sizes="(min-width: 1024px) 42vw, 0px"
          priority
          className="h-auto w-full"
        />
      </div>

      {/* Front frame: the app, in a hand. Overlaps the corner of the frame
          behind it so the two sit in one stack rather than in a grid. */}
      <div className="absolute bottom-0 left-0 w-[46%] rotate-3 overflow-hidden rounded-3xl shadow-[0_30px_70px_-24px_rgba(90,10,10,.55)] ring-1 ring-black/5">
        <Image
          src="/landing/hero-phone.webp"
          alt=""
          width={700}
          height={1010}
          sizes="(min-width: 1024px) 22vw, 0px"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
