import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { ComponentProps } from 'react';

export interface QuickAction extends ComponentProps<'button'> {
  icon: LucideIcon;
  href: string;
  badge?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive';
  label: string;
}

export function ActionButton({ action }: { action: QuickAction }) {
  return (
    <Button variant="ghost" size="icon" className="relative h-9 w-9" asChild>
      <Link href={action.href} aria-label={action.label}>
        <action.icon className="h-5 w-5" />
        {action.badge && (
          <Badge
            variant={action.badgeVariant || 'default'}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]"
          >
            {action.badge}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
