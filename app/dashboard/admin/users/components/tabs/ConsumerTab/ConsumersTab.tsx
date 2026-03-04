'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Profile } from '@/lib/types/user';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { UserFormData } from '@/lib/schemas/userFormSchema';
import { UserFormModal } from '../../forms';
import { UsersTable, UserSearchFilter } from '../../shared';
import {
  useCreateConsumer,
  useUpdateConsumer,
  useDeleteConsumer,
} from '@/hooks/useAdminMutations';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { ADMIN_CONFIG } from '@/config/adminConfig';

export default function ConsumersTab() {
  const [selectedConsumer, setSelectedConsumer] = useState<Profile | null>(
    null,
  );
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

  // Fetch consumers data with server-side pagination and filtering
  const {
    data: consumersData,
    isLoading,
    error: fetchError,
  } = useProfilesByRole('user', {
    page: currentPage,
    limit: ADMIN_CONFIG.ITEMS_PER_PAGE,
    searchQuery: debouncedSearchQuery,
    statusFilter,
    sortOrder,
  });

  // Mutations
  const createConsumerMutation = useCreateConsumer(
    () => {
      toast.success('Consumer account created successfully!');
      setIsFormOpen(false);
      setSelectedConsumer(null);
      setCurrentPage(1);
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to create consumer: ${errorMsg}`);
      console.error('Error creating consumer:', err);
    },
  );

  const updateConsumerMutation = useUpdateConsumer(
    () => {
      toast.success('Consumer account updated successfully!');
      setIsFormOpen(false);
      setSelectedConsumer(null);
      setCurrentPage(1);
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to update consumer: ${errorMsg}`);
      console.error('Error updating consumer:', err);
    },
  );

  const deleteConsumerMutation = useDeleteConsumer(
    () => {
      toast.success('Consumer account deleted successfully!');
      if (consumersData && consumersData.data.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to delete consumer: ${errorMsg}`);
      console.error('Error deleting consumer:', err);
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

        await updateConsumerMutation.mutateAsync({
          id: selectedConsumer.id,
          changes: changedFields,
        });
      } else {
        // Create mode
        await createConsumerMutation.mutateAsync(formData);
      }
    } catch (err) {
      // Error is already handled by mutation callbacks
      console.error('Error in handleCreateConsumer:', err);
    }
  };

  const handleEdit = useCallback((consumer: Profile) => {
    setSelectedConsumer(consumer);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const deleteToast = toast.loading('Deleting consumer account...');
      try {
        await deleteConsumerMutation.mutateAsync(id);
        toast.dismiss(deleteToast);
      } catch {
        toast.dismiss(deleteToast);
      }
    },
    [deleteConsumerMutation],
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
    createConsumerMutation.isPending ||
    updateConsumerMutation.isPending ||
    deleteConsumerMutation.isPending;
  const error = fetchError
    ? extractErrorMessage(fetchError)
    : createConsumerMutation.error
      ? extractErrorMessage(createConsumerMutation.error)
      : updateConsumerMutation.error
        ? extractErrorMessage(updateConsumerMutation.error)
        : deleteConsumerMutation.error
          ? extractErrorMessage(deleteConsumerMutation.error)
          : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Consumer Accounts
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Total consumers: {consumersData?.pagination.totalItems || 0}
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
        data={consumersData}
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
          setSelectedConsumer(null);
        }}
        onSubmit={handleCreateConsumer}
        userType="user"
        error={
          createConsumerMutation.error
            ? extractErrorMessage(createConsumerMutation.error)
            : updateConsumerMutation.error
              ? extractErrorMessage(updateConsumerMutation.error)
              : null
        }
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
