'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import './landing.css';
import { themeTokens } from './tokens';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { BetaBanner } from './BetaBanner';
import { GradientField } from './GradientField';
import { Hero } from './sections/Hero';
import { NearYou } from './sections/NearYou';
import { DealsWall } from './sections/DealsWall';
import { CounterMoment } from './sections/CounterMoment';
import { Voices } from './sections/Voices';
import { ForBusiness } from './sections/ForBusiness';
import { FinalCta } from './sections/FinalCta';

/**
 * The landing page. (Design plan kept local, not committed.)
 *
 * The page is a walk: content sits on one ambient gradient sky (`GradientField`)
 * that warms as you descend, broken twice by a solid Brick Ember section so the
 * rhythm has somewhere to land.
 *
 * Theme: the landing used to run a page-local `useState` for dark mode, which
 * did not persist, ignored the OS preference, and repainted nothing outside
 * `[data-ilokal-root]`. It is now driven by `next-themes` like the rest of the
 * app, so the nav toggle moves BOTH the custom properties the chrome reads and
 * the `.dark` class the sections read. `mounted` gates it because the resolved
 * theme is not known during SSR.
 *
 * The `[data-ilokal-root]` wrapper survives on purpose: `LandingNav` and
 * `LandingFooter` are shared with `/explore` and are styled entirely from those
 * custom properties. The sections are plain Tailwind on the app's tokens.
 */
export function LandingPage() {
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

      <main>
        <Hero />
        <NearYou />
        <DealsWall />
        <CounterMoment />
        <Voices />
        <ForBusiness />
        <FinalCta />
      </main>

      <LandingFooter dark={dark} />
    </div>
  );
}
