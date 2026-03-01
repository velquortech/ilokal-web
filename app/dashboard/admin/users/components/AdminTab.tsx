'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/api/paginationService';
import UserFormModal from './UserFormModal';
import AdminUsersTable from './AdminUsersTable';
import userService, { CreateUserInput } from '@/lib/api/userService';
import authService from '@/lib/api/authService';

/**
 * Extracts error message from various error formats
 */
const extractErrorMessage = (err: unknown): string => {
  const errorMessage = 'Failed to perform action';

  if (err instanceof Error) {
    // Check if error has data property (from axios error)
    if ('data' in err && typeof err.data === 'object' && err.data !== null) {
      const errorData = err.data as Record<string, unknown>;
      if (typeof errorData.message === 'string') {
        return errorData.message;
      }
    }

    // Check for message property
    if (err.message) {
      return err.message;
    }
  }

  // Fallback for unknown error types
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  return errorMessage;
};

export default function AdminTab() {
  const [adminsData, setAdminsData] =
    useState<PaginatedResponse<Profile> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchAdmins(currentPage);
  }, [currentPage]);

  const fetchAdmins = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.getProfilesByRolePaginated(
        'admin',
        page,
        ITEMS_PER_PAGE,
      );
      setAdminsData(data);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      console.error('Error fetching admins:', err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateAdmin = async (formData: CreateUserInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (selectedAdmin) {
        // Update existing admin
        const updated = await userService.updateProfile(selectedAdmin.id, {
          email: formData.email,
          full_name: formData.full_name,
          status: formData.status,
          verification_status: formData.verification_status,
        });

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
        // Create new admin account using auth service
        await authService.signup({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.password,
          name: formData.full_name,
          role: formData.role,
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

      // Refresh current page (or go to first page if last item on this page)
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

      <AdminUsersTable
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
                created_at: selectedAdmin.created_at,
              }
            : undefined
        }
      />
    </div>
  );
}
