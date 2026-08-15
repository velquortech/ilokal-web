'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useCelebrate } from '@/components/custom/Celebrate';
import { PromoFormDialog } from './promo-form-dialog';
import { buildPromoRequest } from './promo-templates';
import { createCouponAction } from '../../actions/couponActions';
import { uploadProductImageAction } from '../../actions/productActions';
import { useBusinessShop } from '@/providers/BusinessProvider';
import type { Coupon, ProductResponse } from '@/lib/types';

interface AddCouponDialogProps {
  children: React.ReactNode;
  products: ProductResponse[];
  /**
   * Prefill the form from an existing coupon WITHOUT creating a new row —
   * the "Duplicate" path. The copied promo opens as a draft, whichever state
   * the original was in, so the owner re-decides when to publish.
   */
  initial?: Coupon | null;
  onSuccess?: () => void;
}

export function AddCouponDialog({
  children,
  products,
  initial = null,
  onSuccess,
}: AddCouponDialogProps) {
  const { selectedBranchId } = useBusinessShop();
  const celebrate = useCelebrate();

  const filteredProducts = selectedBranchId
    ? products.filter((p) => p.branch_id === selectedBranchId)
    : products;

  // A duplicated promo opens as a DRAFT whichever state the original was in,
  // so the owner re-decides when to publish instead of inheriting "live".
  const duplicateDraft = initial
    ? { ...initial, status: 'draft' as const }
    : null;

  return (
    <PromoFormDialog
      products={filteredProducts}
      initial={duplicateDraft}
      title="Add Coupon or Deal"
      description="Start from a template, or build the promo from scratch"
      submitLabel="Save"
      onSubmit={async ({ values, image }) => {
        try {
          let image_url: string | undefined;
          if (image instanceof File) {
            const fd = new FormData();
            fd.append('file', image);
            const uploadResult = await uploadProductImageAction(fd);
            if (!uploadResult.success) {
              return {
                ok: false,
                message: uploadResult.error?.message ?? 'Image upload failed',
              };
            }
            image_url = uploadResult.data?.url;
          }

          const result = await createCouponAction(
            buildPromoRequest(values, {
              imageUrl: image_url,
              branchId: selectedBranchId ?? null,
            }),
          );

          if (!result.success) {
            return {
              ok: false,
              message: result.error?.message ?? 'Failed to create coupon',
            };
          }

          const kind = values.promotion_type === 'deal' ? 'Deal' : 'Coupon';
          const live = values.status === 'published';
          toast.success(
            `${kind} "${values.code.toUpperCase()}" ${live ? 'is live' : 'saved as a draft'}`,
          );
          // Only a PUBLISHED promo is an outcome — saving a draft is
          // housekeeping, and confetti on it would make the burst mean nothing.
          if (live) celebrate();
          return { ok: true };
        } catch {
          return { ok: false, message: 'An unexpected error occurred' };
        }
      }}
      onSuccess={onSuccess}
    >
      {children}
    </PromoFormDialog>
  );
}
