# Quick Reference: Untested Routes & Actions Matrix

**Use this to quickly find what needs testing and understand dependencies.**

---

## 🔴 CRITICAL - START HERE (20 items, ~20 hours)

### Auth Routes - SECURITY CRITICAL

```
PUT /api/auth/login
├─ Service: authService
├─ Wrappers: None
├─ Tests needed: HTTP handler, validation, error transformation
├─ Test file: app/api/auth/__tests__/auth.integration.test.ts
├─ Est. effort: 3-4h
└─ Status: 🔴 PRIORITY #1

PUT /api/auth/signup
├─ Service: authService
├─ Wrappers: None
├─ Tests needed: HTTP handler, validation, error transformation
├─ Status: 🔴 PRIORITY #1

POST /api/auth/verify-email
├─ Service: authService
├─ Wrappers: None
├─ Tests needed: Token verification, error cases
├─ Status: 🔴 PRIORITY #1

POST /api/auth/reset-password
├─ Service: authService
├─ Wrappers: None
├─ Tests needed: Email validation, token handling
├─ Status: 🔴 PRIORITY #1

POST /api/auth/refresh-token
├─ Service: authService
├─ Wrappers: None
├─ Status: 🔴 PRIORITY #1

POST /api/auth/logout
├─ Service: None
├─ Wrappers: None
├─ Status: 🔴 PRIORITY #1
```

### Business Management Admin Routes

```
GET /api/admin/businesses
├─ Service: businessService ✓ (tested)
├─ Wrappers: verifyAdminAccess ✓ (tested)
├─ Tests needed: Route-level admin auth check
├─ Test file: app/api/admin/__tests__/businesses.integration.test.ts
├─ Est. effort: 2-3h
└─ Status: 🔴 PRIORITY #2

POST /api/admin/businesses
├─ Status: 🔴 PRIORITY #2

...similar for:
- PUT /api/admin/businesses/[id]
- POST /api/admin/businesses/[id]/verify
- POST /api/admin/businesses/[id]/suspend
- POST /api/admin/businesses/[id]/reactivate
- POST /api/admin/businesses/[id]/reject
- DELETE /api/admin/businesses/[id]/delete
```

### Payment Routes - FINANCIAL CRITICAL

```
POST /api/payments/checkout
├─ Service: paymentService ✓ (tested)
├─ Wrappers: verifyBusinessOwner ✓ (tested)
├─ Tests needed: Webhook handling, error response formatting
├─ Test file: app/api/payments/__tests__/payments.integration.test.ts
├─ Est. effort: 3-4h
└─ Status: 🔴 PRIORITY #1

POST /api/payments/[id]/confirm
├─ Service: paymentService ✓ (tested)
├─ Status: 🔴 PRIORITY #1

POST /api/payments/[id]/refund
├─ Service: paymentService ✓ (tested with idempotency)
├─ Status: 🔴 PRIORITY #1
```

### Business Action Wrappers

```
businessActions.ts (admin)
├─ Functions: verifyBusiness, suspendBusiness, rejectBusiness, etc.
├─ Service: businessService ✓ (tested)
├─ Wrappers: verifyAdminAccess ✓ (tested)
├─ Tests needed: Server action error handling, auth checks
├─ Test file: app/admin/actions/__tests__/businessActions.test.ts
├─ Est. effort: 2-3h
└─ Status: 🔴 PRIORITY #2

subscriptionPlanActions.ts (admin)
├─ Service: subscriptionService ✓ (tested)
├─ Wrappers: verifyAdminAccess ✓ (tested)
├─ Status: 🔴 PRIORITY #2

billingActions.ts (business)
├─ Service: NONE
├─ Wrappers: verifyBusinessOwner ✓ (tested)
├─ Tests needed: Financial operation handling
├─ Test file: app/business/actions/__tests__/billingActions.test.ts
├─ Est. effort: 2-3h
└─ Status: 🔴 PRIORITY #3
```

---

## 🟡 HIGH - SCHEDULE NEXT (21 items, ~10 hours)

### Admin Moderation Routes

```
GET /api/admin/moderation/reports
├─ Service: moderationService ✓ (tested)
├─ Wrappers: verifyAdminAccess ✓ (tested)
├─ Tests needed: Route-level tests for admin ops
├─ Test file: app/api/admin/__tests__/moderation.integration.test.ts
├─ Est. effort: 1-2h
└─ Status: 🟡 MEDIUM PRIORITY

...similar for:
- POST /api/admin/moderation/report
- GET /api/admin/moderation/flagged
- PUT /api/admin/moderation/[id]/status
- POST /api/admin/moderation/[id]/suspend
- POST /api/admin/moderation/[id]/warn
```

### Subscription Routes - BILLING IMPACT

