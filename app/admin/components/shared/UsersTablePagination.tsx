'use client';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface UsersTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  isSubmitting: boolean;
  onPageChange: (page: number) => void;
}

export function UsersTablePagination({
  currentPage,
  totalPages,
  totalItems,
  isSubmitting,
  onPageChange,
}: UsersTablePaginationProps) {
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <nav
      className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Users table pagination"
    >
      <div className="text-sm text-gray-600">
        Page <span className="font-medium">{currentPage}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
        {' • '}
        <span className="font-medium">{totalItems}</span> total items
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Pagination controls"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage || isSubmitting}
          className="gap-1"
          aria-label="Go to first page"
          title="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">First</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage || isSubmitting}
          className="gap-1"
          aria-label="Go to previous page"
          title="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || isSubmitting}
          className="gap-1"
          aria-label="Go to next page"
          title="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage || isSubmitting}
          className="gap-1"
          aria-label="Go to last page"
          title="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Last</span>
        </Button>
      </div>
    </nav>
  );
}
