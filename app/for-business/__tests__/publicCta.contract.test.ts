/**
 * No public surface may send a logged-out visitor into the login wall.
 *
 * `/business` is a wholesale protected prefix (`lib/utils/protectedRoutes.ts`),
 * and the registration wizard's layout calls `getMyBusinesses()`, which throws
 * unauthenticated — so every "List your business" CTA that pointed at
 * `ROUTES.BUSINESS.registration` bounced a stranger to `/sign-in` having
 * explained nothing. A source sweep, because the failure is a link's
 * destination, which no render test on one component would catch.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTES } from '@/config/routeConfig';
import { isProtectedPath } from '@/lib/utils/protectedRoutes';

const ROOT = join(__dirname, '..', '..', '..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/**
 * Swept as DIRECTORIES, not an enumerated list.
 *
 * The first version of this test named four files and passed while two more
 * landing CTAs — the hero's and the final call to action — still sent logged-out
 * visitors into the wizard. A list of known offenders only ever catches the
 * offenders you already knew about.
 */
const PUBLIC_DIRS = ['app/home/components/landing', 'components/customer'];

/**
 * The page itself is swept separately: it MAY link to the wizard, but only
 * behind a role check — a signed-in customer sent there is bounced by the
 * proxy, which is the dead-end this page exists to remove.
 */
const PAGE = 'app/for-business/page.tsx';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const PUBLIC_SURFACES = PUBLIC_DIRS.flatMap((dir) =>
  sourceFiles(join(ROOT, dir)),
);

describe('public business CTAs', () => {
  it('point at the explainer, never straight at the protected wizard', () => {
    for (const file of PUBLIC_SURFACES) {
      expect(
        readFileSync(file, 'utf8').includes('ROUTES.BUSINESS.registration'),
        `${file} still links a logged-out visitor into the protected wizard`,
      ).toBe(false);
    }

    // ...and the destination is actually used, rather than the CTA quietly
    // disappearing.
    const linksToPage = PUBLIC_SURFACES.filter((file) =>
      readFileSync(file, 'utf8').includes('ROUTES.PUBLIC.FOR_BUSINESS'),
    );
    expect(linksToPage.length).toBeGreaterThanOrEqual(4);
  });

  it('gates the page’s own wizard link on the role, not on a session', () => {
    const source = read(PAGE);

    // `roleAllowedForPath` admits only these two into `/business/**`.
    expect(source).toContain("user?.role === 'business_owner'");
    expect(source).toContain("user?.role === 'admin'");
    // The bug this replaced: `Boolean(user)`, which sent customers to the
    // wizard and had them bounced to /home with no explanation.
    expect(source).not.toContain('const signedIn = Boolean(user)');
  });

  it('is registered for session refresh, since it reads one', () => {
    // Unmatched, nothing refreshes an expiring token: the RSC cannot write the
    // rotated cookie, so a live owner session renders as anonymous.
    expect(read('proxy.ts')).toContain("'/for-business'");
  });

  it('lands somewhere anonymous visitors can actually read', () => {
    // The whole point of the route choice: outside the protected prefix.
    expect(isProtectedPath(ROUTES.PUBLIC.FOR_BUSINESS)).toBe(false);
    expect(ROUTES.PUBLIC.FOR_BUSINESS.startsWith('/business')).toBe(false);
  });

  it('gives the dashboard’s "Learn More" a destination', () => {
    // It was a `<Button>` with no handler and no link.
    const source = read(
      'app/business/[businessId]/home/components/OnboardingSection.tsx',
    );
    const learnMore = source.slice(source.indexOf('Learn More') - 220);

    expect(learnMore).toContain('ROUTES.PUBLIC.FOR_BUSINESS');
  });
});

describe('the step list has one source', () => {
  it('is read from stepMeta, not retyped per surface', () => {
    // Two hand-maintained lists of the same steps is how a marketing page ends
    // up describing a flow the product no longer has.
    for (const file of [
      'app/for-business/page.tsx',
      'app/business/[businessId]/home/components/RegistrationSteps.tsx',
    ]) {
      expect(read(file)).toContain('stepMeta');
    }
    // The wizard builds its components around the same metadata.
    expect(read('app/business/registration/data/steps.tsx')).toContain(
      "from './stepMeta'",
    );
  });

  it('no longer claims a progress step nobody is on', () => {
    const source = read(
      'app/business/[businessId]/home/components/RegistrationSteps.tsx',
    );

    // `currentStep` was defaulted to 1 and never passed, so every visitor was
    // told they were on step 1 of a form they had not opened.
    expect(source).not.toContain('currentStep');
  });
});
