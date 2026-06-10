'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, Ellipsis, FileText, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BusinessVerificationStatus } from '@/lib/types/business';
import { ViewDocumentsDialog } from './view-documents';
import { ApproveDocumentsDialog } from './approve-documents';
import { DisapproveDocumentsDialog } from './disapprove-documents';

interface BusinessActionsProps {
  businessId: string;
  businessName: string;
  status: BusinessVerificationStatus;
}

export function BusinessActions({
  businessId,
  businessName,
  status,
}: BusinessActionsProps) {
  const canApprove = status !== 'verified';
  const canDisapprove = status !== 'rejected';

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <ViewDocumentsDialog
            businessId={businessId}
            businessName={businessName}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <FileText />
              View Documents
            </DropdownMenuItem>
          </ViewDocumentsDialog>

          {(canApprove || canDisapprove) && <DropdownMenuSeparator />}

          {canApprove && (
            <ApproveDocumentsDialog
              businessId={businessId}
              businessName={businessName}
            >
              <DropdownMenuItem
                className="text-green-700 focus:text-green-800 dark:text-green-400"
                onSelect={(e) => e.preventDefault()}
              >
                <CheckCircle2 />
                Approve
              </DropdownMenuItem>
            </ApproveDocumentsDialog>
          )}

          {canDisapprove && (
            <DisapproveDocumentsDialog
              businessId={businessId}
              businessName={businessName}
            >
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <XCircle />
                Disapprove
              </DropdownMenuItem>
            </DisapproveDocumentsDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
