'use client';

import React, { useState, useMemo } from 'react';
import { Table as UITable } from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { AdminUser } from '@/lib/types/admin';
import { PaginatedResponse } from '@/services/api/paginationService';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { UsersTableColumnVisibility } from './UsersTableColumnVisibility';
import { UsersTablePagination } from './UsersTablePagination';
import { UsersTableHeader } from './UsersTableHeader';
import { UsersTableBody } from './UsersTableBody';
import {
  createUsersTableColumns,
  UsersTableColumnsProps,
} from './UsersTableColumns';

interface UsersTableProps {
  data: PaginatedResponse<AdminUser> | null | undefined;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onEdit: (user: AdminUser) => void;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
}

export default function UsersTable({
  data,
  isLoading,
  currentPage,
  onPageChange,
  onEdit,
  onDelete,
  isSubmitting,
}: UsersTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    created_at: false, // Hide by default
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({
    open: false,
    user: null,
  });

  // Create columns using the factory function
  const columns = useMemo(() => {
    const columnsProps: UsersTableColumnsProps = {
      currentPage,
      isSubmitting,
      onEdit,
      onDelete: (user) => {
        setDeleteConfirmation({ open: true, user });
      },
      onError: setError,
    };
    return createUsersTableColumns(columnsProps);
  }, [currentPage, isSubmitting, onEdit]);

  // Initialize table instance
  const table = useReactTable({
    data: data?.data || [],
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.user) {
      onDelete(deleteConfirmation.user.id);
      setDeleteConfirmation({ open: false, user: null });
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading users table"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-600">No users found</p>
        <p className="mt-1 text-sm text-gray-500">
          Create your first account to get started
        </p>
      </div>
    );
  }

  const { pagination } = data;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <UsersTableColumnVisibility table={table} />

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <UITable role="table" aria-label="Users list table">
              <UsersTableHeader headerGroups={table.getHeaderGroups()} />
              <UsersTableBody
                rows={table.getRowModel().rows}
                columnsLength={columns.length}
              />
            </UITable>
          </div>
        </div>

        <UsersTablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          isSubmitting={isSubmitting}
          onPageChange={onPageChange}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteConfirmation.open}
          user={deleteConfirmation.user}
          isSubmitting={isSubmitting}
          onClose={() => setDeleteConfirmation({ open: false, user: null })}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </TooltipProvider>
  );
}
