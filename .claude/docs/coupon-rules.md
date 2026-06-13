# Coupon & Redemption Rules

Business rules for coupon claiming. Enforcement lives in `app/api/protected/mobile/redemptions/route.ts` (POST handler).

---

## Rules enforced today

| Rule                                    | Column                                           | Behavior                                                                                                        |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Coupon must be published & not archived | `status = 'published'`, `archived_at IS NULL`    | 400 — "Coupon not found or not yet active"                                                                      |
| Coupon must be within active window     | `start_date ≤ now ≤ expiry_date`                 | 400 — "Coupon has expired" or "not yet active"                                                                  |
| Total supply cap                        | `max_redemptions_global`                         | 400 — "Coupon has reached its redemption limit" (atomic via `increment_coupon_redemptions` RPC to prevent race) |
| Per-user lifetime claim limit           | `max_redemptions_per_user`                       | 400 — "You have already redeemed this coupon the maximum number of times"                                       |
| No duplicate active redemption          | query `user_redemptions` for unclaimed+unexpired | 400 — "You already have this deal in your wallet"                                                               |
| Subscription gate                       | `requires_subscription` (default `false`)        | 403 — "Follow this business to claim this deal"                                                                 |

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

| Condition                   | HTTP  | Message pattern                                                     |
| --------------------------- | ----- | ------------------------------------------------------------------- |
| Coupon not found / inactive | `400` | "Coupon not found or not yet active"                                |
| Expired                     | `400` | "Coupon has expired"                                                |
| Supply exhausted            | `400` | "Coupon has reached its redemption limit"                           |
| Per-user limit hit          | `400` | "You have already redeemed this coupon the maximum number of times" |
| Active dupe                 | `400` | "You already have this deal in your wallet"                         |
| Subscription required       | `403` | "Follow this business to claim this deal"                           |

**Note:** Most errors return `400`; the subscription gate returns `403` so mobile can distinguish "you can't claim this" from "invalid request."

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
