'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cancelBookingAction } from '@/app/customer/actions/customerActions';
import { formatPeso } from '@/lib/utils/formatOfferingPrice';
import type { BookingStatus, BookingWithContext } from '@/lib/types/booking';

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  no_show: 'bg-destructive/10 text-destructive border-destructive/20',
};

const STATUS_COPY: Record<BookingStatus, string> = {
  pending: 'Waiting for the shop to confirm',
  confirmed: 'Confirmed — see you then',
  declined: 'The shop couldn’t take this one',
  cancelled: 'You cancelled this booking',
  completed: 'Completed',
  no_show: 'Marked as a no-show',
};

export function CustomerBookingsContent({
  bookings,
  failed,
  page,
  totalPages,
}: {
  bookings: BookingWithContext[];
  failed: boolean;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const cancel = async (bookingId: string) => {
    setPendingId(bookingId);
    const toastId = `cancel-booking-${bookingId}`;
    toast.loading('Cancelling…', { id: toastId });
    try {
      const result = await cancelBookingAction(bookingId);
      if (!result.ok) {
        toast.error(result.message, { id: toastId });
        return;
      }
      toast.success('Booking cancelled', { id: toastId });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">My bookings</h1>
        <p className="text-muted-foreground text-sm">
          Requests you’ve sent to shops.
        </p>
      </div>

      {failed ? (
        <Card>
          <CardContent className="text-muted-foreground p-8 text-center text-sm">
            Couldn’t load your bookings right now — please refresh to try again.
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground p-8 text-center text-sm">
            You haven’t requested any bookings yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const busy = pendingId === booking.id;
            const cancellable =
              booking.status === 'pending' || booking.status === 'confirmed';

            return (
              <Card key={booking.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {booking.product?.name ?? 'Removed offering'}
                      </span>
                      <Badge
                        variant="outline"
                        className={STATUS_TONE[booking.status]}
                      >
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {booking.business && (
                      <Link
                        href={`/explore/${booking.business.id}`}
                        className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
                      >
                        {booking.business.shop_name}
                      </Link>
                    )}
                    <p className="text-muted-foreground text-sm">
                      {new Date(booking.starts_at).toLocaleString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {STATUS_COPY[booking.status]}
                      {booking.decision_note
                        ? ` — “${booking.decision_note}”`
                        : ''}
                    </p>
                    {booking.quoted_amount != null && (
                      <p className="text-primary text-sm font-semibold">
                        Quoted {formatPeso(booking.quoted_amount)}
                      </p>
                    )}
                  </div>

                  {cancellable && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => cancel(booking.id)}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <p className="text-muted-foreground text-xs">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
