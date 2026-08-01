'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { styleFromString as s } from '@/lib/utils/cssStyle';
import { LandingNav } from '@/app/home/components/landing/LandingNav';
import { themeTokens } from '@/app/home/components/landing/tokens';
import type { NavLink } from '@/app/home/components/landing/data';
import '@/app/home/components/landing/landing.css';
import { ROUTES, landingSectionPath } from '@/config/routeConfig';

/**
 * The landing's nav, mounted on a non-landing surface.
 *
 * `LandingNav` is a 1:1 port of the design export: it is styled from CSS custom
 * properties and from `.wrap`/`.navlinks`/`.navactions`/`.hamb`, all scoped
 * under `[data-ilokal-root]` in `landing.css`. That scoping is why it cannot
 * simply be dropped into another page — outside the wrapper it renders with no
 * layout and no palette. This component supplies the wrapper (tokens only, no
 * page layout) so /explore gets the identical chrome.
 *
 * Two differences from the landing's own usage:
 *   - theme comes from `next-themes`, not page-local state, so the header
 *     tracks the app theme the rest of /explore is painted with;
 *   - every link is an absolute route — a bare `#shoppers` scrolls nowhere
 *     from /explore.
 */

/**
 * Mirrors the landing's own nav, in the same order and with the same labels —
 * these are one design, and a visitor moving between the two surfaces should
 * not see the menu change out from under them.
 *
 * Every entry is absolute: a bare `#near-you` scrolls nowhere from /explore.
 * The hash targets are typed as `LandingSection`, so a section renamed on the
 * landing breaks this file at build time rather than silently shipping a link
 * that goes nowhere.
 */
export const PUBLIC_NAV_LINKS: NavLink[] = [
  { href: ROUTES.EXPLORE.HOME, label: 'Explore Shops' },
  { href: landingSectionPath('near-you'), label: 'Near You' },
  // The real feed, not the landing's `#deals` teaser — same call as the footer.
  { href: ROUTES.EXPLORE.DEALS, label: 'Deals' },
  { href: landingSectionPath('voices'), label: 'Voices' },
  { href: landingSectionPath('businesses'), label: 'For Businesses' },
];

const linkAction =
  'color:var(--text);font-size:15px;font-weight:600;padding:9px 8px;';

const primaryAction =
  'background:var(--brand);color:#fff;font-size:15px;font-weight:600;padding:11px 18px;border-radius:10px;box-shadow:0 2px 10px rgba(215,0,5,.28);';

export function PublicNav() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes resolves on the client only; rendering the resolved value
  // before mount would mismatch the server HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';

  return (
    <div data-ilokal-root style={themeTokens(dark)}>
      <LandingNav
        dark={dark}
        onToggleDark={() => setTheme(dark ? 'light' : 'dark')}
        links={PUBLIC_NAV_LINKS}
        logoHref={ROUTES.PUBLIC.LANDING}
        actions={
          <>
            <Link href={ROUTES.AUTH.SIGN_IN} style={s(linkAction)}>
              Log In
            </Link>
            {/* Kept beyond landing parity: /explore is where a customer
                decides to join, so this is its only direct signup door. */}
            <Link href={ROUTES.AUTH.SIGNUP} style={s(linkAction)}>
              Sign Up
            </Link>
            <Link
              href={ROUTES.BUSINESS.registration}
              className="il-btn-primary"
              style={s(primaryAction)}
            >
              List Your Business
            </Link>
          </>
        }
        mobileCta={
          <Link
            href={ROUTES.AUTH.SIGNUP}
            style={s(
              'display:block;margin-top:16px;text-align:center;background:var(--brand);color:#fff;font-size:17px;font-weight:600;padding:15px;border-radius:12px;',
            )}
          >
            Sign Up
          </Link>
        }
      />
    </div>
  );
}
