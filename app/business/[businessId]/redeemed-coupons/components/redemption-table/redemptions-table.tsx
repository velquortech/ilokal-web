'use client';

import * as React from 'react';
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from '@tanstack/react-table';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { redemptionColumns, formatDate } from './columns';
import { MobileRedemptionCardList } from './mobile-redemption-card-list';
import type { RedemptionRecord } from '@/lib/types';

interface RedeemedCouponsTableProps {
  redemptions: RedemptionRecord[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

/**
 * The coupon-details panel for an expanded redemption row. Shared by the
 * desktop expanded row and the mobile card view (tap-to-expand), so the two
 * can never drift apart.
 */
export function ExpandedCouponDetail({ record }: { record: RedemptionRecord }) {
  const coupon = record.coupons;
  if (!coupon) return null;

  const scopeLabel = coupon.usage_scope.replace(/_/g, ' ');

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
      {coupon.description && (
        <div className="col-span-2 sm:col-span-4">
          <span className="text-muted-foreground text-xs">Description</span>
          <p className="mt-0.5">{coupon.description}</p>
        </div>
      )}
      <div>
        <span className="text-muted-foreground text-xs">Usage Scope</span>
        <p className="mt-0.5 capitalize">{scopeLabel}</p>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">Coupon Expiry</span>
        <p className="mt-0.5">{formatDate(coupon.expiry_date)}</p>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">
          Redemption Expires
        </span>
        <p className="mt-0.5">{formatDate(record.expires_at)}</p>
      </div>
    </div>
  );
}

export function RedeemedCouponsTable({
  redemptions,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: RedeemedCouponsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

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
        columns={redemptionColumns}
        data={redemptions}
        pageCount={totalPages}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={setSorting}
        expandable={{
          getRowCanExpand: (row) => row.original.coupons !== null,
          renderExpanded: (row) => (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Coupon Details
              </p>
              <ExpandedCouponDetail record={row.original} />
            </div>
          ),
        }}
        renderMobile={(table) => <MobileRedemptionCardList table={table} />}
      />
    </div>
  );
}
