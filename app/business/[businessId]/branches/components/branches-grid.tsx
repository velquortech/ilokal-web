'use client';

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchCard } from './branch-card';
import type { Branch } from '@/lib/types';

interface BranchesGridProps {
  branches: Branch[];
  businessId: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSuccess: () => void;
}

export function BranchesGrid({
  branches,
  businessId,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPaginationChange,
  onSuccess,
}: BranchesGridProps) {
  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <MapPin className="text-muted-foreground mb-3 size-10" />
        <p className="text-muted-foreground text-sm">No branches found</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Add your first branch to appear on the map
        </p>
      </div>
    );
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            businessId={businessId}
            onSuccess={onSuccess}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {start}–{end} of {totalItems} branches
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => onPaginationChange(page - 1, pageSize)}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-muted-foreground min-w-16 text-center text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => onPaginationChange(page + 1, pageSize)}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
