/**
 * Easing shared by the landing's remaining JS animations.
 *
 * The scroll-reveal variants that used to live here (`fadeUp`,
 * `staggerContainer`, `inViewOnce`) are gone. Motion writes `initial` into the
 * SERVER HTML, so every revealed element shipped `style="opacity:0"` — with JS
 * blocked, slow, or broken the whole page rendered blank. Screenshots of the
 * first build showed exactly that. Reveals are CSS view-timeline animations
 * now (`.il-reveal` / `.il-rise` in `landing.css`), which cannot fail that way
 * and let most sections be server components.
 *
 * What is left in JS is only what genuinely needs state: the craving spread and
 * the deals filter (AnimatePresence) and the sky's scroll link.
 */

/** `as const` matters: a plain array widens to number[], which motion rejects. */
export const EASE = [0.22, 1, 0.36, 1] as const;
