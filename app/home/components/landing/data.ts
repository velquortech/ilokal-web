/**
 * iLokal landing content — copied 1:1 from the design export.
 * TODO(real-data): replace copy, mock numbers, and `#` links with real values.
 */

export type Feature = {
  title: string;
  desc: string;
  icon: 'pin' | 'ticket' | 'heart' | 'trip';
};

export type Step = { num: string; text: string };

export type Category = {
  name: string;
  /** stroke-only SVG path `d` list (viewBox 0 0 24 24). */
  icon: string[];
};

export type Deal = {
  name: string;
  cat: string;
  text: string;
  type: 'pct' | 'fix';
  expiry: string;
  initials: string;
  color: string;
  hot: boolean;
  unlock: boolean;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
};

export type NavLink = { href: string; label: string };
export type FooterColumn = { title: string; links: NavLink[] };

/** Primary nav + mobile-menu links (shared by LandingNav). */
export const navLinks: NavLink[] = [
  { href: '#shoppers', label: 'For Shoppers' },
  { href: '#businesses', label: 'For Businesses' },
  { href: '#how', label: 'How It Works' },
  { href: '#deals', label: 'Deals' },
  { href: '#about', label: 'About' },
];

/** Footer link columns (shared by LandingFooter). */
export const footerColumns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { href: '#shoppers', label: 'Shops' },
      { href: '#deals', label: 'Deals' },
      { href: '#businesses', label: 'For Business' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#about', label: 'About' },
      { href: '#', label: 'Contact' },
      { href: '#', label: 'Careers' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Privacy' },
      { href: '#', label: 'Terms' },
    ],
  },
];

/** "Trusted by" hero avatar stack (verbatim from markup). */
export const avatarStack: { initials: string; bg: string; fg: string }[] = [
  { initials: 'KC', bg: '#16A34A', fg: '#fff' },
  { initials: 'TB', bg: '#22C55E', fg: '#fff' },
  { initials: 'PM', bg: '#4ADE80', fg: '#14532D' },
  { initials: 'KC', bg: '#65A30D', fg: '#fff' },
];

export const features: Feature[] = [
  {
    icon: 'pin',
    title: 'Shops Near Me',
    desc: 'See verified local businesses sorted by distance on a live map.',
  },
  {
    icon: 'ticket',
    title: 'Exclusive Deals & Coupons',
    desc: 'Claim coupons and show a 6-digit code at the counter.',
  },
  {
    icon: 'heart',
    title: 'Follow Your Favorites',
    desc: 'Get updates when shops post news, new products, or fresh deals.',
  },
  {
    icon: 'trip',
    title: 'Trip Planner',
    desc: 'Bundle your active deals and followed shops into one plan for the day.',
  },
];

export const bizPoints: string[] = [
  'Manage multiple branches from one dashboard',
  'Publish products & menus with peso pricing',
  'Create coupons and limited-time deals',
  'Track redemptions and follower analytics',
  'Get a "Verified" badge after document review',
];

export const shopperSteps: Step[] = [
  { num: 'STEP 1', text: 'Open the app & allow location' },
  { num: 'STEP 2', text: 'Browse shops & claim a deal' },
  { num: 'STEP 3', text: 'Show your code at the shop' },
];

export const bizSteps: Step[] = [
  { num: 'STEP 1', text: 'Register & upload documents' },
  { num: 'STEP 2', text: 'Get verified by our team' },
  { num: 'STEP 3', text: 'Post products & deals to reach customers' },
];

