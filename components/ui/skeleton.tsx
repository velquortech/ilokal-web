import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    // `bg-muted`, not `bg-accent`: accent is the interactive-hover colour now
    // (brand red), and a loading placeholder should be a neutral grey that
    // reads as "content coming", not a coloured block. Callers pass their own
    // sizing classes so each skeleton matches the shape it replaces.
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
