# Business Analytics Dashboard — Ideas & Implementation Plan

Brainstormed: 2026-05-25

This document captures all analytics and automation ideas for the business owner dashboard,
grounded in the current database schema. No schema changes are required for the first four sections.

---

## What the Database Currently Gives Us

Before building anything, these are the signals extractable from existing tables:

| Signal | Source table(s) |
|---|---|
| When a customer first engaged | `subscriptions.created_at` (first follow) |
| When a customer redeemed | `user_redemptions.redeemed_at`, `coupon_redemptions.redeemed_at` |
| Whether they came back | Repeat rows in redemption tables by `user_id` across months |
| Which branch they visited | `user_redemptions.branch_id` |
| Which coupon drove the visit | `coupon_redemptions.coupon_id` |
| How popular a coupon is | `coupons.current_redemptions` vs `max_redemptions_global` |
| What customers think | `business_ratings`, `ratings` (product-level) |
| Passive followers (never redeemed) | `subscriptions` LEFT JOIN `user_redemptions` WHERE redemption IS NULL |

**What we cannot track yet without schema additions:** page views, product browse events,
time-in-store, actual purchase amounts. Redemptions are the best proxy for "a customer visited."

---

## Dashboard Panel Ideas

### 1. Customer Retention Triangle *(core feature)*

Three numbers displayed prominently, compared month-over-month:

- **New customers** — users who redeemed for the first time this month
- **Returning customers** — users who redeemed last month AND this month
- **Churned customers** — users who redeemed last month but NOT this month

**Formula:** Retention rate = `returning / (returning + churned) × 100`

**Data source:** GROUP `coupon_redemptions` + `user_redemptions` by `user_id`, bucket by month,
then compare current month vs previous month.

**Why it matters:** Directly answers "is my business gaining or losing customers" without
requiring any purchase/revenue data.

---

### 2. Follower Funnel

A funnel visualization showing how many followers actually convert to active customers:

```
Total Followers        (subscriptions)
    → Ever Redeemed    (joined with any redemption row)
        → Active Now   (redeemed within the last 30 days)
            → Loyal    (redeemed in 2+ consecutive months)
```

**The key insight:** The gap between "Total Followers" and "Ever Redeemed" is the biggest
opportunity — these are people who liked the business but never came in. This naturally
suggests: "you should publish a deal targeted at inactive followers."

**Data source:** `subscriptions` LEFT JOIN `coupon_redemptions` USING `user_id` and `business_id`
via coupon → business join.

---

### 3. Monthly Trend Chart (6-month lookback)

A dual-line or stacked bar chart showing per month:
- New followers gained
- Total redemptions

**Reading the chart:**
- Followers up, redemptions flat → deals aren't compelling enough
- Redemptions up, followers flat → loyal base is active but not acquiring new people
- Both declining → business health warning, prompt owner to take action

**Data source:** `subscriptions.created_at` grouped by month + `coupon_redemptions.redeemed_at`
grouped by month, filtered to business.

---

### 4. Coupon / Deal Performance Table

Per-coupon breakdown, ranked by engagement:

| Coupon | Type | Max | Redeemed | Rate | Avg Days to Redeem |
|---|---|---|---|---|---|
| 20% Off Any Drink | Deal | 100 | 67 | 67% | 3.2 days |
| Buy 1 Get 1 | Coupon | 50 | 8 | 16% | 11.4 days |

**Formulas:**
- Redemption rate = `current_redemptions / max_redemptions_global × 100`
- Avg days to redeem = `AVG(redeemed_at - coupon.start_date)`

**Reading the data:**
- Short avg days = urgency worked
- Long tail = customers saved it for later
- Rate below 10% = offer isn't resonating, reconsider discount or scope

**Data source:** `coupons` JOIN `coupon_redemptions`, filtered to business.

---

### 5. Branch Performance Breakdown

Side-by-side comparison of branches (relevant for multi-branch owners):

- Redemptions per branch this month vs last month
- Which branch drives the most repeat customers
- Which branch is underperforming relative to follower count

**Data source:** `user_redemptions.branch_id` GROUP BY `branch_id`, JOIN `branches` for name.

---

### 6. Rating Trend Over Time

Plot rolling average of `business_ratings.rating` per month.

**Cross-signal analysis:**
- Ratings declining while redemptions up → quality/experience problem
- Ratings up, redemptions down → people love it but deal visibility is low
- Both improving → healthy growth

**Data source:** `business_ratings` filtered by `business_id`, grouped by month via `created_at`.

---

### 7. Customer Segments Donut (Simplified RFM)

Group all customers who have ever redeemed into segments based on recency + frequency.
Computable purely from redemption tables — no schema change needed.

| Segment | Rule | Suggested Action |
|---|---|---|
| **Champions** | 3+ redemptions, last < 30 days ago | Reward them, feature as regulars |
| **Loyal** | 2+ redemptions, last < 60 days ago | Keep engaging, give early access |
| **At-Risk** | Redeemed before, last 60–90 days ago | Send a win-back deal |
| **Lost** | Last redemption > 90 days ago | Last-chance offer or accept churn |
| **New** | Only 1 redemption, < 30 days ago | Nurture into loyal segment |

