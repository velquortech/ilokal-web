'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminUser } from '@/lib/types/admin';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { UserFormData } from '@/app/admin/schemas/userFormSchema';
import { UserFormModal } from '../../../components/forms';
import { UsersTable, UserSearchFilter } from '../../../components/shared';
import {
  useCreateAdmin,
  useUpdateAdmin,
  useDeleteAdmin,
} from '@/hooks/useAdminMutations';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';

export default function AdminTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'suspended'
  >('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  // Reset to page 1 immediately when the search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Debounce search input value used for querying
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, ADMIN_CONFIG.SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch admins data with server-side pagination and filtering
  const {
    data: adminsData,
    isLoading,
    error: fetchError,
  } = useProfilesByRole('admin', {
    page: currentPage,
    limit: ADMIN_CONFIG.ITEMS_PER_PAGE,
    searchQuery: debouncedSearchQuery,
    statusFilter,
    sortOrder,
  });

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
      // Add small delay to ensure React has rendered all updates before closing modal
      // This prevents phone number from flashing old value
      setTimeout(() => {
        setIsFormOpen(false);
        setSelectedAdmin(null);
        setCurrentPage(1);
      }, 100);
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
    original: AdminUser,
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

        updateAdminMutation.mutate(selectedAdmin.id, changedFields);
      } else {
        // Create mode
        createAdminMutation.mutate(formData);
      }
    } catch (err) {
      // Error is already handled by mutation callbacks
      console.error('Error in handleCreateAdmin:', err);
    }
  };

  const handleEdit = useCallback((admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      try {
        deleteAdminMutation.mutate(id);
      } catch {
        // Error is already handled by mutation callbacks
        console.error('Error deleting admin');
      }
    },
    [deleteAdminMutation],
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setStatusFilter('all');
    setSortOrder('latest');
    setCurrentPage(1);
    toast.info('Filters reset');
  }, []);

  const isSubmitting =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending;
  const error = fetchError ? extractErrorMessage(fetchError) : null;

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">Access Denied</h2>
        <p className="mt-2 text-red-700">
          You do not have permission to access admin management. Admin
          privileges required.
        </p>
      </div>
    );
  }

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
        onSearchChange={setSearchQuery}
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
        hasActiveFilters={
          Boolean(searchQuery || debouncedSearchQuery) ||
          statusFilter !== 'all' ||
          sortOrder !== 'latest'
        }
      />

      <UsersTable
        data={adminsData}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
        error={null}
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
