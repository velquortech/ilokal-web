import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { BadgeCheckIcon, BadgeX } from 'lucide-react';

const variant = {
  verified: 'bg-green-600/20 text-green-700 dark:text-green-400',
  unverified: 'bg-yellow-600/20 text-yellow-700 dark:text-yellow-400',
};

export function StatusBadge({ isVerified }: { isVerified?: boolean }) {
  return isVerified ? (
    <Badge className={cn(variant.verified)}>
      <BadgeCheckIcon />
      Verified Business
    </Badge>
  ) : (
    <Badge className={cn(variant.unverified)}>
      <BadgeX />
      Business Unverified
    </Badge>
  );
}
