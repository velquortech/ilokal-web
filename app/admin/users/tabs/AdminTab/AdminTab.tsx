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
import { useUser } from '@/providers/UserContext';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';
import { PaginatedResponse } from '@/services/api/paginationService';

export default function AdminTab() {
  const user = useUser();
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
  const [adminsDataCache, setAdminsDataCache] =
    useState<PaginatedResponse<AdminUser> | null>(null);

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

  // Sync fetched data to cache
  useEffect(() => {
    if (adminsData) {
      setAdminsDataCache(adminsData);
    }
  }, [adminsData]);

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

      // Add new admin to the beginning of the list
      const updatedData = {
        ...prevData,
        data: [newAdmin, ...prevData.data.slice(0, -1)], // Add at top, remove last if exceeds limit
        pagination: {
          ...prevData.pagination,
          totalItems: prevData.pagination.totalItems + 1,
          totalPages: Math.ceil(
            (prevData.pagination.totalItems + 1) / ADMIN_CONFIG.ITEMS_PER_PAGE,
          ),
        },
      };

      return updatedData;
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
      const updatedData = {
        ...prevData,
        data: prevData.data.filter((admin) => admin.id !== deletedAdminId),
        pagination: {
          ...prevData.pagination,
          totalItems: Math.max(0, prevData.pagination.totalItems - 1),
          totalPages: Math.max(
            1,
            Math.ceil(
              (prevData.pagination.totalItems - 1) /
                ADMIN_CONFIG.ITEMS_PER_PAGE,
            ),
          ),
        },
      };

      return updatedData;
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
        currentPage > 1
      ) {
        setCurrentPage(currentPage - 1);
      }
    },
    [adminsDataCache, currentPage, removeAdminFromCache],
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
            Total admins: {adminsDataCache?.pagination.totalItems || 0}
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
        data={adminsDataCache}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
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
