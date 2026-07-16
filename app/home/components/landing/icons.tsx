/* 1:1 SVG icons from the design export. viewBox 0 0 24 24 unless noted. */
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

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

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

/* ---- feature icons (mixed path + circle) ---- */
export const PinIcon = ({ size = 24 }: Sz) => (
  <svg {...base(size)}>
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
export const TicketIcon = ({ size = 24 }: Sz) => (
  <svg {...base(size)}>
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-6z" />
    <path d="M9 7v10" strokeDasharray="2 3" />
  </svg>
);
export const HeartIcon = ({ size = 24 }: Sz) => (
  <svg {...base(size)}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" />
  </svg>
);
export const TripIcon = ({ size = 24 }: Sz) => (
  <svg {...base(size)}>
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </svg>
);

export const featureIcon = {
  pin: PinIcon,
  ticket: TicketIcon,
  heart: HeartIcon,
  trip: TripIcon,
} as const;

/* ---- check / verified / lock ---- */
export const CheckIcon = ({
  size = 14,
  width = 3,
}: Sz & { width?: number }) => (
  <StrokeIcon size={size} width={width} paths={['M20 6 9 17l-5-5']} />
);
export const VerifiedSeal = ({ size = 14 }: Sz) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#65A30D">
    <path d="M12 2 9.2 4.6 5.5 4l-.6 3.7L2 9.2 3.4 12 2 14.8l2.9 1.5.6 3.7 3.7-.6L12 22l2.8-2.6 3.7.6.6-3.7 2.9-1.5L20.6 12 22 9.2l-2.9-1.5-.6-3.7-3.7.6z" />
    <path
      d="m9 12 2 2 4-4"
      stroke="#fff"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const LockUnlock = ({ size = 14 }: Sz) => (
  <svg {...base(size)}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);
export const BrowserLock = ({ size = 13 }: Sz) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ---- phone-mock chips (green stroke) ---- */
const phone = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#4ADE80',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});
export const PhonePin = ({ size = 12 }: Sz) => (
  <svg {...phone(size)}>
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
export const PhoneTicket = ({ size = 12 }: Sz) => (
  <svg {...phone(size)}>
    <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.2" fill="#4ADE80" stroke="none" />
  </svg>
);
export const PhoneStore = ({ size = 12 }: Sz) => (
  <svg {...phone(size)}>
    <path d="M3 9 4 4h16l1 5M4 9v11h16V9M4 9a3 3 0 0 0 6 0 3 3 0 0 0 4 0 3 3 0 0 0 6 0" />
  </svg>
);
export const LoginArrow = ({ size = 13 }: Sz) => (
  <svg {...phone(size)}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
  </svg>
);
export const UserPlus = ({ size = 13 }: Sz) => (
  <svg {...phone(size)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6" />
  </svg>
);

/* ---- store badges + socials ---- */
export const AppleLogo = ({ size = 20 }: Sz) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
    <path d="M16.5 1c.1 1.2-.4 2.3-1.1 3.1-.8.9-2 1.6-3.2 1.5-.1-1.2.5-2.4 1.2-3.1.7-.8 2-1.4 3.1-1.5zM20.6 17c-.5 1.2-.8 1.7-1.4 2.7-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.3.9-3.7.9c-1.6 0-2.8-1.6-3.7-3C1.6 16.6 1.3 12 3.1 9.6 4 8.4 5.5 7.6 7 7.6c1.6 0 2.6 1 3.9 1 1.3 0 2-1 3.9-1 1.3 0 2.7.7 3.7 2-3.3 1.8-2.7 6.4 2.1 7.4z" />
  </svg>
);
export const GooglePlayLogo = ({ size = 20 }: Sz) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M3 3l11 9-11 9V3z" fill="#4ADE80" />
    <path d="M14 12l4-3 3 3-3 3-4-3z" fill="#fff" />
  </svg>
);
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
