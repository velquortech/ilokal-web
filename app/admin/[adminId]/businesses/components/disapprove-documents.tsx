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
import { Loader2, XCircle } from 'lucide-react';
import { rejectBusinessDocumentsAction } from '../../actions/businessReviewActions';

interface DisapproveDocumentsDialogProps {
  businessId: string;
  businessName: string;
  children: React.ReactNode;
}

export function DisapproveDocumentsDialog({
  businessId,
  businessName,
  children,
}: DisapproveDocumentsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [remarks, setRemarks] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setRemarks('');
  };

  const handleDisapprove = async () => {
    const trimmed = remarks.trim();
    if (!trimmed) {
      toast.error('Remarks are required when disapproving');
      return;
    }
    setLoading(true);
    try {
      const result = await rejectBusinessDocumentsAction(businessId, trimmed);
      if (result.success) {
        toast.success(`"${businessName}" disapproved — owner notified`);
        setOpen(false);
        setRemarks('');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to disapprove documents');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Disapprove Documents
          </DialogTitle>
          <DialogDescription className="py-1">
            Provide remarks for disapproving <strong>{businessName}</strong>.
            The business owner will receive these remarks in a notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="disapprove-remarks">
            Remarks <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="disapprove-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            className="resize-none"
            placeholder="Explain what needs to be corrected..."
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDisapprove}
            disabled={loading || !remarks.trim()}
            className="min-w-28 gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Disapprove
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
