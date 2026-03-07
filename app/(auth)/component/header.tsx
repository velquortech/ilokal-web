import { cn } from '@/lib/utils';
import { Store } from 'lucide-react';
import Link from 'next/link';
import { ComponentProps } from 'react';

export function AuthHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <Link href="/home">
      <div {...props} className={cn('inline-flex gap-1.5', className)}>
        <div className="bg-primary shadow-primary/20 flex size-7 shrink-0 items-center justify-center rounded-lg shadow-lg group-data-[collapsible=icon]:size-7">
          <Store className="text-primary-foreground size-4" />
        </div>
        <span className="text-lg font-bold">ILOKAL</span>
      </div>
    </Link>
  );
}
