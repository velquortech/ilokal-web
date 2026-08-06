'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { sendMenuFollowUpBatchAction } from '../../actions/menuFollowUpActions';

/**
 * "Send to all" over the whole filtered set. Confirmed first — it emails real
 * owners — and the summary reports skipped/failed, not just sent, because the
 * cooldown and the send-time re-check mean "all" rarely means every id.
 */
export function SendAllButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const count = ids.length;

  const sendAll = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      const res = await sendMenuFollowUpBatchAction(ids);
      if (!res.ok) {
        toast.error(res.error ?? 'Could not send the reminders.');
        return;
      }
      const parts = [`${res.sent} sent`];
      if (res.skipped) parts.push(`${res.skipped} skipped`);
      if (res.failed) parts.push(`${res.failed} failed`);
      if (res.capped) parts.push(`${res.capped} over the limit — run again`);
      toast.success(parts.join(' · '));
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error('Could not send the reminders.');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const busy = sending || pending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={count === 0}>
          <Send className="size-4" />
          Send to all ({count})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send {count} reminder emails?</DialogTitle>
          <DialogDescription>
            Each verified shop below with no menu gets one email to its owner.
            Shops reminded recently, or that have since added a menu, are
            skipped automatically. Up to 100 are sent per run.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={sendAll} disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Send reminders
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
