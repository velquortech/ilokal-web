'use client';

import * as React from 'react';
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from '@tanstack/react-table';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { createColumns } from './columns';
import { MobileCouponCardList } from './mobile-coupon-card-list';
import type { Coupon, ProductResponse } from '@/lib/types';
import { formatOfferingPrice } from '@/lib/utils/formatOfferingPrice';
import { Package } from 'lucide-react';

interface CouponsTableProps {
  coupons: Coupon[];
  products: ProductResponse[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

/**
 * The linked-products panel for an expanded coupon row. Shared by the desktop
 * expanded row and the mobile card view (tap-to-expand), so the two can never
 * drift apart.
 */
export function ExpandedProducts({
  scopeValues,
  products,
}: {
  scopeValues: string[];
  products: ProductResponse[];
}) {
  const linked = products.filter((p) => scopeValues.includes(p.id));

  if (linked.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No matching products found.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {linked.map((product) => (
        <div
          key={product.id}
          className="bg-muted/50 border-border flex items-center gap-2.5 rounded-lg border px-3 py-2"
        >
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="size-8 rounded-md object-cover"
            />
          ) : (
            <div className="bg-muted flex size-8 items-center justify-center rounded-md">
              <Package className="text-muted-foreground size-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{product.name}</span>
            <span className="text-muted-foreground text-xs">
              {formatOfferingPrice(product)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CouponsTable({
  coupons,
  products,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: CouponsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // New column identities on every render make TanStack rebuild the table; the
  // factory only depends on the products list.
  const columns = React.useMemo(() => createColumns(products), [products]);

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    onPaginationChange(next.pageIndex + 1, next.pageSize);
  };

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={coupons}
        pageCount={totalPages}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={setSorting}
        expandable={{
          getRowCanExpand: (row) =>
            (row.original.scope_values?.length ?? 0) > 0,
          renderExpanded: (row) => (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Linked Products
              </p>
              <ExpandedProducts
                scopeValues={row.original.scope_values ?? []}
                products={products}
              />
            </div>
          ),
        }}
        renderMobile={(table) => (
          <MobileCouponCardList table={table} products={products} />
        )}
      />
    </div>
  );
}
