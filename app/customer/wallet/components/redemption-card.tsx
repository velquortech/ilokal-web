'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { BadgePercent, Check, Copy, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { timeLeft } from '@/lib/utils/countdown';
import { cn } from '@/lib/utils';
import { explorePath } from '@/config/routeConfig';
import type { WalletRedemption } from '@/lib/types';

function formatDiscount(
  discount: NonNullable<WalletRedemption['coupon']>['discount'],
): string {
  if (!discount) return 'Deal';
  return discount.type === 'percentage'
    ? `${discount.value}% off`
    : `₱${discount.value} off`;
}

/** Ticks once a minute — enough resolution for an hours/days countdown. */
function useNow(): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function RedemptionCard({
  redemption,
}: {
  redemption: WalletRedemption;
}) {
  const now = useNow();
  const left = timeLeft(redemption.expires_at, now);
  const isActive = !redemption.is_claimed && !left.expired;

  const copyCode = async () => {
    if (!redemption.code) return;
    try {
      await navigator.clipboard.writeText(redemption.code);
      toast.success('Code copied', { id: 'copy-code' });
    } catch {
      toast.error('Could not copy the code', { id: 'copy-code' });
    }
  };

  return (
    <div
      className={cn(
        'bg-card flex flex-col gap-3 rounded-xl border p-4',
        !isActive && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-full border">
          {redemption.coupon?.business?.logo_url ? (
            <Image
              src={redemption.coupon.business.logo_url}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <BadgePercent className="text-muted-foreground m-auto h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {redemption.coupon?.business ? (
            <Link
              href={explorePath(redemption.coupon.business.id)}
              className="hover:text-primary truncate font-medium"
            >
              {redemption.coupon.business.shop_name}
            </Link>
          ) : (
            <p className="truncate font-medium">Shop</p>
          )}
          <p className="text-muted-foreground truncate text-xs">
            {redemption.coupon?.description ??
              redemption.coupon?.code ??
              'Coupon'}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {formatDiscount(redemption.coupon?.discount ?? null)}
        </Badge>
      </div>

      {isActive && (
        <>
          <div className="bg-muted flex items-center justify-between gap-2 rounded-lg px-4 py-3">
            <span className="font-mono text-2xl font-bold tracking-[0.25em]">
              {/* aria-label on a role-less span is ignored (or worse,
                  replaces the code) — the sr-only sibling carries the hint. */}
              <span className="sr-only">Show this code at the store: </span>
              {redemption.code ?? '——————'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyCode}
              aria-label="Copy code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p
            className={cn(
              'text-sm font-medium',
              left.urgent ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            ⏳ {left.label} — show the code at the store to claim your discount.
          </p>
        </>
      )}

      {redemption.is_claimed && (
        <p className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
          <Check className="h-4 w-4" />
          Claimed in store
        </p>
      )}

      {!redemption.is_claimed && left.expired && (
        <p className="text-muted-foreground text-sm">
          Expired before it was claimed.
        </p>
      )}

      {redemption.branch && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3 shrink-0" />
          {redemption.branch.name}
          {redemption.branch.address ? ` · ${redemption.branch.address}` : ''}
        </p>
      )}
    </div>
  );
}
