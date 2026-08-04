'use client';

/**
 * The admin's side of the shared event form — a **staff pick**.
 *
 * `business_id` stays null and the row is inserted at `approved`, because an
 * admin authoring an event IS the review. No draft, and no offering picker: a
 * platform event has no shop, so it has no offering to promote (the composite
 * FK would refuse one anyway).
 */

import * as React from 'react';
import { EventFormDialog } from '@/components/custom/events/EventFormDialog';
import type { EventWithRefs } from '@/lib/types';
import {
  createPlatformEventAction,
  updatePlatformEventAction,
  uploadPlatformEventImageAction,
} from '../../actions/eventReviewActions';

interface StaffPickDialogProps {
  /** Present when editing an existing staff pick. */
  event?: EventWithRefs;
  children: React.ReactNode;
}

export function StaffPickDialog({ event, children }: StaffPickDialogProps) {
  return (
    <EventFormDialog
      variant="staff-pick"
      event={event}
      onSave={(payload) =>
        event
          ? updatePlatformEventAction(event.id, payload)
          : createPlatformEventAction(payload)
      }
      onUploadImage={uploadPlatformEventImageAction}
    >
      {children}
    </EventFormDialog>
  );
}
