'use client';

/**
 * Row actions for the review queue.
 *
 * Approve and reject stay behind their dialogs — a rejection needs a reason,
 * and the action refuses one without it server-side, so a one-click menu entry
 * would fail every time.
 *
 * Edit and Remove appear only on a **staff pick** (`business_id === null`).
 * They are absent rather than disabled: a greyed-out control on a shop's event
 * suggests an admin could take it down silently, and the deliberate answer is
 * that they cannot — that is what reject-with-a-reason is for.
 */

import * as React from 'react';
import Link from 'next/link';
import { Check, Ellipsis, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
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
import { DecisionDialog } from '../decision-dialog';
import { StaffPickDialog } from '../staff-pick-dialog';
import { RemoveStaffPickDialog } from './remove-staff-pick-dialog';

export function ReviewActions({ event }: { event: EventWithRefs }) {
  const isStaffPick = event.business_id === null;
  const awaitingDecision = event.status === 'pending_review';

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {event.status === 'approved' && (
            <DropdownMenuItem asChild>
              <Link href={eventPath(event.id)} target="_blank">
                <ExternalLink />
                View on iLokal
              </Link>
            </DropdownMenuItem>
          )}

          {awaitingDecision && (
            <>
              <DecisionDialog event={event} decision="approve">
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Check />
                  Approve
                </DropdownMenuItem>
              </DecisionDialog>
              <DecisionDialog event={event} decision="reject">
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <X />
                  Reject
                </DropdownMenuItem>
              </DecisionDialog>
            </>
          )}

          {isStaffPick && (
            <>
              <DropdownMenuSeparator />
              <StaffPickDialog event={event}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil />
                  Edit event
                </DropdownMenuItem>
              </StaffPickDialog>
              <RemoveStaffPickDialog event={event}>
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 />
                  Remove
                </DropdownMenuItem>
              </RemoveStaffPickDialog>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
