'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Catalogues } from './components/catalogues';
import { SearchBar } from '@/components/custom/Searchbar';
import { FilterProducts } from './components/filter-products';
import { ManageCatalogues } from './components/manage-catalogue';
import { ProductTable } from './components/product-table/products-table';
import { AddProductDialog } from './components/add-product';
import { ProductStats } from './components/product-stats';
import { Card, CardContent } from '@/components/ui/card';

export default function ProductCataloguesPage() {
  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="inline-flex w-full items-end justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-medium">Product Catalogues</span>
          <span className="text-muted-foreground text-sm">
            Manage your product catalogues
          </span>
        </div>
        <AddProductDialog>
          <Button>
            <Plus />
            Add Product
          </Button>
        </AddProductDialog>
      </div>

      <ProductStats />

      <Card>
        <CardContent className="space-y-2">
          <div className="inline-flex h-10 w-full justify-between">
            <Catalogues />
            <div className="inline-flex w-max gap-2">
              <ManageCatalogues />
              <FilterProducts />
              <SearchBar />
            </div>
          </div>
          <ProductTable />
        </CardContent>
      </Card>
    </div>
  );
}
