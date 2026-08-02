'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/types';
import type { ProductStatus } from '@/lib/types';
import { updateProductsStatusAction } from '@/app/business/[businessId]/actions/productActions';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';

interface BulkStatusActionsProps {
  /** Ids of the currently selected rows. */
  ids: string[];
  /** Clears the table's selection once a change has landed. */
  onDone: () => void;
}

/**
 * Bulk status bar for the table's selection column.
 *
 * The column has existed since the table was written but nothing consumed it —
 * "0 of 1 row(s) selected" with no action to take. This renders only when
 * something is selected, so the empty case is unchanged.
 */
export function BulkStatusActions({ ids, onDone }: BulkStatusActionsProps) {
  const router = useRouter();
  const vocabulary = useOfferingVocabulary();
  const [pending, setPending] = React.useState(false);

  if (ids.length === 0) return null;

  const noun = ids.length === 1 ? vocabulary.singular : vocabulary.plural;

  const applyStatus = async (status: ProductStatus) => {
    setPending(true);
    const toastId = 'product-bulk-status';
    toast.loading('Updating status…', { id: toastId });
    try {
      const result = await updateProductsStatusAction(ids, status);
      if (result.success) {
        const label = PRODUCT_STATUS_OPTIONS.find(
          (o) => o.value === status,
        )?.label;
        const updated = result.data?.updated ?? ids.length;
        toast.success(
          `${updated} ${updated === 1 ? vocabulary.singular : vocabulary.plural} set to ${label}`,
          { id: toastId },
        );
        onDone();
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to update status', {
          id: toastId,
        });
      }
    } catch {
      toast.error('Failed to update status', { id: toastId });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
      <span className="text-sm font-medium">
        {ids.length} {noun.toLowerCase()} selected
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Tag aria-hidden />
              )}
              Set status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Set status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRODUCT_STATUS_OPTIONS.map(({ value, label, description }) => (
              <DropdownMenuItem
                key={value}
                disabled={pending}
                className="items-start"
                onSelect={() => applyStatus(value)}
              >
                <span className="flex flex-col gap-0.5">
                  <span>{label}</span>
                  <span className="text-muted-foreground text-xs">
                    {description}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDone}
          disabled={pending}
          aria-label="Clear selection"
        >
          <X aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
