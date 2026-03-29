import { ProductCard } from '@/components/custom/ProductCard';
import { Button } from '@/components/ui/button';
import { productCatalogues } from '../../data/products';

export function ShopItems() {
  return (
    <div className="space-y-4">
      <div className="inline-flex w-full items-center justify-between">
        <span className="font-medium">Product Catalogues</span>
        <Button size="sm">View Full Catalogue</Button>
      </div>

      {productCatalogues.map((catalogue, key) => (
        <div className="flex flex-col gap-2" key={key}>
          <span className="font-medium">{catalogue.name}</span>
          <div className="grid grid-cols-4 gap-6">
            {catalogue.items.map((item, key) => (
              <ProductCard {...item} key={key} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
