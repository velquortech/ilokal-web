'use client';

import { useState } from 'react';
import { styleFromString as s } from '@/lib/utils/cssStyle';
import { navLinks } from './data';
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from './icons';

export type LandingNavProps = {
  /** Current theme of the self-contained landing (drives the toggle icon). */
  dark: boolean;
  /** Flip the landing theme (owned by the page so the root tokens update). */
  onToggleDark: () => void;
};

/**
 * Sticky landing navigation + mobile-menu overlay. Reusable on any page that
 * renders inside a `[data-ilokal-root]` theme wrapper. Owns its own mobile-menu
 * open state; the theme toggle is lifted to the parent via props.
 */
export function LandingNav({ dark, onToggleDark }: LandingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <div style={s('display:flex;align-items:center;gap:14px;')}>
            <a
              href="#top"
              style={s(
                'font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--brand);',
              )}
            >
              iLokal
            </a>
            <span
              style={s(
                'display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;background:var(--tint);color:var(--brandhover);font-size:12.5px;font-weight:600;border:1px solid color-mix(in srgb,var(--brand) 22%,transparent);',
              )}
            >
              📍 Made for Iloilo City
            </span>
          </div>
          <nav className="navlinks">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={s('color:var(--text);font-size:15px;font-weight:500;')}
              >
                {l.label}
              </a>
            ))}
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
            <a
              href="#"
              style={s(
                'color:var(--text);font-size:15px;font-weight:600;padding:9px 8px;',
              )}
            >
              Log In
            </a>
            <a
              href="#businesses"
              className="il-btn-primary"
              style={s(
                'background:var(--brand);color:#fff;font-size:15px;font-weight:600;padding:11px 18px;border-radius:10px;box-shadow:0 2px 8px rgba(101,163,13,.28);',
              )}
            >
              List Your Business
            </a>
          </div>
          <button
            className="hamb"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            style={s('border:1px solid var(--border);color:var(--text);')}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          style={s(
            'position:fixed;inset:72px 0 0 0;z-index:49;background:var(--bg);padding:24px;display:flex;flex-direction:column;gap:6px;',
          )}
        >
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              style={s(
                'color:var(--text);font-size:20px;font-weight:600;padding:16px 4px;border-bottom:1px solid var(--border);',
              )}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#businesses"
            onClick={() => setMenuOpen(false)}
            style={s(
              'margin-top:16px;text-align:center;background:var(--brand);color:#fff;font-size:17px;font-weight:600;padding:15px;border-radius:12px;',
            )}
          >
            List Your Business
          </a>
        </div>
      )}
    </>
  );
}
