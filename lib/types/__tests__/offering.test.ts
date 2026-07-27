import { describe, it, expect } from 'vitest';
import {
  OFFERING_KINDS,
  OFFERING_MODES,
  defaultKindForMode,
  modeAllowsProducts,
  modeAllowsServices,
} from '@/lib/types/offering';
import type { OfferingMode } from '@/lib/types/offering';

/**
 * These constants mirror DB CHECK constraints (migration 20260727000000).
 * A drift here means the app can send a value PostgREST will reject.
 */
describe('offering constants', () => {
  it('matches the products.kind CHECK', () => {
    expect([...OFFERING_KINDS]).toEqual(['product', 'service']);
  });

  it('matches the businesses.offering_mode CHECK', () => {
    expect([...OFFERING_MODES]).toEqual(['products', 'services', 'both']);
  });
});

describe('modeAllowsProducts / modeAllowsServices', () => {
  const table: Array<[OfferingMode, boolean, boolean]> = [
    // mode, allows products, allows services
    ['products', true, false],
    ['services', false, true],
    ['both', true, true],
  ];

  it.each(table)(
    '%s → products %s, services %s',
    (mode, products, services) => {
      expect(modeAllowsProducts(mode)).toBe(products);
      expect(modeAllowsServices(mode)).toBe(services);
    },
  );

  it('never reports a mode as allowing neither', () => {
    for (const mode of OFFERING_MODES) {
      expect(modeAllowsProducts(mode) || modeAllowsServices(mode)).toBe(true);
    }
  });
});

describe('defaultKindForMode', () => {
  it('defaults a pure services business to service', () => {
    expect(defaultKindForMode('services')).toBe('service');
  });

  it('defaults products and both to product', () => {
    // 'both' is genuinely ambiguous per row — the form asks rather than guesses.
    expect(defaultKindForMode('products')).toBe('product');
    expect(defaultKindForMode('both')).toBe('product');
  });

  it('only ever returns a kind the CHECK accepts', () => {
    for (const mode of OFFERING_MODES) {
      expect(OFFERING_KINDS).toContain(defaultKindForMode(mode));
    }
  });
});
