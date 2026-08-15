import { describe, expect, it } from 'vitest';
import {
  locationSchema,
  step2Schema,
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
