'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Catalogues } from './catalogues';
import { SearchBar } from '@/components/custom/Searchbar';
import { FilterProducts } from './filter-products';
import { ManageCatalogues } from './manage-catalogue';
import { ProductTable } from './product-table/products-table';
import { AddProductDialog } from './add-product';
import { ProductStats } from './product-stats';
import { Card, CardContent } from '@/components/ui/card';
import type { ProductResponse, Category } from '@/lib/types';

type Stats = {
  total: number;
  active: number;
  inactive: number;
  archived: number;
};

interface ProductCataloguesContentProps {
  products: ProductResponse[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  categories: Category[];
  stats: Stats;
}

export function ProductCataloguesContent({
  products,
  metadata,
  categories,
  stats,
}: ProductCataloguesContentProps) {
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

  // Debounce search input → URL update
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleCategoryChange = React.useCallback(
    (categoryId: string) => {
      updateParams({ category: categoryId || null, page: '1' });
    },
    [updateParams],
  );

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

  const selectedCategory = searchParams.get('category') ?? '';
  const selectedStatus = searchParams.get('status') ?? '';

  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="inline-flex w-full items-end justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-medium">Product Catalogues</span>
          <span className="text-muted-foreground text-sm">
            Manage your product catalogues
          </span>
        </div>
        <AddProductDialog
          categories={categories}
          onSuccess={() => router.refresh()}
        >
          <Button>
            <Plus />
            Add Product
          </Button>
        </AddProductDialog>
      </div>

      <ProductStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          <div className="inline-flex h-10 w-full justify-between">
            <Catalogues
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
            <div className="inline-flex w-max gap-2">
              <ManageCatalogues categories={categories} />
              <FilterProducts
                selectedStatus={selectedStatus}
                onStatusChange={handleStatusChange}
              />
              <SearchBar
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <ProductTable
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
