'use client';

/**
 * Banner order, edited in place.
 *
 * Admin-only — the DB trigger zeroes any value an owner sends, so this is the
 * only path to a number other than 0. It saves on blur rather than on every
 * keystroke, and a rejected save puts the stored value back so the field never
 * shows a number the row does not hold.
 *
 * Only meaningful on an approved event: nothing else is on the banner.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { EventWithRefs } from '@/lib/types';
import { setEventPriorityAction } from '../../../actions/eventReviewActions';

export function PriorityCell({ event }: { event: EventWithRefs }) {
  const router = useRouter();
  const [priority, setPriority] = React.useState(String(event.priority));
  const [saving, setSaving] = React.useState(false);

  // A refresh after someone else's edit must show the new number.
  React.useEffect(() => {
    setPriority(String(event.priority));
  }, [event.priority]);

  if (event.status !== 'approved') {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const save = async () => {
    const value = Number(priority);
    if (!Number.isInteger(value) || value === event.priority) return;

    setSaving(true);
    const toastId = `priority-${event.id}`;
    toast.loading('Saving order…', { id: toastId });
    try {
      const result = await setEventPriorityAction(event.id, value);
      if (result.success) {
        toast.success('Order saved', { id: toastId });
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to save', { id: toastId });
        setPriority(String(event.priority));
      }
    } catch {
      toast.error('Failed to save', { id: toastId });
      setPriority(String(event.priority));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        value={priority}
        disabled={saving}
        aria-label={`Banner order for ${event.name}`}
        onChange={(e) => setPriority(e.target.value)}
        onBlur={save}
        className="h-8 w-18"
      />
      {saving && <Loader2 className="size-3 animate-spin" aria-hidden />}
    </div>
  );
}
