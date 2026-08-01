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

interface BrandMarkProps {
  size?: number;
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
  className,
}: BrandMarkProps) {
  const shared = {
    width: MARK_INTRINSIC,
    height: MARK_INTRINSIC,
    alt: 'iLokal',
    style: { width: size, height: size },
    className: cn('shrink-0', className),
  };

  if (palette !== 'auto') {
    return <Image src={MARK[palette]} {...shared} />;
  }

  return (
    <>
      <Image
        src={MARK.light}
        {...shared}
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
  className,
}: {
  palette?: BrandPalette;
  className?: string;
}) {
  const shared = {
    ...WORDMARK_INTRINSIC,
    alt: 'iLokal',
    className: cn('h-[1.15em] w-auto', className),
  };

  if (palette !== 'auto') {
    return <Image src={WORDMARK[palette]} {...shared} />;
  }

  return (
    <>
      <Image
        src={WORDMARK.light}
        {...shared}
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
  className?: string;
  wordmarkClassName?: string;
}

/** Horizontal lockup: square mark + wordmark. */
export function BrandLogo({
  markSize = 28,
  palette = 'auto',
  className,
  wordmarkClassName,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark size={markSize} palette={palette} />
      <BrandWordmark
        palette={palette}
        className={cn('text-xl', wordmarkClassName)}
      />
    </span>
  );
}
