import { describe, it, expect } from 'vitest';
import { groupOfferingsBySection } from '@/lib/utils/groupOfferings';
import type { ProductSection, PublicProduct } from '@/lib/types';

const product = (
  id: string,
  section_id: string | null = null,
): PublicProduct => ({
  id,
  name: `Item ${id}`,
  description: null,
  price: 100,
  sale_price: null,
  price_type: 'fixed',
  price_unit: null,
  booking_mode: 'none',
  duration_minutes: null,
  branch_id: null,
  image_url: null,
  category_name: null,
  section_id,
  section_name: null,
});

const section = (
  id: string,
  name: string,
  position: number,
): Pick<ProductSection, 'id' | 'name' | 'position'> => ({
  id,
  name,
  position,
});

/**
 * The rule this defends: a shop that has never made a section must render
 * EXACTLY as it did before sections existed. Everything else — ordering, empty
 * groups, archived sections — is about not showing a heading that lies.
 */
describe('groupOfferingsBySection', () => {
  it('returns one unnamed group when the shop has no sections', () => {
    const items = [product('a'), product('b')];
    const groups = groupOfferingsBySection(items, []);

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBeNull();
    expect(groups[0].products).toEqual(items);
  });

  it('returns nothing at all for an empty menu', () => {
    expect(
      groupOfferingsBySection([], [section('s1', 'Hot Drinks', 0)]),
    ).toEqual([]);
  });

  it("follows the shop's order, not the order products arrive in", () => {
    const groups = groupOfferingsBySection(
      [product('a', 's2'), product('b', 's1')],
      [section('s1', 'Hot Drinks', 0), section('s2', 'Pastries', 1)],
    );

    expect(groups.map((g) => g.name)).toEqual(['Hot Drinks', 'Pastries']);
  });

  it('drops a section that has nothing on this page', () => {
    const groups = groupOfferingsBySection(
      [product('a', 's1')],
      [section('s1', 'Hot Drinks', 0), section('s2', 'Pastries', 1)],
    );

    // A heading with nothing under it reads as a loading failure.
    expect(groups.map((g) => g.name)).toEqual(['Hot Drinks']);
  });

  it('puts ungrouped offerings last, under "More"', () => {
    const groups = groupOfferingsBySection(
      [product('loose'), product('a', 's1')],
      [section('s1', 'Hot Drinks', 0)],
    );

    expect(groups.map((g) => g.name)).toEqual(['Hot Drinks', 'More']);
    expect(groups[1].products.map((p) => p.id)).toEqual(['loose']);
  });

  it('treats a product pointing at an archived section as ungrouped', () => {
    // The section vanished from the public list between the two reads; the
    // product must not disappear with it.
    const groups = groupOfferingsBySection(
      [product('orphan', 'gone'), product('a', 's1')],
      [section('s1', 'Hot Drinks', 0)],
    );

    expect(groups.map((g) => g.name)).toEqual(['Hot Drinks', 'More']);
    expect(groups[1].products.map((p) => p.id)).toEqual(['orphan']);
  });

  it('never loses a product, whatever the grouping', () => {
    const items = [
      product('a', 's1'),
      product('b', 's2'),
      product('c'),
      product('d', 'archived'),
    ];
    const groups = groupOfferingsBySection(items, [
      section('s1', 'Hot Drinks', 1),
      section('s2', 'Pastries', 0),
    ]);

    const seen = groups.flatMap((g) => g.products.map((p) => p.id)).sort();
    expect(seen).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps the incoming order inside a group', () => {
    const groups = groupOfferingsBySection(
      [product('first', 's1'), product('second', 's1')],
      [section('s1', 'Hot Drinks', 0)],
    );

    expect(groups[0].products.map((p) => p.id)).toEqual(['first', 'second']);
  });
});
