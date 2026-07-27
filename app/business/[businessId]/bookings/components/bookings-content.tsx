'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { StatCard } from '@/components/custom/StatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { decideBookingAction } from '../../actions/bookingActions';
import type { BookingStats } from '@/lib/api/bookings/bookingQuery';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import { BUSINESS_TIME_ZONE } from '@/lib/utils/operatingHours';
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

/**
 * Appointment times are shop-local, always.
 *
 * Without an explicit `timeZone` these render in the AMBIENT zone — UTC during
 * SSR on Vercel, the device zone after hydration — so every row mismatches on
 * hydration and an owner travelling abroad sees times 8h out.
 */
const TIME_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
};

const CLOCK_OPTS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
};

/** Shop-local calendar day, for deciding whether to repeat the date. */
function shopLocalDate(value: Date): string {
  return value.toLocaleDateString('en-PH', { timeZone: BUSINESS_TIME_ZONE });
}

function formatWindow(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  if (!endsAt) return start.toLocaleString('en-PH', TIME_OPTS);

  const end = new Date(endsAt);
  const sameDay = shopLocalDate(start) === shopLocalDate(end);
  return sameDay
    ? `${start.toLocaleString('en-PH', TIME_OPTS)} – ${end.toLocaleTimeString('en-PH', CLOCK_OPTS)}`
    : `${start.toLocaleString('en-PH', TIME_OPTS)} → ${end.toLocaleString('en-PH', TIME_OPTS)}`;
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
  stats: BookingStats;
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
  // Per-row decision drafts, keyed by booking id so typing in one row can't
  // bleed into another.
  const [drafts, setDrafts] = React.useState<
    Record<string, { quote?: string; note?: string }>
  >({});

  const setDraft = (id: string, patch: { quote?: string; note?: string }) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const draftFor = (id: string) => {
    const draft = drafts[id];
    const parsed = draft?.quote ? Number(draft.quote) : NaN;
    return {
      note: draft?.note?.trim() || null,
      quotedAmount: Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
    };
  };

  const status = searchParams.get('status') ?? '';

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('status', next);
    else params.delete('status');
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const decide = async (
    bookingId: string,
    decision: BookingDecision,
    options: { note?: string | null; quotedAmount?: number | null } = {},
  ) => {
    setPendingId(bookingId);
    const toastId = `booking-${bookingId}`;
    toast.loading('Updating booking…', { id: toastId });
    try {
      const result = await decideBookingAction(
        businessId,
        bookingId,
        decision,
        options,
      );
      if (!result.ok) {
        toast.error(result.message, { id: toastId });
        return;
      }
      toast.success(
        decision === 'confirmed' ? 'Booking confirmed' : 'Booking updated',
        { id: toastId },
      );
      router.refresh();
    } catch (err) {
      // Without this a rejected Server Action is an unhandled rejection and
      // the loading toast never resolves.
      console.error('[decideBooking]', err);
      toast.error('Something went wrong — please try again.', { id: toastId });
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

      {/* A failed count would otherwise read as a real zero — misleading next
          to a list that is itself reporting an outage. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            ['Awaiting reply', stats.pending, CalendarClock],
            ['Confirmed', stats.confirmed, Check],
            ['Upcoming', stats.upcoming, CalendarClock],
            ['All time', stats.total, CalendarClock],
          ] as const
        ).map(([title, value, icon]) => (
          <StatCard
            key={title}
            title={title}
            icon={icon}
            value={stats.failed ? '—' : value}
          />
        ))}
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
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      {/* Quoting is the whole point of an `on_request`
                          offering, and a decline the customer can't interpret
                          is worse than none. Both surface on the customer's
                          bookings page, which already renders them. */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Quote ₱ (optional)"
                          className="h-8 w-36 text-sm"
                          value={drafts[booking.id]?.quote ?? ''}
                          onChange={(e) =>
                            setDraft(booking.id, { quote: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Note to customer (optional)"
                          className="h-8 w-52 text-sm"
                          value={drafts[booking.id]?.note ?? ''}
                          onChange={(e) =>
                            setDraft(booking.id, { note: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            decide(booking.id, 'declined', draftFor(booking.id))
                          }
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
                          onClick={() =>
                            decide(
                              booking.id,
                              'confirmed',
                              draftFor(booking.id),
                            )
                          }
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Confirm
                        </Button>
                      </div>
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

      {/* Real controls, not just a counter — nothing else writes ?page=, so
          without this every booking past the first page is unreachable. */}
      <PaginationBar metadata={metadata} noun="booking" />
    </div>
  );
}
