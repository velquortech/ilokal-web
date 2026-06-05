'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteBranchAction } from '../../actions/branchActions';
import type { Branch } from '@/lib/types';

interface DeleteBranchDialogProps {
  children: React.ReactNode;
  branch: Branch;
  onSuccess?: () => void;
}

export function DeleteBranchDialog({
  children,
  branch,
  onSuccess,
}: DeleteBranchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteBranchAction(branch.id);
      if (!result.success) {
        toast.error(result.error?.message ?? 'Failed to delete branch');
        return;
      }
      toast.success(`Branch "${branch.name}" deleted`);
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Branch</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{branch.name}</span>? This branch
            will no longer appear in nearby searches. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Delete Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
