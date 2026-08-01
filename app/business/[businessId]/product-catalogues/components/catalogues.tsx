'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ProductSectionWithCount } from '@/lib/types';

/**
 * The section filter above the offerings table.
 *
 * Two changes from the version that filtered by `categories`:
 *
 * 1. It filters by the shop's OWN sections. The platform taxonomy is a
 *    discovery axis for customers, not how an owner walks their own menu.
 * 2. **All** and **Uncategorised** are real chips. Before, the only way to
 *    clear the filter was to re-click the active chip — undiscoverable — and
 *    products with no grouping were reachable from no chip at all, which is
 *    how 85 of them became invisible on this page.
 *
 * `'none'` is the Uncategorised value; the query layer maps it to
 * `section_id IS NULL`.
 */
export const UNCATEGORISED = 'none';

interface CataloguesProps {
  sections: ProductSectionWithCount[];
  uncategorisedCount: number;
  /** `''` = All. */
  selectedSection: string;
  onSectionChange: (value: string) => void;
}

export function Catalogues({
  sections,
  uncategorisedCount,
  selectedSection,
  onSectionChange,
}: CataloguesProps) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto rounded-md">
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedSection}
        // ToggleGroup hands back '' when the active item is re-clicked, which
        // is exactly "All" — so deselecting and pressing All agree.
        onValueChange={onSectionChange}
        aria-label="Filter by section"
      >
        <ToggleGroupItem value="">All</ToggleGroupItem>

        {sections.map((section) => (
          <ToggleGroupItem key={section.id} value={section.id}>
            {section.name}
            <span className="text-muted-foreground ml-1.5 text-xs">
              {section.product_count}
            </span>
          </ToggleGroupItem>
        ))}

        {/* Only worth showing when something is actually in it — a shop that
            has grouped everything should not be nagged by an empty bucket. */}
        {uncategorisedCount > 0 && (
          <ToggleGroupItem value={UNCATEGORISED}>
            Uncategorised
            <span className="text-muted-foreground ml-1.5 text-xs">
              {uncategorisedCount}
            </span>
          </ToggleGroupItem>
        )}
      </ToggleGroup>
    </div>
  );
}
