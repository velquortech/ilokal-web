'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/custom/StatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { decideBookingAction } from '../../actions/bookingActions';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import {
  BOOKING_STATUSES,
  type BookingDecision,
  type BookingStatus,
  type BookingWithContext,
} from '@/lib/types/booking';

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  no_show: 'bg-destructive/10 text-destructive border-destructive/20',
};

function formatWindow(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  if (!endsAt) return start.toLocaleString('en-PH', opts);

  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${start.toLocaleString('en-PH', opts)} – ${end.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`
    : `${start.toLocaleString('en-PH', opts)} → ${end.toLocaleString('en-PH', opts)}`;
}

interface Props {
  businessId: string;
  bookings: BookingWithContext[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  stats: {
    pending: number;
    confirmed: number;
    upcoming: number;
    total: number;
  };
  failed: boolean;
}

export function BookingsContent({
  businessId,
  bookings,
  metadata,
  stats,
  failed,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vocabulary = useOfferingVocabulary();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const status = searchParams.get('status') ?? '';

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('status', next);
    else params.delete('status');
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const decide = async (bookingId: string, decision: BookingDecision) => {
    setPendingId(bookingId);
    const toastId = `booking-${bookingId}`;
    toast.loading('Updating booking…', { id: toastId });
    try {
      const result = await decideBookingAction(businessId, bookingId, decision);
      if (!result.ok) {
        toast.error(result.message, { id: toastId });
        return;
      }
      toast.success(
        decision === 'confirmed' ? 'Booking confirmed' : 'Booking updated',
        { id: toastId },
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex h-max flex-1 flex-col space-y-6 pb-8">
      <div className="flex flex-col">
        <span className="text-lg font-medium">Bookings</span>
        <span className="text-muted-foreground text-sm">
          Requests for your {vocabulary.plural.toLowerCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Awaiting reply"
          icon={CalendarClock}
          value={stats.pending}
        />
        <StatCard title="Confirmed" icon={Check} value={stats.confirmed} />
        <StatCard
          title="Upcoming"
          icon={CalendarClock}
          value={stats.upcoming}
        />
        <StatCard title="All time" icon={CalendarClock} value={stats.total} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status || 'all'}
          onValueChange={(v) => setStatus(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {failed ? (
        <Card>
          <CardContent className="text-muted-foreground p-8 text-center text-sm">
            Couldn’t load bookings right now — please refresh to try again.
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground p-8 text-center text-sm">
            No booking requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const busy = pendingId === booking.id;
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
                    <p className="text-muted-foreground text-sm">
                      {formatWindow(booking.starts_at, booking.ends_at)}
                      {booking.party_size ? ` · ${booking.party_size} pax` : ''}
                      {booking.branch?.name ? ` · ${booking.branch.name}` : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {booking.customer?.full_name ?? 'A customer'}
                      {booking.notes ? ` — “${booking.notes}”` : ''}
                    </p>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => decide(booking.id, 'declined')}
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => decide(booking.id, 'confirmed')}
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Confirm
                      </Button>
                    </div>
                  )}

                  {booking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => decide(booking.id, 'completed')}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Mark completed
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {metadata.total_pages > 1 && (
        <p className="text-muted-foreground text-xs">
          Page {metadata.page} of {metadata.total_pages} · {metadata.total}{' '}
          total
        </p>
      )}
    </div>
  );
}
