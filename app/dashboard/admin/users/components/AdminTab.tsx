'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Profile } from '@/lib/types/user';
import UserFormModal from './UserFormModal';
import userService from '@/lib/api/userService';

export default function AdminTab() {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.getProfilesByRole('admin');
      setAdmins(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch admins';
      setError(errorMessage);
      console.error('Error fetching admins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (
    formData: Omit<Parameters<typeof userService.createProfile>[0], 'role'> & {
      role: 'admin';
    },
  ) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (selectedAdmin) {
        const updated = await userService.updateProfile(selectedAdmin.id, {
          email: formData.email,
          full_name: formData.full_name,
          business_name: formData.business_name,
          status: formData.status,
        });
        setAdmins(admins.map((a) => (a.id === selectedAdmin.id ? updated : a)));
      } else {
        const newAdmin = await userService.createProfile(formData);
        setAdmins([...admins, newAdmin]);
      }

      setIsFormOpen(false);
      setSelectedAdmin(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save admin';
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
      setAdmins(admins.filter((a) => a.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete admin';
      setError(errorMessage);
      console.error('Error deleting admin:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-gray-600">Loading admins...</p>
        </div>
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
            Total admins: {admins.length}
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
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {admins.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">No admins found</p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first admin account to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {admin.full_name}
                    </CardTitle>
                    <p className="mt-1 text-xs text-gray-600">{admin.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-600">
                  Created: {new Date(admin.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-600">
                  Updated: {new Date(admin.updated_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(admin)}
                    className="flex-1 gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(admin.id)}
                    className="flex-1 gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAdmin(null);
          setError(null);
        }}
        onSubmit={handleCreateAdmin}
        userType="admin"
        initialData={selectedAdmin}
      />
    </div>
  );
}
