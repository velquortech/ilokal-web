# Real Component Usage Examples

This document shows actual patterns used throughout the codebase. Copy and adapt these examples for your own features.

---

## 1. Query Data in a Hook (Client-Safe Service)

### ✅ Pattern: `useProfilesByRole` Hook

**File**: `hooks/useProfiles.ts`

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { userService } from '@/lib/services';
import { UserRole, Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/services';

interface UseProfilesByRoleOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
  searchQuery?: string;
}

interface UseProfilesByRoleResult {
  data?: PaginatedResponse<Profile>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProfilesByRole(
  role: UserRole,
  options: UseProfilesByRoleOptions = {},
): UseProfilesByRoleResult {
  const { page = 1, limit = 10, enabled = true, searchQuery = '' } = options;

  const [data, setData] = useState<PaginatedResponse<Profile>>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoized fetch to prevent infinite loops
  const fetchProfiles = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await userService.getProfilesByRolePaginated(
        role,
        page,
        limit,
        { searchQuery },
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [role, page, limit, enabled, searchQuery]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { data, isLoading, error, refetch: fetchProfiles };
}
```

### ✅ Usage in Component

```typescript
'use client';

import { useProfilesByRole } from '@/hooks/useProfiles';

export function UserListComponent() {
  const { data, isLoading, error } = useProfilesByRole('seller', {
    page: 1,
    limit: 20,
    searchQuery: 'john',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.map((profile) => (
        <div key={profile.id}>{profile.full_name}</div>
      ))}
      <div>Page {data?.pagination.currentPage} of {data?.pagination.totalPages}</div>
    </div>
  );
}
```

---

## 2. Make Untyped API Calls (Generic HTTP Service)

### ✅ Pattern: Using `http` for Custom Endpoints

**Raw `http` service supports**: `get`, `post`, `put`, `del`, `patch`

```typescript
'use client';

import { http } from '@/lib/services';
import { useEffect, useState } from 'react';

interface DealData {
  id: string;
  title: string;
  discount: number;
}

export function FeaturedDeals() {
  const [deals, setDeals] = useState<DealData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // GET request
        const data = await http.get<DealData[]>('/deals/featured');
        setDeals(data);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      {isLoading ? 'Loading...' : deals.map((deal) => (
        <div key={deal.id}>{deal.title} - {deal.discount}%</div>
      ))}
    </div>
  );
}
```

### ✅ POST Request with Body

```typescript
'use client';

import { http } from '@/lib/services';
import { useState } from 'react';

export function CreateReviewForm() {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // POST request
      const response = await http.post('/reviews', {
        entityId: 'product-123',
        rating,
        comment,
        entityType: 'product',
      });

      console.log('Review created:', response);
      // Reset form or show success
    } catch (error) {
      console.error('Failed to create review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Your review..."
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
```

### ✅ DELETE Request

```typescript
async function deleteItem(id: string) {
  try {
    await http.del(`/items/${id}`);
    console.log('Item deleted');
  } catch (error) {
    console.error('Failed to delete:', error);
  }
}
```

---

## 3. Server Action with Protected Service

### ✅ Pattern: Authorization Check with Server Service

**File**: `app/admin/actions.ts` (Server-only code)

```typescript
// This is a Server Action - runs only on the server
'use server';

import { auth } from '@clerk/nextjs/server';
import authService from '@/lib/services/authService';
import paymentService from '@/lib/services/paymentService';

// Only the server can import these!
// They would fail Turbopack check in browser code

export async function confirmPayment(paymentId: string) {
  // Get current user
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  // Check user permissions
  const user = await authService.validateAdminAccess(userId);
  if (!user.isAdmin) {
    throw new Error('Not authorized');
  }

  // Confirm payment (server-only operation)
  const result = await paymentService.confirmPayment(paymentId);
  return result;
}
```

### ✅ Call from Client Component

```typescript
'use client';

import { confirmPayment } from '@/app/admin/actions';
import { useState } from 'react';

export function PaymentConfirmButton({ paymentId }: { paymentId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      // This transitions to the server, runs authService & paymentService securely
      const result = await confirmPayment(paymentId);
      console.log('Payment confirmed:', result);
    } catch (error) {
      console.error('Failed to confirm:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleConfirm} disabled={isLoading}>
      {isLoading ? 'Confirming...' : 'Confirm Payment'}
    </button>
  );
}
```

---

## 4. API Route for Browser-to-Server Communication

### ✅ Pattern: API Route Using Server Services

**File**: `app/api/deals/featured/route.ts` (Server-only)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import dealService from '@/lib/services/dealService';

export async function GET(request: NextRequest) {
  try {
    // Server-only service import
    const deals = await dealService.getFeaturedDeals();
    return NextResponse.json(deals);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // This uses server services securely
    const deal = await dealService.createDeal(body);
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 400 },
    );
  }
}
```

### ✅ Call from Client Component

```typescript
'use client';

import { http } from '@/lib/services';
import { useEffect, useState } from 'react';

export function FeaturedDealsWidget() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    (async () => {
      // This makes a request to the API route above
      const data = await http.get<Deal[]>('/deals/featured');
      setDeals(data);
    })();
  }, []);

  return <div>{/* render deals */}</div>;
}
```

---

## 5. Isomorphic Wrapper Pattern

### ✅ Pattern: Server Fast-Path + Browser Fallback

**File**: `lib/services/public/exampleWrapper.ts`

```typescript
import { http } from '../client';

export interface ExampleInput {
  id: string;
  data: unknown;
}

export interface ExampleOutput {
  success: boolean;
  result: unknown;
}

/**
 * Isomorphic wrapper: Fast server path, browser HTTP fallback.
 * Can be used from browser AND server safely.
 */
export const exampleWrapper = {
  async processSomething(input: ExampleInput): Promise<ExampleOutput> {
    // ✅ Server: Fast import, no HTTP round-trip
    if (typeof window === 'undefined') {
      try {
        const serverService = await import('@/lib/services/exampleService');
        return serverService.default.processSomething(input);
      } catch {
        // Fallback to HTTP if import fails
      }
    }

    // ✅ Browser OR server fallback: HTTP request
    return http.post<ExampleOutput>('/api/example/process', input);
  },
};
```

### ✅ Use from Anywhere

```typescript
// In browser OR server - works both places!
import { exampleWrapper } from '@/lib/services/public/exampleWrapper';

const result = await exampleWrapper.processSomething({ id: '123', data: {} });
```

---

## 6. Type Safety with Generics

### ✅ Pattern: Typed Service Methods

```typescript
// Define your types
interface Product {
  id: string;
  name: string;
  price: number;
}

interface GetProductsParams {
  limit?: number;
  offset?: number;
}

// Typed service method
const productService = {
  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    return http.get<Product[]>(`/products?${query}`);
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      return await http.get<Product>(`/products/${id}`);
    } catch (error) {
      console.error(`Product ${id} not found`);
      return null;
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return http.put<Product>(`/products/${id}`, updates);
  },
};
```

### ✅ Use with Type Checking

```typescript
'use client';

import { useEffect, useState } from 'react';

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      // Type-safe! TypeScript knows this returns Product | null
      const prod = await productService.getProductById(productId);
      setProduct(prod);
    })();
  }, [productId]);

  return product ? (
    <div>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
    </div>
  ) : (
    <div>Product not found</div>
  );
}
```

---

## 7. Error Handling Patterns

### ✅ Pattern: Comprehensive Error Handling

```typescript
'use client';

import { http } from '@/lib/services';
import { useState } from 'react';

interface ApiError {
  status?: number;
  message: string;
  data?: unknown;
}

async function fetchWithErrorHandling<T>(
  path: string,
  options?: { retry?: number },
): Promise<T> {
  let lastError: ApiError | null = null;
  const retries = options?.retry ?? 1;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await http.get<T>(path);
    } catch (error: unknown) {
      lastError = {
        status: (error as any)?.status,
        message: (error as any)?.message || 'Unknown error',
        data: (error as any)?.data,
      };

      // Don't retry on client errors (4xx)
      if (lastError.status && lastError.status < 500) {
        throw lastError;
      }

      // Retry on server errors (5xx)
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// Usage in component
export function DataComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<ApiError | null>(null);

  const loadData = async () => {
    try {
      const result = await fetchWithErrorHandling('/data', { retry: 3 });
      setData(result);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  return (
    <div>
      {error ? (
        <div className="error">
          Error {error.status}: {error.message}
        </div>
      ) : (
        <div>{data && JSON.stringify(data)}</div>
      )}
      <button onClick={loadData}>Load Data</button>
    </div>
  );
}
```

---

## Quick Lookup

| Scenario               | Service               | Import                               | Location                     |
| ---------------------- | --------------------- | ------------------------------------ | ---------------------------- |
| Get user list          | `userService`         | `@/lib/services`                     | Client component/hook        |
| Generic API call       | `http`                | `@/lib/services`                     | Client component/hook        |
| Get rating             | `ratingService`       | `@/lib/services`                     | Client component/hook        |
| Confirm payment        | `paymentService`      | `@/lib/services/paymentService`      | Server Action only           |
| Check auth             | `authService`         | `@/lib/services/authService`         | Server Action/API route only |
| Send notification      | `notificationService` | `@/lib/services/notificationService` | Server Action/API route only |
| Browser + server logic | `*/Wrapper`           | `@/lib/services/public/*`            | Anywhere (isomorphic)        |

---

## Related Documentation

- **Setup Guide**: [lib/services/public/README.md](./public/README.md) — How to create new wrappers
- **Architecture**: [lib/services/README.md](./README.md) — Technical deep dive
- **Quick Ref**: [lib/services/QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — One-page summary
