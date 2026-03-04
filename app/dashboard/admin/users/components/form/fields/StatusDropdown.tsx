'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Profile } from '@/lib/types/user';
import { useAdminStore } from '@/lib/stores/adminStore';
import userService from '@/lib/api/userService';
import { PaginatedResponse } from '@/lib/api/paginationService';
import { extractErrorMessage } from '@/lib/utils/errorHandler';
import { StatusBadge } from './StatusBadge';
import { Loader2, ChevronDown } from 'lucide-react';

export interface StatusDropdownProps {
  admin: Profile;
  onStatusChange?: (updatedAdmin: Profile) => void;
  onError?: (error: string) => void;
}

const statusOptions: Array<'active' | 'inactive' | 'suspended'> = [
  'active',
  'inactive',
  'suspended',
];

export function StatusDropdown({
  admin,
  onStatusChange,
  onError,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isUpdating, setIsUpdating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const { setUpdatingId } = useAdminStore();

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192, // 192px = w-48
      });
    }
  }, [isOpen]);

  // Helper to optimistically update the profile status in all matching query caches
  const updateCachedStatus = (
    newStatus: 'active' | 'inactive' | 'suspended',
  ) => {
    queryClient.setQueriesData<PaginatedResponse<Profile>>(
      { queryKey: ['profiles'] },
      (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((profile) =>
            profile.id === admin.id
              ? {
                  ...profile,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                }
              : profile,
          ),
        };
      },
    );
  };

  const handleStatusChange = async (
    newStatus: 'active' | 'inactive' | 'suspended',
  ) => {
    if (newStatus === admin.status) {
      setIsOpen(false);
      return;
    }

    const previousStatus = admin.status;
    setIsOpen(false);
    setIsUpdating(true);
    setUpdatingId(admin.id);

    // Optimistically update the cache immediately — row stays in place
    updateCachedStatus(newStatus);

    try {
      const updated = await userService.adminUpdateProfile(admin.id, {
        status: newStatus,
      });

      toast.success(`Status updated to ${newStatus}`);

      // Silently refetch in background to sync with server
      queryClient.invalidateQueries({ queryKey: ['profiles'] });

      onStatusChange?.(updated);
    } catch (err) {
      // Revert optimistic update on failure
      updateCachedStatus(previousStatus);

      const errorMessage = extractErrorMessage(err);
      toast.error(`Failed to update status: ${errorMessage}`);
      onError?.(errorMessage);
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
      setUpdatingId(null);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        title="Click to change status"
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <>
            <div className="flex items-center">
              <StatusBadge status={admin.status} />
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {isOpen &&
        !isUpdating &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="fixed z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              {statusOptions.map((status, index) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`block w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors ${
                    admin.status === status
                      ? 'bg-blue-50 font-medium text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${
                    index === statusOptions.length - 1 ? 'rounded-b-lg' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{status}</span>
                    {admin.status === status && (
                      <span className="ml-auto">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
