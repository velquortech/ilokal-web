'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, History, Loader2, ShieldAlert } from 'lucide-react';
import {
  getBusinessAuditLogAction,
  type BusinessAuditEntry,
} from '../../actions/businessActions';
import { getTimeAgo } from '@/lib/utils/dateFormatter';

interface ChangeHistoryDialogProps {
  businessId: string;
  businessName: string;
  children: React.ReactNode;
}

interface ChangeDescription {
  label: string;
  from: string;
  to: string;
}

/**
 * What changed, from the audit row's old/new JSONB. Each row records ONE
 * field (status, category or business type — the trigger logs them
 * separately), so the first key hit decides the label.
 */
function describeChange(entry: BusinessAuditEntry): ChangeDescription {
  const oldV = entry.old_value ?? {};
  const newV = entry.new_value ?? {};

  if ('category_id' in newV || 'category_id' in oldV) {
    return {
      label: 'Category',
      from: String(oldV.category_name ?? '—'),
      to: String(newV.category_name ?? '—'),
    };
  }
  if ('business_type_id' in newV || 'business_type_id' in oldV) {
    return {
      label: 'Business Type',
      from: String(oldV.business_type_name ?? '—'),
      to: String(newV.business_type_name ?? '—'),
    };
  }
  return {
    label: 'Status',
    from: String(oldV.status ?? '—'),
    to: String(newV.status ?? '—'),
  };
}

export function ChangeHistoryDialog({
  businessId,
  businessName,
  children,
}: ChangeHistoryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [entries, setEntries] = React.useState<BusinessAuditEntry[] | null>(
    null,
  );

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && entries === null && !loading) {
      setLoading(true);
      try {
        const result = await getBusinessAuditLogAction(businessId);
        if (result.success) {
          setEntries(result.data);
        } else {
          toast.error(result.error ?? 'Failed to load change history');
          setEntries([]);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History
          </DialogTitle>
          <DialogDescription>
            Status, category and business-type changes for{' '}
            <strong>{businessName}</strong> — recorded automatically for review,
            newest first.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading changes…
            </div>
          ) : entries && entries.length > 0 ? (
            <ul className="divide-border divide-y rounded-lg border">
              {entries.map((entry) => {
                const change = describeChange(entry);
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {change.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground line-through">
                          {change.from}
                        </span>
                        <ArrowRight className="text-muted-foreground size-3.5" />
                        <span className="font-medium">{change.to}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {entry.performed_by_name ?? 'System'} ·{' '}
                        {getTimeAgo(entry.performed_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-10 text-sm">
              <ShieldAlert className="size-6 opacity-40" />
              No changes recorded yet
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
