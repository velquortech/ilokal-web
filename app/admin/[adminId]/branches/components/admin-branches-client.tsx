'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react';
import type { Branch } from '@/lib/types';
import {
  approveBranchAction,
  getBranchDocumentsAction,
  rejectBranchAction,
} from '../../actions/branchActions';

type PendingBranch = Branch & { business_name: string };

interface AdminBranchesClientProps {
  branches: PendingBranch[];
}

export function AdminBranchesClient({ branches }: AdminBranchesClientProps) {
  const router = useRouter();
  const [rejectTarget, setRejectTarget] = React.useState<PendingBranch | null>(
    null,
  );
  const [rejectReason, setRejectReason] = React.useState('');
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [docs, setDocs] = React.useState<
    Record<string, { document_type: string; file_url: string }[]>
  >({});

  const handleViewDocs = async (branch: PendingBranch) => {
    if (docs[branch.id]) return;
    const result = await getBranchDocumentsAction(branch.id);
    if (result.success) {
      setDocs((prev) => ({
        ...prev,
        [branch.id]: result.data?.documents ?? [],
      }));
    }
  };

  const handleApprove = async (branch: PendingBranch) => {
    setLoadingId(branch.id);
    try {
      const result = await approveBranchAction(branch.id);
      if (result.success) {
        toast.success(`"${branch.name}" approved and activated`);
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to approve branch');
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setLoadingId(rejectTarget.id);
    try {
      const result = await rejectBranchAction(
        rejectTarget.id,
        rejectReason.trim() || 'Application rejected',
      );
      if (result.success) {
        toast.success(`"${rejectTarget.name}" rejected`);
        setRejectTarget(null);
        setRejectReason('');
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to reject branch');
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <Clock className="text-muted-foreground mb-3 size-10" />
        <p className="text-muted-foreground text-sm">
          No pending branch applications
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          New applications will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <React.Fragment key={branch.id}>
                <TableRow>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.business_name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-48 truncate">
                    {branch.address ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(branch.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleViewDocs(branch)}
                    >
                      View Docs
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Badge
                        variant="secondary"
                        className="gap-1 text-amber-700 dark:text-amber-400"
                      >
                        <Clock className="size-3" />
                        Pending
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-700 hover:text-green-800"
                        disabled={loadingId === branch.id}
                        onClick={() => handleApprove(branch)}
                      >
                        {loadingId === branch.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive gap-1"
                        disabled={loadingId === branch.id}
                        onClick={() => {
                          setRejectTarget(branch);
                          setRejectReason('');
                        }}
                      >
                        <XCircle className="size-3" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Document rows */}
                {docs[branch.id]?.length > 0 && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={6}>
                      <div className="flex flex-wrap gap-3 px-2 py-1">
                        {docs[branch.id].map((doc, i) => (
                          <a
                            key={i}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1 text-xs underline"
                          >
                            <ExternalLink className="size-3" />
                            {doc.document_type === 'business_permit'
                              ? 'Business Permit'
                              : 'Supporting Document'}
                          </a>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {docs[branch.id]?.length === 0 && (
                  <TableRow className="bg-muted/30">
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground px-4 py-2 text-xs italic"
                    >
                      No documents uploaded
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Branch Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting &ldquo;{rejectTarget?.name}&rdquo;.
              The business owner will be able to see this reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loadingId === rejectTarget?.id}
              onClick={handleRejectSubmit}
            >
              {loadingId === rejectTarget?.id ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 size-4" />
              )}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
