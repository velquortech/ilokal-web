# 🔐 RBAC (Role-Based Access Control) Model

> Last Updated: March 20, 2026  
> Status: **Implemented**  
> Focus: Multi-tenant access control with clear separation of concerns

---

## 📋 Overview

The RBAC model defines permissions for different user roles across the Ilokal platform. The key principle is **business autonomy with platform oversight** — businesses own and manage their data, while admins provide moderation and system-level management.

---

## 👥 User Roles

### **1. Super Admin (Platform Administrator)**

- **Scope:** Entire platform
- **Primary Responsibility:** Platform health, compliance, and system oversight
- **Data Ownership:** None (all data owned by businesses/users)
- **Escalation Level:** Highest

### **2. Business Owner**

- **Scope:** Their own business(es) and associated data
- **Primary Responsibility:** Manage own branches, products, coupons, and operations
- **Data Ownership:** Full ownership of business data
- **Escalation Level:** Medium

### **3. Business Admin/Manager**

- **Scope:** Delegated by business owner
- **Primary Responsibility:** Day-to-day operations management
- **Data Ownership:** Limited to delegated tasks
- **Escalation Level:** Low

### **4. App User (Consumer)**

- **Scope:** Personal account and purchased items
- **Primary Responsibility:** Browse and purchase
- **Data Ownership:** Personal profile only
- **Escalation Level:** Lowest

---

## 🔑 Permission Tiers

### **Tier 1: View/Monitor (Read-Only)**

- **Purpose:** Observation and auditing without modification
- **Risk Level:** 🟢 Low
- **Requires Logging:** No
- **Examples:**
  - View all branches across platform
  - Monitor product listings
  - Review coupon activity
  - Access analytics dashboard

**Super Admin can:**

```tsx
✅ View all branches globally
✅ View all products (across all businesses)
✅ View all coupons and deals
✅ View analytics and reports
✅ Audit user activity logs
```

---

### **Tier 2: Moderate (Limited Write)**

- **Purpose:** Content and policy enforcement without business data ownership
- **Risk Level:** 🟡 Medium
- **Requires Logging:** Yes (audit trail)
- **Examples:**
  - Suspend inappropriate content
  - Flag harmful products
  - Remove policy-violating deals
  - Temporarily disable branches

**Super Admin can:**

```tsx
✅ Flag/mark products as inappropriate
✅ Suspend/freeze branches
✅ Remove policy-violating coupons
✅ Suspend business accounts
✅ Approve/reject business registration
✅ Lock user accounts (security)
❌ Permanently delete business data
❌ Modify business operational data
```

**Audit Logging Required:**

```json
{
  "action": "suspend_product",
  "admin_id": "admin_123",
  "target_product_id": "prod_456",
  "reason": "Violates content policy",
  "timestamp": "2026-03-20T10:30:00Z",
  "reversible": true
}
```

---

### **Tier 3: Override (Full Write)**

- **Purpose:** Emergency intervention and critical platform issues
- **Risk Level:** 🔴 High
- **Requires Logging:** YES (with mandatory reason)
- **Requires Approval:** YES (for sensitive operations)
- **Examples:**
  - Data recovery/restoration
  - Security incident response
  - Critical bug fixes affecting data

**Super Admin can (with strict controls):**

```tsx
⚠️ Edit product details (emergency only)
⚠️ Edit coupon terms (emergency only)
⚠️ Delete compromised data (with approval)
⚠️ Restore archived data

❌ Change business ownership
❌ Access business financial data they don't oversee
❌ Modify user passwords (without security reason)
```

**Mandatory Audit Logging:**

```json
{
  "action": "override_product_edit",
  "admin_id": "admin_123",
  "target_product_id": "prod_456",
  "reason": "Data corruption detected in product listing",
  "changes": { "title": "Old → New" },
  "timestamp": "2026-03-20T10:30:00Z",
  "approval_by": "senior_admin_789",
  "reversible": true
}
```

---

### **Tier 4: System-Level**

- **Purpose:** Platform-wide operations only
- **Risk Level:** 🟡 Medium
- **Requires Logging:** Yes

**Super Admin can:**

```tsx
✅ Create platform-wide featured deals
✅ Create system-wide promotional coupons
✅ Manage platform configuration
✅ Run background jobs/migrations
✅ Access system analytics
✅ Manage admin accounts
✅ Configure payment gateways
```

---

## 📊 Permission Matrix

| Action                         | Business Owner | Admin      | Super Admin | App User |
| ------------------------------ | -------------- | ---------- | ----------- | -------- |
| **View own business data**     | ✅             | ✅\*       | —           | —        |
| **Edit own business data**     | ✅             | ✅\*       | ❌          | —        |
| **View other businesses**      | ❌             | ❌         | ✅ (read)   | ❌       |
| **Manage own products**        | ✅             | ✅\*       | ❌          | —        |
| **Manage own coupons**         | ✅             | ✅\*       | ❌          | —        |
| **Manage own branches**        | ✅             | ✅\*       | ❌          | —        |
| **Flag inappropriate content** | ❌             | ⚠️\*       | ✅          | ❌       |
| **Moderate all products**      | ❌             | ❌         | ✅          | ❌       |
| **Suspend business account**   | ❌             | ❌         | ✅          | ❌       |
| **Create platform deals**      | ❌             | ❌         | ✅          | ❌       |
| **View analytics**             | ✅ (own)       | ✅\* (own) | ✅ (all)    | ❌       |
| **Access audit logs**          | ❌             | ❌         | ✅          | ❌       |
| **Manage admins**              | ❌             | ❌         | ✅          | ❌       |

\*Delegated permission (business owner approves)

---

## 🗂️ Data Ownership Model

### **Business Owner Owns:**

