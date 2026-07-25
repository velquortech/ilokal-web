import { cn } from '@/lib/utils';

/**
 * iLokal brand lockup — "Hablon Weave" mark (public/brand, v0.2), inlined.
 *
 * Inlined rather than <img src="/brand/svg/…"> on purpose: the lockup SVGs
 * carry live <text> and SVG-as-image cannot load document fonts, so the
 * wordmark would render in a fallback typeface. Here the mark is pure vector
 * and the wordmark is real HTML text in the app's default sans (Geist), which
 * is exactly the brand spec (Geist 800, tracking −3.5%).
 *
 * Brand colors (README.txt): light surfaces #65A30D tile / white strips; dark
 * surfaces #84CC16 tile / #1A1A1A strips (#65A30D muddies on charcoal).
 */

type BrandPalette = 'auto' | 'light' | 'dark';

const TILE_CLASS: Record<BrandPalette, string> = {
  auto: 'fill-[#65A30D] dark:fill-[#84CC16]',
  light: 'fill-[#65A30D]',
  dark: 'fill-[#84CC16]',
};

const STRIP_CLASS: Record<BrandPalette, string> = {
  auto: 'fill-white dark:fill-[#1A1A1A]',
  light: 'fill-white',
  dark: 'fill-[#1A1A1A]',
};

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

export function BrandMark({
  size = 28,
  palette = 'auto',
  className,
}: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label="iLokal"
      className={cn('shrink-0', className)}
    >
      <rect width="48" height="48" rx="12" className={TILE_CLASS[palette]} />
      <g className={STRIP_CLASS[palette]}>
        <rect x="13" y="6" width="6.5" height="36" rx="2" />
        <rect x="28.5" y="6" width="6.5" height="36" rx="2" />
        <rect x="6" y="13" width="21" height="6.5" rx="2" />
        <rect x="35" y="13" width="7" height="6.5" rx="2" />
        <rect x="6" y="28.5" width="5" height="6.5" rx="2" />
        <rect x="19.5" y="28.5" width="22.5" height="6.5" rx="2" />
      </g>
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('font-giest font-extrabold tracking-[-0.035em]', className)}
    >
      iLokal
    </span>
  );
}

interface BrandLogoProps {
  markSize?: number;
  palette?: BrandPalette;
  className?: string;
  wordmarkClassName?: string;
}

/** Horizontal lockup: mark + wordmark (brand green, theme-aware). */
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
        className={cn('text-primary text-xl', wordmarkClassName)}
      />
    </span>
  );
}
