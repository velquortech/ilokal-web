'use client';

/**
 * Take a staff pick down.
 *
 * Platform events only — the action and the service both scope the write
 * `business_id IS NULL`. A shop's event comes down through **reject**, which
 * carries a reason to its owner; archiving one silently would remove it from
 * Explore with nobody told.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { EventWithRefs } from '@/lib/types';
import { archivePlatformEventAction } from '../../../actions/eventReviewActions';

interface RemoveStaffPickDialogProps {
  event: EventWithRefs;
  children: React.ReactNode;
}

export function RemoveStaffPickDialog({
  event,
  children,
}: RemoveStaffPickDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const remove = async () => {
    setPending(true);
    setError(null);

    const toastId = `remove-staff-pick-${event.id}`;
    toast.loading('Removing…', { id: toastId });

    try {
      const result = await archivePlatformEventAction(event.id);
      if (result.success) {
        toast.success(`“${event.name}” removed`, { id: toastId });
        setOpen(false);
        router.refresh();
      } else {
        const message = result.error?.message ?? 'Failed to remove the event.';
        setError(message);
        toast.error(message, { id: toastId });
      }
    } catch {
      const message = 'Failed to remove the event.';
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="size-5" aria-hidden />
            Remove this iLokal event?
          </DialogTitle>
          <DialogDescription>
            “{event.name}” comes off Explore straight away. Anyone holding the
            link will see that it is no longer listed.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
