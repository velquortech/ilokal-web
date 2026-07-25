import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { ProductResponse } from '@/lib/types';

function peso(value: number): string {
  return `₱${Number(value).toLocaleString('en-PH')}`;
}

export function ProductCard({ product }: { product: ProductResponse }) {
  const onSale = product.sale_price != null;
  return (
    <div className="bg-card flex gap-3 rounded-xl border p-3">
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
        {product.image_url && (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{product.name}</p>
          {onSale && <Badge>Sale</Badge>}
        </div>
        {product.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {product.description}
          </p>
        )}
        <p className="mt-1 text-sm font-semibold">
          {onSale ? (
            <>
              <span className="text-primary">{peso(product.sale_price!)}</span>{' '}
              <span className="text-muted-foreground text-xs font-normal line-through">
                {peso(product.price)}
              </span>
            </>
          ) : (
            peso(product.price)
          )}
        </p>
      </div>
    </div>
  );
}
