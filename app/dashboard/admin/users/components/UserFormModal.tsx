'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormData {
  email: string;
  full_name: string;
  business_name: string;
  status: 'active' | 'inactive' | 'suspended';
  verification_status: 'pending' | 'verified' | 'suspended' | 'rejected';
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  userType: 'admin' | 'business_owner' | 'consumer';
  initialData?: Partial<FormData>;
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  userType,
  initialData,
}: UserFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    full_name: '',
    business_name: '',
    status: 'active',
    verification_status: 'pending',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email || '',
        full_name: initialData.full_name || '',
        business_name: initialData.business_name || '',
        status: initialData.status || 'active',
        verification_status: initialData.verification_status || 'pending',
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        business_name: '',
        status: 'active',
        verification_status: 'pending',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getTitle = () => {
    if (initialData) {
      return `Edit ${userType === 'admin' ? 'Admin' : userType === 'business_owner' ? 'Business Owner' : 'Consumer'}`;
    }
    return `Create New ${userType === 'admin' ? 'Admin' : userType === 'business_owner' ? 'Business Owner' : 'Consumer'}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the user details below'
              : 'Fill in the details to create a new user account'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Business Name (for business owners only) */}
          {userType === 'business_owner' && (
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                name="business_name"
                type="text"
                placeholder="Your Business Name"
                value={formData.business_name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {/* Status (for admins and consumers) */}
          {(userType === 'admin' || userType === 'consumer') && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: value as 'active' | 'inactive' | 'suspended',
                  }))
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  {userType === 'consumer' && (
                    <SelectItem value="suspended">Suspended</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Verification Status (for business owners only) */}
          {userType === 'business_owner' && (
            <div className="space-y-2">
              <Label htmlFor="verification_status">Verification Status</Label>
              <Select
                value={formData.verification_status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    verification_status: value as
                      | 'pending'
                      | 'verified'
                      | 'suspended'
                      | 'rejected',
                  }))
                }
              >
                <SelectTrigger id="verification_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
