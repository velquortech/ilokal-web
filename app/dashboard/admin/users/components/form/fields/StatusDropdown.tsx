'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Profile } from '@/lib/types/user';
import { useAdminStore } from '@/lib/stores/adminStore';
import userService from '@/lib/api/userService';
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
  const [optimisticStatus, setOptimisticStatus] = useState<
    'active' | 'inactive' | 'suspended' | null
  >(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const { setUpdatingId } = useAdminStore();
  const isLoading = optimisticStatus !== null;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192, // 192px = w-48
      });
    }
  }, [isOpen]);

  const handleStatusChange = async (
    newStatus: 'active' | 'inactive' | 'suspended',
  ) => {
    if (newStatus === admin.status && optimisticStatus === null) {
      setIsOpen(false);
      return;
    }

    // Set optimistic status for instant UI feedback
    setOptimisticStatus(newStatus);
    setUpdatingId(admin.id);

    try {
      const loadingToast = toast.loading(`Updating status to ${newStatus}...`);

      // Call API
      const updated = await userService.updateProfile(admin.id, {
        email: admin.email,
        full_name: admin.full_name || '',
        status: newStatus,
      });

      toast.dismiss(loadingToast);
      toast.success(`Status updated to ${newStatus} successfully!`);

      // Invalidate React Query cache to refetch with fresh data
      queryClient.invalidateQueries({ queryKey: ['profiles'] });

      // Call parent callback with updated data
      onStatusChange?.(updated);
      setIsOpen(false);
      setOptimisticStatus(null);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      toast.error(`Failed to update status: ${errorMessage}`);
      onError?.(errorMessage);
      console.error('Error updating status:', err);
      setOptimisticStatus(null);
    } finally {
      setUpdatingId(null);
    }
  };

  // Use optimistic status if available, otherwise use admin's current status
  const displayStatus = optimisticStatus || admin.status;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        title="Click to change status"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <>
            <div className="flex items-center">
              <StatusBadge status={displayStatus} />
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
        !isLoading &&
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
                    displayStatus === status
                      ? 'bg-blue-50 font-medium text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${
                    index === statusOptions.length - 1 ? 'rounded-b-lg' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{status}</span>
                    {displayStatus === status && (
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
