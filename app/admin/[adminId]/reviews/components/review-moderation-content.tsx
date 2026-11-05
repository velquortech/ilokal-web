'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Loader2, RotateCcw, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  moderateReviewAction,
  type ModerationAction,
} from '../../actions/reviewModerationActions';
import type {
  ModeratedItem,
  QueueItem,
  ReportReason,
} from '@/lib/api/admin/reviewModerationQuery';

const REASON_LABEL: Record<ReportReason, string> = {
  fake: 'Fake',
  offensive: 'Offensive',
  spam: 'Spam',
  personal_info: 'Personal info',
  other: 'Other',
};

const ACTION_DONE: Record<ModerationAction, string> = {
  hide: 'Review hidden.',
  remove: 'Review removed.',
  restore: 'Review restored.',
};

/**
 * The RPC stores `auto:reports` for the 3-report auto-hide and `admin:<action>`
 * when this page acted without a typed reason; anything else is free text.
 */
export function reasonLabel(reason: string): string {
  if (reason.startsWith('auto:')) return 'Auto-hidden by reports';
  if (reason === 'admin:hide') return 'Hidden by an admin';
  if (reason === 'admin:remove') return 'Removed by an admin';
  return reason;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ActionButton({
  ratingId,
  action,
}: {
  ratingId: string;
  action: ModerationAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  // A ref latch stops a second click before React commits `disabled`.
  const inFlight = useRef(false);

  const run = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const res = await moderateReviewAction(ratingId, action);
      if (res.ok) toast.success(ACTION_DONE[action]);
      else toast.error(res.error ?? 'Could not update the review.');
      startTransition(() => router.refresh());
    } catch {
      toast.error('Could not update the review.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const loading = busy || pending;
  const Icon =
    action === 'hide' ? EyeOff : action === 'remove' ? Trash2 : RotateCcw;
  const label =
    action === 'hide' ? 'Hide' : action === 'remove' ? 'Remove' : 'Restore';

  return (
    <Button
      size="sm"
      variant={action === 'remove' ? 'destructive' : 'outline'}
      onClick={run}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Icon className="size-4" />
      )}
      {label}
    </Button>
  );
}

function ReviewBody({ item }: { item: QueueItem }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{item.shop_name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{item.author_name}</span>
        <span
          className="inline-flex items-center gap-1"
          aria-label={`${item.rating} of 5 stars`}
        >
          <Star className="size-3.5 fill-current" />
          {item.rating}
        </span>
        <span className="text-muted-foreground">
          {formatDate(item.created_at)}
        </span>
      </div>
      <p className="text-sm break-words whitespace-pre-wrap">
        {item.comment?.trim() || (
          <span className="text-muted-foreground italic">
            No comment — star rating only
          </span>
        )}
      </p>
      {item.reports.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.reports.map((r, i) => (
            <Badge
              key={`${r.created_at}-${i}`}
              variant="secondary"
              title={r.note ?? undefined}
            >
              {REASON_LABEL[r.reason] ?? r.reason}
              {r.note ? ' · note' : ''}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewModerationContent({
  reported,
  moderated,
}: {
  reported: QueueItem[];
  moderated: ModeratedItem[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reported ({reported.length})</CardTitle>
          <CardDescription>
            Published reviews someone flagged. Hide keeps it restorable; remove
            is for clear violations.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {reported.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              Nothing reported. 🎉
            </p>
          ) : (
            reported.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <ReviewBody item={item} />
                <div className="flex shrink-0 gap-2">
                  <ActionButton ratingId={item.id} action="hide" />
                  <ActionButton ratingId={item.id} action="remove" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hidden &amp; removed ({moderated.length})</CardTitle>
          <CardDescription>
            Reviews taken off the shop page, newest first. Restoring one
            publishes it again and clears its reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {moderated.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              No hidden or removed reviews.
            </p>
          ) : (
            moderated.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        item.status === 'removed' ? 'destructive' : 'outline'
                      }
                    >
                      {item.status === 'removed' ? 'Removed' : 'Hidden'}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {reasonLabel(item.moderation_reason)} ·{' '}
                      {formatDate(item.moderated_at)}
                    </span>
                  </div>
                  <ReviewBody item={item} />
                </div>
                <div className="flex shrink-0 gap-2">
                  <ActionButton ratingId={item.id} action="restore" />
                  {item.status === 'hidden' && (
                    <ActionButton ratingId={item.id} action="remove" />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
