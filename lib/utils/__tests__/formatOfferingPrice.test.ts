import { describe, it, expect } from 'vitest';
import {
  formatOfferingPrice,
  formatOfferingPricePair,
  formatPeso,
  PRICE_ON_REQUEST,
} from '@/lib/utils/formatOfferingPrice';
import type { PriceType } from '@/lib/types';

describe('formatPeso', () => {
  it('groups thousands and forces no decimals', () => {
    expect(formatPeso(3500)).toBe('₱3,500');
    expect(formatPeso(500)).toBe('₱500');
    expect(formatPeso(12000)).toBe('₱12,000');
  });

  it('keeps significant decimals when the amount has them', () => {
    expect(formatPeso(185.5)).toBe('₱185.5');
  });
});

describe('formatOfferingPrice — every price_type', () => {
  const cases: Array<[PriceType, number, string]> = [
    ['fixed', 280, '₱280'],
    ['from', 12000, 'From ₱12,000'],
    ['per_hour', 500, '₱500/hr'],
    ['per_day', 3500, '₱3,500/day'],
    ['per_person', 350, '₱350/person'],
    ['per_event', 25000, '₱25,000/event'],
  ];

  it.each(cases)('%s renders as %s', (price_type, price, expected) => {
    expect(formatOfferingPrice({ price, price_type })).toBe(expected);
  });
});

describe('formatOfferingPrice — price_unit override', () => {
  it('replaces the enum suffix with the owner label, space-separated', () => {
    expect(
      formatOfferingPrice({
        price: 800,
        price_type: 'per_event',
        price_unit: 'per table',
      }),
    ).toBe('₱800 per table');
  });

  it('applies to fixed pricing too', () => {
    expect(
      formatOfferingPrice({
        price: 350,
        price_type: 'fixed',
        price_unit: 'per pax',
      }),
    ).toBe('₱350 per pax');
  });

  it('keeps the "From" prefix alongside a unit override', () => {
    expect(
      formatOfferingPrice({
        price: 12000,
        price_type: 'from',
        price_unit: 'per unit',
      }),
    ).toBe('From ₱12,000 per unit');
  });

  it('ignores a blank / whitespace-only unit', () => {
    expect(
      formatOfferingPrice({
        price: 500,
        price_type: 'per_hour',
        price_unit: '   ',
      }),
    ).toBe('₱500/hr');
  });
});

describe('formatOfferingPrice — degradation', () => {
  it('falls back to fixed when price_type is absent', () => {
    expect(formatOfferingPrice({ price: 280 })).toBe('₱280');
  });

  it('falls back to fixed on an unknown price_type rather than breaking', () => {
    // Forward-compat: a row written by a newer build must still show a figure.
    expect(
      formatOfferingPrice({ price: 280, price_type: 'per_fortnight' }),
    ).toBe('₱280');
  });

  it('renders quote copy for a null price (Phase 3 on_request)', () => {
    expect(formatOfferingPrice({ price: null })).toBe(PRICE_ON_REQUEST);
    expect(formatOfferingPrice({ price: undefined })).toBe(PRICE_ON_REQUEST);
  });

  it('renders quote copy rather than "₱NaN" for a non-finite price', () => {
    expect(formatOfferingPrice({ price: Number.NaN })).toBe(PRICE_ON_REQUEST);
  });

  it('renders a zero price as free, not as a quote', () => {
    expect(formatOfferingPrice({ price: 0, price_type: 'fixed' })).toBe('₱0');
  });
});

describe('formatOfferingPrice — quote-based (on_request)', () => {
  it('renders quote copy for a quote-priced offering', () => {
    expect(formatOfferingPrice({ price: null, price_type: 'on_request' })).toBe(
      PRICE_ON_REQUEST,
    );
  });

  it('wins over a stale price left on the row', () => {
    // The DB CHECK only requires a price for NON-quote types, so switching an
    // offering to quote-based leaves the old figure behind. Showing it would
    // quote a price the business has withdrawn.
    expect(formatOfferingPrice({ price: 3500, price_type: 'on_request' })).toBe(
      PRICE_ON_REQUEST,
    );
  });

  it('ignores a unit label — there is no amount to qualify', () => {
    expect(
      formatOfferingPrice({
        price: null,
        price_type: 'on_request',
        price_unit: 'per van',
      }),
    ).toBe(PRICE_ON_REQUEST);
  });
});

describe('formatOfferingPricePair', () => {
  it('returns a null sale when the offering is not discounted', () => {
    expect(
      formatOfferingPricePair({ price: 500, price_type: 'per_hour' }),
    ).toEqual({ base: '₱500/hr', sale: null });
  });

  it('carries the same suffix onto the sale figure', () => {
    // The bug this guards: "₱400 ₱500/hr" — a struck-through unit price next
    // to a unit-less sale price.
    expect(
      formatOfferingPricePair({
        price: 500,
        sale_price: 400,
        price_type: 'per_hour',
      }),
    ).toEqual({ base: '₱500/hr', sale: '₱400/hr' });
  });

  it('carries a unit override onto both figures', () => {
    expect(
      formatOfferingPricePair({
        price: 3500,
        sale_price: 2800,
        price_type: 'per_day',
        price_unit: 'per van',
      }),
    ).toEqual({ base: '₱3,500 per van', sale: '₱2,800 per van' });
  });

  it('never pairs a sale onto a quote-based offering', () => {
    // Without the guard this rendered "Price on request" struck through beside
    // "Price on request".
    expect(
      formatOfferingPricePair({
        price: null,
        sale_price: 2800,
        price_type: 'on_request',
      }),
    ).toEqual({ base: PRICE_ON_REQUEST, sale: null });
  });

  it('treats a null sale_price as no discount', () => {
    expect(
      formatOfferingPricePair({
        price: 280,
        sale_price: null,
        price_type: 'fixed',
      }),
    ).toEqual({ base: '₱280', sale: null });
  });
});
