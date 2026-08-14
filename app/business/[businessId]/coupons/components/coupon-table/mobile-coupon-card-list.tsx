'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { Coupon, ProductResponse } from '@/lib/types';
import { ExpandedProducts } from './coupons-table';

interface MobileCouponCardListProps {
  table: Table<Coupon>;
  products: ProductResponse[];
}

/**
 * Layer 2 of the mobile strategy (§6.8): the coupons table as a card list
 * below `md`, from the SAME TanStack rows as the desktop table.
 *
 * Each card reuses the column cells via `flexRender` — the mono code (what a
 * cashier reads), discount + usage scope, visibility/availability chips and
 * the expiry line come straight from the table columns, and the kebab footer
 * is the existing `CouponActions`. Expansion is single-source: the chevron
 * toggles the same row state as the table, and the linked-products panel
 * reuses `ExpandedProducts`.
 */
export function MobileCouponCardList({
  table,
  products,
}: MobileCouponCardListProps) {
  const rows = table.getRowModel().rows;
  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const cell = (id: string) => cells.find((c) => c.column.id === id);

        return (
          <div
            key={row.id}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            className="rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {cell('expand') &&
                  flexRender(
                    cell('expand')!.column.columnDef.cell,
                    cell('expand')!.getContext(),
                  )}
                {cell('code') &&
                  flexRender(
                    cell('code')!.column.columnDef.cell,
                    cell('code')!.getContext(),
                  )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {cell('visibility') &&
                  flexRender(
                    cell('visibility')!.column.columnDef.cell,
                    cell('visibility')!.getContext(),
                  )}
                {cell('availability') &&
                  flexRender(
                    cell('availability')!.column.columnDef.cell,
                    cell('availability')!.getContext(),
                  )}
              </div>
            </div>

            <div className="mt-2">
              {cell('discount') &&
                flexRender(
                  cell('discount')!.column.columnDef.cell,
                  cell('discount')!.getContext(),
                )}
            </div>

            <div className="text-muted-foreground mt-1 text-xs">
              {cell('dates') &&
                flexRender(
                  cell('dates')!.column.columnDef.cell,
                  cell('dates')!.getContext(),
                )}
            </div>

            {row.getIsExpanded() && (
              <div className="bg-muted/30 mt-2 space-y-1.5 rounded-md p-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Linked Products
                </p>
                <ExpandedProducts
                  scopeValues={row.original.scope_values ?? []}
                  products={products}
                />
              </div>
            )}

            <div className="mt-2 flex items-center justify-end border-t pt-2">
              {cell('actions') &&
                flexRender(
                  cell('actions')!.column.columnDef.cell,
                  cell('actions')!.getContext(),
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
