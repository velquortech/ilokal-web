'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ExternalLink, FileText, FileX, Loader2 } from 'lucide-react';
import {
  getBusinessDocumentsAction,
  type BusinessDocumentLink,
} from '../../actions/businessReviewActions';

interface ViewDocumentsDialogProps {
  businessId: string;
  businessName: string;
  children: React.ReactNode;
}

export function ViewDocumentsDialog({
  businessId,
  businessName,
  children,
}: ViewDocumentsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [docs, setDocs] = React.useState<BusinessDocumentLink[] | null>(null);

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && docs === null && !loading) {
      setLoading(true);
      try {
        const result = await getBusinessDocumentsAction(businessId);
        if (result.success) {
          setDocs(result.data ?? []);
        } else {
          toast.error(result.error?.message ?? 'Failed to load documents');
          setDocs([]);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const available = docs?.filter((d) => d.url) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submitted Documents
          </DialogTitle>
          <DialogDescription>
            Verification documents submitted by <strong>{businessName}</strong>.
            Links open in a new tab and expire after a short time.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading documents…
          </div>
        ) : available.length > 0 ? (
          <ul className="divide-border divide-y rounded-lg border">
            {available.map((doc) => (
              <li key={doc.key}>
                <a
                  href={doc.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-accent flex items-center justify-between px-4 py-3 text-sm transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="text-muted-foreground size-4" />
                    {doc.label}
                  </span>
                  <ExternalLink className="text-muted-foreground size-4" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-10 text-sm">
            <FileX className="size-6 opacity-40" />
            No documents submitted
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
