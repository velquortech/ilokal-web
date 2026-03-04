'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/api/paginationService';
import { AvatarImage } from '@/components/custom/AvatarImage';
import { StatusDropdown } from '../form/fields/StatusDropdown';
import { getTimeAgo } from '@/lib/utils/dateFormatter';

interface UsersTableProps {
  data: PaginatedResponse<Profile> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onEdit: (user: Profile) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (updatedUser: Profile) => void;
  isSubmitting: boolean;
}

export default function UsersTable({
  data,
  isLoading,
  currentPage,
  onPageChange,
  onEdit,
  onDelete,
  onStatusChange,
  isSubmitting,
}: UsersTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    user: Profile | null;
  }>({
    open: false,
    user: null,
  });

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.user) {
      onDelete(deleteConfirmation.user.id);
      setDeleteConfirmation({ open: false, user: null });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
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
  const hasNextPage = currentPage < pagination.totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">Avatar</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold">Updated</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((user, index) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell>
                    <span className="font-medium">
                      {(currentPage - 1) * 10 + index + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.avatar_url ? (
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.full_name || 'Avatar'}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                        {user.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || 'N/A'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{user.full_name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {getTimeAgo(user.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {getTimeAgo(user.updated_at)}
                  </TableCell>
                  <TableCell>
                    <StatusDropdown
                      admin={user}
                      onStatusChange={(updatedUser) => {
                        onStatusChange?.(updatedUser);
                        setError(null);
                      }}
                      onError={setError}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onEdit(user);
                          toast.info(`Editing ${user.full_name}`);
                        }}
                        disabled={isSubmitting}
                        className="gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDeleteConfirmation({ open: true, user })
                        }
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          Page <span className="font-medium">{currentPage}</span> of{' '}
          <span className="font-medium">{pagination.totalPages}</span>
          {' • '}
          <span className="font-medium">{pagination.totalItems}</span> total
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!hasPrevPage || isSubmitting}
            className="gap-1"
            title="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevPage || isSubmitting}
            className="gap-1"
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
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.totalPages)}
            disabled={!hasNextPage || isSubmitting}
            className="gap-1"
            title="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmation.open}
        onOpenChange={(open) =>
          setDeleteConfirmation({ ...deleteConfirmation, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deleteConfirmation.user?.full_name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ open: false, user: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
