import { describe, expect, it } from 'vitest';
import {
  locationSchema,
  step1Schema,
  step2Schema,
  step3Schema,
} from '../business-registration-form-schema';

const validLocation = {
  province: 'ILOILO',
  city: 'Iloilo City',
  barangay: 'Jaro',
  street_address: '123 Main Street',
  zip_code: '5000',
  latitude: 10.72,
  longitude: 122.56,
  geometry: 'lat:10.72,lng:122.56',
};

const validStep2 = {
  shop_name: 'The Coffee House',
  description: 'Specialty coffee in the heart of Iloilo.',
  location: validLocation,
};

describe('locationSchema (tightened address fields)', () => {
  it('accepts a well-formed location', () => {
    const result = locationSchema.safeParse(validLocation);
    expect(result.success).toBe(true);
  });

  it('accepts a location without coordinates (lat/lng are optional)', () => {
    const rest: Record<string, unknown> = { ...validLocation };
    delete rest.latitude;
    delete rest.longitude;
    const result = locationSchema.safeParse({ ...rest, geometry: '' });
    // geometry is still required — the pin proof — but lat/lng alone are not.
    expect(result.success).toBe(false);
    const issues = result.error?.issues.map((i) => i.path.join('.')) ?? [];
    expect(issues).toContain('geometry');
    expect(issues).not.toContain('latitude');
    expect(issues).not.toContain('longitude');
  });

  it('rejects a ZIP code with letters', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      zip_code: '50OO',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('4 digits');
  });

  it('rejects a five-digit ZIP code', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      zip_code: '50000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short ZIP code', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      zip_code: '50',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a ZIP code with surrounding whitespace (trimmed)', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      zip_code: ' 5000 ',
    });
    expect(result.success).toBe(true);
    expect(result.data?.zip_code).toBe('5000');
  });

  it('rejects a whitespace-only street address', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      street_address: '   ',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('full street address');
  });

  it('rejects a street address shorter than 5 characters', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      street_address: '12 A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an over-long street address', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      street_address: 'A'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing province / city / barangay', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      province: '',
      city: '',
      barangay: '',
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join('.')) ?? [];
    expect(paths).toEqual(
      expect.arrayContaining(['province', 'city', 'barangay']),
    );
  });

  it('rejects an out-of-range latitude', () => {
    const result = locationSchema.safeParse({ ...validLocation, latitude: 91 });
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range longitude', () => {
    const result = locationSchema.safeParse({
      ...validLocation,
      longitude: -181,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing geometry (no map pin)', () => {
    const result = locationSchema.safeParse({ ...validLocation, geometry: '' });
    expect(result.success).toBe(false);
  });
});

describe('step2Schema (shop info fields)', () => {
  it('accepts a well-formed step 2', () => {
    const result = step2Schema.safeParse(validStep2);
    expect(result.success).toBe(true);
  });

  it('rejects a whitespace-only shop name', () => {
    const result = step2Schema.safeParse({ ...validStep2, shop_name: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Shop name is required');
  });

  it('rejects an over-long shop name', () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      shop_name: 'A'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('trims the shop name', () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      shop_name: '  The Coffee House  ',
    });
    expect(result.success).toBe(true);
    expect(result.data?.shop_name).toBe('The Coffee House');
  });

  it('rejects a whitespace-only description', () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      description: ' \n ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a description longer than the 500-char counter', () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      description: 'A'.repeat(501),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('500 characters');
  });

  it('rejects a bad location inside the full step', () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      location: { ...validLocation, zip_code: 'not-a-zip' },
    });
    expect(result.success).toBe(false);
  });
});

const image = (name: string) =>
  new File(['bytes'], name, { type: 'image/png' });

describe('step3Schema (gallery is gated on its own step)', () => {
  it('accepts a logo, no uploaded banner, and one interior photo', () => {
    const result = step3Schema.safeParse({
      shop_logo: image('logo.png'),
      shop_banner: undefined,
      interior_images: [image('inside.png')],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing logo instead of deferring it to Submit', () => {
    const result = step3Schema.safeParse({
      shop_logo: undefined,
      shop_banner: undefined,
      interior_images: [image('inside.png')],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['shop_logo']);
  });

  it('rejects an empty interior gallery', () => {
    const result = step3Schema.safeParse({
      shop_logo: image('logo.png'),
      shop_banner: undefined,
      interior_images: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['interior_images']);
  });
});

// Existing submit tests continue to pin all related behavior.

describe('step1Schema (business category)', () => {
  it('rejects a restored custom category on step 1, not at Submit', () => {
    const result = step1Schema.safeParse({
      business_category: { type: 'custom', name: 'Weird', description: 'x' },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['business_category']);
  });

  it('accepts a predefined category', () => {
    const result = step1Schema.safeParse({
      business_category: {
        id: '1c772728-189e-4eac-a61a-029382a396aa',
        type: 'predefined',
        name: 'Café',
      },
    });
    expect(result.success).toBe(true);
  });
});