```
POST /api/subscriptions/upgrade
├─ Service: subscriptionService ✓ (tested)
├─ Wrappers: verifyBusinessOwner ✓ (tested)
├─ Tests needed: Route-level billing checks
├─ Test file: app/api/subscriptions/__tests__/subscriptions.integration.test.ts
├─ Est. effort: 1-2h
└─ Status: 🟡 MEDIUM PRIORITY

POST /api/subscriptions/downgrade
├─ Status: 🟡 MEDIUM PRIORITY

GET /api/admin/subscriptions/plans
├─ Status: 🟡 MEDIUM PRIORITY

POST /api/admin/subscriptions/plans
├─ Status: 🟡 MEDIUM PRIORITY
```

### Server Action Wrappers - ERROR HANDLING

```
reviewActions.ts (auth)
├─ Service: reviewService ✓ (tested)
├─ Wrappers: verifyUser ✓ (tested)
├─ Tests needed: Server action wrapper tests
├─ Test file: app/(auth)/actions/__tests__/reviewActions.test.ts
├─ Est. effort: 1-2h
└─ Status: 🟡 MEDIUM PRIORITY

branchActions.ts (business)
├─ Service: branchService ✓ (tested)
├─ Tests needed: Business action wrapper tests
├─ Est. effort: 1h
└─ Status: 🟡 MEDIUM PRIORITY

couponActions.ts (business)
├─ Service: couponService ✓ (tested)
├─ Est. effort: 1h
└─ Status: 🟡 MEDIUM PRIORITY

productActions.ts (business)
├─ Service: productService ✓ (tested)
├─ Est. effort: 1h
└─ Status: 🟡 MEDIUM PRIORITY

subscriptionActions.ts (business)
├─ Service: subscriptionService ✓ (tested)
├─ Est. effort: 1h
└─ Status: 🟡 MEDIUM PRIORITY
```

### Upload Routes - FILE HANDLING

```
POST /api/upload/avatar
├─ Service: NONE
├─ Wrappers: getCurrentUser ✓ (tested)
├─ Tests needed: File upload validation, error handling
├─ Test file: app/api/upload/__tests__/upload.integration.test.ts
├─ Est. effort: 2-3h
└─ Status: 🟡 MEDIUM PRIORITY

...similar for:
- POST /api/upload/business-logo
- POST /api/upload/business-interior
- POST /api/upload/verification-docs
- DELETE /api/upload/[bucket]/[id]
```

---

## 🟢 LOW - SCHEDULE LATER (25 items, ~5 hours)

### Admin Analytics Routes (read-only, backend)

```
GET /api/admin/analytics/businesses
├─ Service: analyticsQuery ✓ (tested)
├─ Status: 🟢 LOW PRIORITY - read-only

GET /api/admin/analytics/users
├─ Status: 🟢 LOW PRIORITY

GET /api/admin/analytics/revenue
├─ Status: 🟢 LOW PRIORITY

GET /api/admin/analytics/platform
├─ Status: 🟢 LOW PRIORITY
```

### Admin Profile Routes (backend)

```
GET /api/admin/profiles
├─ Service: NONE (likely list users)
├─ Status: 🟢 LOW PRIORITY - admin only

GET /api/admin/profiles/[id]
├─ Status: 🟢 LOW PRIORITY

DELETE /api/admin/profiles/[id]/delete
├─ Status: 🟢 LOW PRIORITY
```

### Business Analytics Routes (read-only)

```
GET /api/analytics/dashboard
├─ Service: businessAnalytics ✓ (tested)
├─ Status: 🟢 LOW PRIORITY - read-only

GET /api/analytics/traffic
├─ Status: 🟢 LOW PRIORITY

GET /api/analytics/revenue
├─ Status: 🟢 LOW PRIORITY

GET /api/analytics/products
├─ Status: 🟢 LOW PRIORITY

GET /api/analytics/coupons
├─ Status: 🟢 LOW PRIORITY
```

### Utility Routes (non-critical)

```
GET /api/categories
├─ Service: NONE
├─ Status: 🟢 LOW PRIORITY - non-critical data

GET /api/businesses/[id]/verification-status
├─ Status: 🟢 LOW PRIORITY

GET /api/featured-deals
├─ Status: 🟢 LOW PRIORITY

POST /api/featured-deals
├─ Status: 🟢 LOW PRIORITY

GET /api/invoices
├─ Status: 🟢 LOW PRIORITY

GET /api/invoices/[id]
├─ Status: 🟢 LOW PRIORITY

POST /api/invoices/[id]/send
├─ Status: 🟢 LOW PRIORITY

GET /api/trending
├─ Service: trendingService ✓ (tested)
├─ Status: 🟢 (Actually covered)

GET /api/search/deals
├─ Service: NONE (uncovered edge case)
├─ Status: 🟢 LOW PRIORITY
```

### Server Action - Non-critical

```
categoryActions.ts (admin)
├─ Service: NONE
├─ Functions: createCategory, updateCategory, deleteCategory
├─ Status: 🟢 LOW PRIORITY - non-critical data
```

---

## 📋 COPY & PASTE TEST TEMPLATES

### Template: Server Action Test

