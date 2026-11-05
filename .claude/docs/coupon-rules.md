# Coupon & Redemption Rules

Business rules for coupon claiming. Enforcement lives in the `redeem_coupon` SQL RPC (migration `20261024000000`), shared by every redeem path (mobile `POST /api/protected/mobile/redemptions`, the web shop page's `redeemCouponAction`, and the legacy `/api/web/coupons/[id]/redeem` + `couponService.redeemCoupon`). Clients cannot write `user_redemptions` directly. Behaviour is pinned by `supabase/tests/redemption_lockdown.test.sql`; the code → HTTP mapping lives in `app/api/helpers/redemptionErrors.ts`.

---

## Rules enforced today

| Rule                                    | Column                                                 | Behavior                                                                                                     |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Coupon must be published & not archived | `status = 'published'`, `archived_at IS NULL`          | 400 — "Coupon not found or not yet active"                                                                   |
| Coupon must be within active window     | `start_date ≤ now ≤ expiry_date`                       | 400 — "Coupon has expired" or "not yet active"                                                               |
| Total supply cap                        | `max_redemptions_global`                               | 400 — "Coupon has reached its redemption limit" (race-safe: checked + incremented under the coupon row lock) |
| Per-user lifetime claim limit           | `max_redemptions_per_user`                             | 400 — "You have already redeemed this coupon the maximum number of times"                                    |
| No duplicate active redemption          | query `user_redemptions` for unclaimed+unexpired       | 400 — "You already have this deal in your wallet"                                                            |
| Follow gate                             | `requires_follow` (default `false`)                    | 403 — "Follow this business to claim this deal"                                                              |
| Branch must fit the coupon              | branch of the coupon's business; `branch_id` if scoped | 400 — "This deal cannot be redeemed at that branch"                                                          |

### Typical values set by businesses

| Use case                    | `max_redemptions_per_user` | `max_redemptions_global` |
| --------------------------- | -------------------------- | ------------------------ |
| One-time promo              | `1`                        | any cap or NULL          |
| Flash deal (first 50 users) | `1`                        | `50`                     |
| Loyalty stamp (3 visits)    | `3`                        | NULL                     |
| Unlimited / open promo      | NULL                       | NULL                     |

---

---

## Error codes mobile app should handle

Every error body is `{ "code": "<CODE>", "message": "<user copy>" }` (the `code` field was added in `20261024000000`; status + message are unchanged).

| Condition                   | `code`                   | HTTP  | Message pattern                                                     |
| --------------------------- | ------------------------ | ----- | ------------------------------------------------------------------- |
| Coupon not found / inactive | `COUPON_NOT_FOUND`       | `400` | "Coupon not found or not yet active"                                |
| Wrong branch                | `BRANCH_MISMATCH`        | `400` | "This deal cannot be redeemed at that branch"                       |
| Expired                     | `COUPON_EXPIRED`         | `400` | "Coupon has expired"                                                |
| Supply exhausted            | `COUPON_LIMIT_REACHED`   | `400` | "Coupon has reached its redemption limit"                           |
| Per-user limit hit          | `PER_USER_LIMIT_REACHED` | `400` | "You have already redeemed this coupon the maximum number of times" |
| Active dupe                 | `ALREADY_IN_WALLET`      | `400` | "You already have this deal in your wallet"                         |
| Follow required             | `FOLLOW_REQUIRED`        | `403` | "Follow this business to claim this deal"                           |

Claim (`PATCH /api/protected/mobile/redemptions/[id]/claim`, RPC `claim_my_redemption`): `REDEMPTION_NOT_FOUND` 404 "Redemption not found", `ALREADY_CLAIMED` 400 "Redemption already claimed", `REDEMPTION_EXPIRED` 400 "Redemption has expired".

**Note:** Most errors return `400`; the follow gate returns `403` so mobile can distinguish "you can't claim this" from "invalid request."

---

## Redemption lifecycle

```
CLAIMED           → is_claimed = true (cashier marks redeemed)
   ↑
ACTIVE            → is_claimed = false, expires_at > now
   ↑
[User claims]     → POST /redemptions → inserts user_redemptions row
                     expires_at = coupon.expiry_date
   ↑
BROWSING          → User sees deal in /deals feed
```

**`expires_at` on `user_redemptions`** is set to `coupon.expiry_date` at claim time. It is not a per-redemption countdown timer — the whole coupon window applies.

> If you want a "use within 24h of claiming" window, add `redeem_time_limit_minutes` to the coupon and compute `expires_at = redeemed_at + interval`. The mobile type already has `redeem_time_limit_minutes` in `ApiCoupon` but the POST handler ignores it currently.
