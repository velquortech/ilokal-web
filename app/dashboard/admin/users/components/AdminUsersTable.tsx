'use client';

import React from 'react';
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
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/api/paginationService';

interface AdminUsersTableProps {
  data: PaginatedResponse<Profile> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onEdit: (admin: Profile) => void;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
}

const formatDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString();
    }
    return date.toLocaleDateString();
  } catch {
    return new Date().toLocaleDateString();
  }
};

export default function AdminUsersTable({
  data,
  isLoading,
  currentPage,
  onPageChange,
  onEdit,
  onDelete,
  isSubmitting,
}: AdminUsersTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-600">No admins found</p>
        <p className="mt-1 text-sm text-gray-500">
          Create your first admin account to get started
        </p>
      </div>
    );
  }

  const { pagination } = data;
  const hasNextPage = currentPage < pagination.totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">#</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="font-semibold">Updated</TableHead>
              <TableHead className="text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((admin, index) => (
              <TableRow key={admin.id} className="hover:bg-gray-50">
                <TableCell>
                  <span className="font-medium">
                    {(currentPage - 1) * 10 + index + 1}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{admin.full_name}</span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {admin.email}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(admin.created_at)}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(admin.updated_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(admin)}
                      disabled={isSubmitting}
                      className="gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(admin.id)}
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

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-600">
          Page <span className="font-medium">{currentPage}</span> of{' '}
          <span className="font-medium">{pagination.totalPages}</span>
          {' • '}
          <span className="font-medium">{pagination.totalItems}</span> total
        </div>

        <div className="flex gap-2">
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
    </div>
  );
}