```typescript
// app/[area]/actions/__tests__/[actionName].test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as actions from '../[actionName]';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/[service]');

describe('[actionName]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create[Item]Action', () => {
    it('should create item successfully', async () => {
      // Arrange
      const input = { /* valid data */ };

      // Act
      const result = await actions.create[Item]Action(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });

    it('should reject unauthorized users', async () => {
      // Arrange
      const input = { /* valid data */ };
      vi.mocked(verifyBusinessOwner).mockResolvedValue({
        authorized: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authorized' }
      });

      // Act
      const result = await actions.create[Item]Action(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });

    it('should return validation errors', async () => {
      // Arrange
      const input = { /* invalid data */ };

      // Act
      const result = await actions.create[Item]Action(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('update[Item]Action', () => {
    // Similar tests for update
  });

  describe('delete[Item]Action', () => {
    // Similar tests for delete
  });
});
```

### Template: Route Integration Test

```typescript
// app/api/[route]/__tests__/[route].integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

vi.mock('@/supabase/server');
vi.mock('@/lib/api/[service]');

describe('POST /api/[route]', () => {
  it('should return 200 with valid input', async () => {
    // Arrange
    const request = new NextRequest(
      new URL('http://localhost:3000/api/[route]'),
      {
        method: 'POST',
        body: JSON.stringify({
          /* valid data */
        }),
      },
    );

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('should return 400 with invalid input', async () => {
    // Arrange
    const request = new NextRequest(
      new URL('http://localhost:3000/api/[route]'),
      {
        method: 'POST',
        body: JSON.stringify({
          /* invalid data */
        }),
      },
    );

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('should return 401 if unauthorized', async () => {
    // Arrange - mock unauthorized state
    // Act & Assert
    // Test authorization
  });

  it('should return 500 on server error', async () => {
    // Arrange - mock service error
    // Act & Assert
    // Test error handling
  });
});
```

---

## 🚀 EXECUTION CHECKLIST

### Week 1: Critical Auth & Payments

- [ ] Create `app/api/auth/__tests__/auth.integration.test.ts`
  - [ ] Test login endpoint
  - [ ] Test signup endpoint
  - [ ] Test email verification
  - [ ] Test password reset
  - [ ] Run: `npm run test -- auth.integration`

- [ ] Create `app/api/payments/__tests__/payments.integration.test.ts`
  - [ ] Test checkout
  - [ ] Test confirm
  - [ ] Test refund
  - [ ] Run: `npm run test -- payments.integration`

- [ ] Create `app/admin/actions/__tests__/businessActions.test.ts`
  - [ ] Test business verify
  - [ ] Test business suspend
  - [ ] Test business reject
  - [ ] Run: `npm run test -- businessActions`

### Week 2: Admin & Business Ops

- [ ] Create `app/api/admin/__tests__/businesses.integration.test.ts`
- [ ] Create `app/admin/actions/__tests__/subscriptionPlanActions.test.ts`
- [ ] Create `app/business/actions/__tests__/billingActions.test.ts`
- [ ] Run: `npm run test:coverage` to verify progress

### Week 3: Moderation & Subscriptions

- [ ] Create `app/api/admin/__tests__/moderation.integration.test.ts`
- [ ] Create `app/api/subscriptions/__tests__/subscriptions.integration.test.ts`
- [ ] Create server action tests for remaining 5 actions
- [ ] Run: `npm run test -- admin` and `npm run test -- business`

### Week 4+: Cleanup & Enhancement

- [ ] Create `app/api/upload/__tests__/upload.integration.test.ts`
- [ ] Create utility route tests
- [ ] Run full `npm run test:coverage`
- [ ] Document patterns in WORKFLOW

---

## 📊 TRACK YOUR PROGRESS

Copy this to your project notes:

```
TEST CREATION PROGRESS TRACKER

Priority 1: Critical (16 items, ~15h)
  Auth Routes:           [ ] [ ] [ ] [ ] [ ] [ ]   0/6
  Admin Business:        [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]   0/8
  Payments:              [ ] [ ] [ ]   0/3
  Business Actions:      [ ] [ ] [ ]   0/3

Priority 2: High (18 items, ~8h)
  Admin Routes:          [ ] [ ] [ ] [ ] [ ] [ ]   0/6
  Server Actions:        [ ] [ ] [ ] [ ] [ ]   0/5
  Upload Routes:         [ ] [ ] [ ] [ ] [ ]   0/5
  Subscriptions:         [ ] [ ]   0/2

Priority 3: Medium (25 items, ~5h)
  Analytics:             [ ] [ ] [ ] [ ] [ ]   0/5
  Utilities:             [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]   0/8
  Other:                 [ ] [ ] [ ] [ ] [ ]   0/12

Total: 59 items / ~28 hours
Completed: ____ (0%)
Target: 90%+ coverage
```

---

**Last Updated:** April 2, 2026  
**Status:** Complete audit, ready for implementation  
**Next:** Choose Priority 1 items and start week 1
