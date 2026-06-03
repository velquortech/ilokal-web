'use client';

import { Badge } from '@/components/ui/badge';
import type { BusinessVerificationStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  BusinessVerificationStatus,
  { label: string; className: string }
> = {
  verified: {
    label: 'Verified',
    className: 'bg-green-500/15 text-green-600 border-green-500/30',
  },
  pending: {
    label: 'Pending Review',
    className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

interface VerificationStatusBadgeProps {
  status: BusinessVerificationStatus;
}

export function VerificationStatusBadge({
  status,
}: VerificationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
