'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { approveBusinessDocumentsAction } from '../../actions/businessReviewActions';

interface ApproveDocumentsDialogProps {
  businessId: string;
  businessName: string;
  children: React.ReactNode;
}

export function ApproveDocumentsDialog({
  businessId,
  businessName,
  children,
}: ApproveDocumentsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [remarks, setRemarks] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveBusinessDocumentsAction(
        businessId,
        remarks.trim() || undefined,
      );
      if (result.success) {
        toast.success(`"${businessName}" verified — owner notified`);
        setOpen(false);
        setRemarks('');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to approve documents');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Approve Documents
          </DialogTitle>
          <DialogDescription className="py-1">
            Verify <strong>{businessName}</strong>. The business owner will be
            notified. You can include an optional note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="approve-remarks">Remarks (optional)</Label>
          <Textarea
            id="approve-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="resize-none"
            placeholder="Optional note for the owner..."
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="min-w-28 gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
