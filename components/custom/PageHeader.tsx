import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The heading block for a dashboard page.
 *
 * Exists because every business page hand-rolled `text-2xl font-bold`, which
 * meant the dashboard never used Pally and read as a different product from
 * the landing. Titles are display type here; the numbers and tables below stay
 * in Inter, where legibility beats personality.
 *
 * `eyebrow` is where a page says which branch or filter it is scoped to — the
 * one piece of context people lose most often on a dashboard.
 */
export function PageHeader({
  title,
  lede,
  eyebrow,
  action,
  className,
}: {
  title: ReactNode;
  lede?: ReactNode;
  eyebrow?: ReactNode;
  /** Primary action for the page. The one place a screen spends brand red. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 pb-2',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-primary mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[clamp(1.75rem,2.4vw,2.25rem)] leading-tight font-bold tracking-tight">
          {title}
        </h1>
        {lede && (
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-relaxed">
            {lede}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}
