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

/**
 * Radix's single-type ToggleGroup computes its pressed set as
 * `value ? [value] : []`, so an EMPTY-STRING item value can never be selected —
 * the All chip rendered permanently unpressed, which is the discoverability
 * problem this strip exists to fix. It gets a sentinel instead, mapped back to
 * '' (= no filter) on the way out.
 */
const ALL = 'all';

interface CataloguesProps {
  sections: ProductSectionWithCount[];
  uncategorisedCount: number;
  /**
   * The counts RPC failed, so `product_count` is a placeholder zero — show the
   * chips without numbers rather than a confident "0".
   */
  countsFailed?: boolean;
  /** `''` = All. */
  selectedSection: string;
  onSectionChange: (value: string) => void;
}

export function Catalogues({
  sections,
  uncategorisedCount,
  countsFailed = false,
  selectedSection,
  onSectionChange,
}: CataloguesProps) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto rounded-md">
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedSection || ALL}
        // Radix also hands back '' when the active chip is re-clicked; both
        // that and the All chip mean "no filter".
        onValueChange={(value) =>
          onSectionChange(value === ALL || value === '' ? '' : value)
        }
        aria-label="Filter by section"
      >
        <ToggleGroupItem value={ALL}>All</ToggleGroupItem>

        {sections.map((section) => (
          <ToggleGroupItem key={section.id} value={section.id}>
            {section.name}
            {!countsFailed && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                {section.product_count}
              </span>
            )}
          </ToggleGroupItem>
        ))}

        {/* Only worth showing when something is actually in it — a shop that
            has grouped everything should not be nagged by an empty bucket. */}
        {(uncategorisedCount > 0 || countsFailed) && (
          <ToggleGroupItem value={UNCATEGORISED}>
            Uncategorised
            {!countsFailed && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                {uncategorisedCount}
              </span>
            )}
          </ToggleGroupItem>
        )}
      </ToggleGroup>
    </div>
  );
}
