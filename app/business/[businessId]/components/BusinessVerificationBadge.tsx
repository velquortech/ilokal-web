'use client';

import { BadgeCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The shop's verification state as a compact badge, rendered in the header
 * identity block and the account menu so the owner always sees where their
 * shop stands without opening a page.
 *
 * Unknown / null statuses render nothing — a blank badge would read as
 * "unverified" when it is really "we don't know".
 */
const STATUS_META = {
  verified: {
    label: 'Verified',
    icon: BadgeCheck,
    className: 'text-emerald-600',
  },
  pending: {
    label: 'Pending review',
    icon: ShieldAlert,
    className: 'text-amber-600',
  },
  rejected: {
    label: 'Rejected',
    icon: ShieldX,
    className: 'text-destructive',
  },
  suspended: {
    label: 'Suspended',
    icon: ShieldX,
    className: 'text-destructive',
  },
} as const;

export function BusinessVerificationBadge({
  status,
  className,
  hideLabelOnMobile = false,
}: {
  status?: string | null;
  className?: string;
  /** Icon-only below `sm` — for the header, where the name already truncates. */
  hideLabelOnMobile?: boolean;
}) {
  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? undefined;
  if (!meta) return null;

  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        meta.className,
        className,
      )}
      title={meta.label}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className={cn(hideLabelOnMobile && 'hidden sm:inline')}>
        {meta.label}
      </span>
    </span>
  );
}
