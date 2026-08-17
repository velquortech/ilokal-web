'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/custom/PageHeader';
import { Plus } from 'lucide-react';
import { SearchBar } from '@/components/custom/Searchbar';
import { Card, CardContent } from '@/components/ui/card';
import { CouponStats } from './coupon-stats';
import { CouponsTable } from './coupon-table/coupons-table';
import { AddCouponDialog } from './add-coupon';
import { FilterCoupons } from './filter-coupons';
import type { Coupon, CouponStatus, ProductResponse } from '@/lib/types';

interface CouponsContentProps {
  coupons: Coupon[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  stats: { total: number; published: number; draft: number };
  products: ProductResponse[];
}

export function CouponsContent({
  coupons,
  metadata,
  stats,
  products,
}: CouponsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );

  React.useEffect(() => {
    setSearchInput(searchParams.get('search') ?? '');
  }, [searchParams]);

  const updateParams = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Keyed on the URL too: the closure must rebuild from the CURRENT params
  // when the debounce fires. Keyed on the input alone, a status/branch filter
  // clicked during the 400 ms window is silently wiped — the push re-writes
  // the params it captured before that click. (Same guard as branches-content.)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, searchParams, updateParams]);

  const handleStatusChange = React.useCallback(
    (status: string) => {
      updateParams({ status: status || null, page: '1' });
    },
    [updateParams],
  );

  const handlePaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      updateParams({
        page: page === 1 ? null : String(page),
        perPage: pageSize === 10 ? null : String(pageSize),
      });
    },
    [updateParams],
  );

  const selectedStatus = (searchParams.get('status') as CouponStatus) ?? '';

  return (
    <div className="font-giest flex h-max min-w-0 flex-1 flex-col space-y-6 pb-8">
      <PageHeader
        title="Coupons & Deals"
        lede="Manage discount coupons for your customers"
        action={
          <>
            <AddCouponDialog
              products={products}
              onSuccess={() => router.refresh()}
            >
              <Button>
                <Plus />
                Add Coupons or Deals
              </Button>
            </AddCouponDialog>
          </>
        }
      />

      <CouponStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <FilterCoupons
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
            />
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <CouponsTable
            coupons={coupons}
            products={products}
            page={metadata.page}
            pageSize={metadata.per_page}
            totalPages={metadata.total_pages}
            onPaginationChange={handlePaginationChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
