'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  CircleCheck,
  CircleX,
  Info,
  Loader2,
} from 'lucide-react';
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
} from '../actions/notificationActions';

const PAGE_SIZE = 15;

const TYPE_ICON: Record<NotificationType, typeof Info> = {
  business_document_approved: CircleCheck,
  business_verified: CircleCheck,
  business_document_rejected: CircleX,
  business_rejected: CircleX,
  system: Info,
};

const TYPE_TONE: Record<NotificationType, string> = {
  business_document_approved: 'text-emerald-600',
  business_verified: 'text-emerald-600',
  business_document_rejected: 'text-destructive',
  business_rejected: 'text-destructive',
  system: 'text-muted-foreground',
};

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

  const handleRead = useCallback(async (n: Notification) => {
    if (n.read_at) return;
    setItems((prev) =>
      prev.map((x) =>
        x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
      ),
    );
    setUnread((u) => Math.max(0, u - 1));
    await markNotificationReadAction(n.id);
  }, []);

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
          className="relative h-9 w-9"
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
      <PopoverContent align="end" className="w-96 p-0">
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
