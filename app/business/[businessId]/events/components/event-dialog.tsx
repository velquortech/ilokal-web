'use client';

/**
 * The owner's side of the shared event form.
 *
 * All this does is bind the owner's Server Actions — which prove ownership of
 * `businessId` before writing anything — to the shared dialog. The fields,
 * the Manila-pinned times and the coordinate rules live in one place
 * (`components/custom/events/EventFormDialog.tsx`), so the admin's staff-pick
 * form cannot drift away from this one.
 */

import * as React from 'react';
import {
  EventFormDialog,
  type OfferingOption,
} from '@/components/custom/events/EventFormDialog';
import type { EventWithRefs } from '@/lib/types';
import {
  createEventAction,
  updateEventAction,
  uploadEventImageAction,
} from '../../actions/eventActions';

export type { OfferingOption };

interface EventDialogProps {
  /**
   * The shop this event belongs to, from the route segment.
   *
   * Required, and threaded all the way to `verifyBusinessOwner(businessId)`.
   * The actions used to call that helper with no argument, which falls back to
   * whichever shop `.limit(1)` returns — so an owner with two shops filed
   * events against the wrong one.
   */
  businessId: string;
  offerings: OfferingOption[];
  /** Present when editing. */
  event?: EventWithRefs;
  children: React.ReactNode;
}

export function EventDialog({
  businessId,
  offerings,
  event,
  children,
}: EventDialogProps) {
  return (
    <EventFormDialog
      variant="proposal"
      event={event}
      offerings={offerings}
      onSave={(payload, { asDraft }) =>
        event
          ? updateEventAction(businessId, event.id, payload)
          : createEventAction(businessId, payload, !asDraft)
      }
      onUploadImage={(formData) => uploadEventImageAction(businessId, formData)}
    >
      {children}
    </EventFormDialog>
  );
}
