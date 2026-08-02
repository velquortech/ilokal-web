'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarDays,
  ImageOff,
  Loader2,
  MapPin,
  Plus,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/custom/PageHeader';
import { SearchBar } from '@/components/custom/Searchbar';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { cn } from '@/lib/utils';
import { formatEventWhen, eventPhase } from '@/lib/utils/eventSchedule';
import {
  EVENT_STATUS_OPTIONS,
  type EventListMetadata,
  type EventStatus,
  type EventWithRefs,
} from '@/lib/types';
import { EventDialog, type OfferingOption } from './event-dialog';
import {
  archiveEventAction,
  setEventStatusAction,
} from '../../actions/eventActions';

const STATUS_TONE: Record<EventStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  // Success-green, not brand — the standing rule.
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const STATUS_FILTERS: Array<{ value: EventStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  ...EVENT_STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
];

function statusLabel(status: EventStatus): string {
  return EVENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

interface EventsContentProps {
  events: EventWithRefs[];
  metadata: EventListMetadata;
  loadFailed: boolean;
  selectedStatus: EventStatus | '';
  offerings: OfferingOption[];
}

export function EventsContent({
  events,
  metadata,
  loadFailed,
  selectedStatus,
  offerings,
}: EventsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const updateParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // Intentionally keyed on the input alone: including `updateParams` would
    // re-arm the timer on every navigation and re-push the search mid-typing.
  }, [searchInput]);

  const run = async (
    id: string,
    label: string,
    fn: () => Promise<{ success: boolean; error?: { message: string } }>,
  ) => {
    setBusyId(id);
    const toastId = `event-${id}`;
    toast.loading(label, { id: toastId });
    try {
      const result = await fn();
      if (result.success) {
        toast.success(label.replace(/…$/, ''), { id: toastId });
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Something went wrong', {
          id: toastId,
        });
      }
    } catch {
      // A rejected Server Action would otherwise leave the toast spinning.
      toast.error('Something went wrong', { id: toastId });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-max flex-1 flex-col space-y-6 pb-8">
      <PageHeader
        title="Events"
        lede="Propose an event and the iLokal team will review it before it goes live."
        action={
          <EventDialog offerings={offerings}>
            <Button>
              <Plus />
              Propose an event
            </Button>
          </EventDialog>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {STATUS_FILTERS.map(({ value, label }) => (
                <Button
                  key={value || 'all'}
                  size="sm"
                  variant={selectedStatus === value ? 'default' : 'ghost'}
                  onClick={() =>
                    updateParams({ status: value || null, page: '1' })
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {loadFailed ? (
            <EmptyState
              title="We couldn't load your events"
              body="Something went wrong on our side. Try again in a moment."
            />
          ) : events.length === 0 ? (
            <EmptyState
              title="No events yet"
              body="Propose one and the iLokal team will review it before it appears on Explore."
            />
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  offerings={offerings}
                  busy={busyId === event.id}
                  onSubmit={() =>
                    run(event.id, 'Sending for review…', () =>
                      setEventStatusAction(event.id, 'pending_review'),
                    )
                  }
                  onWithdraw={() =>
                    run(event.id, 'Withdrawing…', () =>
                      setEventStatusAction(event.id, 'draft'),
                    )
                  }
                  onRemove={() =>
                    run(event.id, 'Removing…', () =>
                      archiveEventAction(event.id),
                    )
                  }
                />
              ))}
            </ul>
          )}

          <PaginationBar metadata={metadata} noun="event" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <CalendarDays className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}

function EventRow({
  event,
  offerings,
  busy,
  onSubmit,
  onWithdraw,
  onRemove,
}: {
  event: EventWithRefs;
  offerings: OfferingOption[];
  busy: boolean;
  onSubmit: () => void;
  onWithdraw: () => void;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);
  const phase = eventPhase(event);

  return (
    <li className="flex flex-wrap items-start gap-4 rounded-lg border p-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md border">
        {event.image_url && !imgError ? (
          <Image
            src={event.image_url}
            alt=""
            fill
            unoptimized
            sizes="64px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="bg-muted flex h-full w-full items-center justify-center">
            <ImageOff className="text-muted-foreground size-5" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{event.name}</p>
          <Badge variant="outline" className={cn(STATUS_TONE[event.status])}>
            {statusLabel(event.status)}
          </Badge>
          {phase === 'live' && event.status === 'approved' && (
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary"
            >
              Happening now
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground text-sm">
          {formatEventWhen(event)}
        </p>
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="size-3" aria-hidden />
          {event.address}
        </p>

        {/* The reason lives on the row, not only in the bell — an owner should
            not have to find a notification to learn what to change. */}
        {event.status === 'rejected' && event.review_note && (
          <p className="text-destructive mt-2 text-sm">“{event.review_note}”</p>
        )}
        {event.status === 'approved' && (
          <p className="text-muted-foreground mt-1 text-xs">
            Editing a published event sends it back for review.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EventDialog offerings={offerings} event={event}>
          <Button size="sm" variant="outline" disabled={busy}>
            Edit
          </Button>
        </EventDialog>

        {(event.status === 'draft' || event.status === 'rejected') && (
          <Button size="sm" onClick={onSubmit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Send aria-hidden />}
            Send for review
          </Button>
        )}

        {event.status === 'pending_review' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onWithdraw}
            disabled={busy}
          >
            <Undo2 aria-hidden />
            Withdraw
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={onRemove}
          disabled={busy}
        >
          <Trash2 aria-hidden />
          Remove
        </Button>
      </div>
    </li>
  );
}
