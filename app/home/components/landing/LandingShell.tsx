'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import './landing.css';
import { themeTokens } from './tokens';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { BetaBanner } from './BetaBanner';
import { GradientField } from './GradientField';

/**
 * The landing's client shell: the ambient sky, the shared chrome, and the theme.
 *
 * This is the ONLY reason the landing needs a client boundary. It is split out
 * from `LandingPage` so the boundary wraps the chrome instead of the page —
 * with `'use client'` on the composition root, every section it rendered was
 * pulled into the client bundle whether or not it declared the directive, and
 * five of the seven are pure markup. They come through as `children` now, so
 * they stay server components and their markup never ships as JS.
 *
 * Theme: the landing used to run a page-local `useState` for dark mode, which
 * did not persist, ignored the OS preference, and repainted nothing outside
 * `[data-ilokal-root]`. It is driven by `next-themes` like the rest of the app,
 * so the nav toggle moves BOTH the custom properties the chrome reads and the
 * `.dark` class the sections read. `mounted` gates it because the resolved
 * theme is not known during SSR.
 *
 * The `[data-ilokal-root]` wrapper survives on purpose: `LandingNav` and
 * `LandingFooter` are shared with `/explore` and are styled entirely from those
 * custom properties. The sections are plain Tailwind on the app's tokens.
 */
export function LandingShell({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === 'dark';

  return (
    <div
      data-ilokal-root
      style={themeTokens(dark)}
      className="relative min-h-screen overflow-x-hidden text-[#1A1A1A] dark:text-[#F7F5EF]"
    >
      <GradientField />

      <LandingNav
        dark={dark}
        onToggleDark={() => setTheme(dark ? 'light' : 'dark')}
      />

      <BetaBanner />

      <main>{children}</main>

      <LandingFooter dark={dark} />
    </div>
  );
}
