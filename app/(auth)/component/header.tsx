import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ComponentProps } from 'react';
import { BrandLogo } from '@/components/custom/BrandLogo';

export function AuthHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <Link href="/home">
      <div {...props} className={cn('inline-flex', className)}>
        <BrandLogo markSize={28} />
      </div>
    </Link>
  );
}
