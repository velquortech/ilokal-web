import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { BadgeCheckIcon, BadgeX } from 'lucide-react';

const className = 'h-max w-max p-1';

export function StatusBadge({ isVerified }: { isVerified: boolean }) {
  return isVerified ? (
    <Badge className={cn(className)}>
      <BadgeCheckIcon />
    </Badge>
  ) : (
    <Badge className={cn(className, 'bg-yellow-600')}>
      <BadgeX />
    </Badge>
  );
}
