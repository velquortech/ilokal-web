'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
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

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

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
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="inline-flex w-full items-end justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-medium">Coupons & Deals</span>
          <span className="text-muted-foreground text-sm">
            Manage discount coupons for your customers
          </span>
        </div>
        <AddCouponDialog products={products} onSuccess={() => router.refresh()}>
          <Button>
            <Plus />
            Add Coupons or Deals
          </Button>
        </AddCouponDialog>
      </div>

      <CouponStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          <div className="inline-flex h-10 w-full justify-between">
            <div />
            <div className="inline-flex items-center gap-2">
              <FilterCoupons
                selectedStatus={selectedStatus}
                onStatusChange={handleStatusChange}
              />
              <SearchBar
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <CouponsTable
            coupons={coupons}
            products={products}
            page={metadata.page}
            pageSize={metadata.per_page}
            totalPages={metadata.total_pages}
            total={metadata.total}
            onPaginationChange={handlePaginationChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
