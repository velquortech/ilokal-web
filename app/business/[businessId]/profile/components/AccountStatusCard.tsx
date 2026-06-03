'use client';

import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { VerificationStatusBadge } from './VerificationStatusBadge';
import type { BusinessVerificationStatus } from '@/lib/types';
import type { Profile } from '@/lib/types/user';

interface AccountStatusCardProps {
  profileStatus: Profile['status'];
  role: Profile['role'];
  verificationStatus: BusinessVerificationStatus;
}

const PROFILE_STATUS_CONFIG: Record<
  Profile['status'],
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/15 text-green-600 border-green-500/30',
  },
  inactive: {
    label: 'Inactive',
    className: '',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

const ROLE_LABEL: Record<Profile['role'], string> = {
  business_owner: 'Business Owner',
  admin: 'Admin',
  app_user: 'App User',
};

export function AccountStatusCard({
  profileStatus,
  role,
  verificationStatus,
}: AccountStatusCardProps) {
  const ps =
    PROFILE_STATUS_CONFIG[profileStatus] ?? PROFILE_STATUS_CONFIG.inactive;

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4" />
          Account Status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Account</span>
          <Badge variant="outline" className={ps.className}>
            {ps.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Role</span>
          <Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Business Verification
          </span>
          <VerificationStatusBadge status={verificationStatus} />
        </div>

        {verificationStatus !== 'verified' && (
          <p className="text-muted-foreground border-t pt-3 text-xs">
            Verification status is managed by iLokal admins.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
