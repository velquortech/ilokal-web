'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Profile } from '@/lib/types/user';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { UserFormData } from '@/lib/schemas/userFormSchema';
import { UserFormModal } from '../../form';
import { UsersTable, UserSearchFilter } from '../../shared';
import {
  useCreateAdmin,
  useUpdateAdmin,
  useDeleteAdmin,
} from '@/hooks/useAdminMutations';
import { useProfilesByRole, useApplyFilters } from '@/hooks/useProfiles';

export default function AdminTab() {
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'suspended'
  >('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  const ITEMS_PER_PAGE = 10;

  // Fetch admins data from server (always page 1, large limit for client-side pagination)
  const {
    data: rawData,
    isLoading,
    error: fetchError,
  } = useProfilesByRole('admin', {
    page: 1, // Always fetch from page 1, let client handle pagination
    limit: 1000, // Fetch enough data for client-side filtering and pagination
  });

  // Apply filters and pagination on client side
  const adminsData = useApplyFilters(
    rawData,
    searchQuery,
    statusFilter,
    sortOrder,
    currentPage,
    ITEMS_PER_PAGE,
  );

  // Mutations
  const createAdminMutation = useCreateAdmin(
    () => {
      toast.success('Admin account created successfully!');
      setIsFormOpen(false);
      setSelectedAdmin(null);
      setCurrentPage(1);
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to create admin: ${errorMsg}`);
      console.error('Error creating admin:', err);
    },
  );

  const updateAdminMutation = useUpdateAdmin(
    () => {
      toast.success('Admin account updated successfully!');
      setIsFormOpen(false);
      setSelectedAdmin(null);
      setCurrentPage(1); // Reset to page 1 to ensure user appears in view
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to update admin: ${errorMsg}`);
      console.error('Error updating admin:', err);
    },
  );

  const deleteAdminMutation = useDeleteAdmin(
    () => {
      toast.success('Admin account deleted successfully!');
      if (adminsData && adminsData.data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to delete admin: ${errorMsg}`);
      console.error('Error deleting admin:', err);
    },
  );

  const getChangedFields = (
    original: Profile,
    formData: UserFormData,
  ): Record<string, unknown> => {
    const changes: Record<string, unknown> = {};

    if (formData.email !== original.email) {
      changes.email = formData.email;
    }

    if (formData.full_name !== (original.full_name || '')) {
      changes.full_name = formData.full_name;
    }

    if ((formData.phone_number || '') !== (original.phone_number || '')) {
      changes.phone_number = formData.phone_number;
    }

    if ((formData.avatar_url || '') !== (original.avatar_url || '')) {
      changes.avatar_url = formData.avatar_url;
    }

    return changes;
  };

  const handleCreateAdmin = async (formData: UserFormData) => {
    try {
      if (selectedAdmin) {
        // Update mode
        const changedFields = getChangedFields(selectedAdmin, formData);

        if (Object.keys(changedFields).length === 0) {
          setIsFormOpen(false);
          setSelectedAdmin(null);
          return;
        }

        await updateAdminMutation.mutateAsync({
          id: selectedAdmin.id,
          changes: changedFields,
        });
      } else {
        // Create mode
        await createAdminMutation.mutateAsync(formData);
      }
    } catch (err) {
      console.error('Error in handleCreateAdmin:', err);
    }
  };

  const handleEdit = (admin: Profile) => {
    setSelectedAdmin(admin);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this admin? This action cannot be undone.',
      )
    ) {
      toast.info('Delete cancelled');
      return;
    }

    const deleteToast = toast.loading('Deleting admin account...');
    try {
      await deleteAdminMutation.mutateAsync(id);
    } catch {
      toast.dismiss(deleteToast);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortOrder('latest');
    setCurrentPage(1);
    toast.info('Filters reset');
  };

  const hasActiveFilters =
    Boolean(searchQuery) || statusFilter !== 'all' || sortOrder !== 'latest';
  const isSubmitting =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending;
  const error = fetchError
    ? extractErrorMessage(fetchError)
    : createAdminMutation.error
      ? extractErrorMessage(createAdminMutation.error)
      : updateAdminMutation.error
        ? extractErrorMessage(updateAdminMutation.error)
        : deleteAdminMutation.error
          ? extractErrorMessage(deleteAdminMutation.error)
          : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Admin Accounts
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Total admins: {adminsData?.pagination.totalItems || 0}
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedAdmin(null);
            setIsFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Admin
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
        </div>
      )}

      <UserSearchFilter
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(status) => {
          setStatusFilter(status);
          setCurrentPage(1);
        }}
        sortOrder={sortOrder}
        onSortOrderChange={(order) => {
          setSortOrder(order);
          setCurrentPage(1);
        }}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <UsersTable
        data={adminsData}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={(_updatedAdmin) => {
          // The status change is handled by StatusDropdown which uses its own mutation
        }}
        isSubmitting={isSubmitting}
      />

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAdmin(null);
        }}
        onSubmit={handleCreateAdmin}
        userType="admin"
        error={
          createAdminMutation.error
            ? extractErrorMessage(createAdminMutation.error)
            : updateAdminMutation.error
              ? extractErrorMessage(updateAdminMutation.error)
              : null
        }
        initialData={
          selectedAdmin
            ? {
                email: selectedAdmin.email,
                full_name: selectedAdmin.full_name || '',
                phone_number: selectedAdmin.phone_number || '',
                avatar_url: selectedAdmin.avatar_url || '',
                created_at: selectedAdmin.created_at,
              }
            : undefined
        }
      />
    </div>
  );
}
