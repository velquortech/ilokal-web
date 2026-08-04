'use client';

import * as React from 'react';
import type {
  ProductResponse,
  ProductSectionWithCount,
  ProductStatus,
} from '@/lib/types';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Ellipsis, Eye, Tag, BadgePercent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdateProductDialog } from '../update-product';
import { DropdownMenuSub } from '@radix-ui/react-dropdown-menu';
import { DeleteProductDialog } from '../delete-product';
import { ViewProduct } from '../view-product';
import { ApplySale } from '../apply-sale';
import { updateProductStatusAction } from '@/app/business/[businessId]/actions/productActions';
import { useBusinessId } from '@/providers/BusinessProvider';

/**
 * Row actions. Takes the product plus the shop's sections, so "Update" can
 * offer a section picker — the table is where an owner actually assigns them.
 */
export function ProductActions({
  product,
  sections,
}: {
  product: ProductResponse;
  sections?: ProductSectionWithCount[];
}) {
  const businessId = useBusinessId();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const handleStatusChange = async (status: string) => {
    if (status === product.status) return;
    setPending(true);
    // Stable id per the one-Toaster rule — a fast clicker gets one toast that
    // resolves, not a stack of them.
    const toastId = `product-status-${product.id}`;
    toast.loading('Updating status…', { id: toastId });
    try {
      const result = await updateProductStatusAction(
        businessId,
        product.id,
        status as ProductStatus,
      );
      if (result.success) {
        const label =
          PRODUCT_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
          status;
        toast.success(`${product.name} is now ${label}`, { id: toastId });
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to update status', {
          id: toastId,
        });
      }
    } catch {
      // A rejected Server Action (network drop, redeploy) would otherwise
      // leave the loading toast spinning forever.
      toast.error('Failed to update status', { id: toastId });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <ViewProduct {...product}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Eye />
              View Card
            </DropdownMenuItem>
          </ViewProduct>
          <UpdateProductDialog product={product} sections={sections}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit Product
            </DropdownMenuItem>
          </UpdateProductDialog>
          {/* Nothing to discount when the price is a quote. */}
          {product.price_type !== 'on_request' && (
            <ApplySale product={product}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <BadgePercent />
                Apply Sale
              </DropdownMenuItem>
            </ApplySale>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={pending}>
              <Tag />
              Set Status
            </DropdownMenuSubTrigger>
            {/* Options come from PRODUCT_STATUS_OPTIONS, not literals: this
                menu previously offered `inactive`/`archived`, which the
                products CHECK rejects, so every change silently failed. */}
            <DropdownMenuSubContent className="w-60">
              <DropdownMenuRadioGroup
                value={product.status}
                onValueChange={handleStatusChange}
              >
                {PRODUCT_STATUS_OPTIONS.map(({ value, label, description }) => (
                  <DropdownMenuRadioItem
                    key={value}
                    value={value}
                    disabled={pending}
                    className="items-start"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span>{label}</span>
                      <span className="text-muted-foreground text-xs">
                        {description}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DeleteProductDialog product={product}>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DeleteProductDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
