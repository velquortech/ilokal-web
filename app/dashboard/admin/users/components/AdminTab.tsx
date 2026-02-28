'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Profile } from '@/lib/types/user';
import UserFormModal from './UserFormModal';

interface AdminFormData {
  email: string;
  full_name: string;
  password: string;
  status?: 'active' | 'inactive' | 'suspended';
  role: 'admin';
}

const mockAdmins: Profile[] = [
  {
    id: '1',
    email: 'admin@ilokal.com',
    full_name: 'Admin User',
    phone_number: null,
    role: 'admin',
    avatar_url: null,
    created_at: '2025-01-15',
    updated_at: '2025-01-15',
    archived_at: null,
  },
  {
    id: '2',
    email: 'superadmin@ilokal.com',
    full_name: 'Super Admin',
    phone_number: null,
    role: 'admin',
    avatar_url: null,
    created_at: '2025-01-10',
    updated_at: '2025-01-10',
    archived_at: null,
  },
];

export default function AdminTab() {
  const [admins, setAdmins] = useState<Profile[]>(mockAdmins);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);

  const handleCreateAdmin = (formData: AdminFormData) => {
    if (selectedAdmin) {
      setAdmins(
        admins.map((a) =>
          a.id === selectedAdmin.id
            ? {
                ...a,
                email: formData.email,
                full_name: formData.full_name,
                updated_at: new Date().toISOString(),
              }
            : a,
        ),
      );
    } else {
      setAdmins([
        ...admins,
        {
          id: Date.now().toString(),
          email: formData.email,
          full_name: formData.full_name,
          phone_number: null,
          role: formData.role,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived_at: null,
        },
      ]);
    }
    setIsFormOpen(false);
    setSelectedAdmin(null);
  };

  const handleEdit = (admin: Profile) => {
    setSelectedAdmin(admin);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this admin?')) {
      setAdmins(admins.filter((a) => a.id !== id));
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {admins.map((admin) => (
          <Card key={admin.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{admin.full_name}</CardTitle>
                  <p className="mt-1 text-xs text-gray-600">{admin.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-gray-600">
                Created: {new Date(admin.created_at).toLocaleDateString()}
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

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAdmin(null);
        }}
        onSubmit={handleCreateAdmin}
        userType="admin"
        initialData={selectedAdmin}
      />
    </div>
  );
}
