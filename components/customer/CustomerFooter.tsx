import Link from 'next/link';
import { BrandLogo } from '@/components/custom/BrandLogo';
import {
  ROUTES,
  landingSectionPath,
  type LandingSection,
} from '@/config/routeConfig';

/**
 * Slim public footer for the explore surface.
 *
 * Deliberately NOT `LandingFooter`: that component is styled from CSS custom
 * properties (`--border`, `--muted`, …) and `.wrap`/`.footgrid` classes that
 * only exist under the landing's `[data-ilokal-root]` wrapper + `landing.css`.
 * Reusing it here would mean dragging that whole theme system onto a page built
 * from app tokens. This one speaks Tailwind/shadcn tokens like the rest of the
 * explore chrome.
 *
 * Server component — pure links, no interactivity.
 */

type FooterLink = { href: string; label: string };

const FOOTER_LINKS: FooterLink[] = [
  { href: ROUTES.PUBLIC.LANDING, label: 'Home' },
  { href: ROUTES.EXPLORE.HOME, label: 'Explore' },
  { href: ROUTES.EXPLORE.NEARBY, label: 'Nearby' },
  { href: ROUTES.EXPLORE.DEALS, label: 'Deals' },
  // Cross-surface anchors go through the helper — a bare `#about` scrolls
  // nowhere from /explore.
  {
    href: landingSectionPath('about' satisfies LandingSection),
    label: 'About',
  },
  { href: ROUTES.BUSINESS.registration, label: 'List your business' },
];

export function CustomerFooter() {
  return (
    <footer className="bg-background mt-8 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={ROUTES.PUBLIC.LANDING}
            // Same reason as the header: an inline anchor would wrap the
            // lockup in a line box and mis-centre it against the link row.
            className="flex w-fit items-center"
            aria-label="iLokal — home"
          >
            <BrandLogo markSize={24} wordmarkClassName="text-base" />
          </Link>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="text-muted-foreground text-xs">
          © 2026 iLokal · Made in Iloilo City 🇵🇭
        </p>
      </div>
    </footer>
  );
}
