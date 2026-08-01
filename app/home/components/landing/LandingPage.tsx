import { LandingShell } from './LandingShell';
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
 * A SERVER component on purpose. Only two of these sections need the client —
 * `Hero` (the craving rotation) and `DealsWall` (the category filter) — and they
 * declare it themselves. The theme + chrome live in `LandingShell`, so the
 * client boundary wraps the chrome rather than the whole page and the other
 * five sections ship as markup with no JS behind them.
 */
export function LandingPage() {
  return (
    <LandingShell>
      <Hero />
      <NearYou />
      <DealsWall />
      <CounterMoment />
      <Voices />
      <ForBusiness />
      <FinalCta />
    </LandingShell>
  );
}
