import type { ProductSection, PublicProduct } from '@/lib/types';

/**
 * Group a page of offerings under the shop's own section headings.
 *
 * Pure, and separate from the page, because the interesting parts are all edge
 * cases: a shop with no sections at all (the common case today, and it must
 * render exactly as it did before), a section that is empty on THIS page, and a
 * product pointing at a section that has just been archived.
 *
 * Note this groups **one page**, not the whole menu — the public menu is
 * paginated, so a section that spans a page boundary appears at the end of one
 * page and again at the top of the next. That is how a printed menu reads, and
 * the alternative (unbounded fetch) is the row cap the perf audit keeps
 * catching.
 */

export type OfferingGroup = {
  /** `null` is the Uncategorised group. */
  id: string | null;
  name: string | null;
  products: PublicProduct[];
};

export function groupOfferingsBySection(
  products: PublicProduct[],
  sections: Pick<ProductSection, 'id' | 'name' | 'position'>[],
): OfferingGroup[] {
  if (products.length === 0) return [];

  // No sections means the shop has never grouped anything: one unnamed group,
  // which renders as the plain grid it always was.
  if (sections.length === 0) {
    return [{ id: null, name: null, products }];
  }

  const known = new Set(sections.map((s) => s.id));
  const buckets = new Map<string | null, PublicProduct[]>();

  for (const product of products) {
    // A product whose section was archived mid-visit points at a row the
    // public list no longer contains. It belongs in Uncategorised, not in a
    // heading nobody can see.
    const key =
      product.section_id && known.has(product.section_id)
        ? product.section_id
        : null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(product);
    else buckets.set(key, [product]);
  }

  const ordered = [...sections].sort((a, b) => a.position - b.position);

  const groups: OfferingGroup[] = [];
  for (const section of ordered) {
    const items = buckets.get(section.id);
    // Empty on this page ⇒ no heading. A heading with nothing under it reads
    // as a loading failure.
    if (items?.length) {
      groups.push({ id: section.id, name: section.name, products: items });
    }
  }

  // Uncategorised always last: it is the leftovers, not a section the owner
  // chose to put first.
  const loose = buckets.get(null);
  if (loose?.length) {
    groups.push({ id: null, name: 'More', products: loose });
  }

  return groups;
}
