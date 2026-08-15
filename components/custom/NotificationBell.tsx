'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BadgePercent,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  CircleX,
  Info,
  Loader2,
  MapPin,
} from 'lucide-react';
import {
  adminEventsPath,
  businessEventsPath,
  businessRedeemedCouponsPath,
  eventPath,
} from '@/config/routeConfig';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/lib/types';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notificationActions';

const PAGE_SIZE = 15;

const TYPE_ICON: Record<NotificationType, typeof Info> = {
  business_document_approved: CircleCheck,
  business_verified: CircleCheck,
  business_document_rejected: CircleX,
  business_rejected: CircleX,
  coupon_redeemed: BadgePercent,
  event_proposal_submitted: CalendarDays,
  event_proposal_approved: CircleCheck,
  event_proposal_rejected: CircleX,
  event_nearby: MapPin,
  system: Info,
};

const TYPE_TONE: Record<NotificationType, string> = {
  business_document_approved: 'text-emerald-600',
  business_verified: 'text-emerald-600',
  business_document_rejected: 'text-destructive',
  business_rejected: 'text-destructive',
  coupon_redeemed: 'text-primary',
  event_proposal_submitted: 'text-primary',
  event_proposal_approved: 'text-emerald-600',
  event_proposal_rejected: 'text-destructive',
  event_nearby: 'text-primary',
  system: 'text-muted-foreground',
};

/**
 * Where a notification should deep-link on click, or null if it only marks
 * read.
 *
 * One function for both audiences: the bell is mounted in the business header
 * AND the admin header, and RLS decides which rows each caller sees, so the
 * destination follows from the TYPE rather than from who is looking.
 */
export function notificationHref(notification: Notification): string | null {
  const eventId = notification.metadata?.event_id;

  switch (notification.type) {
    case 'coupon_redeemed':
      return notification.business_id
        ? businessRedeemedCouponsPath(notification.business_id)
        : null;

    // Only admins receive this type, and admin routes are keyed by the
    // admin's own id — which is the recipient. No extra context needed.
    case 'event_proposal_submitted':
      return adminEventsPath(notification.user_id);

    // The owner gets these; their own list carries the reviewer's note.
    case 'event_proposal_approved':
    case 'event_proposal_rejected':
      return notification.business_id
        ? businessEventsPath(notification.business_id)
        : null;

    case 'event_nearby':
      return typeof eventId === 'string' ? eventPath(eventId) : null;

    default:
      return null;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (n: Notification) => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? Info;
  const tone = TYPE_TONE[notification.type] ?? 'text-muted-foreground';
  const isUnread = !notification.read_at;

  return (
    <button
      type="button"
      onClick={() => onRead(notification)}
      className={cn(
        'hover:bg-accent flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
        isUnread && 'bg-accent/40',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{notification.title}</p>
        {notification.body && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {notification.body}
          </p>
        )}
        {typeof notification.metadata?.remarks === 'string' &&
          notification.metadata.remarks.length > 0 && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">
              “{notification.metadata.remarks}”
            </p>
          )}
        <p className="text-muted-foreground mt-1 text-[11px]">
          {timeAgo(notification.created_at)}
        </p>
      </div>
      {isUnread && (
        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (opts: { reset?: boolean; cursor?: string | null } = {}) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const res = await getNotificationsAction({
        cursor: opts.reset ? null : opts.cursor,
        limit: PAGE_SIZE,
      });
      loadingRef.current = false;
      setLoading(false);
      if (!res.success || !res.data) return;
      setUnread(res.data.unread_count);
      setCursor(res.data.next_cursor);
      setItems((prev) =>
        opts.reset
          ? res.data!.notifications
          : [...prev, ...res.data!.notifications],
      );
    },
    [],
  );

  // First page on mount → seeds the unread badge without opening the panel.
  useEffect(() => {
    void loadPage({ reset: true });
  }, [loadPage]);

  // Infinite scroll: load the next keyset page when the sentinel is visible.
  useEffect(() => {
    if (!open || !cursor) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current) {
          void loadPage({ cursor });
        }
      },
      { rootMargin: '80px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, cursor, loadPage]);

  const handleRead = useCallback(
    async (n: Notification) => {
      const href = notificationHref(n);

      if (!n.read_at) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
          ),
        );
        setUnread((u) => Math.max(0, u - 1));
        void markNotificationReadAction(n.id);
      }

      // Deep-link notifications close the panel and navigate.
      if (href) {
        setOpen(false);
        router.push(href);
      }
    },
    [router],
  );

  const handleMarkAll = useCallback(async () => {
    setItems((prev) =>
      prev.map((x) => ({
        ...x,
        read_at: x.read_at ?? new Date().toISOString(),
      })),
    );
    setUnread(0);
    await markAllNotificationsReadAction();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 md:h-9 md:w-9"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]">
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] p-0 sm:w-96"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {unread} new
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 gap-1 px-2 text-xs"
              onClick={handleMarkAll}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-96">
          {items.length === 0 && !loading ? (
            <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
              <Bell className="size-6 opacity-40" />
              You&apos;re all caught up
            </div>
          ) : (
            <div className="divide-border divide-y">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={handleRead}
                />
              ))}
              <div ref={sentinelRef} />
              {loading && (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-3 text-xs">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading…
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
