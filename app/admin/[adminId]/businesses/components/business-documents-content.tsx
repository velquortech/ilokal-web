'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/custom/Searchbar';
import { FilterBusinesses } from './filter-businesses';
import { BusinessDocumentsTable } from './business-documents-table';
import type { AdminBusinessWithMeta } from '@/lib/types/business';

interface BusinessDocumentsContentProps {
  businesses: AdminBusinessWithMeta[];
  metadata: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function BusinessDocumentsContent({
  businesses,
  metadata,
}: BusinessDocumentsContentProps) {
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

  // Debounced search → resets to page 1
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, searchParams, updateParams]);

  const selectedStatus = searchParams.get('status') ?? '';

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by business or owner email..."
          className="max-w-xs"
        />
        <FilterBusinesses
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
        />
      </div>

      <BusinessDocumentsTable
        businesses={businesses}
        page={metadata.page}
        pageSize={metadata.pageSize}
        totalPages={metadata.totalPages}
        onPaginationChange={handlePaginationChange}
      />
    </div>
  );
}
