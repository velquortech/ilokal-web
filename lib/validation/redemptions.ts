import { z } from 'zod';

// Body for POST /api/protected/mobile/redemptions — redeem a coupon at a branch.
// Both ids are UUIDs; validating shape at the boundary turns type-confused input
// (arrays/objects) into a clean 400 instead of a downstream 500.
//
// Use z.guid() (lenient UUID-shape), NOT z.uuid()/.uuid(): Zod 4's z.uuid() is
// strict RFC 9562 and rejects any id without a valid version+variant nibble —
// including Postgres uuid values that aren't RFC-variant (e.g. seed ids like
// 4444...-4444-...). We only need to reject non-string / wrong-shape input here,
// so z.guid() is the correct validator. (Zod 3's .uuid() was lenient; the v4
// upgrade silently tightened it and 400'd every claim.)
export const redeemCouponSchema = z.object({
  coupon_id: z.guid(),
  branch_id: z.guid(),
});

export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
