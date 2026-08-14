'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/custom/PageHeader';
import { Building2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    <div className="font-giest flex h-max min-w-0 flex-1 flex-col space-y-6 pb-8">
      {/* Branch goes in the eyebrow: which branch you are looking at is the
          context people lose most often on this page. */}
      <PageHeader
        title="Redemptions"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3" />
            {branchName}
          </span>
        }
        lede="Every coupon your customers have claimed at the counter."
      />

      <RedemptionStats stats={stats} />

      {/* The counter helper: this page is a tool a cashier stands behind, and
          the empty state gave them nothing to do. The three steps tell them
          what the table is for without making them guess. */}
      <Alert>
        <Info />
        <AlertTitle>How to redeem at the counter</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>
            <strong>1.</strong> Ask for the customer&apos;s coupon code —
            they&apos;ll show it from the app.
          </p>
          <p>
            <strong>2.</strong> Search the code above to check what it&apos;s
            worth and whether it&apos;s still valid.
          </p>
          <p>
            <strong>3.</strong> Apply the discount, then the coupon is marked
            claimed here.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <FilterRedemptions
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
            />
            {/* On a phone the code search is the hero control — the first
                thing a cashier reaches for — so it leads the row below `md`
                instead of trailing after the filter (§6.8). */}
            <div className="order-first w-full sm:order-none sm:w-auto">
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
