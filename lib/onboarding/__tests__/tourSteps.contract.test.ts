/**
 * The tour's anchor contract.
 *
 * A step whose `data-tour` attribute was renamed or deleted points at nothing —
 * the exact failure the `LandingSection` union exists to prevent, and which has
 * shipped twice in this repo as dead nav links. `NavItem.tourId` is typed as
 * `TourStepId`, so a rename breaks the build at the nav config; this suite
 * covers the anchors that are written as literal attributes, plus the flag
 * names, which no type can check against `app_settings`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  TOUR_STEPS,
  TOUR_ORDER,
  resolveTourSteps,
  tourAnchorSelector,
  type TourStepId,
} from '../tourSteps';
import type { OfferingVocabulary } from '@/lib/types/offering';

const ROOT = join(__dirname, '..', '..', '..');
const SCAN_DIRS = ['app', 'components'];
const EXTS = ['.ts', '.tsx'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (EXTS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

const CORPUS = SCAN_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const vocabulary: OfferingVocabulary = {
  singular: 'Service',
  plural: 'Services',
  catalogue: 'Service Menu',
  addLabel: 'Add Service',
  saveLabel: 'Save Service',
  updateLabel: 'Update Service',
  emptyLabel: 'No services yet',
  totalLabel: 'Total Services',
  imageLabel: 'Service Image',
  nameRequiredLabel: 'Service name is required',
  defaultKind: 'service',
} as unknown as OfferingVocabulary;

describe('tour step contract', () => {
  it('orders every declared step exactly once', () => {
    const ids = Object.keys(TOUR_STEPS) as TourStepId[];
    expect([...TOUR_ORDER].sort()).toEqual([...ids].sort());
    expect(new Set(TOUR_ORDER).size).toBe(TOUR_ORDER.length);
  });

  it('anchors every step to a data-tour attribute that exists in the app', () => {
    for (const id of TOUR_ORDER) {
      // Either written literally on an element, or handed to the nav config's
      // typed `tourId`, which `Nav.tsx` renders as `data-tour`.
      const literal = `data-tour="${id}"`;
      const viaNav = `tourId: '${id}'`;
      expect(
        CORPUS.includes(literal) || CORPUS.includes(viaNav),
        `no anchor found for tour step "${id}"`,
      ).toBe(true);
    }
  });

  it('renders data-tour from the nav config rather than hardcoding it', () => {
    // The three sidebar anchors ride `NavItem.tourId`; if that binding is ever
    // dropped, three steps silently point at nothing while the ids still exist.
    expect(CORPUS).toContain('data-tour={item.tourId}');
  });

  it('names only flags the platform actually has', () => {
    const known = ['enable_bookings', 'enable_events'];
    for (const id of TOUR_ORDER) {
      const { flag } = TOUR_STEPS[id];
      if (flag) expect(known).toContain(flag);
    }
  });

  it('builds a selector that matches the id verbatim', () => {
    expect(tourAnchorSelector('nav-coupons')).toBe('[data-tour="nav-coupons"]');
  });
});

describe('resolveTourSteps', () => {
  it('drops flagged steps while their flag is off, so they never count', () => {
    const off = resolveTourSteps({ vocabulary, flags: {} });
    const on = resolveTourSteps({
      vocabulary,
      flags: { enable_bookings: true },
    });

    expect(off.map((s) => s.id)).not.toContain('nav-bookings');
    expect(on.map((s) => s.id)).toContain('nav-bookings');
    expect(on.length).toBe(off.length + 1);
  });

  it('treats a non-true flag value as off', () => {
    const steps = resolveTourSteps({
      vocabulary,
      // A missing row reads as `undefined` here; nothing but `true` may pass.
      flags: { enable_bookings: false },
    });
    expect(steps.map((s) => s.id)).not.toContain('nav-bookings');
  });

  it('speaks the shop’s vocabulary, not retail’s', () => {
    const steps = resolveTourSteps({ vocabulary, flags: {} });
    const catalogue = steps.find((s) => s.id === 'nav-catalogue');

    expect(catalogue?.title).toBe('Service Menu');
    expect(catalogue?.body).toContain('services');
    expect(catalogue?.body).not.toContain('products');
  });

  it('never resolves an empty title or body', () => {
    for (const step of resolveTourSteps({
      vocabulary,
      flags: { enable_bookings: true },
    })) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks the sidebar steps, since the sidebar starts collapsed', () => {
    const steps = resolveTourSteps({ vocabulary, flags: {} });
    const bySidebar = Object.fromEntries(
      steps.map((s) => [s.id, s.inSidebar]),
    ) as Record<string, boolean>;

    expect(bySidebar['nav-catalogue']).toBe(true);
    expect(bySidebar['setup-checklist']).toBe(false);
  });
});
