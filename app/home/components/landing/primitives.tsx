import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared layout atoms for the landing sections.
 *
 * These exist so the type scale lives in one place instead of being retyped
 * as clamp() strings in seven files.
 */

export function Wrap({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('mx-auto w-full max-w-[1200px] px-6', className)}
      style={style}
    >
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-xs font-semibold tracking-[0.2em] text-[#D70005] uppercase dark:text-[#FEE87B]',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Section head: Pally, tight, big. `clamp(2rem, 4.5vw, 3.25rem)`. */
export function SectionTitle({
  children,
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  className?: string;
  /**
   * `h1` is here for standalone pages (`/for-business`): the landing's own
   * hero owns the page's single level-1, but a page that mounts this as its
   * top heading needs one of its own or it ships with none at all.
   */
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <Tag
      className={cn(
        'font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lede({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-[1.0625rem] leading-[1.65] text-[#4A403E] dark:text-[#B8B0A6]',
        className,
      )}
    >
      {children}
    </p>
  );
}
