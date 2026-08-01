/*
 * SVG icons for the shared landing chrome (nav, footer) and the deals filter.
 *
 * Pruned to what the redesign actually renders. The export's feature icons,
 * phone-mock chips, store badges and verification seals went with the sections
 * that used them.
 */
type Sz = { size?: number };

/** Generic stroke icon (matches the export's `svg()` helper: width 1.9). */
export function StrokeIcon({
  paths,
  size = 16,
  width = 1.9,
}: {
  paths: string[];
  size?: number;
  width?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/* ---- theme + nav ---- */
export const SunIcon = ({ size = 18 }: Sz) => (
  <StrokeIcon
    size={size}
    paths={[
      'M12 3v2',
      'M12 19v2',
      'M5 5l1.5 1.5',
      'M17.5 17.5 19 19',
      'M3 12h2',
      'M19 12h2',
      'M5 19l1.5-1.5',
      'M17.5 6.5 19 5',
    ]}
  />
);
export const MoonIcon = ({ size = 18 }: Sz) => (
  <StrokeIcon
    size={size}
    paths={['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z']}
  />
);
export const MenuIcon = ({ size = 22 }: Sz) => (
  <StrokeIcon size={size} paths={['M3 6h18', 'M3 12h18', 'M3 18h18']} />
);
export const CloseIcon = ({ size = 22 }: Sz) => (
  <StrokeIcon size={size} paths={['M18 6 6 18', 'M6 6l12 12']} />
);

/* ---- socials (footer) ---- */
export const FacebookIcon = ({ size = 18 }: Sz) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 9V7c0-1 .5-1.5 1.5-1.5H17V2h-2.5C11.5 2 10 3.8 10 6.5V9H8v3h2v10h4V12h2.5l.5-3h-3z" />
  </svg>
);
export const InstagramIcon = ({ size = 18 }: Sz) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
export const TikTokIcon = ({ size = 18 }: Sz) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 3c.3 2.2 1.8 3.9 4 4.2v3c-1.5 0-2.9-.5-4-1.3V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.1c-.3-.1-.7-.2-1-.2a3 3 0 1 0 3 3V3h3z" />
  </svg>
);
