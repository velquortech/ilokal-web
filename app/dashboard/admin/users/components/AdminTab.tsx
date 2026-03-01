'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/api/paginationService';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { UserFormData } from '@/lib/schemas/userFormSchema';
import UserFormModal from './UserFormModal';
import AdminUsersTable from './AdminUsersTable';
import { AdminSearchFilter } from './AdminSearchFilter';
import userService from '@/lib/api/userService';
import authService from '@/lib/api/authService';

export default function AdminTab() {
  const [adminsData, setAdminsData] =
    useState<PaginatedResponse<Profile> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'suspended'
  >('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchAdmins(currentPage);
  }, [currentPage, searchQuery, statusFilter, sortOrder]);

  const fetchAdmins = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.getProfilesByRolePaginated(
        'admin',
        page,
        ITEMS_PER_PAGE,
      );

      const filteredData = filterAdmins(data);
      setAdminsData(filteredData);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching admins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAdmins = (
    data: PaginatedResponse<Profile>,
  ): PaginatedResponse<Profile> => {
    if (!data || !data.data || data.data.length === 0) {
      return {
        data: [],
        pagination: {
          currentPage,
          pageSize: ITEMS_PER_PAGE,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }

    let filtered = [...data.data];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (admin) =>
          admin.full_name?.toLowerCase().includes(query) ||
          false ||
          admin.email.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((admin) => admin.status === statusFilter);
    }

    // Sort by created_at
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedFiltered = filtered.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE,
    );

    return {
      data: paginatedFiltered,
      pagination: {
        currentPage,
        pageSize: ITEMS_PER_PAGE,
        totalItems,
        totalPages,
      },
    };
  };

  /**
   * Compare form data with original admin and return only changed fields
   */
  const getChangedFields = (
    original: Profile,
    formData: UserFormData,
  ): {
    email?: string;
    full_name?: string;
    phone_number?: string;
    avatar_url?: string;
    password?: string;
  } => {
    const changes: Record<string, unknown> = {};

    // Check if email changed
    if (formData.email !== original.email) {
      changes.email = formData.email;
    }

    // Check if full_name changed
    if (formData.full_name !== (original.full_name || '')) {
      changes.full_name = formData.full_name;
    }

    // Check if phone_number changed
    if ((formData.phone_number || '') !== (original.phone_number || '')) {
      changes.phone_number = formData.phone_number;
    }

    // Check if avatar_url changed
    if ((formData.avatar_url || '') !== (original.avatar_url || '')) {
      changes.avatar_url = formData.avatar_url;
    }

    // Only include password if it's not empty (user wants to change it)
    if (formData.password && formData.password.length > 0) {
      changes.password = formData.password;
    }

    return changes as {
      email?: string;
      full_name?: string;
      phone_number?: string;
      avatar_url?: string;
      password?: string;
    };
  };

  const handleCreateAdmin = async (
    formData: Omit<UserFormData, 'confirm_password'> & {
      confirm_password?: string;
    },
  ) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (selectedAdmin) {
        // Update existing admin - only send changed fields
        const changedFields = getChangedFields(
          selectedAdmin,
          formData as UserFormData,
        );

        // If nothing changed, just close the modal
        if (Object.keys(changedFields).length === 0) {
          setIsFormOpen(false);
          setSelectedAdmin(null);
          return;
        }

        const updated = await userService.adminUpdateProfile(
          selectedAdmin.id,
          changedFields,
        );

        // Update the data in table
        if (adminsData) {
          setAdminsData({
            ...adminsData,
            data: adminsData.data.map((a) =>
              a.id === selectedAdmin.id ? updated : a,
            ),
          });
        }
      } else {
        // Create new admin account
        const phoneNumber = formData.phone_number?.trim();
        const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

        await authService.signup({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirm_password || '',
          name: formData.full_name,
          role: formData.role,
          ...(hasPhoneNumber && { phone_number: phoneNumber }),
          ...(formData.avatar_url && { avatar_url: formData.avatar_url }),
        });

        // Refresh the first page to show the new admin
        await fetchAdmins(1);
        setCurrentPage(1);
      }

      setIsFormOpen(false);
      setSelectedAdmin(null);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      console.error('Error saving admin:', err);
    } finally {
      setIsSubmitting(false);
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
      return;
    }

    try {
      setError(null);
      await userService.deleteProfile(id);

      if (adminsData && adminsData.data.length > 1) {
        await fetchAdmins(currentPage);
      } else if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await fetchAdmins(1);
      }
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      console.error('Error deleting admin:', err);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortOrder('latest');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== 'all';

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

      <AdminSearchFilter
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

      <AdminUsersTable
        data={adminsData}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={(updatedAdmin) => {
          if (adminsData) {
            setAdminsData({
              ...adminsData,
              data: adminsData.data.map((a) =>
                a.id === updatedAdmin.id ? updatedAdmin : a,
              ),
            });
          }
        }}
        isSubmitting={isSubmitting}
      />

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAdmin(null);
          setError(null);
        }}
        onSubmit={handleCreateAdmin}
        userType="admin"
        error={error}
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
