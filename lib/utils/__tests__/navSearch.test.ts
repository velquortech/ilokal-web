import { describe, it, expect } from 'vitest';
import { Home, Store, Ticket } from 'lucide-react';
import {
  filterNavSections,
  hasNavResults,
  type NavSection,
} from '@/lib/utils/navSearch';

const sections: NavSection[] = [
  {
    items: [{ title: 'Home', href: '/business', icon: Home }],
  },
  {
    header: 'Store Management',
    items: [
      { title: 'My Shop', href: '/business/shop', icon: Store },
      {
        title: 'Coupons & Deals',
        href: '/business/coupons',
        icon: Ticket,
      },
      {
        title: 'Reports',
        icon: Store,
        items: [
          { title: 'Sales Report', href: '/business/reports/sales' },
          { title: 'Product Report', href: '/business/reports/products' },
        ],
      },
    ],
  },
];

describe('filterNavSections', () => {
  it('returns the input unchanged for an empty query', () => {
    expect(filterNavSections(sections, '')).toBe(sections);
  });

  it('returns the input unchanged for a whitespace-only query', () => {
    expect(filterNavSections(sections, '   ')).toBe(sections);
  });

  it('matches item titles case-insensitively', () => {
    const result = filterNavSections(sections, 'coup');
    expect(result).toHaveLength(1);
    expect(result[0].header).toBe('Store Management');
    expect(result[0].items.map((i) => i.title)).toEqual(['Coupons & Deals']);
  });

  it('drops sections that have no matching items', () => {
    const result = filterNavSections(sections, 'home');
    expect(result).toHaveLength(1);
    expect(result[0].items.map((i) => i.title)).toEqual(['Home']);
    // the "Store Management" section is gone entirely
    expect(result.some((s) => s.header === 'Store Management')).toBe(false);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterNavSections(sections, 'zzz-nope')).toEqual([]);
  });

  it('keeps all sub-items when the parent title matches', () => {
    const result = filterNavSections(sections, 'report');
    const reports = result[0].items.find((i) => i.title === 'Reports');
    expect(reports?.items?.map((s) => s.title)).toEqual([
      'Sales Report',
      'Product Report',
    ]);
  });

  it('keeps only the matching sub-items when only a sub matches', () => {
    const result = filterNavSections(sections, 'sales');
    const reports = result[0].items.find((i) => i.title === 'Reports');
    expect(reports).toBeDefined();
    expect(reports?.items?.map((s) => s.title)).toEqual(['Sales Report']);
  });

  it('does not mutate the input sections', () => {
    const snapshot = JSON.parse(
      JSON.stringify(sections, (k, v) => (k === 'icon' ? undefined : v)),
    );
    filterNavSections(sections, 'sales');
    const after = JSON.parse(
      JSON.stringify(sections, (k, v) => (k === 'icon' ? undefined : v)),
    );
    expect(after).toEqual(snapshot);
  });
});

describe('hasNavResults', () => {
  it('is true when a section has items', () => {
    expect(hasNavResults(sections)).toBe(true);
  });

  it('is false for an empty result set', () => {
    expect(hasNavResults([])).toBe(false);
  });

  it('is false when every section is empty', () => {
    expect(hasNavResults([{ items: [] }])).toBe(false);
  });
});
