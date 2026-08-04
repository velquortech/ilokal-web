'use client';

/**
 * Confirm before removing an event.
 *
 * The old list had `Remove` as a bare button in the row — one mis-click
 * soft-deleted a proposal with no way back from the UI. Every other destructive
 * row action in this dashboard confirms first (`DeleteProductDialog`); this one
 * now does too.
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
import { archiveEventAction } from '../../../actions/eventActions';

interface RemoveEventDialogProps {
  businessId: string;
  event: EventWithRefs;
  children: React.ReactNode;
}

export function RemoveEventDialog({
  businessId,
  event,
  children,
}: RemoveEventDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const remove = async () => {
    setPending(true);
    setError(null);

    const toastId = `remove-event-${event.id}`;
    toast.loading('Removing…', { id: toastId });

    try {
      const result = await archiveEventAction(businessId, event.id);
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
      // A rejected Server Action would otherwise leave the toast spinning.
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
            Remove this event?
          </DialogTitle>
          <DialogDescription>
            {event.status === 'approved'
              ? `“${event.name}” is live on Explore. Removing it takes it down.`
              : `“${event.name}” will be removed from your list.`}
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
