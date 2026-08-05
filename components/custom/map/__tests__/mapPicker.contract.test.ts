/**
 * One map picker, three call sites.
 *
 * Source-level, because what is being pinned is where the code LIVES and how
 * it is mounted — neither of which any render can observe:
 *
 * - the picker sat under `app/business/registration/components/` while branch
 *   creation reached across features to import it, and the event form was
 *   about to be the third such reach,
 * - leaflet touches `window` at import, so a mount that is not
 *   `ssr: false` breaks the build rather than the page,
 * - `scrollWheelZoom` defaults to true, which inside a scrolling dialog body
 *   means the wheel zooms the map and the reader is stuck mid-form.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const SHARED = 'components/custom/map/LocationPicker.tsx';
const CALL_SITES = [
  'app/business/registration/steps/ShopInformation.tsx',
  'app/business/[businessId]/branches/create/steps/step-branch-location.tsx',
  'components/custom/map/LocationField.tsx',
];

describe('the picker has one home', () => {
  it.each(CALL_SITES)('%s imports the shared component', (relative) => {
    const source = read(relative);
    expect(source).toMatch(
      /import\('(@\/components\/custom\/map\/LocationPicker|\.\/LocationPicker)'\)/,
    );
  });

  it.each(CALL_SITES)('%s does not reach into another feature', (relative) => {
    // The exact shape that made this a shared component: branch-create was
    // importing '@/app/business/registration/components/LocationPicker'.
    expect(read(relative)).not.toContain(
      'app/business/registration/components/LocationPicker',
    );
  });

  it.each(CALL_SITES)('%s mounts it client-only', (relative) => {
    const source = read(relative);
    expect(source).toContain('dynamic(');
    expect(source).toContain('ssr: false');
  });
});

describe('the geolocation button is one hook', () => {
  it.each(CALL_SITES)('%s uses useGeolocation', (relative) => {
    expect(read(relative)).toMatch(/useGeolocation/);
  });

  it.each(CALL_SITES)('%s hand-rolls no getCurrentPosition', (relative) => {
    // Twenty duplicated lines in two files, about to be three.
    expect(read(relative)).not.toContain('navigator.geolocation');
  });
});

describe('the map behaves inside a dialog', () => {
  it('re-measures when its box changes', () => {
    const source = read(SHARED);
    // Leaflet lays tiles out against the size it measured at mount; in a
    // dialog that is mid-open-animation, and the result is a grey band.
    expect(source).toContain('invalidateSize');
    expect(source).toContain('ResizeObserver');
  });

  it('lets the caller switch wheel zoom off', () => {
    expect(read(SHARED)).toContain('scrollWheelZoom');
  });

  it('keeps wheel zoom on by default, so the page forms are unchanged', () => {
    expect(read(SHARED)).toContain('scrollWheelZoom = true');
  });

  it('is switched off in the event dialog, which scrolls', () => {
    expect(read('components/custom/events/EventFormDialog.tsx')).toContain(
      'scrollWheelZoom={false}',
    );
  });
});

describe('the event form pins on a map rather than asking for numbers', () => {
  const dialog = read('components/custom/events/EventFormDialog.tsx');

  it('renders the shared field', () => {
    expect(dialog).toContain('LocationField');
  });

  it('no longer carries two bare coordinate inputs', () => {
    // The regression this replaces: `id="event-lat"` / `id="event-lng"` with
    // a real Iloilo coordinate as the placeholder and nothing to pick from.
    expect(dialog).not.toContain('id="event-lat"');
    expect(dialog).not.toContain('id="event-lng"');
  });

  it('still sends the pair only when both parse', () => {
    // Unchanged by the map: a blank field means "I did not set a pin", never
    // "erase the one that is there" — the service refuses a partial write for
    // the same reason.
    expect(dialog).toContain('const coordinates = (state: FormState)');
    expect(dialog).toContain('Number.isFinite(lat)');
  });
});

describe('leaflet is contained in its own stacking context', () => {
  // Leaflet hardcodes `z-index: 400` on its panes and `1000` on its control
  // corners. Both outrank the sticky public header (`z-50`) and a Radix
  // dialog's chrome, and without a stacking context on the map's own wrapper
  // those numbers compete with the whole page — which is exactly how the shop
  // page's branch map came to paint over the navigation bar.
  const isolated = (source: string) =>
    /className="[^"]*\bz-0\b[^"]*"/.test(source) &&
    /className="[^"]*\bisolate\b[^"]*"/.test(source);

  it('holds for the shared picker, so every call site inherits it', () => {
    expect(isolated(read('components/custom/map/LocationPicker.tsx'))).toBe(
      true,
    );
  });

  it('holds for the public branch map', () => {
    expect(isolated(read('components/customer/BusinessMap.tsx'))).toBe(true);
  });
});
