import { z } from 'zod';

// Body for POST /api/protected/mobile/redemptions — redeem a coupon at a branch.
// Both ids are UUIDs; validating shape at the boundary turns type-confused input
// (arrays/objects) into a clean 400 instead of a downstream 500.
export const redeemCouponSchema = z.object({
  coupon_id: z.string().uuid(),
  branch_id: z.string().uuid(),
});

export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
