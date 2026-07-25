'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DirectoryMetadata } from '@/lib/types';

/**
 * URL-driven offset pagination for customer grids: writes `page` into the
 * query string (server component refetches), preserving every other param.
 */
export function PaginationBar({
  metadata,
  param = 'page',
  noun = 'shop',
}: {
  metadata: DirectoryMetadata;
  /** Query-string key — lets two paginated sections coexist on one page. */
  param?: string;
  noun?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (metadata.total_pages <= 1) return null;

  const goTo = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(param);
    else params.set(param, String(page));
    // push (not replace) so Back walks the pages instead of leaving the list.
    router.push(`?${params.toString()}`, { scroll: true });
  };

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-muted-foreground text-sm">
        Page {metadata.page} of {metadata.total_pages} · {metadata.total} {noun}
        {metadata.total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={metadata.page <= 1}
          onClick={() => goTo(metadata.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={metadata.page >= metadata.total_pages}
          onClick={() => goTo(metadata.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
