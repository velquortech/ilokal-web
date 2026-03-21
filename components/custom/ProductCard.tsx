// components/product-cards.tsx
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  badge?: string;
};

export function ProductCard(product: Product) {
  return (
    <Card
      key={product.id}
      className="group gap-2 overflow-hidden p-3 transition hover:shadow-lg"
    >
      {/* IMAGE */}
      <div className="border-border relative h-48 w-full overflow-hidden rounded-md border">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
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

        <p className="mt-auto font-semibold">
          ₱{product.price.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
