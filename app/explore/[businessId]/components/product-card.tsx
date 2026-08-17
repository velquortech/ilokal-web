import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/custom/SafeImage';
import { BrokenImage } from '@/components/custom/BrokenImage';
import { formatOfferingPricePair } from '@/lib/utils/formatOfferingPrice';
import type { PublicProduct } from '@/lib/types';

export function ProductCard({ product }: { product: PublicProduct }) {
  const onSale = product.sale_price != null;
  const { base, sale } = formatOfferingPricePair(product);
  return (
    <div className="bg-card flex gap-3 rounded-xl border p-3">
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
        {/* SafeImage owns both rules: `unoptimized` (write-time WebP, no
            Supabase transform endpoint — Next's optimizer would leave this
            blank) and the broken-image fallback. */}
        {product.image_url ? (
          <SafeImage
            src={product.image_url}
            alt={product.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <BrokenImage />
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
          {onSale && sale ? (
            <>
              <span className="text-primary">{sale}</span>{' '}
              <span className="text-muted-foreground text-xs font-normal line-through">
                {base}
              </span>
            </>
          ) : (
            base
          )}
        </p>
      </div>
    </div>
  );
}