- Products → Only they can CRUD
- Branches → Only they can CRUD
- Business Coupons/Deals → Only they can CRUD
- Employee/Staff → Only they can manage
- Business Analytics → Only they can view

### **Super Admin Oversees (No Direct Ownership):**

- Platform Health
- Content Moderation
- Policy Enforcement
- System Operations
- User Account Security

### **Platform Owns (Admin Manages):**

- Platform-wide featured deals
- System promotions
- Global configurations
- Admin accounts

---

## 🚨 Important Principles

### **1. Principle of Least Privilege**

```
Super admin should have MINIMUM permissions needed for platform oversight.
If a business can do it themselves, they should.
```

### **2. Immutable Audit Trail**

```
Every privileged action must be logged:
- WHO did it
- WHAT they changed
- WHEN it happened
- WHY (reason/justification)
- BY WHOM (if approved)
```

### **3. Reversibility**

```
Moderation actions should be reversible:
✅ Suspend → Can unsuspend
✅ Flag → Can unflag
❌ Delete → Should archive, not delete
```

### **4. Separation of Duties**

```
Critical actions require approval:
- Deleting business data
- Changing ownership
- High-value override actions
```

---

## 🔧 Implementation Examples

### **Super Admin Viewing Products (Tier 1: Monitor)**

```tsx
// Safe - read only, no logging needed
const allProducts = await supabase
  .from('products')
  .select('id, title, business_id, status')
  .neq('status', 'archived');

// Can filter, search, but NOT edit
```

### **Super Admin Flagging a Product (Tier 2: Moderate)**

```tsx
// Requires audit logging
async function flagProduct(productId: string, reason: string) {
  // Mark product as flagged
  await supabase
    .from('products')
    .update({ flagged: true, flag_reason: reason })
    .eq('id', productId);

  // Log the action (immutable)
  await supabase.from('audit_logs').insert({
    action: 'flag_product',
    admin_id: session.user.id,
    target_id: productId,
    reason,
    timestamp: new Date(),
  });
}
```

### **Super Admin Overriding Product Edit (Tier 3: Override)**

```tsx
// Requires approval workflow
async function overrideProductEdit(
  productId: string,
  changes: Partial<Product>,
  reason: string,
) {
  // Check if approval is needed
  if (requiresApproval(reason)) {
    // Create approval ticket
    const ticket = await createApprovalTicket({
      type: 'override_edit',
      product_id: productId,
      proposed_changes: changes,
      reason,
      requested_by: session.user.id,
    });

    return { status: 'pending_approval', ticket_id: ticket.id };
  }

  // Apply changes
  await supabase.from('products').update(changes).eq('id', productId);

  // Mandatory audit log with approval
  await supabase.from('audit_logs').insert({
    action: 'override_product_edit',
    admin_id: session.user.id,
    target_id: productId,
    changes,
    reason,
    approval_required: true,
    timestamp: new Date(),
  });
}
```

### **Business Owner Managing Own Products (Full CRUD)**

```tsx
// Full control - no admin oversight needed
async function updateOwnProduct(productId: string, changes: Partial<Product>) {
  // Verify ownership
  const product = await supabase
    .from('products')
    .select('business_id')
    .eq('id', productId)
    .single();

  if (product.business_id !== session.user.business_id) {
    throw new Error('Unauthorized');
  }

  // Update freely
  return await supabase.from('products').update(changes).eq('id', productId);
}
```

---

## 📱 Super Admin Interface Structure

### **Dashboard Sections**

#### **1. Monitoring (Tier 1)**

- Platform analytics
- Business activity feed
- Transaction logs
- User growth metrics

#### **2. Content Moderation (Tier 2)**

- Review flagged products
- Suspend inappropriate branches
- Remove policy-violating coupons
- Manage business verification status

#### **3. System Management (Tier 4)**

- Create platform-wide deals
- Configure system settings
- Manage payment gateways
- View audit logs

#### **NOT Present:**

- ❌ "Edit Product" button (business owns)
- ❌ "Manage Business Coupons" (business owns)
- ❌ "Create Product" (only businesses create)

---

## 🚀 Implementation Checklist

- [ ] Define audit log schema
- [ ] Implement permission checking middleware
- [ ] Create approval workflow system
- [ ] Add audit logging to all moderation actions
- [ ] Implement reversible operations (soft delete)
- [ ] Create admin dashboard with proper scopes
- [ ] Add admin activity monitoring
- [ ] Implement rate limiting on privileged actions
- [ ] Create admin action reports
- [ ] Set up alerts for unusual admin activity

---

## 📖 Related Documentation

- **Authentication:** See [AUTHENTICATION.md](AUTHENTICATION.md)
- **API Security:** See [SECURITY.md](SECURITY.md)
- **Backend Workflow:** See [claude.md](claude.md)

---

## 🔍 Audit Logging Reference

All moderation and override actions must log to `audit_logs`:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR NOT NULL,
  admin_id UUID NOT NULL REFERENCES auth.users,
  target_type VARCHAR (product, business, coupon, user, etc),
  target_id UUID,
  changes JSONB,
  reason TEXT,
  approval_required BOOLEAN,
  approved_by UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

---

## ✅ Summary

| Tier            | Access Level   | Super Admin        | Business Owner  | Logging             |
| --------------- | -------------- | ------------------ | --------------- | ------------------- |
| **1: Monitor**  | Read-only      | ✅ All data        | ✅ Own data     | Optional            |
| **2: Moderate** | Limited write  | ✅ Flag/suspend    | ✅ Delegated    | Required            |
| **3: Override** | Full write     | ⚠️ Emergency only  | ❌ None         | Required + Approval |
| **4: System**   | Platform-level | ✅ Auto + features | ❌ Own features | Required            |

**Key Principle:** Business autonomy with admin oversight.
