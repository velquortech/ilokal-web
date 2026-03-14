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
  useCreateBusinessOwner,
  useUpdateBusinessOwner,
  useDeleteBusinessOwner,
} from '@/hooks/useAdminMutations';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';
import { PaginatedResponse } from '@/services/api/paginationService';

export default function BusinessOwnerTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedBusinessOwner, setSelectedBusinessOwner] =
    useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'suspended'
  >('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [businessOwnersDataCache, setBusinessOwnersDataCache] =
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

  // Fetch business owners data with server-side pagination and filtering
  const {
    data: businessOwnersData,
    isLoading,
    error: fetchError,
  } = useProfilesByRole('business_owner', {
    page: currentPage,
    limit: ADMIN_CONFIG.ITEMS_PER_PAGE,
    searchQuery: debouncedSearchQuery,
    statusFilter,
    sortOrder,
  });

  // Sync fetched data to cache
  useEffect(() => {
    if (businessOwnersData) {
      setBusinessOwnersDataCache(businessOwnersData);
    }
  }, [businessOwnersData]);

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

      // Add new business owner to the beginning of the list
      const updatedData = {
        ...prevData,
        data: [newBusinessOwner, ...prevData.data.slice(0, -1)], // Add at top, remove last if exceeds limit
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
  const removeBusinessOwnerFromCache = useCallback(
    (deletedBusinessOwnerId: string) => {
      setBusinessOwnersDataCache((prevData) => {
        if (!prevData) return prevData;

        // Remove the deleted business owner from the list
        const updatedData = {
          ...prevData,
          data: prevData.data.filter(
            (businessOwner) => businessOwner.id !== deletedBusinessOwnerId,
          ),
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
        currentPage > 1
      ) {
        setCurrentPage(currentPage - 1);
      }
    },
    [businessOwnersDataCache, currentPage, removeBusinessOwnerFromCache],
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
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setStatusFilter('all');
    setSortOrder('latest');
    setCurrentPage(1);
    toast.info('Filters reset');
  }, []);

  const isSubmitting =
    createBusinessOwnerMutation.isPending ||
    updateBusinessOwnerMutation.isPending ||
    deleteBusinessOwnerMutation.isPending;
  const error = fetchError ? extractErrorMessage(fetchError) : null;

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
            {businessOwnersDataCache?.pagination.totalItems || 0}
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
        data={businessOwnersDataCache}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
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
