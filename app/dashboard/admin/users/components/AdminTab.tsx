'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import UserFormModal from './UserFormModal';
interface Admin {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  status: 'active' | 'inactive';
}

interface AdminFormData {
  email: string;
  full_name: string;
}

const mockAdmins: Admin[] = [
  {
    id: '1',
    email: 'admin@ilokal.com',
    full_name: 'Admin User',
    created_at: '2025-01-15',
    status: 'active',
  },
  {
    id: '2',
    email: 'superadmin@ilokal.com',
    full_name: 'Super Admin',
    created_at: '2025-01-10',
    status: 'active',
  },
];

export default function AdminTab() {
  const [admins, setAdmins] = useState<Admin[]>(mockAdmins);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const handleCreateAdmin = (formData: AdminFormData) => {
    if (selectedAdmin) {
      setAdmins(
        admins.map((a) =>
          a.id === selectedAdmin.id ? { ...a, ...formData } : a,
        ),
      );
    } else {
      setAdmins([
        ...admins,
        {
          id: Date.now().toString(),
          ...formData,
          created_at: new Date().toISOString().split('T')[0],
          status: 'active',
        },
      ]);
    }
    setIsFormOpen(false);
    setSelectedAdmin(null);
  };

  const handleEdit = (admin: Admin) => {
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

      {/* Admins List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {admins.map((admin) => (
          <Card key={admin.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{admin.full_name}</CardTitle>
                  <p className="mt-1 text-xs text-gray-600">{admin.email}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    admin.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {admin.status}
                </span>
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

      {/* Form Modal */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAdmin(null);
        }}
        onSubmit={handleCreateAdmin}
        userType="admin"
        initialData={selectedAdmin || undefined}
      />
    </div>
  );
}
