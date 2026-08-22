'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendRegistrationFollowUpAction } from '../../actions/registrationFollowUpActions';

/** Friendly copy for each skip reason the action can return. */
const SKIP_COPY: Record<string, string> = {
  ALREADY_REGISTERED: 'This owner has listed a shop — nothing to send.',
  NOT_ELIGIBLE: 'This account is no longer eligible.',
  NO_EMAIL: 'This owner has no email on file.',
  RECENTLY_SENT: 'This owner was reminded recently.',
  NOT_FOUND: 'This account could not be found.',
};

export function SendRegistrationReminderButton({
  ownerId,
}: {
  ownerId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  // A ref latch stops a second click before React commits `disabled`.
  const inFlight = useRef(false);

  const send = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      const res = await sendRegistrationFollowUpAction(ownerId);
      if (!res.ok) {
        toast.error(res.error ?? 'Could not send the reminder.');
        return;
      }
      const outcome = res.outcome;
      if (outcome?.status === 'sent') {
        toast.success('Reminder sent.');
      } else if (outcome?.status === 'skipped') {
        toast.info(SKIP_COPY[outcome.reason] ?? 'Nothing to send.');
      } else {
        toast.error('The email could not be sent. Please try again.');
      }
      // Refresh so the "last reminded" column and the stats update.
      startTransition(() => router.refresh());
    } catch {
      toast.error('Could not send the reminder.');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const busy = sending || pending;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={send}
      disabled={busy}
      aria-busy={busy}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mail className="size-4" />
      )}
      Send reminder
    </Button>
  );
}
