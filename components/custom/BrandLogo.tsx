import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * iLokal brand lockup — identity v1.0 ("Presented Brand Identity", 2026-08-01).
 *
 * The wordmark is DRAWN lettering, not a typeface setting: rounded terminals,
 * the two-people `ilo` ligature, the 350° `a`. It cannot be reproduced by
 * setting text in Pally, so both marks ship as matted PNGs from
 * `public/brand` rather than as inline SVG or live text (which is what the
 * previous "Hablon Weave" lockup did).
 *
 * Palette, by surface — Brick Ember `#D70005` measures only 3.23:1 against
 * Charcoal, so the dark-surface assets use the lifted `#DD2920` ("flame") tile
 * and a Porcelain wordmark instead of simply reusing the light ones:
 *
 *   light surfaces   Brick tile + Jasmine `ilo`   ·   Brick wordmark
 *   dark surfaces    Flame tile + Jasmine `ilo`   ·   Porcelain wordmark
 */

type BrandPalette = 'auto' | 'light' | 'dark';

/**
 * `eager` only ever applies to the LIGHT cut.
 *
 * In `auto` mode both cuts render and CSS picks one (`dark:hidden` /
 * `hidden dark:block`) — the resolved theme is a class, not something the
 * server can read. Marking both `priority` therefore emitted four preloads for
 * a lockup that paints two images, half of them into `display:none`, which is
 * a net LCP loss from the change meant to protect LCP. The dark cut lazy-loads;
 * it is swapped in by a class change, not by the initial paint.
 */
const PRIORITY = { priority: true } as const;

const MARK = {
  light: '/brand/mark/ilokal-mark-brick.png',
  dark: '/brand/mark/ilokal-mark-flame.png',
} as const;

const WORDMARK = {
  light: '/brand/wordmark/ilokal-wordmark-brick.png',
  dark: '/brand/wordmark/ilokal-wordmark-porcelain.png',
} as const;

/** Native pixel size of the matted sources — the intrinsic ratio next/image needs. */
const MARK_INTRINSIC = 512;
const WORDMARK_INTRINSIC = { width: 1128, height: 244 };

/**
 * The wordmark is sized in `em` off the inherited font, so its intrinsic 1128px
 * says nothing about the slot it lands in. Every call site renders it between
 * ~90px (a `text-base` footer lockup) and ~120px (the landing nav) wide, so
 * without this next/image would build a `1128w 1x / 2256w 2x` srcset and
 * preload a 1128px source into a ~120px box. 128px covers 1x and lets the
 * browser take the 256px cut on a retina screen.
 */
const WORDMARK_SIZES = '128px';

interface BrandMarkProps {
  size?: number;
  /**
   * Skip lazy-loading. Set it wherever the lockup sits in the first viewport —
   * the nav wordmark is the LCP element on the landing, and lazy-loading the
   * thing the metric is measured on is a self-inflicted wound.
   */
  eager?: boolean;
  /**
   * 'auto' follows the app theme via the Tailwind `dark:` class. Pin 'light'
   * or 'dark' on surfaces with their own theming (e.g. the landing page's
   * data-ilokal-root toggle, which never sets the `.dark` class).
   */
  palette?: BrandPalette;
  className?: string;
}

/** Square app mark: rounded tile + the `ilo` submark. */
export function BrandMark({
  size = 28,
  palette = 'auto',
  eager = false,
  className,
}: BrandMarkProps) {
  const shared = {
    width: MARK_INTRINSIC,
    height: MARK_INTRINSIC,
    alt: 'iLokal',
    // The source is 512px square and this renders at ~28px. Without `sizes`
    // next/image would preload the full 512 for it.
    sizes: `${size}px`,
    style: { width: size, height: size },
    className: cn('shrink-0', className),
  };

  if (palette !== 'auto') {
    return (
      <Image src={MARK[palette]} {...shared} {...(eager ? PRIORITY : {})} />
    );
  }

  return (
    <>
      <Image
        src={MARK.light}
        {...shared}
        {...(eager ? PRIORITY : {})}
        className={cn(shared.className, 'dark:hidden')}
      />
      <Image
        src={MARK.dark}
        {...shared}
        aria-hidden
        alt=""
        className={cn(shared.className, 'hidden dark:block')}
      />
    </>
  );
}

/**
 * The wordmark scales with the inherited font size (height is set in `em`), so
 * existing call sites that size the lockup with `text-base` / `text-lg` keep
 * working exactly as they did when this was live text.
 */
export function BrandWordmark({
  palette = 'auto',
  eager = false,
  className,
}: {
  palette?: BrandPalette;
  /** See `BrandMarkProps.eager`. */
  eager?: boolean;
  className?: string;
}) {
  const shared = {
    ...WORDMARK_INTRINSIC,
    sizes: WORDMARK_SIZES,
    alt: 'iLokal',
    className: cn('h-[1.15em] w-auto', className),
  };

  if (palette !== 'auto') {
    return (
      <Image src={WORDMARK[palette]} {...shared} {...(eager ? PRIORITY : {})} />
    );
  }

  return (
    <>
      <Image
        src={WORDMARK.light}
        {...shared}
        {...(eager ? PRIORITY : {})}
        className={cn(shared.className, 'dark:hidden')}
      />
      <Image
        src={WORDMARK.dark}
        {...shared}
        aria-hidden
        alt=""
        className={cn(shared.className, 'hidden dark:block')}
      />
    </>
  );
}

interface BrandLogoProps {
  markSize?: number;
  palette?: BrandPalette;
  /** See `BrandMarkProps.eager`. */
  eager?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

/** Horizontal lockup: square mark + wordmark. */
export function BrandLogo({
  markSize = 28,
  palette = 'auto',
  eager = false,
  className,
  wordmarkClassName,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark size={markSize} palette={palette} eager={eager} />
      <BrandWordmark
        palette={palette}
        eager={eager}
        className={cn('text-xl', wordmarkClassName)}
      />
    </span>
  );
}
