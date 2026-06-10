'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/custom/Searchbar';
import { FilterBusinesses } from './filter-businesses';
import { BusinessDocumentsTable } from './business-documents-table';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
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

  // Debounced search → writes straight to the URL and resets to page 1.
  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams({ search: value.trim() || null, page: '1' });
  }, 400);

  const handleStatusChange = (status: string) => {
    updateParams({ status: status || null, page: '1' });
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    updateParams({
      page: page === 1 ? null : String(page),
      perPage: pageSize === 10 ? null : String(pageSize),
    });
  };

  const selectedStatus = searchParams.get('status') ?? '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <SearchBar
          defaultValue={searchParams.get('search') ?? ''}
          onSearch={handleSearch}
          placeholder="Search by business name..."
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
