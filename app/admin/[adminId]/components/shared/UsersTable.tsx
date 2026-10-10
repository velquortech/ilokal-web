'use client';

import { useCallback, useMemo, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type {
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { AdminUser } from '@/lib/types/admin';
import { PaginatedResponse } from '@/lib/services';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { MobileFieldCardList } from '@/components/custom/data-table/MobileFieldCardList';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { UsersTableColumnVisibility } from './UsersTableColumnVisibility';
import {
  createUsersTableColumns,
  UsersTableColumnsProps,
} from './UsersTableColumns';

/**
 * The admin users/account-status table.
 *
 * This was a 654-line fork — its own TanStack instance plus its own header,
 * body, pagination and column-visibility markup — so every responsive fix made
 * to the shared `DataTable` had to be made here too, and was not: it never got
 * the wrap-safe pager, the caller-supplied empty state, or a mobile renderer.
 * It is the shared composite now, and the props below are unchanged, so all
 * six callers (three user tabs, three account-status tabs) are untouched.
 *
 * Two behaviours it keeps, both deliberately:
 *
 *  · **Client-side sorting** (`manualSorting={false}`). It has always sorted
 *    the page it was handed rather than asking the server to re-order. That is
 *    arguably wrong for server-paged data — you are sorting ten rows, not the
 *    set — but it is existing behaviour and changing it is a product decision,
 *    not part of removing a fork.
 *  · **No rows-per-page control.** The page size is fixed by the caller's
 *    fetch (`useProfiles`' `limit`), so a selector here could not change what
 *    is fetched. An inert control reads as a broken one — the "Rows per page
 *    does nothing" defect, which is why `pageSizeSelect` exists.
 */

interface UsersTableProps<TRow = AdminUser> {
  data: PaginatedResponse<TRow> | null | undefined;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onEdit?: (user: TRow) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (updatedUser: TRow) => void;
  isSubmitting: boolean;
  /**
   * Optional: Provide custom columns for non-AdminUser types
   * If not provided and TRow is AdminUser, will use default admin columns
   */
  columns?: ColumnDef<TRow>[];
  /**
   * Optional: Handler for delete confirmation
   * Only used if columns support delete action
   */
  onDeleteConfirm?: (id: string) => void;
  /**
   * Optional: User data for delete confirmation dialog
   * Only shown if using AdminUser and delete action is triggered
   */
  deleteUser?: AdminUser | null;
  onDeleteCancel?: () => void;
  /**
   * Optional: Show/hide features (for extending to other row types)
   */
  showDeleteConfirmation?: boolean;
}

export default function UsersTable<TRow extends { id: string } = AdminUser>({
  data,
  isLoading,
  currentPage,
  onPageChange,
  onEdit,
  onDelete,
  onStatusChange,
  isSubmitting,
  columns: customColumns,
  onDeleteConfirm,
  deleteUser,
  onDeleteCancel,
  showDeleteConfirmation = true,
}: UsersTableProps<TRow>) {
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    created_at: false, // Hide by default
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({
    open: false,
    user: null,
  });

  // Use custom columns if provided, otherwise generate admin columns for
  // backward compatibility.
  const columns = useMemo(() => {
    if (customColumns) {
      return customColumns;
    }

    // Default behavior for AdminUser type
    if (onEdit && onDelete) {
      const columnsProps: UsersTableColumnsProps = {
        currentPage,
        isSubmitting,
        onEdit: onEdit as unknown as (user: AdminUser) => void,
        onDelete: (user: AdminUser) => {
          setDeleteConfirmation({ open: true, user });
        },
        onStatusChange: onStatusChange as unknown as (user: AdminUser) => void,
        onError: setError,
      };
      return createUsersTableColumns(columnsProps) as ColumnDef<TRow>[];
    }

    // If no handlers provided and no custom columns, return empty array
    return [];
  }, [
    customColumns,
    currentPage,
    isSubmitting,
    onEdit,
    onDelete,
    onStatusChange,
  ]);

  const pageSize = data?.pagination.pageSize ?? 10;
  const pagination: PaginationState = useMemo(
    () => ({ pageIndex: currentPage - 1, pageSize }),
    [currentPage, pageSize],
  );

  const handlePaginationChange = useCallback(
    (
      updater: PaginationState | ((old: PaginationState) => PaginationState),
    ) => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater;
      // Page only — the size is the caller's, which is why the size control is
      // switched off below rather than wired to nothing.
      if (next.pageIndex !== pagination.pageIndex) {
        onPageChange(next.pageIndex + 1);
      }
    },
    [pagination, onPageChange],
  );

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.user) {
      // Use new handler if provided, otherwise use legacy onDelete
      if (onDeleteConfirm) {
        onDeleteConfirm(deleteConfirmation.user.id);
      } else if (onDelete) {
        onDelete(deleteConfirmation.user.id);
      }
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
          <div className="border-muted border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center sm:p-12">
        <p className="text-muted-foreground">
          No columns configured for this table
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          pageCount={data?.pagination.totalPages ?? 0}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={setSorting}
          manualSorting={false}
          pageSizeSelect={false}
          columnVisibility={{
            state: columnVisibility,
            onChange: setColumnVisibility,
          }}
          // A render function, because the visibility menu needs the table
          // instance and `DataTable` is the one that creates it.
          toolbar={(table) => <UsersTableColumnVisibility table={table} />}
          renderMobile={(table) => (
            // The generic card renderer, not a bespoke one: these columns are
            // supplied by the CALLER and differ across all six mounts, so
            // there is no fixed layout to hand-write.
            <MobileFieldCardList
              table={table}
              primaryColumnIds={['name', 'full_name', 'email']}
            />
          )}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
              <p className="font-medium">No users found</p>
              <p className="text-muted-foreground text-sm">
                Create your first account to get started.
              </p>
            </div>
          }
        />

        {/* Delete Confirmation Dialog - Only show for AdminUser type with delete confirmation enabled */}
        {showDeleteConfirmation && (
          <DeleteConfirmationDialog
            open={deleteUser ? true : deleteConfirmation.open}
            user={deleteUser || deleteConfirmation.user}
            isSubmitting={isSubmitting}
            onClose={() => {
              if (onDeleteCancel) {
                onDeleteCancel();
              } else {
                setDeleteConfirmation({ open: false, user: null });
              }
            }}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
