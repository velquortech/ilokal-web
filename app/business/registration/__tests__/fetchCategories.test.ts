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
