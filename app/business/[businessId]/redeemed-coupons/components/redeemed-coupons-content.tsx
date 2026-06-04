'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { SearchBar } from '@/components/custom/Searchbar';
import { Card, CardContent } from '@/components/ui/card';
import { RedemptionStats } from './redemption-stats';
import { RedeemedCouponsTable } from './redemption-table/redemptions-table';
import { FilterRedemptions } from './filter-redemptions';
import { useBusinessShop } from '@/providers/BusinessProvider';
import type {
  RedemptionRecord,
  RedemptionStatus,
  RedemptionSummaryStats,
} from '@/lib/types';

interface RedeemedCouponsContentProps {
  branchId: string | undefined;
  redemptions: RedemptionRecord[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  stats: RedemptionSummaryStats;
}

export function RedeemedCouponsContent({
  branchId,
  redemptions,
  metadata,
  stats,
}: RedeemedCouponsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { branches } = useBusinessShop();

  const branchName = branchId
    ? (branches.find((b) => b.id === branchId)?.name ?? 'Selected Branch')
    : 'All Branches';

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

  const selectedStatus = (searchParams.get('status') as RedemptionStatus) ?? '';

  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="flex flex-col">
        <span className="text-lg font-medium">Redeemed Coupons</span>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
          <Building2 className="size-3.5" />
          {branchName}
        </span>
      </div>

      <RedemptionStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          <div className="inline-flex h-10 w-full justify-between">
            <div />
            <div className="inline-flex items-center gap-2">
              <FilterRedemptions
                selectedStatus={selectedStatus}
                onStatusChange={handleStatusChange}
              />
              <SearchBar
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by coupon code…"
              />
            </div>
          </div>
          <RedeemedCouponsTable
            redemptions={redemptions}
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
