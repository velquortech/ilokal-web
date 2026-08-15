/**
 * The resolver's whole job is the fallback contract: `offering_profile` is
 * admin-editable JSONB, so a typo in Studio reaches production. It must never
 * be able to blank a heading or render `undefined`.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OFFERING_VOCABULARY,
  resolveOfferingVocabulary,
} from '@/lib/utils/offeringVocabulary';

const SALON_PROFILE = {
  products: { singular: 'Product', plural: 'Products', catalogue: 'Products' },
  services: {
    singular: 'Service',
    plural: 'Services',
    catalogue: 'Service Menu',
    shopLabel: 'My Salon',
    dealsLabel: 'Promos',
  },
  both: {
    singular: 'Offering',
    plural: 'Offerings',
    catalogue: 'Products & Services',
  },
  icon: 'Scissors',
};

describe('resolveOfferingVocabulary — mode selection', () => {
  it('reads the services nouns for a services business', () => {
    const v = resolveOfferingVocabulary(SALON_PROFILE, 'services');
    expect(v.catalogue).toBe('Service Menu');
    expect(v.shopLabel).toBe('My Salon');
    expect(v.dealsLabel).toBe('Promos');
    expect(v.addLabel).toBe('Add Service');
    expect(v.updateLabel).toBe('Update Service');
    expect(v.saveLabel).toBe('Save Service');
    expect(v.totalLabel).toBe('Total Services');
    expect(v.emptyLabel).toBe('No services yet');
    expect(v.imageLabel).toBe('Service Photo');
    expect(v.nameRequiredLabel).toBe('Service name is required');
  });

  it('reads the products nouns for a products business', () => {
    const v = resolveOfferingVocabulary(SALON_PROFILE, 'products');
    expect(v.catalogue).toBe('Products');
    expect(v.addLabel).toBe('Add Product');
  });

  it('reads its own noun set for a mixed business — never a concatenation', () => {
    const v = resolveOfferingVocabulary(SALON_PROFILE, 'both');
    expect(v.catalogue).toBe('Products & Services');
    expect(v.addLabel).toBe('Add Offering');
  });

  it('passes the icon through', () => {
    expect(resolveOfferingVocabulary(SALON_PROFILE, 'services').icon).toBe(
      'Scissors',
    );
  });

  it('supports a vertical the app has never heard of (data-only)', () => {
    // The versatility claim: onboarding van rental is a row edit, no deploy.
    const fleet = {
      services: {
        singular: 'Vehicle',
        plural: 'Fleet',
        catalogue: 'Our Fleet',
        shopLabel: 'My Fleet',
      },
    };
    const v = resolveOfferingVocabulary(fleet, 'services');
    expect(v.catalogue).toBe('Our Fleet');
    expect(v.shopLabel).toBe('My Fleet');
    // Not defined → universal default, never undefined.
    expect(v.dealsLabel).toBe('Coupons & Deals');
    expect(v.addLabel).toBe('Add Vehicle');
    expect(v.totalLabel).toBe('Total Fleet');
  });
});

describe('resolveOfferingVocabulary — fallback contract', () => {
  it('falls back wholesale on a null / undefined profile', () => {
    expect(resolveOfferingVocabulary(null, 'services')).toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
    expect(resolveOfferingVocabulary(undefined, 'services')).toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
  });

  it('falls back on a non-object profile (string / number / array-of-junk)', () => {
    expect(resolveOfferingVocabulary('nonsense', 'services')).toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
    expect(resolveOfferingVocabulary(42, 'services')).toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
  });

  it('falls back per-field when a mode is only partly defined', () => {
    const partial = { services: { catalogue: 'Service Menu' } };
    const v = resolveOfferingVocabulary(partial, 'services');
    expect(v.catalogue).toBe('Service Menu'); // defined → used
    expect(v.singular).toBe('Product'); // missing → retail default
    expect(v.plural).toBe('Products');
  });

  it('ignores blank and whitespace-only strings', () => {
    const blank = { services: { singular: '   ', plural: '', catalogue: '' } };
    // Words fall back to retail, but `defaultKind` still follows the MODE — a
    // services business creates services even with an unusable noun set.
    expect(resolveOfferingVocabulary(blank, 'services')).toEqual({
      ...DEFAULT_OFFERING_VOCABULARY,
      defaultKind: 'service',
    });
  });

  it('ignores wrong-typed noun values', () => {
    const wrong = { services: { singular: 42, plural: null, catalogue: {} } };
    expect(resolveOfferingVocabulary(wrong, 'services')).toEqual({
      ...DEFAULT_OFFERING_VOCABULARY,
      defaultKind: 'service',
    });
  });

  it('falls back when the requested mode key is absent', () => {
    const onlyProducts = {
      products: { singular: 'Widget', plural: 'Widgets', catalogue: 'Widgets' },
    };
    const v = resolveOfferingVocabulary(onlyProducts, 'services');
    expect(v.catalogue).toBe('Product Catalogue');
    expect(v.singular).toBe('Product');
  });

  it('treats an unknown / null mode as products (the pre-phase-1 reading)', () => {
    expect(resolveOfferingVocabulary(SALON_PROFILE, 'rental').catalogue).toBe(
      'Products',
    );
    expect(resolveOfferingVocabulary(SALON_PROFILE, null).catalogue).toBe(
      'Products',
    );
    expect(resolveOfferingVocabulary(SALON_PROFILE, undefined).catalogue).toBe(
      'Products',
    );
  });

  it('drops a non-string icon rather than passing junk to the nav', () => {
    const v = resolveOfferingVocabulary(
      { ...SALON_PROFILE, icon: 7 },
      'services',
    );
    expect(v.icon).toBeUndefined();
    expect(v.catalogue).toBe('Service Menu');
  });

  it('trims surrounding whitespace', () => {
    const padded = { services: { singular: '  Service  ' } };
    expect(resolveOfferingVocabulary(padded, 'services').singular).toBe(
      'Service',
    );
  });

  it('never returns an empty or undefined label, whatever the input', () => {
    const junk: unknown[] = [
      null,
      undefined,
      'x',
      0,
      [],
      {},
      { services: null },
      { services: { singular: '' } },
    ];
    const labelKeys = [
      'singular',
      'plural',
      'catalogue',
      'shopLabel',
      'dealsLabel',
      'addLabel',
      'updateLabel',
      'saveLabel',
      'nameRequiredLabel',
      'imageLabel',
      'totalLabel',
      'emptyLabel',
    ] as const;

    for (const profile of junk) {
      const v = resolveOfferingVocabulary(profile, 'services');
      for (const key of labelKeys) {
        expect(typeof v[key]).toBe('string');
        expect(v[key].length).toBeGreaterThan(0);
      }
      // The field policy must always be usable too — an empty price-type list
      // would leave the picker with nothing to select.
      expect(v.allowedPriceTypes.length).toBeGreaterThan(0);
      expect(Array.isArray(v.fields)).toBe(true);
    }
  });
});

describe('resolveOfferingVocabulary — field policy (phase 3)', () => {
  const RENTAL_PROFILE = {
    services: { singular: 'Vehicle', plural: 'Fleet', catalogue: 'Our Fleet' },
    fields: ['inventory_count', 'capacity', 'deposit_amount'],
    allowed_price_types: ['per_day', 'on_request'],
    default_booking_mode: 'date_range',
  };

  it('reads fields, price types, and booking mode from the profile', () => {
    const v = resolveOfferingVocabulary(RENTAL_PROFILE, 'services');
    expect(v.fields).toEqual(['inventory_count', 'capacity', 'deposit_amount']);
    expect(v.allowedPriceTypes).toEqual(['per_day', 'on_request']);
    expect(v.defaultBookingMode).toBe('date_range');
  });

  it('derives defaultKind from the MODE, not the profile', () => {
    // This is what closes the phase-1 decay: a services business must mint
    // services, and the DB cannot infer that from an omitted field.
    expect(
      resolveOfferingVocabulary(RENTAL_PROFILE, 'services').defaultKind,
    ).toBe('service');
    expect(
      resolveOfferingVocabulary(RENTAL_PROFILE, 'products').defaultKind,
    ).toBe('product');
    // 'both' is ambiguous per row — the form asks rather than guessing.
    expect(resolveOfferingVocabulary(RENTAL_PROFILE, 'both').defaultKind).toBe(
      'product',
    );
  });

  it('drops unrecognized field names rather than rendering unknown inputs', () => {
    const v = resolveOfferingVocabulary(
      { ...RENTAL_PROFILE, fields: ['capacity', 'wingspan', 'horsepower'] },
      'services',
    );
    expect(v.fields).toEqual(['capacity']);
  });

  it('falls back to no fields when every entry is unrecognized', () => {
    const v = resolveOfferingVocabulary(
      { ...RENTAL_PROFILE, fields: ['wingspan'] },
      'services',
    );
    expect(v.fields).toEqual([]);
  });

  it('falls back to every price type when the list is empty or all invalid', () => {
    // An empty picker would make the form unusable.
    expect(
      resolveOfferingVocabulary(
        { ...RENTAL_PROFILE, allowed_price_types: [] },
        'services',
      ).allowedPriceTypes,
    ).toContain('fixed');
    expect(
      resolveOfferingVocabulary(
        { ...RENTAL_PROFILE, allowed_price_types: ['per_fortnight'] },
        'services',
      ).allowedPriceTypes,
    ).toContain('on_request');
  });

  it('drops an unrecognized booking mode', () => {
    const v = resolveOfferingVocabulary(
      { ...RENTAL_PROFILE, default_booking_mode: 'calendar' },
      'services',
    );
    expect(v.defaultBookingMode).toBe('none');
  });

  it('gives a profile-less vertical the retail field policy', () => {
    const v = resolveOfferingVocabulary({ services: {} }, 'services');
    expect(v.fields).toEqual([]);
    expect(v.defaultBookingMode).toBe('none');
    expect(v.allowedPriceTypes).toContain('fixed');
  });
});

describe('DEFAULT_OFFERING_VOCABULARY', () => {
  it('is exactly the copy the surfaces used before phase 2', () => {
    expect(DEFAULT_OFFERING_VOCABULARY).toMatchObject({
      singular: 'Product',
      plural: 'Products',
      catalogue: 'Product Catalogue',
      shopLabel: 'My Shop',
      dealsLabel: 'Coupons & Deals',
      addLabel: 'Add Product',
      totalLabel: 'Total Products',
    });
  });
});
