'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Prev/next pager for bounded-scan feeds that only know `has_more` (no exact
 * total — the merged set is capped, so a fabricated "page X of Y" would lie).
 */
export function FeedPager({
  page,
  hasMore,
  param = 'page',
}: {
  page: number;
  hasMore: boolean;
  param?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (page <= 1 && !hasMore) return null;

  const goTo = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete(param);
    else params.set(param, String(next));
    router.push(`?${params.toString()}`, { scroll: true });
  };

  return (
    <nav
      aria-label="Feed pagination"
      className="flex items-center justify-between gap-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Newer
      </Button>
      <span className="text-muted-foreground text-sm">Page {page}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasMore}
        onClick={() => goTo(page + 1)}
      >
        Older
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
