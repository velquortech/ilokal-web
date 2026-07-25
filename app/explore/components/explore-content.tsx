'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/custom/Searchbar';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { BusinessCard } from './business-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CustomerCategory,
  DirectoryBusiness,
  DirectoryMetadata,
} from '@/lib/types';

const ALL_CATEGORIES = 'all';

interface ExploreContentProps {
  businesses: DirectoryBusiness[];
  metadata: DirectoryMetadata;
  categories: CustomerCategory[];
  /** True when the directory read failed — outage ≠ genuinely no shops. */
  loadFailed?: boolean;
}

export function ExploreContent({
  businesses,
  metadata,
  categories,
  loadFailed = false,
}: ExploreContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );
  // The last search value THIS component pushed into the URL. The sync effect
  // below must ignore navigations we caused ourselves — otherwise, when the
  // debounce lands mid-typing, it resets the input to the URL value and
  // silently deletes the characters typed during the server round-trip.
  const lastPushedSearch = React.useRef<string | null>(null);

  React.useEffect(() => {
    const urlValue = searchParams.get('search') ?? '';
    if (
      lastPushedSearch.current !== null &&
      urlValue === lastPushedSearch.current
    ) {
      return;
    }
    setSearchInput(urlValue);
  }, [searchParams]);

  const updateParams = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      });
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Debounce search input into the URL (server refetches).
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        lastPushedSearch.current = searchInput;
        updateParams({ search: searchInput || null, page: null });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, searchParams, updateParams]);

  const selectedCategory = searchParams.get('category') ?? ALL_CATEGORIES;

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Explore shops</h1>
          <p className="text-muted-foreground text-sm">
            Discover local businesses and deals around Iloilo City
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              updateParams({
                category: value === ALL_CATEGORIES ? null : value,
                page: null,
              })
            }
          >
            <SelectTrigger className="w-44" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchBar
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search shops…"
          />
        </div>
      </div>

      {loadFailed ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          Couldn&apos;t load shops right now — please refresh to try again.
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          No shops found
          {searchInput ? (
            <>
              {' '}
              for <span className="text-foreground">“{searchInput}”</span>
            </>
          ) : null}
          . Try a different search or category.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}

      <PaginationBar metadata={metadata} />
    </div>
  );
}
