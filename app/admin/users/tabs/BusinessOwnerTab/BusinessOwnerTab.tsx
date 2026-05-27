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
  useCreateBusinessOwner,
  useUpdateBusinessOwner,
  useDeleteBusinessOwner,
} from '@/hooks/useAdminMutations';
import { useUser } from '@/providers/UserContext';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';
import { PaginatedResponse } from '@/lib/services';

interface BusinessOwnerTabProps {
  data: PaginatedResponse<AdminUser> | null;
  isLoading: boolean;
  filters: AdminTabFilterState;
  onFiltersChange: (filters: AdminTabFilterState) => void;
  _onRefetch?: () => void; // Available for future explicit refresh functionality
}

export default function BusinessOwnerTab({
  data: businessOwnerData,
  isLoading,
  filters,
  onFiltersChange,
  _onRefetch,
}: BusinessOwnerTabProps) {
  const user = useUser();
  const isAdmin = user?.role === 'admin';
  const [isMounted, setIsMounted] = useState(false);
  const [selectedBusinessOwner, setSelectedBusinessOwner] =
    useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [businessOwnersDataCache, setBusinessOwnersDataCache] =
    useState<PaginatedResponse<AdminUser> | null>(businessOwnerData);

  // Prevent hydration mismatch by only rendering after client hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync incoming prop to local cache when it changes
  useEffect(() => {
    setBusinessOwnersDataCache(businessOwnerData ?? null);
  }, [businessOwnerData]);

  /**
   * Patch a single user record in the cached data with only the changed fields
   * This provides instant UI updates without re-fetching the entire list
   */
  const patchBusinessOwnerInCache = useCallback(
    (updatedBusinessOwner: AdminUser) => {
      setBusinessOwnersDataCache((prevData) => {
        if (!prevData) return prevData;

        // Find and update the specific business owner in the current page
        const updatedData = {
          ...prevData,
          data: prevData.data.map((businessOwner) =>
            businessOwner.id === updatedBusinessOwner.id
              ? {
                  ...businessOwner,
                  ...updatedBusinessOwner,
                }
              : businessOwner,
          ),
        };

        return updatedData;
      });
    },
    [],
  );

  /**
   * Add a newly created user to the top of the cache
   * This provides instant UI updates when a new user is created
   */
  const addBusinessOwnerToCache = useCallback((newBusinessOwner: AdminUser) => {
    setBusinessOwnersDataCache((prevData) => {
      if (!prevData) {
        // If no cache exists, create initial data with just the new business owner
        return {
          data: [newBusinessOwner],
          pagination: {
            currentPage: 1,
            pageSize: ADMIN_CONFIG.ITEMS_PER_PAGE,
            totalItems: 1,
            totalPages: 1,
          },
        };
      }

      // Add new business owner to the beginning of the list and recompute pagination
      const prevTotal =
        prevData.pagination?.totalItems ?? prevData.data?.length ?? 0;
      const pageSize =
        prevData.pagination?.pageSize ?? ADMIN_CONFIG.ITEMS_PER_PAGE;
      const newTotal = prevTotal + 1;
      const newList = [newBusinessOwner, ...(prevData.data ?? [])];
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
  const removeBusinessOwnerFromCache = useCallback(
    (deletedBusinessOwnerId: string) => {
      setBusinessOwnersDataCache((prevData) => {
        if (!prevData) return prevData;

        // Remove the deleted business owner from the list
        const filtered = (prevData.data ?? []).filter(
          (businessOwner) => businessOwner.id !== deletedBusinessOwnerId,
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
    },
    [],
  );

  // Memoized mutation callbacks to ensure stable references
  const handleCreateBusinessOwnerSuccess = useCallback(
    (newBusinessOwner: AdminUser) => {
      // Optimistic update: add new business owner to the top of the table
      addBusinessOwnerToCache(newBusinessOwner);
      toast.success('Business owner account created successfully!');
      setIsFormOpen(false);
      setSelectedBusinessOwner(null);
      // Don't reset to page 1 - keep user on current page to see the new user at top
    },
    [addBusinessOwnerToCache],
  );

  const handleCreateBusinessOwnerError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to create business owner: ${errorMsg}`);
    console.error('Error creating business owner:', err);
  }, []);

  const handleUpdateBusinessOwnerSuccess = useCallback(
    (updatedBusinessOwner: AdminUser) => {
      // Optimistic update: patch only the changed values in the table
      // This updates the UI instantly without re-rendering the whole component
      patchBusinessOwnerInCache(updatedBusinessOwner);

      toast.success('Business owner account updated successfully!');
      // Close modal immediately without delay since data is already updated
      setIsFormOpen(false);
      setSelectedBusinessOwner(null);
    },
    [patchBusinessOwnerInCache],
  );

  const handleUpdateBusinessOwnerError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to update business owner: ${errorMsg}`);
    console.error('Error updating business owner:', err);
  }, []);

  const handleDeleteBusinessOwnerSuccess = useCallback(
    (deletedBusinessOwnerId: string) => {
      // Optimistic update: remove business owner from cache
      removeBusinessOwnerFromCache(deletedBusinessOwnerId);
      toast.success('Business owner account deleted successfully!');
      // Refetch or adjust current page
      if (
        businessOwnersDataCache &&
        businessOwnersDataCache.data.length === 1 &&
        filters.page > 1
      ) {
        onFiltersChange({
          ...filters,
          page: filters.page - 1,
        });
      }
    },
    [
      businessOwnersDataCache,
      filters,
      onFiltersChange,
      removeBusinessOwnerFromCache,
    ],
  );

  const handleDeleteBusinessOwnerError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to delete business owner: ${errorMsg}`);
    console.error('Error deleting business owner:', err);
  }, []);

  // Mutations
  const createBusinessOwnerMutation = useCreateBusinessOwner(
    handleCreateBusinessOwnerSuccess,
    handleCreateBusinessOwnerError,
  );

  const updateBusinessOwnerMutation = useUpdateBusinessOwner(
    handleUpdateBusinessOwnerSuccess,
    handleUpdateBusinessOwnerError,
  );

  const deleteBusinessOwnerMutation = useDeleteBusinessOwner(
    handleDeleteBusinessOwnerSuccess,
    handleDeleteBusinessOwnerError,
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

  const handleCreateBusinessOwner = async (formData: UserFormData) => {
    try {
      if (selectedBusinessOwner) {
        // Update mode
        const changedFields = getChangedFields(selectedBusinessOwner, formData);

        if (Object.keys(changedFields).length === 0) {
          setIsFormOpen(false);
          setSelectedBusinessOwner(null);
          return;
        }

        updateBusinessOwnerMutation.mutate(
          selectedBusinessOwner.id,
          changedFields,
        );
      } else {
        // Create mode
        createBusinessOwnerMutation.mutate(formData);
      }
    } catch (err) {
      // Error is already handled by mutation callbacks
      console.error('Error in handleCreateBusinessOwner:', err);
    }
  };

  const handleEdit = useCallback((businessOwner: AdminUser) => {
    setSelectedBusinessOwner(businessOwner);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      try {
        deleteBusinessOwnerMutation.mutate(id);
      } catch {
        // Error is already handled by mutation callbacks
        console.error('Error deleting business owner');
      }
    },
    [deleteBusinessOwnerMutation],
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
    createBusinessOwnerMutation.isPending ||
    updateBusinessOwnerMutation.isPending ||
    deleteBusinessOwnerMutation.isPending;

  // Prevent hydration mismatch: render placeholder until mounted
  if (!isMounted) {
    return <div className="space-y-4" />;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">Access Denied</h2>
        <p className="mt-2 text-red-700">
          You do not have permission to access business owner management. Admin
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
            Business Owner Accounts
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Total business owners:{' '}
            {businessOwnersDataCache?.pagination?.totalItems || 0}
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedBusinessOwner(null);
            setIsFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Business Owner
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
        data={businessOwnersDataCache}
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
        onStatusChange={patchBusinessOwnerInCache}
        isSubmitting={isSubmitting}
      />

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedBusinessOwner(null);
        }}
        onSubmit={handleCreateBusinessOwner}
        userType="business_owner"
        error={null}
        initialData={
          selectedBusinessOwner
            ? {
                email: selectedBusinessOwner.email,
                full_name: selectedBusinessOwner.full_name || '',
                phone_number: selectedBusinessOwner.phone_number || '',
                avatar_url: selectedBusinessOwner.avatar_url || '',
                created_at: selectedBusinessOwner.created_at,
              }
            : undefined
        }
      />
    </div>
  );
}
