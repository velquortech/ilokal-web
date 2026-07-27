'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requestBookingAction } from '@/app/customer/actions/customerActions';
import type { PublicProduct } from '@/lib/types';

/**
 * Customer-side booking request.
 *
 * Every rule (lead time, capacity, branch ownership, availability) is enforced
 * by the `request_booking` RPC — this form only collects input and surfaces the
 * server's message. Duplicating the gates client-side is how they drift.
 */
export function BookOfferingDialog({
  product,
  branchId,
  needsRange,
  children,
}: {
  product: PublicProduct;
  branchId?: string | null;
  /** Rentals occupy a window; appointments derive theirs from the duration. */
  needsRange: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [startsAt, setStartsAt] = React.useState('');
  const [endsAt, setEndsAt] = React.useState('');
  const [partySize, setPartySize] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!startsAt) {
      setError('Pick a start date and time.');
      return;
    }
    if (needsRange && !endsAt) {
      setError('Pick an end date and time.');
      return;
    }

    setBusy(true);
    const toastId = `book-${product.id}`;
    toast.loading('Sending your request…', { id: toastId });
    try {
      const result = await requestBookingAction({
        product_id: product.id,
        // `datetime-local` has no zone; toISOString applies the viewer's.
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        branch_id: branchId ?? null,
        party_size: partySize ? Number(partySize) : null,
        notes: notes.trim() || null,
      });

      if (!result.ok) {
        setError(result.message);
        toast.error(result.message, { id: toastId });
        return;
      }

      toast.success('Request sent — the shop will confirm shortly', {
        id: toastId,
      });
      setOpen(false);
      setStartsAt('');
      setEndsAt('');
      setPartySize('');
      setNotes('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="text-primary size-5" />
              Request {product.name}
            </DialogTitle>
            <DialogDescription>
              The shop confirms or declines — nothing is charged now.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field>
              <FieldLabel htmlFor="booking-start">
                {needsRange ? 'From' : 'Preferred date and time'}
              </FieldLabel>
              <Input
                id="booking-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </Field>

            {needsRange && (
              <Field>
                <FieldLabel htmlFor="booking-end">Until</FieldLabel>
                <Input
                  id="booking-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="booking-party">
                How many people? (optional)
              </FieldLabel>
              <Input
                id="booking-party"
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="booking-notes">Notes (optional)</FieldLabel>
              <Textarea
                id="booking-notes"
                rows={3}
                className="resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the shop should know"
              />
            </Field>

            {error && <FieldError>{error}</FieldError>}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="min-w-32">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Send request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
