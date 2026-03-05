'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Profile } from '@/lib/types/user';

interface DeleteConfirmationDialogProps {
  open: boolean;
  user: Profile | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({
  open,
  user,
  isSubmitting,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const userName = user?.full_name || user?.email || 'this user';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        role="alertdialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="sm:max-w-md"
      >
        {/* Header - rendered first for accessibility */}
        <DialogHeader className="text-center">
          <DialogTitle id="delete-dialog-title" className="text-xl">
            Delete User
          </DialogTitle>
          <DialogDescription
            id="delete-dialog-description"
            className="pt-2 text-sm"
          >
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{userName}</span>?
            <br />
            <span className="text-red-600">This action cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>

        {/* Warning Icon */}
        <div className="flex justify-center pt-2">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        {/* Footer with Actions */}
        <DialogFooter className="gap-2 pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
