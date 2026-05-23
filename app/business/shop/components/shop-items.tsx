import { PackageOpen, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessShop } from '@/providers/BusinessProvider';
import Link from 'next/link';
import { ProductCard } from '@/components/custom/ProductCard';
import type { ProductResponse } from '@/lib/types';

interface ShopItemsProps {
  business?: BusinessShop | null;
  products: ProductResponse[];
}

export function ShopItems({ business, products }: ShopItemsProps) {
  const hasBusinessData = business && business.shop_name;
  const hasProducts = products.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex w-full items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold tracking-tight">
            Product Catalogues
          </h3>
          <p className="text-muted-foreground text-base">
            Manage your shop offerings
          </p>
        </div>
        {hasBusinessData && (
          <Link href="/business/product-catalogues">
            <Button
              size="sm"
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/5 h-8 text-sm font-bold"
            >
              View All
            </Button>
          </Link>
        )}
      </div>

      {hasBusinessData ? (
        hasProducts ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-secondary/20 border-border flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed p-8 text-center">
              <div className="bg-background z-10 scale-110 rounded-2xl border p-4 shadow-lg">
                <PackageOpen className="text-primary h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground text-2xl font-bold">
                  No products yet
                </p>
                <p className="text-muted-foreground max-w-120 text-base">
                  Start adding products to your catalogue to showcase them to
                  customers.
                </p>
              </div>
              <Link href="/business/product-catalogues">
                <Button size="sm" className="h-8 text-sm">
                  <PlusCircle className="mr-2 h-3.5 w-3.5" />
                  Add First Product
                </Button>
              </Link>
            </div>
          </div>
        )
      ) : (
        <div className="group border-muted-foreground/25 bg-muted/30 hover:bg-muted/50 relative overflow-hidden rounded-2xl border border-dashed p-8 py-12 transition-colors">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-background relative flex h-12 w-12 items-center justify-center rounded-full border shadow-sm">
              <PackageOpen className="text-muted-foreground/40 h-6 w-6 transition-transform group-hover:scale-110" />
              <div className="bg-primary border-background absolute -top-1 -right-1 h-3 w-3 rounded-full border-2" />
            </div>

            <div className="space-y-1.5">
              <p className="text-foreground text-sm font-bold">
                Catalogue is currently locked
              </p>
              <p className="text-muted-foreground max-w-60 text-[11px] leading-relaxed">
                Your product catalogue will be available once you finish your
                <span className="text-primary font-semibold">
                  {' '}
                  business registration
                </span>
                .
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="h-8 px-4 text-[11px] font-bold"
              disabled
            >
              Awaiting Setup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
