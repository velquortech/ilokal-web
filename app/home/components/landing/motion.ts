import type { Variants } from 'motion/react';

/**
 * Shared reveal variants — the `motion` equivalent of the export's `fadeUp`
 * keyframe, extended with a stagger container for the card grids.
 */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/** Standard in-view trigger props (fires once, a bit before fully on screen). */
export const inViewOnce = {
  initial: 'hidden' as const,
  whileInView: 'show' as const,
  viewport: { once: true, amount: 0.25 },
};
