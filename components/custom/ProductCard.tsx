// components/product-cards.tsx
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/app/business/libs/types/product.type';
import { calculatePercentage } from '@/lib/product-helper';

export function ProductCard(product: Product) {
  return (
    <Card
      key={product.id}
      className="group gap-2 overflow-hidden p-3 transition hover:shadow-lg"
    >
      {/* IMAGE */}
      <div className="border-border relative aspect-square min-h-48 w-full overflow-hidden rounded-md border">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* BADGE */}
        {product.badge && (
          <Badge className="absolute top-2 left-2">{product.badge}</Badge>
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
        {product?.salePrice ? (
          <p className="text-primary mt-auto inline-flex items-center gap-1.5 font-semibold">
            ₱{product.salePrice.toLocaleString()}
            <span className="text-muted-foreground/75 font-normal line-through">
              ₱{product.price.toLocaleString()}
            </span>
            <Badge className="bg-primary/20 text-foreground font-light">
              -{calculatePercentage(product.price, product.salePrice)}%
            </Badge>
          </p>
        ) : (
          <p className="text-primary mt-auto font-semibold">
            ₱{product.price.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
