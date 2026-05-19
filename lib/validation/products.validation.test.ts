import { describe, it, expect } from 'vitest';
import {
  priceTypeSchema,
  createProductSchema,
  updateProductSchema,
  categoryFiltersSchema,
  productFiltersSchema,
} from './products';

describe('priceTypeSchema', () => {
  const valid = ['fixed', 'from', 'per_hour', 'per_day', 'per_person', 'per_event'] as const;

  it.each(valid)('accepts "%s"', (type) => {
    expect(priceTypeSchema.parse(type)).toBe(type);
  });

  it('rejects an unknown price type', () => {
    expect(() => priceTypeSchema.parse('monthly')).toThrow();
    expect(() => priceTypeSchema.parse('')).toThrow();
  });
});

describe('createProductSchema', () => {
  const base = {
    name: 'Flat White',
    price: 185,
    category_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('accepts a minimal valid product', () => {
    const result = createProductSchema.parse(base);
    expect(result.name).toBe('Flat White');
    expect(result.price).toBe(185);
  });

  it('defaults price_type to "fixed"', () => {
    expect(createProductSchema.parse(base).price_type).toBe('fixed');
  });

  it('defaults is_available to true', () => {
    expect(createProductSchema.parse(base).is_available).toBe(true);
  });

  it('accepts all valid price types', () => {
    const types = ['fixed', 'from', 'per_hour', 'per_day', 'per_person', 'per_event'] as const;
    for (const price_type of types) {
      expect(createProductSchema.parse({ ...base, price_type }).price_type).toBe(price_type);
    }
  });

  it('accepts optional price_unit', () => {
    const result = createProductSchema.parse({ ...base, price_unit: 'per table' });
    expect(result.price_unit).toBe('per table');
  });

  it('accepts optional description', () => {
    const result = createProductSchema.parse({ ...base, description: 'Smooth espresso' });
    expect(result.description).toBe('Smooth espresso');
  });

  it('accepts is_available set to false', () => {
    const result = createProductSchema.parse({ ...base, is_available: false });
    expect(result.is_available).toBe(false);
  });

  it('rejects missing name', () => {
    expect(() => createProductSchema.parse({ ...base, name: '' })).toThrow();
  });

  it('rejects negative price', () => {
    expect(() => createProductSchema.parse({ ...base, price: -1 })).toThrow();
  });

  it('accepts price of zero', () => {
    expect(createProductSchema.parse({ ...base, price: 0 }).price).toBe(0);
  });

  it('rejects an invalid category_id (not a UUID)', () => {
    expect(() => createProductSchema.parse({ ...base, category_id: 'not-a-uuid' })).toThrow();
  });
});

describe('updateProductSchema', () => {
  it('allows all fields to be optional', () => {
    expect(() => updateProductSchema.parse({})).not.toThrow();
  });

  it('accepts a status field', () => {
    const result = updateProductSchema.parse({ status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('rejects an invalid status', () => {
    expect(() => updateProductSchema.parse({ status: 'deleted' })).toThrow();
  });
});

describe('categoryFiltersSchema', () => {
  it('defaults page to 1, per_page to 10, sort_by to name_asc', () => {
    const result = categoryFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(10);
    expect(result.sort_by).toBe('name_asc');
  });

  it('accepts per_page up to 500', () => {
    expect(() => categoryFiltersSchema.parse({ per_page: 500 })).not.toThrow();
    expect(() => categoryFiltersSchema.parse({ per_page: 200 })).not.toThrow();
  });

  it('rejects per_page above 500', () => {
    expect(() => categoryFiltersSchema.parse({ per_page: 501 })).toThrow();
  });

  it('rejects per_page of 0', () => {
    expect(() => categoryFiltersSchema.parse({ per_page: 0 })).toThrow();
  });

  it('accepts all valid sort_by values', () => {
    const values = ['name_asc', 'name_desc', 'newest', 'oldest'] as const;
    for (const sort_by of values) {
      expect(categoryFiltersSchema.parse({ sort_by }).sort_by).toBe(sort_by);
    }
  });

  it('rejects an invalid sort_by value', () => {
    expect(() => categoryFiltersSchema.parse({ sort_by: 'price_low' })).toThrow();
  });
});

describe('productFiltersSchema', () => {
  it('defaults page, per_page, and sort_by', () => {
    const result = productFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(10);
    expect(result.sort_by).toBe('newest');
  });

  it('rejects per_page above 100', () => {
    expect(() => productFiltersSchema.parse({ per_page: 101 })).toThrow();
  });

  it('accepts all product sort_by values', () => {
    const values = ['newest', 'oldest', 'name_asc', 'name_desc', 'price_low', 'price_high'] as const;
    for (const sort_by of values) {
      expect(productFiltersSchema.parse({ sort_by }).sort_by).toBe(sort_by);
    }
  });
});
