import { describe, it, expect } from 'vitest';
import { Coffee } from 'lucide-react';
import {
  transformBusinessTypes,
  type RawBusinessType,
} from '../api/fetchCategories';

const makeRaw = (
  overrides: Partial<RawBusinessType> = {},
): RawBusinessType => ({
  name: 'Food & Drink',
  description: 'Restaurants and cafes',
  icon: 'Coffee',
  business_categories: [
    {
      id: 'cat-1',
      name: 'Cafe',
      description: 'Coffee shops',
      image_url: 'https://example.com/cafe.jpg',
    },
  ],
  ...overrides,
});

describe('transformBusinessTypes', () => {
  it('returns an empty array for empty input', () => {
    expect(transformBusinessTypes([])).toEqual([]);
  });

  it('maps a known icon string to a LucideIcon component', () => {
    const [result] = transformBusinessTypes([makeRaw({ icon: 'Coffee' })]);
    expect(result.icon).toBe(Coffee);
  });

  it('falls back to Coffee icon for an unknown icon name', () => {
    const [result] = transformBusinessTypes([makeRaw({ icon: 'Unknown' })]);
    expect(result.icon).toBe(Coffee);
  });

  it('renames image_url to imageURL in items', () => {
    const [result] = transformBusinessTypes([makeRaw()]);
    expect(result.items[0]).toHaveProperty(
      'imageURL',
      'https://example.com/cafe.jpg',
    );
    expect(result.items[0]).not.toHaveProperty('image_url');
  });

  it('preserves name and description on the type', () => {
    const [result] = transformBusinessTypes([makeRaw()]);
    expect(result.name).toBe('Food & Drink');
    expect(result.description).toBe('Restaurants and cafes');
  });

  it('preserves id, name, description on each item', () => {
    const [result] = transformBusinessTypes([makeRaw()]);
    const item = result.items[0];
    expect(item.id).toBe('cat-1');
    expect(item.name).toBe('Cafe');
    expect(item.description).toBe('Coffee shops');
  });

  it('handles a type with no business_categories', () => {
    const [result] = transformBusinessTypes([
      makeRaw({ business_categories: [] }),
    ]);
    expect(result.items).toHaveLength(0);
  });

  // REGRESSION — `business_categories.description` is NULLABLE in the database
  // and `POST /api/web/business-categories` runs no Zod validation, so a row
  // with no description is reachable today. The category search box calls
  // `.toLowerCase()` on this value while the owner types; before the boundary
  // normalisation below, one such row threw
  // `Cannot read properties of null (reading 'toLowerCase')` on the first
  // keystroke and took the whole registration step down.
  it('normalises a NULL category description to an empty string', () => {
    const [result] = transformBusinessTypes([
      makeRaw({
        business_categories: [
          {
            id: 'cat-1',
            name: 'Cafe',
            // The DB genuinely returns null here; the raw type says so.
            description: null,
            image_url: 'https://example.com/cafe.jpg',
          },
        ],
      }),
    ]);

    expect(result.items[0].description).toBe('');
    // The actual crash, asserted directly: this is what the search filter does
    // on every keystroke.
    expect(() => result.items[0].description.toLowerCase()).not.toThrow();
  });

  // REGRESSION — the sibling of the description fix, and it goes the OTHER
  // way on purpose. `image_url` must NOT be coerced to '': next/image throws
  // on an empty src exactly as it throws on null, so normalising here would
  // hide the absence from the one place that can render a fallback.
  it('preserves a NULL image_url instead of coercing it to an empty string', () => {
    const [result] = transformBusinessTypes([
      makeRaw({
        business_categories: [
          {
            id: 'cat-1',
            name: 'Carinderia',
            description: 'Home-style eateries',
            image_url: null,
          },
        ],
      }),
    ]);

    expect(result.items[0].imageURL).toBeNull();
    // An empty string would be the tempting "fix" and is just as fatal.
    expect(result.items[0].imageURL).not.toBe('');
  });

  it('leaves a real description untouched', () => {
    const [result] = transformBusinessTypes([makeRaw()]);
    expect(result.items[0].description).toBe('Coffee shops');
  });

  it('transforms multiple types independently', () => {
    const raw = [
      makeRaw({ name: 'Type A', icon: 'Coffee' }),
      makeRaw({ name: 'Type B', icon: 'Store' }),
    ];
    const results = transformBusinessTypes(raw);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Type A');
    expect(results[1].name).toBe('Type B');
  });
});
