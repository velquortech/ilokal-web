'use client';

/**
 * One status pill, shared by both event tables.
 *
 * The tone map was spelled out identically in the owner's list and the admin
 * queue. Two copies of a `Record<EventStatus, …>` is two chances for the next
 * status to be added to one of them (CLAUDE.md §DRY).
 *
 * Green is reserved for SUCCESS, not for brand — `approved` earns it. Amber is
 * "waiting on someone", not a fault. `rejected` is destructive because it is
 * the one state that needs acting on.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EVENT_STATUS_OPTIONS, type EventStatus } from '@/lib/types';

const STATUS_TONE: Record<EventStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

/** The owner-facing label for a status, never the raw column value. */
export function eventStatusLabel(status: EventStatus): string {
  return EVENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATUS_TONE[status], className)}>
      {eventStatusLabel(status)}
    </Badge>
  );
}
