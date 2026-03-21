import { ProductCard } from '@/components/custom/ProductCard';
import { Button } from '@/components/ui/button';
import { products } from '../../data/data';

export function ShopItems() {
  return (
    <div className="space-y-4">
      <div className="inline-flex w-full items-center justify-between">
        <span className="font-medium">Product Menu</span>
        <Button size="sm">View Full Menu</Button>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {products.map((product, key) => (
          <ProductCard {...product} key={key} />
        ))}
      </div>
    </div>
  );
}
