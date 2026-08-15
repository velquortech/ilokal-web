import Image from 'next/image';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOfferingDialog } from './book-offering-dialog';
import { formatOfferingPricePair } from '@/lib/utils/formatOfferingPrice';
import type { PublicBranch, PublicProduct } from '@/lib/types';

export function ProductCard({
  product,
  bookingsEnabled = false,
  canBook = false,
  branches = [],
}: {
  product: PublicProduct;
  /** Platform kill switch (`app_settings.enable_bookings`). */
  bookingsEnabled?: boolean;
  /** False for anon visitors, owners, and admins — matching FollowButton. */
  canBook?: boolean;
  /** All the shop's branches; the dialog lets the customer pick. */
  branches?: PublicBranch[];
}) {
  const onSale = product.sale_price != null;
  const { base, sale } = formatOfferingPricePair(product);
  const bookable = bookingsEnabled && product.booking_mode !== 'none';
  return (
    <div className="bg-card flex gap-3 rounded-xl border p-3">
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
        {/* `unoptimized` — same reason as every other product thumbnail:
            write-time WebP and no Supabase transform endpoint, so Next's
            optimizer would leave this blank. */}
        {product.image_url && (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            unoptimized
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
            branches={branches}
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
