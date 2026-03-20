'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminUser, AdminTabFilterState } from '@/lib/types/admin';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { UserFormData } from '@/app/admin/schemas/userFormSchema';
import { UserFormModal } from '../../../components/forms';
import { UsersTable, UserSearchFilter } from '../../../components/shared';
import {
  useCreateConsumer,
  useUpdateConsumer,
  useDeleteConsumer,
} from '@/hooks/useAdminMutations';
import { useUser } from '@/providers/UserContext';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';
import { PaginatedResponse } from '@/services/api/paginationService';

interface ConsumersTabProps {
  data: PaginatedResponse<AdminUser> | null;
  isLoading: boolean;
  filters: AdminTabFilterState;
  onFiltersChange: (filters: AdminTabFilterState) => void;
  _onRefetch?: () => void; // Available for future explicit refresh functionality
}

export default function ConsumersTab({
  data: consumerData,
  isLoading,
  filters,
  onFiltersChange,
  _onRefetch,
}: ConsumersTabProps) {
  const user = useUser();
  const isAdmin = user?.role === 'admin';
  const [selectedConsumer, setSelectedConsumer] = useState<AdminUser | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [consumersDataCache, setConsumersDataCache] =
    useState<PaginatedResponse<AdminUser> | null>(consumerData);

  // Update cache when data changes
  if (consumerData && consumersDataCache !== consumerData) {
    setConsumersDataCache(consumerData);
  }

  /**
   * Patch a single user record in the cached data with only the changed fields
   * This provides instant UI updates without re-fetching the entire list
   */
  const patchConsumerInCache = useCallback((updatedConsumer: AdminUser) => {
    setConsumersDataCache((prevData) => {
      if (!prevData) return prevData;

      // Find and update the specific consumer in the current page
      const updatedData = {
        ...prevData,
        data: prevData.data.map((consumer) =>
          consumer.id === updatedConsumer.id
            ? {
                ...consumer,
                ...updatedConsumer,
              }
            : consumer,
        ),
      };

      return updatedData;
    });
  }, []);

  /**
   * Add a newly created user to the top of the cache
   * This provides instant UI updates when a new user is created
   */
  const addConsumerToCache = useCallback((newConsumer: AdminUser) => {
    setConsumersDataCache((prevData) => {
      if (!prevData) {
        // If no cache exists, create initial data with just the new consumer
        return {
          data: [newConsumer],
          pagination: {
            currentPage: 1,
            pageSize: ADMIN_CONFIG.ITEMS_PER_PAGE,
            totalItems: 1,
            totalPages: 1,
          },
        };
      }

      // Add new consumer to the beginning of the list
      const updatedData = {
        ...prevData,
        data: [newConsumer, ...prevData.data.slice(0, -1)], // Add at top, remove last if exceeds limit
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
  const removeConsumerFromCache = useCallback((deletedConsumerId: string) => {
    setConsumersDataCache((prevData) => {
      if (!prevData) return prevData;

      // Remove the deleted consumer from the list
      const updatedData = {
        ...prevData,
        data: prevData.data.filter(
          (consumer) => consumer.id !== deletedConsumerId,
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
  }, []);

  // Memoized mutation callbacks to ensure stable references
  const handleCreateConsumerSuccess = useCallback(
    (newConsumer: AdminUser) => {
      // Optimistic update: add new consumer to the top of the table
      addConsumerToCache(newConsumer);
      toast.success('Consumer account created successfully!');
      setIsFormOpen(false);
      setSelectedConsumer(null);
      // Don't reset to page 1 - keep user on current page to see the new user at top
    },
    [addConsumerToCache],
  );

  const handleCreateConsumerError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to create consumer: ${errorMsg}`);
    console.error('Error creating consumer:', err);
  }, []);

  const handleUpdateConsumerSuccess = useCallback(
    (updatedConsumer: AdminUser) => {
      // Optimistic update: patch only the changed values in the table
      // This updates the UI instantly without re-rendering the whole component
      patchConsumerInCache(updatedConsumer);

      toast.success('Consumer account updated successfully!');
      // Close modal immediately without delay since data is already updated
      setIsFormOpen(false);
      setSelectedConsumer(null);
    },
    [patchConsumerInCache],
  );

  const handleUpdateConsumerError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to update consumer: ${errorMsg}`);
    console.error('Error updating consumer:', err);
  }, []);

  const handleDeleteConsumerSuccess = useCallback(
    (deletedConsumerId: string) => {
      // Optimistic update: remove consumer from cache
      removeConsumerFromCache(deletedConsumerId);
      toast.success('Consumer account deleted successfully!');
      // Refetch or adjust current page
      if (
        consumersDataCache &&
        consumersDataCache.data.length === 1 &&
        filters.page > 1
      ) {
        onFiltersChange({
          ...filters,
          page: filters.page - 1,
        });
      }
    },
    [consumersDataCache, filters, onFiltersChange, removeConsumerFromCache],
  );

  const handleDeleteConsumerError = useCallback((err: string) => {
    const errorMsg = extractErrorMessage(err);
    toast.error(`Failed to delete consumer: ${errorMsg}`);
    console.error('Error deleting consumer:', err);
  }, []);

  // Mutations
  const createConsumerMutation = useCreateConsumer(
    handleCreateConsumerSuccess,
    handleCreateConsumerError,
  );

  const updateConsumerMutation = useUpdateConsumer(
    handleUpdateConsumerSuccess,
    handleUpdateConsumerError,
  );

  const deleteConsumerMutation = useDeleteConsumer(
    handleDeleteConsumerSuccess,
    handleDeleteConsumerError,
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

  const handleCreateConsumer = async (formData: UserFormData) => {
    try {
      if (selectedConsumer) {
        // Update mode
        const changedFields = getChangedFields(selectedConsumer, formData);

        if (Object.keys(changedFields).length === 0) {
          setIsFormOpen(false);
          setSelectedConsumer(null);
          return;
        }

        updateConsumerMutation.mutate(selectedConsumer.id, changedFields);
      } else {
        // Create mode
        createConsumerMutation.mutate(formData);
      }
    } catch (err) {
      // Error is already handled by mutation callbacks
      console.error('Error in handleCreateConsumer:', err);
    }
  };

  const handleEdit = useCallback((consumer: AdminUser) => {
    setSelectedConsumer(consumer);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      try {
        deleteConsumerMutation.mutate(id);
      } catch {
        // Error is already handled by mutation callbacks
        console.error('Error deleting consumer');
      }
    },
    [deleteConsumerMutation],
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
    createConsumerMutation.isPending ||
    updateConsumerMutation.isPending ||
    deleteConsumerMutation.isPending;

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">Access Denied</h2>
        <p className="mt-2 text-red-700">
          You do not have permission to access consumer management. Admin
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
            Consumer Accounts
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Total consumers: {consumersDataCache?.pagination.totalItems || 0}
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedConsumer(null);
            setIsFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Consumer
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
        data={consumersDataCache}
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
        onStatusChange={patchConsumerInCache}
        isSubmitting={isSubmitting}
      />

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedConsumer(null);
        }}
        onSubmit={handleCreateConsumer}
        userType="app_user"
        error={null}
        initialData={
          selectedConsumer
            ? {
                email: selectedConsumer.email,
                full_name: selectedConsumer.full_name || '',
                phone_number: selectedConsumer.phone_number || '',
                avatar_url: selectedConsumer.avatar_url || '',
                created_at: selectedConsumer.created_at,
              }
            : undefined
        }
      />
    </div>
  );
}