export const categories: Category[] = [
  {
    name: 'All',
    icon: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  },
  {
    name: 'Cafés',
    icon: [
      'M18 8h1a4 4 0 0 1 0 8h-1',
      'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z',
      'M6 1v3',
      'M10 1v3',
      'M14 1v3',
    ],
  },
  {
    name: 'Restaurants',
    icon: [
      'M6 2v6a2 2 0 1 1-4 0V2',
      'M4 2v20',
      'M18 2c-2 0-3 3-3 6s3 3 3 3v11',
    ],
  },
  {
    name: 'Retail',
    icon: [
      'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z',
      'M3 6h18',
      'M16 10a4 4 0 0 1-8 0',
    ],
  },
  {
    name: 'Services',
    icon: [
      'M14.7 6.3a4 4 0 0 0-5.6 5.2l-6.4 6.4a2 2 0 1 0 2.8 2.8l6.4-6.4a4 4 0 0 0 5.2-5.6l-2.7 2.7-2.1-2.1z',
    ],
  },
  {
    name: 'Bakeries',
    icon: [
      'M4 12a4 4 0 0 1 8 0 4 4 0 0 1 8 0v2H4z',
      'M4 14v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3',
    ],
  },
  {
    name: 'Groceries',
    icon: [
      'M2 3h3l2.5 12.5a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5L22 7H6',
      'M10 21h.01',
      'M18 21h.01',
    ],
  },
];

export const deals: Deal[] = [
  {
    name: "Kap Ising's Café",
    cat: 'Cafés',
    text: '20% off any specialty drink',
    type: 'pct',
    expiry: 'Ends in 5 days',
    initials: 'KC',
    color: '#16A34A',
    hot: false,
    unlock: true,
  },
  {
    name: "Ted's Batchoy Haus",
    cat: 'Restaurants',
    text: '₱50 off any batchoy bilao',
    type: 'fix',
    expiry: 'Ends in 3 days',
    initials: 'TB',
    color: '#22C55E',
    hot: true,
    unlock: false,
  },
  {
    name: 'Panadería Molo',
    cat: 'Bakeries',
    text: 'Buy 5, take 1 free pan de sol',
    type: 'pct',
    expiry: 'Ends in 6 days',
    initials: 'PM',
    color: '#4ADE80',
    hot: false,
    unlock: false,
  },
  {
    name: 'Kultura Crafts',
    cat: 'Retail',
    text: '15% off local handicrafts',
    type: 'pct',
    expiry: 'Ends in 2 days',
    initials: 'KC',
    color: '#65A30D',
    hot: true,
    unlock: false,
  },
  {
    name: 'AutoCare Jaro',
    cat: 'Services',
    text: '₱200 off full oil change',
    type: 'fix',
    expiry: 'Ends in 8 days',
    initials: 'AJ',
    color: '#15803D',
    hot: false,
    unlock: false,
  },
  {
    name: 'FreshMart Grocery',
    cat: 'Groceries',
    text: '10% off a ₱1,000 basket',
    type: 'pct',
    expiry: 'Ends in 4 days',
    initials: 'FM',
    color: '#86EFAC',
    hot: false,
    unlock: false,
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      'I found three new coffee spots near Molo in one afternoon. The 6-digit code at the counter is so quick — no screenshots, no fuss.',
    name: 'Andrea Salcedo',
    role: 'Shopper · Iloilo City',
    initials: 'AS',
    color: '#16A34A',
  },
  {
    quote:
      'iLokal brought weekday regulars back to my café. I post a deal in the morning and see the redemptions roll in by lunch.',
    name: 'Nonoy Tabuada',
    role: 'Owner · Kap Ising’s Café',
    initials: 'NT',
    color: '#65A30D',
  },
  {
    quote:
      'The Verified badge builds real trust. My followers actually get notified when new handicrafts arrive — sales went up.',
    name: 'Grace Deocampo',
    role: 'Owner · Kultura Crafts',
    initials: 'GD',
    color: '#22C55E',
  },
];

/** Scroll count-up targets (Shops → 120, Deals → 500). */
export const COUNTER_TARGETS = { shops: 120, deals: 500 } as const;

/** Deal badge label by discount type (from `decorate()`). */
export function dealBadgeLabel(type: Deal['type']): string {
  return type === 'pct' ? '% Percentage off' : '₱ Fixed amount off';
}

/** `#86EFAC` is remapped to `#22C55E` for the avatar tile (from `decorate()`). */
export function dealAvatarColor(color: string): string {
  return color === '#86EFAC' ? '#22C55E' : color;
}
