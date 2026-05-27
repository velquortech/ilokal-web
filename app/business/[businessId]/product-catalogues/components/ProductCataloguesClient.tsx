'use client';

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
import type {
  ProductResponse,
  ProductStats as ProductStatsType,
  Category,
} from '@/lib/types';
import * as React from 'react';

interface Props {
  initialProducts: ProductResponse[];
  stats: ProductStatsType;
  categories: Category[];
}

export function ProductCataloguesClient({
  initialProducts,
  stats,
  categories,
}: Props) {
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');

  const filteredProducts = initialProducts.filter((p) => {
    const matchesCategory =
      !selectedCategory || p.category?.id === selectedCategory;
    const matchesStatus = !selectedStatus || p.status === selectedStatus;
    return matchesCategory && matchesStatus;
  });

  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="inline-flex w-full items-end justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-medium">Product Catalogues</span>
          <span className="text-muted-foreground text-sm">
            Manage your product catalogues
          </span>
        </div>
        <AddProductDialog categories={categories}>
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
              onCategoryChange={(id) =>
                setSelectedCategory((prev) => (prev === id ? '' : id))
              }
            />
            <div className="inline-flex w-max gap-2">
              <ManageCatalogues categories={categories} />
              <FilterProducts
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />
              <SearchBar />
            </div>
          </div>
          <ProductTable
            products={filteredProducts}
            page={1}
            pageSize={filteredProducts.length || 10}
            totalPages={1}
            total={filteredProducts.length}
            onPaginationChange={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
