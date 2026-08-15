'use client';

/**
 * Row actions for the owner's event list.
 *
 * The menu only ever offers moves the owner actually has. Approve and reject
 * are absent — not disabled — because the DB trigger reverts either from a
 * non-admin, so an entry for them would be a control that silently does
 * nothing. `ownerEventStatusSchema` refuses them server-side as well.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Ellipsis,
  ExternalLink,
  Pencil,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { eventPath } from '@/config/routeConfig';
import type { EventWithRefs } from '@/lib/types';
import { EventDialog, type OfferingOption } from '../event-dialog';
import { RemoveEventDialog } from './remove-event-dialog';
import { setEventStatusAction } from '../../../actions/eventActions';

interface EventActionsProps {
  businessId: string;
  event: EventWithRefs;
  offerings: OfferingOption[];
}

export function EventActions({
  businessId,
  event,
  offerings,
}: EventActionsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const move = async (
    status: 'draft' | 'pending_review',
    label: string,
    done: string,
  ) => {
    setPending(true);
    // Stable id per the one-Toaster rule — a fast clicker gets one toast that
    // resolves, not a stack of them.
    const toastId = `event-status-${event.id}`;
    toast.loading(label, { id: toastId });
    try {
      const result = await setEventStatusAction(businessId, event.id, status);
      if (result.success) {
        toast.success(done, { id: toastId });
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
      setPending(false);
    }
  };

  const canSubmit = event.status === 'draft' || event.status === 'rejected';

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 p-0 md:h-8 md:w-8"
          >
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Only a published event has a public page to open. */}
          {event.status === 'approved' && (
            <DropdownMenuItem asChild>
              <Link href={eventPath(event.id)} target="_blank">
                <ExternalLink />
                View on iLokal
              </Link>
            </DropdownMenuItem>
          )}

          <EventDialog
            businessId={businessId}
            offerings={offerings}
            event={event}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit event
            </DropdownMenuItem>
          </EventDialog>

          {canSubmit && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                void move(
                  'pending_review',
                  'Sending for review…',
                  'Sent for review',
                );
              }}
            >
              <Send />
              Send for review
            </DropdownMenuItem>
          )}

          {event.status === 'pending_review' && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                void move('draft', 'Withdrawing…', 'Withdrawn');
              }}
            >
              <Undo2 />
              Withdraw
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <RemoveEventDialog businessId={businessId} event={event}>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 />
              Remove
            </DropdownMenuItem>
          </RemoveEventDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
