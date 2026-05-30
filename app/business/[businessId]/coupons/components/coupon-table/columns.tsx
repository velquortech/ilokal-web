'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Coupon, ProductResponse } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';
import { CouponActions } from './coupon-actions';

function getCouponStatus(coupon: Coupon): 'active' | 'expired' | 'upcoming' {
  const now = new Date();
  if (new Date(coupon.expiry_date) < now) return 'expired';
  if (new Date(coupon.start_date) > now) return 'upcoming';
  return 'active';
}

function formatDiscount(coupon: Coupon): string {
  if (!coupon.discount) return '—';
  const { type, value } = coupon.discount;
  return type === 'percentage' ? `${value}% off` : `₱${value} off`;
}

export function createColumns(
  products: ProductResponse[],
): ColumnDef<Coupon>[] {
  return [
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
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.promotion_type ?? 'coupon';
        return (
          <Badge
            variant={type === 'deal' ? 'default' : 'secondary'}
            className="text-xs capitalize"
          >
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="bg-muted rounded px-2 py-0.5 font-mono text-sm font-semibold tracking-wider">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'discount',
      header: 'Discount',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-primary font-semibold">
            {formatDiscount(row.original)}
          </span>
          <span className="text-muted-foreground text-xs capitalize">
            {row.original.usage_scope.replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      id: 'visibility',
      header: 'Visibility',
      cell: ({ row }) => {
        const status = row.original.status ?? 'draft';
        return (
          <div
            className={cn(
              'inline-flex h-max items-center rounded-sm px-2 py-0.5 text-xs capitalize',
              status === 'published' && 'bg-green-600/10 text-green-700',
              status === 'draft' && 'bg-yellow-500/10 text-yellow-700',
            )}
          >
            {status}
          </div>
        );
      },
    },
    {
      id: 'availability',
      header: 'Availability',
      cell: ({ row }) => {
        const status = getCouponStatus(row.original);
        return (
          <div
            className={cn(
              'inline-flex h-max items-center rounded-sm px-2 py-0.5 text-xs capitalize',
              status === 'active' && 'bg-green-600/10 text-green-700',
              status === 'expired' && 'bg-red-600/10 text-red-700',
              status === 'upcoming' && 'bg-blue-600/10 text-blue-700',
            )}
          >
            {status}
          </div>
        );
      },
    },
    {
      id: 'dates',
      header: 'Valid Period',
      cell: ({ row }) => {
        const fmt = (d: string) =>
          new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(d));
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span>{fmt(row.original.start_date)}</span>
            <span className="text-muted-foreground">
              → {fmt(row.original.expiry_date)}
            </span>
          </div>
        );
      },
    },
    {
      id: 'redemptions',
      header: 'Redemptions',
      cell: ({ row }) => {
        const { current_redemptions, max_redemptions_global } = row.original;
        return (
          <div className="text-sm">
            <span className="font-medium">{current_redemptions}</span>
            {max_redemptions_global != null && (
              <span className="text-muted-foreground">
                {' '}
                / {max_redemptions_global}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <CouponActions coupon={row.original} products={products} />
      ),
    },
  ];
}
