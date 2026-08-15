'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { PromoFormDialog } from './promo-form-dialog';
import { buildPromoRequest } from './promo-templates';
import { updateCouponAction } from '../../actions/couponActions';
import { uploadProductImageAction } from '../../actions/productActions';
import type { Coupon, ProductResponse } from '@/lib/types';

interface UpdateCouponDialogProps {
  coupon: Coupon;
  products: ProductResponse[];
  children: React.ReactNode;
}

export function UpdateCouponDialog({
  coupon,
  products,
  children,
}: UpdateCouponDialogProps) {
  const filteredProducts = coupon.branch_id
    ? products.filter((p) => p.branch_id === coupon.branch_id)
    : products;

  return (
    <PromoFormDialog
      products={filteredProducts}
      initial={coupon}
      title="Edit Coupon or Deal"
      description={
        <>
          Update <strong>{coupon.code}</strong>
        </>
      }
      submitLabel="Save Changes"
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

          const request = buildPromoRequest(values, { imageUrl: image_url });
          // `undefined` means "not sent" to the update service; `null` means
          // "remove the photo". Omitting the key preserves the current photo —
          // sending null here used to wipe a deal's image on every edit that
          // did not pick a new one.
          if (!(image instanceof File)) delete request.image_url;

          const result = await updateCouponAction(coupon.id, request);
          if (!result.success) {
            return {
              ok: false,
              message: result.error?.message ?? 'Failed to update coupon',
            };
          }

          toast.success(`"${values.code.toUpperCase()}" updated`);
          return { ok: true };
        } catch {
          return { ok: false, message: 'An unexpected error occurred' };
        }
      }}
    >
      {children}
    </PromoFormDialog>
  );
}
