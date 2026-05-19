// components/product-cards.tsx
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { ProductResponse } from '@/lib/types';

export function ProductCard(product: ProductResponse) {
  return (
    <Card
      key={product.id}
      className="group gap-2 overflow-hidden p-3 transition hover:shadow-lg"
    >
      {/* IMAGE */}
      <div className="border-border relative aspect-square min-h-48 w-full overflow-hidden rounded-md border">
        <Image
          src={product.image_url ?? '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>

      {/* CONTENT */}
      <CardContent className="flex flex-1 flex-col gap-2 p-0">
        <h3 className="line-clamp-1 font-semibold">{product.name}</h3>

        {product.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {product.description}
          </p>
        )}
        <p className="text-primary mt-auto font-semibold">
          ₱{product.price.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
