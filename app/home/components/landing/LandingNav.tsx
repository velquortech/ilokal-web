'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { styleFromString as s } from '@/lib/utils/cssStyle';
import { ROUTES } from '@/config/routeConfig';
import { navLinks, type NavLink } from './data';
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from './icons';
import { BrandMark, BrandWordmark } from '@/components/custom/BrandLogo';

export type LandingNavProps = {
  /**
   * Current theme of the surface hosting this nav (drives the toggle icon).
   * On the landing this is page-local state that only repaints
   * `[data-ilokal-root]` — see `tokens.ts`. Embedders may instead drive it from
   * `next-themes`, which is what `PublicNav` does.
   */
  dark: boolean;
  /** Flip the host's theme (owned by the host so its root tokens update). */
  onToggleDark: () => void;
  /**
   * Nav entries. Defaults to the landing's own list. Embedders must pass
   * ABSOLUTE hrefs — a bare `#about` scrolls nowhere off the landing.
   */
  links?: NavLink[];
  /** Where the brand lockup points. Landing scrolls to its own top anchor. */
  logoHref?: string;
  /** Right-hand action buttons, after the theme toggle. */
  actions?: ReactNode;
  /** Bottom-of-overlay call to action on the mobile menu. */
  mobileCta?: ReactNode;
};

const navLinkStyle = 'color:var(--text);font-size:15px;font-weight:500;';

const overlayLinkStyle =
  'color:var(--text);font-size:20px;font-weight:600;padding:16px 4px;border-bottom:1px solid var(--border);';

const overlayCtaStyle =
  'display:block;margin-top:16px;text-align:center;background:var(--brand);color:#fff;font-size:17px;font-weight:600;padding:15px;border-radius:12px;';

const brandStyle =
  'display:inline-flex;align-items:center;gap:9px;font-size:24px;';

// `/business/registration` sits under a protected prefix, so a logged-out
// visitor clicking the site's primary business CTA was bounced to /sign-in
// having been told nothing. The explainer page is the honest destination; its
// own first button carries them straight on into the wizard.
const defaultActions = (
  <>
    <Link
      href={ROUTES.AUTH.SIGN_IN}
      style={s(
        'color:var(--text);font-size:15px;font-weight:600;padding:9px 8px;',
      )}
    >
      Log In
    </Link>
    <Link
      href={ROUTES.PUBLIC.FOR_BUSINESS}
      className="il-btn-primary"
      style={s(
        'background:var(--brand);color:#fff;font-size:15px;font-weight:600;padding:11px 18px;border-radius:10px;box-shadow:0 2px 10px rgba(215,0,5,.28);',
      )}
    >
      List Your Business
    </Link>
  </>
);

/**
 * Sticky navigation + mobile-menu overlay, shared by every public surface.
 *
 * Renders only inside an element carrying `data-ilokal-root` and the landing
 * tokens — every rule it relies on (`.wrap`, `.navlinks`, `.navactions`,
 * `.hamb`, and the `var(--*)` palette) is scoped under that attribute in
 * `landing.css`. The landing supplies it via `rootStyle`; other surfaces use
 * `PublicNav`, which supplies `themeTokens` and drives `dark` from next-themes.
 *
 * Owns its own mobile-menu open state; theme, links and actions come in as
 * props so the same chrome can serve the landing and /explore.
 */
export function LandingNav({
  dark,
  onToggleDark,
  links = navLinks,
  logoHref = '#top',
  actions = defaultActions,
  mobileCta,
}: LandingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the mobile-menu overlay is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      <header
        style={s(
          'position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);',
        )}
      >
        <div
          className="wrap"
          style={s(
            'height:72px;display:flex;align-items:center;justify-content:space-between;gap:20px;',
          )}
        >
          <div
            className="brandlockup"
            style={s('display:flex;align-items:center;gap:14px;')}
          >
            {/* Hash targets stay <a> (same-page scroll); a route needs <Link>
                or the click forces a full document reload. */}
            {logoHref.startsWith('#') ? (
              <a href={logoHref} style={s(brandStyle)} aria-label="iLokal">
                <BrandMark size={30} palette={dark ? 'dark' : 'light'} eager />
                <BrandWordmark palette={dark ? 'dark' : 'light'} eager />
              </a>
            ) : (
              <Link href={logoHref} style={s(brandStyle)} aria-label="iLokal">
                <BrandMark size={30} palette={dark ? 'dark' : 'light'} eager />
                <BrandWordmark palette={dark ? 'dark' : 'light'} eager />
              </Link>
            )}
            {/* "Made for Iloilo City" pill removed from the nav row: with the
                brand mark + the Explore Shops link it pushed the row past the
                1200px wrap and wrapped the whole header. The hero pill right
                below carries the same message. */}
          </div>
          <nav className="navlinks">
            {/* Hash anchors stay <a>; route links must be <Link> or every
                click forces a full document reload. */}
            {links.map((l) =>
              l.href.startsWith('#') ? (
                <a key={l.href} href={l.href} style={s(navLinkStyle)}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} style={s(navLinkStyle)}>
                  {l.label}
                </Link>
              ),
            )}
          </nav>
          <div className="navactions">
            <button
              onClick={onToggleDark}
              aria-label="Toggle theme"
              style={s(
                'width:40px;height:40px;border-radius:10px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text);background:var(--surface);',
              )}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            {actions}
          </div>
          <button
            className="hamb"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            style={s('border:1px solid var(--border);color:var(--text);')}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="il-overlay"
          style={s(
            'position:fixed;inset:72px 0 0 0;z-index:49;background:var(--bg);padding:24px;display:flex;flex-direction:column;gap:6px;',
          )}
        >
          {links.map((l) =>
            l.href.startsWith('#') ? (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={s(overlayLinkStyle)}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={s(overlayLinkStyle)}
              >
                {l.label}
              </Link>
            ),
          )}
          {/* `display:contents` so the CTA stays a direct flex child of the
              overlay — as a wrapped block it would lose the column stretch and
              render at content width instead of full width. */}
          <div
            onClick={() => setMenuOpen(false)}
            style={s('display:contents;')}
          >
            {mobileCta ?? (
              <Link
                href={ROUTES.PUBLIC.FOR_BUSINESS}
                style={s(overlayCtaStyle)}
              >
                List Your Business
              </Link>
            )}
            {/* The desktop actions row (which carries Log In) is hidden below
                1180px, and the overlay never carried the link — a phone
                visitor could sign up but had no way back into an existing
                account. Secondary outline button under the primary CTA, same
                destination as the desktop row's Log In. */}
            <Link
              href={ROUTES.AUTH.SIGN_IN}
              style={s(
                'display:block;margin-top:12px;text-align:center;color:var(--text);font-size:15px;font-weight:600;padding:13px;border-radius:12px;border:1px solid var(--border);',
              )}
            >
              Log In
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
