/**
 * iLokal landing content. Fixtures, deliberately — the landing does not read
 * live data — a marketing page that 500s when the DB blips is a bad trade.
 *
 * TODO(real-data): the remaining `#` links (Contact, Careers, Privacy, Terms)
 * still need real destinations.
 *
 * Route links come from `config/routeConfig` — never hardcode a path here.
 * `LandingNav` renders `#`-prefixed entries as `<a>` and everything else as
 * `<Link>`, so a route string added here soft-navigates for free.
 */

import { ROUTES } from '@/config/routeConfig';

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
// Order matches scroll order — a jump nav that disagrees with the page is
// disorienting.
export const navLinks: NavLink[] = [
  { href: ROUTES.EXPLORE.HOME, label: 'Explore Shops' },
  { href: '#near-you', label: 'Near You' },
  { href: '#deals', label: 'Deals' },
  { href: '#voices', label: 'Voices' },
  { href: '#businesses', label: 'For Businesses' },
];

/** Footer link columns (shared by LandingFooter). */
export const footerColumns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      // Shops and Deals point at the real surfaces, not at the landing sections
      // that merely advertise them — that's the whole point of having /explore.
      { href: ROUTES.EXPLORE.HOME, label: 'Shops' },
      { href: ROUTES.EXPLORE.DEALS, label: 'Deals' },
      { href: '#businesses', label: 'For Business' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#voices', label: 'Voices' },
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

/**
 * The hero's craving switcher — the page's signature.
 *
 * Shop names are invented but plausible (the established pattern in this file);
 * the districts are real Iloilo City ones, which is what makes the spread read
 * as a place rather than as filler. Replace wholesale when the landing is
 * allowed to read live data.
 */
export type CardTone = 'brick' | 'jasmine' | 'petal' | 'cornsilk';

export type CravingResult = {
  name: string;
  /** Iloilo City district — the thing that makes this feel local. */
  area: string;
  /** What the place is known for. One clause, no marketing. */
  note: string;
  walk: string;
  tone: CardTone;
};

export type Craving = { query: string; results: CravingResult[] };

export const cravings: Craving[] = [
  {
    query: 'batchoy',
    results: [
      {
        name: "Ted's Batchoy Haus",
        area: 'La Paz',
        note: 'Extra chicharrón, no asking',
        walk: '4 min',
        tone: 'brick',
      },
      {
        name: 'Sunburst Corner',
        area: 'Jaro',
        note: 'Open before the market does',
        walk: '9 min',
        tone: 'jasmine',
      },
      {
        name: 'Molo Mainit',
        area: 'Molo',
        note: 'Bowl bigger than your head',
        walk: '12 min',
        tone: 'petal',
      },
    ],
  },
  {
    query: 'kape',
    results: [
      {
        name: "Kap Ising's Café",
        area: 'Molo',
        note: 'Single-origin from Antique',
        walk: '3 min',
        tone: 'cornsilk',
      },
      {
        name: 'Hablon Coffee',
        area: 'City Proper',
        note: 'Weaves sold at the counter',
        walk: '7 min',
        tone: 'brick',
      },
      {
        name: 'Dungon Roasters',
        area: 'Jaro',
        note: 'Roasts on Tuesdays, sells out',
        walk: '11 min',
        tone: 'jasmine',
      },
    ],
  },
  {
    query: 'pan de sal',
    results: [
      {
        name: 'Panadería Molo',
        area: 'Molo',
        note: 'Out of the oven at 5am',
        walk: '6 min',
        tone: 'jasmine',
      },
      {
        name: 'Tinapay Jaro',
        area: 'Jaro',
        note: 'Buy five, take one',
        walk: '8 min',
        tone: 'petal',
      },
      {
        name: 'La Paz Bakehouse',
        area: 'La Paz',
        note: 'Still warm at 6pm',
        walk: '10 min',
        tone: 'brick',
      },
    ],
  },
  {
    query: 'pasalubong',
    results: [
      {
        name: 'Kultura Crafts',
        area: 'City Proper',
        note: 'Hablon by the metre',
        walk: '5 min',
        tone: 'petal',
      },
      {
        name: 'Barotac Weave',
        area: 'Arevalo',
        note: 'Looms you can watch',
        walk: '14 min',
        tone: 'cornsilk',
      },
      {
        name: 'Iloilo Sweets Co.',
        area: 'Jaro',
        note: 'Barquillos, boxed to fly',
        walk: '9 min',
        tone: 'brick',
      },
    ],
  },
  {
    query: 'sunset spot',
    results: [
      {
        name: 'Esplanade Kiosks',
        area: 'Mandurriao',
        note: 'River on one side, food on the other',
        walk: '8 min',
        tone: 'brick',
      },
      {
        name: 'Villa Beachfront',
        area: 'Arevalo',
        note: 'Grilled, salted, eaten standing',
        walk: '16 min',
        tone: 'jasmine',
      },
      {
        name: 'Riverside Grill',
        area: 'Mandurriao',
        note: 'Last orders when the light goes',
        walk: '11 min',
        tone: 'petal',
      },
    ],
  },
];

/** Proximity block — the claim, and what backs it. */
export const nearYouFacts: { figure: string; label: string }[] = [
  { figure: '7', label: 'districts covered, from La Paz to Arevalo' },
  { figure: '6', label: 'characters to show at the counter' },
  { figure: '0', label: 'delivery fees, because you walk there' },
];

export const bizPoints: string[] = [
  'Manage multiple branches from one dashboard',
  'Publish products & menus with peso pricing',
  'Create coupons and limited-time deals',
  'Track redemptions and follower analytics',
  'Get a "Verified" badge after document review',
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
    color: '#D70005',
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
    color: '#DD2920',
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
    color: '#FEE87B',
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
    color: '#D70005',
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
    color: '#A80004',
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
    color: '#FCD9F7',
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
    color: '#D70005',
  },
  {
    quote:
      'iLokal brought weekday regulars back to my café. I post a deal in the morning and see the redemptions roll in by lunch.',
    name: 'Nonoy Tabuada',
    role: 'Owner · Kap Ising’s Café',
    initials: 'NT',
    color: '#D70005',
  },
  {
    quote:
      'The Verified badge builds real trust. My followers actually get notified when new handicrafts arrive — sales went up.',
    name: 'Grace Deocampo',
    role: 'Owner · Kultura Crafts',
    initials: 'GD',
    color: '#DD2920',
  },
];

/**
 * Category filter for the deals wall. Lives here rather than inline in the
 * component so the rule is testable without rendering through AnimatePresence,
 * which keeps exiting cards mounted until a frame it never gets in jsdom.
 */
export function filterDeals(category: string): Deal[] {
  return category === 'All' ? deals : deals.filter((d) => d.cat === category);
}

/** Petal Frost is too light for a white-text avatar tile — swap it for flame. */
export function dealAvatarColor(color: string): string {
  return color === '#FCD9F7' ? '#DD2920' : color;
}
