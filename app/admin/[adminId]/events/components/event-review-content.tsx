'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarDays,
  Check,
  ExternalLink,
  ImageOff,
  Loader2,
  MapPin,
  Store,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/custom/PageHeader';
import { SearchBar } from '@/components/custom/Searchbar';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { cn } from '@/lib/utils';
import { formatEventWhen } from '@/lib/utils/eventSchedule';
import { safeExternalUrl } from '@/lib/utils/safeExternalUrl';
import { explorePath } from '@/config/routeConfig';
import {
  EVENT_STATUS_OPTIONS,
  type EventListMetadata,
  type EventStatus,
  type EventWithRefs,
} from '@/lib/types';
import { DecisionDialog } from './decision-dialog';
import { setEventPriorityAction } from '../../actions/eventReviewActions';

const STATUS_TONE: Record<EventStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'pending_review', label: 'Needs a decision' },
  { value: 'approved', label: 'Published' },
  { value: 'rejected', label: 'Not approved' },
  { value: 'all', label: 'All' },
];

function statusLabel(status: EventStatus): string {
  return EVENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

interface EventReviewContentProps {
  events: EventWithRefs[];
  metadata: EventListMetadata;
  loadFailed: boolean;
  selectedStatus: EventStatus | '';
}

export function EventReviewContent({
  events,
  metadata,
  loadFailed,
  selectedStatus,
}: EventReviewContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );

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
    // Keyed on the input alone — see events-content.tsx for why.
  }, [searchInput]);

  // `status` is absent by default, which the page reads as pending_review.
  const activeFilter = selectedStatus === '' ? 'all' : selectedStatus;

  return (
    <div className="flex h-max flex-1 flex-col space-y-6 pb-8">
      <PageHeader
        title="Event Proposals"
        lede="Approve what belongs on Explore. Every rejection needs a reason the shop can act on."
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={activeFilter === value ? 'default' : 'ghost'}
                  onClick={() => updateParams({ status: value, page: '1' })}
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
              title="We couldn't load the queue"
              body="Something went wrong on our side. Try again in a moment."
            />
          ) : events.length === 0 ? (
            <EmptyState
              title={
                activeFilter === 'pending_review'
                  ? 'Nothing waiting'
                  : 'Nothing here'
              }
              body={
                activeFilter === 'pending_review'
                  ? 'Every proposal has been decided.'
                  : 'No events match this filter.'
              }
            />
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <ReviewRow key={event.id} event={event} />
              ))}
            </ul>
          )}

          <PaginationBar metadata={metadata} noun="proposal" />
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

function ReviewRow({ event }: { event: EventWithRefs }) {
  const router = useRouter();
  const [imgError, setImgError] = React.useState(false);
  const [priority, setPriority] = React.useState(String(event.priority));
  const [savingPriority, setSavingPriority] = React.useState(false);

  // Never render a submitted URL raw. Zod guards the write path, but rows
  // written before that check — and any admin edit — bypass it entirely.
  const link = safeExternalUrl(event.link_url);
  const tickets = safeExternalUrl(event.ticket_url);

  const savePriority = async () => {
    const value = Number(priority);
    if (!Number.isInteger(value) || value === event.priority) return;

    setSavingPriority(true);
    const toastId = `priority-${event.id}`;
    toast.loading('Saving order…', { id: toastId });
    try {
      const result = await setEventPriorityAction(event.id, value);
      if (result.success) {
        toast.success('Order saved', { id: toastId });
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to save', { id: toastId });
        setPriority(String(event.priority));
      }
    } catch {
      toast.error('Failed to save', { id: toastId });
      setPriority(String(event.priority));
    } finally {
      setSavingPriority(false);
    }
  };

  return (
    <li className="flex flex-wrap items-start gap-4 rounded-lg border p-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md border">
        {event.image_url && !imgError ? (
          <Image
            src={event.image_url}
            alt=""
            fill
            unoptimized
            sizes="80px"
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
        </div>

        <p className="text-muted-foreground flex items-center gap-1 text-sm">
          <Store className="size-3" aria-hidden />
          {event.business ? (
            <Link
              href={explorePath(event.business.id)}
              className="hover:underline"
            >
              {event.business.shop_name}
            </Link>
          ) : (
            // A platform event has no shop behind it — say so rather than
            // rendering an empty slot that reads like missing data.
            <span>iLokal</span>
          )}
          {event.product && <span>· promotes {event.product.name}</span>}
        </p>

        <p className="text-muted-foreground text-sm">
          {formatEventWhen(event)}
        </p>
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="size-3" aria-hidden />
          {event.address}
        </p>

        {event.description && (
          <p className="mt-2 line-clamp-3 text-sm">{event.description}</p>
        )}

        {(link || tickets) && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
              >
                <ExternalLink className="size-3" aria-hidden />
                Website
              </a>
            )}
            {tickets && (
              <a
                href={tickets}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
              >
                <ExternalLink className="size-3" aria-hidden />
                Tickets
              </a>
            )}
          </div>
        )}

        {event.review_note && (
          <p className="text-muted-foreground mt-2 text-xs italic">
            Your note: “{event.review_note}”
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {event.status === 'pending_review' && (
          <div className="flex flex-wrap items-center gap-2">
            <DecisionDialog event={event} decision="approve">
              <Button size="sm">
                <Check aria-hidden />
                Approve
              </Button>
            </DecisionDialog>
            <DecisionDialog event={event} decision="reject">
              <Button size="sm" variant="outline" className="text-destructive">
                <X aria-hidden />
                Reject
              </Button>
            </DecisionDialog>
          </div>
        )}

        {event.status === 'approved' && (
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Banner order</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={priority}
              disabled={savingPriority}
              onChange={(e) => setPriority(e.target.value)}
              onBlur={savePriority}
              className="h-8 w-20"
            />
            {savingPriority && (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            )}
          </label>
        )}
      </div>
    </li>
  );
}
