'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { ProductResponse } from '@/lib/types';
import { ViewProduct } from '../view-product';

interface MobileProductCardListProps {
  table: Table<ProductResponse>;
}

/**
 * Layer 2 of the mobile strategy (§6.8): the catalogue as a card list below
 * `md`.
 *
 * Renders from the SAME TanStack rows as the desktop table, reusing each
 * column's `cell` via `flexRender` — sorting, pagination and selection stay
 * single-source, and a row never renders differently from its cells. The image
 * and name cells each carry the existing `ViewProduct` trigger, so tapping
 * either opens the product card dialog.
 */
export function MobileProductCardList({ table }: MobileProductCardListProps) {
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
            <div className="flex items-start gap-3">
              {cell('image_url') &&
                flexRender(
                  cell('image_url')!.column.columnDef.cell,
                  cell('image_url')!.getContext(),
                )}
              <div className="min-w-0 flex-1">
                <ViewProduct {...row.original}>
                  {cell('name') &&
                    flexRender(
                      cell('name')!.column.columnDef.cell,
                      cell('name')!.getContext(),
                    )}
                </ViewProduct>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              {cell('price') && (
                <div className="min-w-0">
                  {flexRender(
                    cell('price')!.column.columnDef.cell,
                    cell('price')!.getContext(),
                  )}
                </div>
              )}
              {cell('status') &&
                flexRender(
                  cell('status')!.column.columnDef.cell,
                  cell('status')!.getContext(),
                )}
            </div>

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
