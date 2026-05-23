import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculatePercentage } from '@/lib/product-helper';
import type { ProductResponse } from '@/lib/types';

export function ProductCard(product: ProductResponse) {
  return (
    <Card
      key={product.id}
      className="group gap-2 overflow-hidden p-3 transition hover:shadow-lg"
    >
      {/* IMAGE */}
      <div className="border-border relative aspect-square min-h-48 w-full overflow-hidden rounded-md border">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center">
            <ImageOff className="size-10" />
          </div>
        )}
        {product.sale_price != null && (
          <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-xs font-semibold">
            Sale
          </span>
        )}
      </div>

      {/* CONTENT */}
      <CardContent className="flex flex-1 flex-col gap-2 p-0">
        <h3 className="line-clamp-1 font-semibold">{product.name}</h3>

        {product.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {product.description}
          </p>
        )}
        {product.sale_price !== null && product.sale_price !== undefined ? (
          <div className="mt-auto flex items-center gap-2">
            <span className="text-primary font-semibold">
              ₱{product.sale_price.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-sm line-through">
              ₱{product.price.toLocaleString()}
            </span>
            <Badge className="bg-primary/10 text-primary border-none text-xs">
              -{calculatePercentage(product.price, product.sale_price)}%
            </Badge>
          </div>
        ) : (
          <p className="text-primary mt-auto font-semibold">
            ₱{product.price.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
