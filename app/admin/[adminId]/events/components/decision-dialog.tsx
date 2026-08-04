'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EventWithRefs } from '@/lib/types';
import { decideEventAction } from '../../actions/eventReviewActions';

interface DecisionDialogProps {
  event: EventWithRefs;
  decision: 'approve' | 'reject';
  children: React.ReactNode;
}

/**
 * Approve or reject one proposal.
 *
 * The reason field is required on reject and optional on approve — the same
 * rule `reviewDecisionSchema` enforces server-side. Disabling the button is a
 * courtesy; the action is what actually refuses.
 */
export function DecisionDialog({
  event,
  decision,
  children,
}: DecisionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [priority, setPriority] = React.useState('0');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isReject = decision === 'reject';

  React.useEffect(() => {
    if (open) {
      setNote('');
      setPriority(String(event.priority));
      setError(null);
    }
  }, [open, event.priority]);

  const submit = async () => {
    setPending(true);
    setError(null);

    const toastId = `decide-${event.id}`;
    toast.loading(isReject ? 'Rejecting…' : 'Approving…', { id: toastId });

    try {
      const result = await decideEventAction(event.id, {
        decision,
        note: note.trim() || undefined,
        ...(isReject ? {} : { priority: Number(priority) || 0 }),
      });

      if (result.success) {
        toast.success(
          isReject
            ? 'Rejected. The shop has been told why.'
            : 'Approved and published.',
          { id: toastId },
        );
        setOpen(false);
        router.refresh();
      } else {
        const message = result.error?.message ?? 'Something went wrong.';
        setError(message);
        toast.error(message, { id: toastId });
      }
    } catch {
      // A rejected Server Action would otherwise leave the toast spinning.
      const message = 'Something went wrong.';
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReject ? 'Reject this event' : 'Approve this event'}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? `“${event.name}” stays off Explore, and the shop gets your reason.`
              : `“${event.name}” goes live on Explore straight away.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="decision-note">
              {isReject ? 'Why not?' : 'Note to the shop (optional)'}
            </FieldLabel>
            <Textarea
              id="decision-note"
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isReject
                  ? 'Tell them what to change so they can resubmit.'
                  : 'Anything you want them to know.'
              }
            />
            {isReject && (
              <p className="text-muted-foreground text-xs">
                They see this on their event and in their notifications.
              </p>
            )}
          </Field>

          {!isReject && (
            <Field>
              <FieldLabel htmlFor="decision-priority">Banner order</FieldLabel>
              <Input
                id="decision-priority"
                type="number"
                min={0}
                max={100}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Higher shows first among events starting the same day. 0 is
                normal.
              </p>
            </Field>
          )}

          {error && <FieldError>{error}</FieldError>}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            variant={isReject ? 'destructive' : 'default'}
            disabled={pending || (isReject && note.trim().length === 0)}
          >
            {pending && <Loader2 className="animate-spin" />}
            {isReject ? 'Reject' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
