'use client';

import {
  useReducedMotion,
  useScroll,
  useTransform,
  motion,
} from 'motion/react';

/**
 * The sky.
 *
 * One fixed layer of four soft blooms in the brand colours — the gradient the
 * identity deck is built on. The page scrolls over it, and the blooms drift
 * upward as it does, so descending the page reads as the light changing:
 * warm noon at the hero (Cornsilk + Jasmine), Petal Frost through the middle,
 * Brick Ember pooling at the bottom.
 *
 * Deliberately NOT `filter: blur()`. A blur on a viewport-sized layer is a
 * full repaint every frame; `radial-gradient` with a soft stop is already
 * blurred, costs nothing, and composites on the GPU. Everything here animates
 * transform and nothing else.
 *
 * The grain is doing real work, not decoration: four wide flat gradients on a
 * near-white background band visibly on 8-bit displays, and a little noise is
 * the standard fix.
 */

/** Deterministic bloom layout — position, size, colour, drift distance. */
const BLOOMS = [
  {
    color: '#FEE87B',
    className: 'left-[-14%] top-[-14%] h-[78vh] w-[78vw]',
    opacity: 1,
    drift: -140,
  },
  {
    color: '#D70005',
    className: 'right-[-24%] top-[-30%] h-[85vh] w-[72vw]',
    opacity: 0.72,
    drift: -240,
  },
  {
    color: '#FCD9F7',
    className: 'left-[10%] top-[42%] h-[88vh] w-[92vw]',
    opacity: 1,
    drift: -320,
  },
  {
    color: '#D70005',
    className: 'right-[-16%] top-[74%] h-[78vh] w-[66vw]',
    opacity: 0.5,
    drift: -420,
  },
] as const;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.42'/%3E%3C/svg%3E\")";

export function GradientField() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FBFAF6] dark:bg-[#1A1A1A]"
    >
      {/* Dark mode runs the same blooms at roughly half strength. At full
          strength on Charcoal they stop reading as a background: the red mass
          in the top corner threw enough light that body copy crossing it lost
          contrast. */}
      <div className="absolute inset-0 dark:opacity-45">
        {BLOOMS.map((bloom, i) => (
          <Bloom
            key={i}
            {...bloom}
            progress={scrollYProgress}
            still={!!reduced}
          />
        ))}
      </div>
      {/* Just enough paper back under the middle band to keep body copy
          readable where three blooms overlap — any more and the identity's
          whole gradient washes out to a tint, which is what the first pass
          did. */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_44%_at_46%_46%,rgba(251,250,246,.62),transparent_72%)] dark:hidden" />
      <div
        className="absolute inset-0 opacity-[.16] mix-blend-multiply dark:opacity-[.22] dark:mix-blend-overlay"
        style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}

function Bloom({
  color,
  className,
  opacity,
  drift,
  progress,
  still,
}: {
  color: string;
  className: string;
  opacity: number;
  drift: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  still: boolean;
}) {
  const y = useTransform(progress, [0, 1], [0, drift]);

  return (
    <motion.div
      className={`absolute ${className}`}
      style={{
        y: still ? 0 : y,
        opacity,
        // Two things this has to get right, both learned from screenshots:
        //
        // `ellipse closest-side` so the gradient reaches zero alpha exactly at
        // the element's edge. The default (`farthest-corner`) extends past the
        // box, which the box then CLIPS — at 390px that showed up as hard
        // vertical seams running the height of the page.
        //
        // And the falloff lands on the SAME colour at zero alpha, not on
        // `transparent`, which interpolates toward transparent-black and rings
        // a saturated bloom with grey.
        background: `radial-gradient(ellipse closest-side at 50% 50%, ${color} 0%, ${color}E6 26%, ${color}99 46%, ${color}40 64%, ${color}14 78%, ${color}00 100%)`,
      }}
    />
  );
}
