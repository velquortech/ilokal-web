'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/custom/Searchbar';
import { Plus } from 'lucide-react';
import { BranchStatsCards } from './branch-stats';
import { BranchesGrid } from './branches-grid';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { businessBranchesCreatePath } from '@/config/routeConfig';
import type { Branch, BranchStats } from '@/lib/types';

interface BranchesContentProps {
  branches: Branch[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  stats: BranchStats;
}

export function BranchesContent({
  branches,
  metadata,
  stats,
}: BranchesContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { business } = useBusinessShop();

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
  }, [searchInput, searchParams, updateParams]);

  const handlePaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      updateParams({
        page: page === 1 ? null : String(page),
        perPage: pageSize === 10 ? null : String(pageSize),
      });
    },
    [updateParams],
  );

  const createHref = business?.id
    ? businessBranchesCreatePath(business.id)
    : '#';

  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="inline-flex w-full items-end justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-medium">Branch Management</span>
          <span className="text-muted-foreground text-sm">
            Manage all branch locations for your business
          </span>
        </div>
        <Button asChild>
          <Link href={createHref}>
            <Plus />
            Add Branch
          </Link>
        </Button>
      </div>

      <BranchStatsCards stats={stats} />

      <div className="space-y-3">
        <div className="flex justify-end">
          <SearchBar
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <BranchesGrid
          branches={branches}
          businessId={business?.id ?? ''}
          page={metadata.page}
          pageSize={metadata.per_page}
          totalPages={metadata.total_pages}
          totalItems={metadata.total}
          onPaginationChange={handlePaginationChange}
          onSuccess={() => router.refresh()}
        />
      </div>
    </div>
  );
}
