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
import { cn } from '@/lib/utils';
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
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selected = ids.length;
  const noun = selected === 1 ? vocabulary.singular : vocabulary.plural;

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
    // The bar stays MOUNTED with nothing selected — unmounting it on clear
    // destroys the focus Radix has just restored to the trigger, dropping the
    // keyboard user back to <body>. `aria-live` is what tells them the bar
    // appeared at all: it renders above the table, so tabbing forward from a
    // row checkbox never reaches it.
    <div
      role="region"
      aria-label="Bulk actions"
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 transition-opacity',
        selected === 0 && 'text-muted-foreground opacity-60',
        selected > 0 && 'bg-muted/50',
      )}
    >
      <span className="text-sm font-medium" aria-live="polite">
        {selected === 0
          ? `Select ${vocabulary.plural.toLowerCase()} to change their status`
          : `${selected} ${noun.toLowerCase()} selected`}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={triggerRef}
              size="sm"
              variant="outline"
              disabled={pending || selected === 0}
            >
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
          onClick={() => {
            // Move focus before the buttons go disabled, so it never lands on
            // an inert element.
            triggerRef.current?.blur();
            onDone();
          }}
          disabled={pending || selected === 0}
        >
          <X aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
