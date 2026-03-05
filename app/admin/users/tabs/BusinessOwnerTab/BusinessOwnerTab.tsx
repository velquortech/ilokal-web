'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Profile } from '@/lib/types/user';
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

export default function BusinessOwnerTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedBusinessOwner, setSelectedBusinessOwner] =
    useState<Profile | null>(null);
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

  // Mutations
  const createBusinessOwnerMutation = useCreateBusinessOwner(
    () => {
      toast.success('Business owner account created successfully!');
      setIsFormOpen(false);
      setSelectedBusinessOwner(null);
      setCurrentPage(1);
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to create business owner: ${errorMsg}`);
      console.error('Error creating business owner:', err);
    },
  );

  const updateBusinessOwnerMutation = useUpdateBusinessOwner(
    () => {
      toast.success('Business owner account updated successfully!');
      // Add small delay to ensure React has rendered all updates before closing modal
      // This prevents phone number from flashing old value
      setTimeout(() => {
        setIsFormOpen(false);
        setSelectedBusinessOwner(null);
        setCurrentPage(1);
      }, 100);
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to update business owner: ${errorMsg}`);
      console.error('Error updating business owner:', err);
    },
  );

  const deleteBusinessOwnerMutation = useDeleteBusinessOwner(
    () => {
      toast.success('Business owner account deleted successfully!');
      if (
        businessOwnersData &&
        businessOwnersData.data.length === 1 &&
        currentPage > 1
      ) {
        setCurrentPage(currentPage - 1);
      }
    },
    (err) => {
      const errorMsg = extractErrorMessage(err);
      toast.error(`Failed to delete business owner: ${errorMsg}`);
      console.error('Error deleting business owner:', err);
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

        await updateBusinessOwnerMutation.mutateAsync({
          id: selectedBusinessOwner.id,
          changes: changedFields,
        });
      } else {
        // Create mode
        await createBusinessOwnerMutation.mutateAsync(formData);
      }
    } catch (err) {
      // Error is already handled by mutation callbacks
      console.error('Error in handleCreateBusinessOwner:', err);
    }
  };

  const handleEdit = useCallback((businessOwner: Profile) => {
    setSelectedBusinessOwner(businessOwner);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteBusinessOwnerMutation.mutateAsync(id);
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
  const error = fetchError
    ? extractErrorMessage(fetchError)
    : createBusinessOwnerMutation.error
      ? extractErrorMessage(createBusinessOwnerMutation.error)
      : updateBusinessOwnerMutation.error
        ? extractErrorMessage(updateBusinessOwnerMutation.error)
        : deleteBusinessOwnerMutation.error
          ? extractErrorMessage(deleteBusinessOwnerMutation.error)
          : null;

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
            {businessOwnersData?.pagination.totalItems || 0}
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
        data={businessOwnersData}
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
          setSelectedBusinessOwner(null);
        }}
        onSubmit={handleCreateBusinessOwner}
        userType="business_owner"
        error={
          createBusinessOwnerMutation.error
            ? extractErrorMessage(createBusinessOwnerMutation.error)
            : updateBusinessOwnerMutation.error
              ? extractErrorMessage(updateBusinessOwnerMutation.error)
              : null
        }
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
