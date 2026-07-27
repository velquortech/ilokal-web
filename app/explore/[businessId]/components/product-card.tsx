import Image from 'next/image';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOfferingDialog } from './book-offering-dialog';
import { formatOfferingPricePair } from '@/lib/utils/formatOfferingPrice';
import type { PublicProduct } from '@/lib/types';

export function ProductCard({
  product,
  bookingsEnabled = false,
  canBook = false,
  branchId = null,
}: {
  product: PublicProduct;
  /** Platform kill switch (`app_settings.enable_bookings`). */
  bookingsEnabled?: boolean;
  /** False for anon visitors, owners, and admins — matching FollowButton. */
  canBook?: boolean;
  branchId?: string | null;
}) {
  const onSale = product.sale_price != null;
  const { base, sale } = formatOfferingPricePair(product);
  const bookable = bookingsEnabled && product.booking_mode !== 'none';
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
        {bookable && canBook && (
          <BookOfferingDialog
            product={product}
            branchId={branchId}
            needsRange={product.booking_mode === 'date_range'}
          >
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
              <CalendarClock className="size-3.5" />
              Request booking
            </Button>
          </BookOfferingDialog>
        )}
      </div>
    </div>
  );
}
