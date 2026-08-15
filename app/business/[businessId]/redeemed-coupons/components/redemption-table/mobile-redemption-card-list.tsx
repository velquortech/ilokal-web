'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { RedemptionRecord } from '@/lib/types';
import { ExpandedCouponDetail } from './redemptions-table';

interface MobileRedemptionCardListProps {
  table: Table<RedemptionRecord>;
}

/**
 * Layer 2 of the mobile strategy (§6.8): the redemptions table as a card list
 * below `md`, from the SAME TanStack rows as the desktop table — the counter
 * tool for a cashier holding a phone.
 *
 * Cards reuse the column cells via `flexRender`: avatar + name + email, the
 * mono code, the discount, the status badge and the redeemed-on line all come
 * straight from the table columns. The chevron toggles the same row expansion
 * as the table (single-source), and the expanded coupon-details panel reuses
 * `ExpandedCouponDetail`.
 */
export function MobileRedemptionCardList({
  table,
}: MobileRedemptionCardListProps) {
  const rows = table.getRowModel().rows;
  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const cell = (id: string) => cells.find((c) => c.column.id === id);

        return (
          <div key={row.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {cell('user') &&
                  flexRender(
                    cell('user')!.column.columnDef.cell,
                    cell('user')!.getContext(),
                  )}
              </div>
              {cell('status') &&
                flexRender(
                  cell('status')!.column.columnDef.cell,
                  cell('status')!.getContext(),
                )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {cell('coupon_code') &&
                  flexRender(
                    cell('coupon_code')!.column.columnDef.cell,
                    cell('coupon_code')!.getContext(),
                  )}
                {cell('discount') &&
                  flexRender(
                    cell('discount')!.column.columnDef.cell,
                    cell('discount')!.getContext(),
                  )}
              </div>
              {cell('expand') &&
                flexRender(
                  cell('expand')!.column.columnDef.cell,
                  cell('expand')!.getContext(),
                )}
            </div>

            <div className="text-muted-foreground mt-1 text-xs">
              {cell('redeemed_at') &&
                flexRender(
                  cell('redeemed_at')!.column.columnDef.cell,
                  cell('redeemed_at')!.getContext(),
                )}
            </div>

            {row.getIsExpanded() && (
              <div className="bg-muted/30 mt-2 space-y-1.5 rounded-md p-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Coupon Details
                </p>
                <ExpandedCouponDetail record={row.original} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
