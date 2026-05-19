'use client';

import { useRouter } from 'next/navigation';
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

interface ProductCataloguesContentProps {
  initialProducts: ProductResponse[];
  categories: Category[];
}

export function ProductCataloguesContent({
  initialProducts,
  categories,
}: ProductCataloguesContentProps) {
  const router = useRouter();

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

      <ProductStats products={initialProducts} isLoading={false} />

      <Card>
        <CardContent className="space-y-2">
          <div className="inline-flex h-10 w-full justify-between">
            <Catalogues categories={categories} />
            <div className="inline-flex w-max gap-2">
              <ManageCatalogues categories={categories} />
              <FilterProducts />
              <SearchBar />
            </div>
          </div>
          <ProductTable products={initialProducts} isLoading={false} />
        </CardContent>
      </Card>
    </div>
  );
}
