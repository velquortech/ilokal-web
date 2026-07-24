import type { NavItem, NavSubItem } from '@/components/custom/Nav';

/**
 * A sidebar section: a list of nav items with an optional group header.
 * Mirrors the shape of `SIDEBAR_SECTIONS` in the business sidebar config.
 */
export interface NavSection {
  items: NavItem[];
  header?: string;
}

function matches(title: string, query: string): boolean {
  return title.toLowerCase().includes(query);
}

/**
 * Filter sidebar sections by a search query, matching item and sub-item titles.
 *
 * Rules:
 * - An empty / whitespace-only query returns the input unchanged (same
 *   reference) — no filtering happens.
 * - Matching is case-insensitive substring on titles.
 * - A top-level item is kept when its own title matches, OR (when it has
 *   sub-items) any sub-item title matches.
 *   - If the parent title matches, all of its sub-items are kept.
 *   - Otherwise only the matching sub-items are kept.
 * - Items with no match are dropped; sections left with no items are dropped.
 *
 * Pure and dependency-free: adding new sections/items requires no change here.
 */
export function filterNavSections(
  sections: NavSection[],
  query: string,
): NavSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return sections;
  }

  const result: NavSection[] = [];

  for (const section of sections) {
    const items: NavItem[] = [];

    for (const item of section.items) {
      const titleMatches = matches(item.title, normalized);

      if (item.items && item.items.length > 0) {
        // Parent match keeps all children; otherwise keep only matching subs.
        const subItems: NavSubItem[] = titleMatches
          ? item.items
          : item.items.filter((sub) => matches(sub.title, normalized));

        if (titleMatches || subItems.length > 0) {
          items.push({ ...item, items: subItems });
        }
        continue;
      }

      if (titleMatches) {
        items.push(item);
      }
    }

    if (items.length > 0) {
      result.push({ ...section, items });
    }
  }

  return result;
}

/** True when at least one section still has items after filtering. */
export function hasNavResults(sections: NavSection[]): boolean {
  return sections.some((section) => section.items.length > 0);
}
