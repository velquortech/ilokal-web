'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { RedemptionRecord, RedemptionStatus } from '@/lib/types';

function getRedemptionStatus(record: RedemptionRecord): RedemptionStatus {
  if (record.is_claimed) return 'claimed';
  const now = new Date();
  if (record.expires_at && new Date(record.expires_at) < now) return 'expired';
  return 'active';
}

function formatDiscount(
  discount: RedemptionRecord['coupons'] extends null
    ? null
    : RedemptionRecord['coupons'],
): string {
  if (!discount) return '—';
  const { type, value } = discount.discount;
  return type === 'percentage' ? `${value}% off` : `₱${value} off`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const redemptionColumns: ColumnDef<RedemptionRecord>[] = [
  {
    id: 'expand',
    header: () => null,
    cell: ({ row }) => {
      if (!row.getCanExpand()) {
        return <span className="inline-block w-4" />;
      }
      return (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
        >
          <ChevronRight
            className={cn(
              'size-4 transition-transform duration-200',
              row.getIsExpanded() && 'rotate-90',
            )}
          />
        </button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'user',
    header: 'User',
    cell: ({ row }) => {
      const profile = row.original.profiles;
      const name = profile?.full_name ?? null;
      const email = profile?.email ?? '—';
      return (
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={name ?? email} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            {name && <span className="text-sm font-medium">{name}</span>}
            <span className="text-muted-foreground text-xs">{email}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'coupon_code',
    header: 'Coupon',
    cell: ({ row }) => {
      const code = row.original.coupons?.code;
      if (!code) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="bg-muted rounded px-2 py-0.5 font-mono text-sm font-semibold tracking-wider">
          {code}
        </span>
      );
    },
  },
  {
    id: 'discount',
    header: 'Discount',
    cell: ({ row }) => (
      <span className="text-primary font-semibold">
        {formatDiscount(row.original.coupons)}
      </span>
    ),
  },
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => {
      const branch = row.original.branches;
      return (
        <span className="text-sm">
          {branch?.name ?? <span className="text-muted-foreground">—</span>}
        </span>
      );
    },
  },
  {
    id: 'redeemed_at',
    header: 'Redeemed On',
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.redeemed_at)}</span>
    ),
  },
  {
    id: 'expires_at',
    header: 'Expires',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.expires_at)}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = getRedemptionStatus(row.original);
      return (
        <Badge
          variant="outline"
          className={cn(
            'capitalize',
            status === 'active' &&
              'border-green-600/30 bg-green-600/10 text-green-700',
            status === 'claimed' &&
              'border-blue-600/30 bg-blue-600/10 text-blue-700',
            status === 'expired' &&
              'border-red-600/30 bg-red-600/10 text-red-700',
          )}
        >
          {status}
        </Badge>
      );
    },
  },
];

export { getRedemptionStatus, formatDate };