**Data source:** `coupon_redemptions` + `user_redemptions` aggregated by `user_id`,
compute `MAX(redeemed_at)` as recency and `COUNT(*)` as frequency.

---

### 8. Business Health Score Card

A summary card at the top of the dashboard with directional arrows for each signal:

| Indicator | Metric | Status |
|---|---|---|
| Customer Retention | Retention rate vs last month | ↑ ↓ → |
| Follower Growth | New followers this month vs last | ↑ ↓ → |
| Deal Activity | Active published deals count | number |
| Customer Sentiment | Average rating + trend direction | ↑ ↓ → |

**Rule:** Never show a single composite "score" — show each signal separately so the owner
knows exactly which dimension needs attention.

---

### 9. Automation Suggestions Panel *(actionable nudges)*

Instead of raw numbers, surface plain-language prompts derived from the same data:

> **"47 followers haven't redeemed any deal in the past 60 days. Consider publishing a
> re-engagement offer targeting inactive subscribers."**

> **"Your 'Buy 1 Get 1' deal hit 80% redemption in 5 days — consider raising the max
> redemption limit or extending the end date."**

> **"Retention dropped from 62% → 41% this month. Customers who visited in April haven't
> returned. A win-back coupon may help."**

> **"Your Main Branch had 3× more redemptions than your second branch this month. Consider
> running a branch-specific deal to balance traffic."**

These are computed from the same queries as the charts but presented as actionable sentences
rather than numbers the owner has to interpret themselves.

---

## Implementation Priority (Highest Value First)

| Priority | Panel | Schema changes needed | Complexity |
|---|---|---|---|
| 1 | Retention Triangle + Monthly Trend | None | Medium |
| 2 | Customer Segments Donut | None | Medium |
| 3 | Coupon Performance Table | None | Low |
| 4 | Automation Suggestions Panel | None | Medium |
| 5 | Follower Funnel | None | Low |
| 6 | Branch Performance Breakdown | None | Low |
| 7 | Rating Trend | None | Low |
| 8 | Business Health Score Card | None | Low |

---

## What Would Need a Schema Addition

| Future Idea | What's Missing |
|---|---|
| "Customer visited today" foot traffic | A `check_ins` or event log table |
| Product browse popularity | An `events` table (view, click events per product) |
| Revenue per coupon | A `purchase_amount` column on redemptions |
| Push re-engagement campaigns | A `campaigns` or `notifications` table |
| Coupon → revenue attribution | Link redemptions to an actual transaction record |

---

## Key DB Queries to Build Against

### Retention Triangle
```sql
WITH monthly_redeemers AS (
  SELECT DISTINCT user_id, DATE_TRUNC('month', redeemed_at) AS month
  FROM coupon_redemptions
  WHERE coupon_id IN (SELECT id FROM coupons WHERE business_id = $1)
)
SELECT
  curr.month,
  COUNT(DISTINCT curr.user_id) FILTER (WHERE prev.user_id IS NULL) AS new_customers,
  COUNT(DISTINCT curr.user_id) FILTER (WHERE prev.user_id IS NOT NULL) AS returning_customers,
  COUNT(DISTINCT prev.user_id) FILTER (WHERE curr.user_id IS NULL) AS churned_customers
FROM monthly_redeemers curr
FULL OUTER JOIN monthly_redeemers prev
  ON curr.user_id = prev.user_id
  AND curr.month = prev.month + INTERVAL '1 month'
GROUP BY curr.month
ORDER BY curr.month DESC;
```

### Follower-to-Redeemer Conversion
```sql
SELECT
  COUNT(DISTINCT s.user_id) AS total_followers,
  COUNT(DISTINCT cr.user_id) AS ever_redeemed,
  COUNT(DISTINCT cr.user_id) FILTER (
    WHERE cr.redeemed_at > NOW() - INTERVAL '30 days'
  ) AS active_last_30_days
FROM subscriptions s
LEFT JOIN coupon_redemptions cr
  ON s.user_id = cr.user_id
  AND cr.coupon_id IN (SELECT id FROM coupons WHERE business_id = $1)
WHERE s.business_id = $1;
```

### Customer Segments (RFM)
```sql
SELECT
  user_id,
  COUNT(*) AS redemption_count,
  MAX(redeemed_at) AS last_redeemed_at,
  CASE
    WHEN COUNT(*) >= 3 AND MAX(redeemed_at) > NOW() - INTERVAL '30 days' THEN 'champion'
    WHEN COUNT(*) >= 2 AND MAX(redeemed_at) > NOW() - INTERVAL '60 days' THEN 'loyal'
    WHEN MAX(redeemed_at) BETWEEN NOW() - INTERVAL '90 days' AND NOW() - INTERVAL '60 days' THEN 'at_risk'
    WHEN MAX(redeemed_at) < NOW() - INTERVAL '90 days' THEN 'lost'
    ELSE 'new'
  END AS segment
FROM coupon_redemptions
WHERE coupon_id IN (SELECT id FROM coupons WHERE business_id = $1)
GROUP BY user_id;
```
