'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminUser, AdminTabFilterState } from '@/lib/types/admin';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { UserFormData } from '@/app/admin/schemas/userFormSchema';
import { UserFormModal } from '../../../components/forms';
import { UsersTable, UserSearchFilter } from '../../../components/shared';
import {
  useCreateAdmin,
  useUpdateAdmin,
  useDeleteAdmin,
} from '@/hooks/useAdminMutations';
import { useUser } from '@/providers/UserContext';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';
import { PaginatedResponse } from '@/lib/services';

interface AdminTabProps {
  data: PaginatedResponse<AdminUser> | null;
  isLoading: boolean;
  filters: AdminTabFilterState;
  onFiltersChange: (filters: AdminTabFilterState) => void;
  _onRefetch?: () => void; // Available for future explicit refresh functionality
}

export default function AdminTab({
  data: adminData,
  isLoading,
  filters,
  onFiltersChange,
  _onRefetch,
}: AdminTabProps) {
  const user = useUser();
  const isAdmin = user?.role === 'admin';
  const [isMounted, setIsMounted] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [adminsDataCache, setAdminsDataCache] =
    useState<PaginatedResponse<AdminUser> | null>(adminData);

  // Prevent hydration mismatch by only rendering after client hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync incoming prop to local cache when it changes
  useEffect(() => {
    setAdminsDataCache(adminData ?? null);
  }, [adminData]);

  /**
   * Patch a single user record in the cached data with only the changed fields
   * This provides instant UI updates without re-fetching the entire list
   */
  const patchAdminInCache = useCallback((updatedAdmin: AdminUser) => {
    setAdminsDataCache((prevData) => {
      if (!prevData) return prevData;

      // Find and update the specific admin in the current page
      const updatedData = {
        ...prevData,
        data: prevData.data.map((admin) =>
          admin.id === updatedAdmin.id
            ? {
                ...admin,
                ...updatedAdmin,
              }
            : admin,
        ),
      };

      return updatedData;
    });
  }, []);

  /**
   * Add a newly created user to the top of the cache
   * This provides instant UI updates when a new user is created
   */
  const addAdminToCache = useCallback((newAdmin: AdminUser) => {
    setAdminsDataCache((prevData) => {
      if (!prevData) {
        // If no cache exists, create initial data with just the new admin
        return {
          data: [newAdmin],
          pagination: {
            currentPage: 1,
            pageSize: ADMIN_CONFIG.ITEMS_PER_PAGE,
            totalItems: 1,
            totalPages: 1,
          },
        };
      }

      // Add new admin to the beginning of the list and recompute pagination
      const prevTotal =
        prevData.pagination?.totalItems ?? prevData.data?.length ?? 0;
      const pageSize =
        prevData.pagination?.pageSize ?? ADMIN_CONFIG.ITEMS_PER_PAGE;
      const newTotal = prevTotal + 1;
      const newList = [newAdmin, ...(prevData.data ?? [])];
      const trimmed = newList.slice(0, pageSize);

      return {
        ...prevData,
        data: trimmed,
        pagination: {
          ...(prevData.pagination ?? {}),
          totalItems: newTotal,
          totalPages: Math.max(1, Math.ceil(newTotal / pageSize)),
          pageSize,
        },
      };
    });
  }, []);

  /**
   * Remove a deleted user from the cache
   * This provides instant UI removal without re-fetching the entire list
   */
  const removeAdminFromCache = useCallback((deletedAdminId: string) => {
    setAdminsDataCache((prevData) => {
      if (!prevData) return prevData;

      // Remove the deleted admin from the list
      const filtered = (prevData.data ?? []).filter(
        (admin) => admin.id !== deletedAdminId,
      );
      const prevTotal =
        prevData.pagination?.totalItems ?? prevData.data?.length ?? 0;
      const newTotal = Math.max(0, prevTotal - 1);
      const pageSize =
        prevData.pagination?.pageSize ?? ADMIN_CONFIG.ITEMS_PER_PAGE;

      return {
        ...prevData,
        data: filtered,
        pagination: {
          ...(prevData.pagination ?? {}),
          totalItems: newTotal,
          totalPages: Math.max(1, Math.ceil(newTotal / pageSize)),
          pageSize,
        },
      };
    });
  }, []);

  // Memoized mutation callbacks to ensure stable references
  const handleCreateAdminSuccess = useCallback(
    (newAdmin: AdminUser) => {
      // Optimistic update: add new admin to the top of the table
      addAdminToCache(newAdmin);
      toast.success('Admin account created successfully!');
      setIsFormOpen(false);
      setSelectedAdmin(null);
      // Don't reset to page 1 - keep user on current page to see the new user at top
    },
    [addAdminToCache],
  );

  const handleCreateAdminError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to create admin: ${errorMsg}`);
    console.error('Error creating admin:', err);
  }, []);

  const handleUpdateAdminSuccess = useCallback(
    (updatedAdmin: AdminUser) => {
      // Optimistic update: patch only the changed values in the table
      // This updates the UI instantly without re-rendering the whole component
      console.info(
        '[AdminTab] Update success callback triggered with:',
        updatedAdmin,
      );
      patchAdminInCache(updatedAdmin);

      toast.success('Admin account updated successfully!');
      // Close modal immediately without delay since data is already updated
      setIsFormOpen(false);
      setSelectedAdmin(null);
    },
    [patchAdminInCache],
  );

  const handleUpdateAdminError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to update admin: ${errorMsg}`);
    console.error('Error updating admin:', err);
  }, []);

  const handleDeleteAdminSuccess = useCallback(
    (deletedAdminId: string) => {
      // Optimistic update: remove admin from cache
      removeAdminFromCache(deletedAdminId);
      toast.success('Admin account deleted successfully!');
      // Refetch or adjust current page
      if (
        adminsDataCache &&
        adminsDataCache.data.length === 1 &&
        filters.page > 1
      ) {
        onFiltersChange({
          ...filters,
          page: filters.page - 1,
        });
      }
    },
    [adminsDataCache, filters, onFiltersChange, removeAdminFromCache],
  );

  const handleDeleteAdminError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to delete admin: ${errorMsg}`);
    console.error('Error deleting admin:', err);
  }, []);

  // Mutations
  const createAdminMutation = useCreateAdmin(
    handleCreateAdminSuccess,
    handleCreateAdminError,
  );

  const updateAdminMutation = useUpdateAdmin(
    handleUpdateAdminSuccess,
    handleUpdateAdminError,
  );

  const deleteAdminMutation = useDeleteAdmin(
    handleDeleteAdminSuccess,
    handleDeleteAdminError,
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
    onFiltersChange({
      page: 1,
      searchQuery: '',
      statusFilter: 'all',
      sortOrder: 'latest',
    });
    toast.info('Filters reset');
  }, [onFiltersChange]);

  const isSubmitting =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deleteAdminMutation.isPending;

  // Prevent hydration mismatch: render placeholder until mounted
  if (!isMounted) {
    return <div className="space-y-4" />;
  }

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
            Total admins: {adminsDataCache?.pagination?.totalItems || 0}
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

      <UserSearchFilter
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => {
          onFiltersChange({
            ...filters,
            searchQuery: query,
            page: 1, // Reset to page 1 on search change
          });
        }}
        statusFilter={filters.statusFilter}
        onStatusFilterChange={(status) => {
          onFiltersChange({
            ...filters,
            statusFilter: status,
            page: 1,
          });
        }}
        sortOrder={filters.sortOrder}
        onSortOrderChange={(order) => {
          onFiltersChange({
            ...filters,
            sortOrder: order,
            page: 1,
          });
        }}
        onReset={handleResetFilters}
        hasActiveFilters={
          Boolean(filters.searchQuery) ||
          filters.statusFilter !== 'all' ||
          filters.sortOrder !== 'latest'
        }
      />

      <UsersTable
        data={adminsDataCache}
        isLoading={isLoading}
        currentPage={filters.page}
        onPageChange={(page) => {
          onFiltersChange({
            ...filters,
            page,
          });
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={patchAdminInCache}
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
