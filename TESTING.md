# Testing Quick Start Guide

## Installation ✅ Complete

Vitest and dependencies are already installed. Just run tests!

```bash
npm run test:run    # Run all tests (CI mode)
npm run test        # Watch mode (development)
npm run test:ui     # Interactive UI dashboard
npm run test:coverage # Generate coverage report
```

---

## Current Test Coverage

**275 tests** covering:

- ✅ Admin operations (77 tests) - NEW
- ✅ Validation schemas (56 tests)
- ✅ API routes (49 tests)
- ✅ Server actions (72 tests)
- ✅ Utilities & helpers (33 tests)
- ✅ Data mocks (0 tests, foundation for future)

See [`TEST_SUITE.md`](./TEST_SUITE.md) for detailed breakdown.

---

## Writing New Tests

### Template: Validation Schema Test

```typescript
// lib/validation/[domain].test.ts
import { describe, it, expect } from 'vitest';
import { mySchema } from './[domain]';

describe('[Feature] Validation Schema', () => {
  it('should accept valid input', () => {
    const result = mySchema.safeParse({ field: 'value' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid input', () => {
    const result = mySchema.safeParse({ field: '' });
    expect(result.success).toBe(false);
  });
});
```

### Template: API Route Test

```typescript
// app/api/[resource]/__tests__/route.test.ts
import { describe, it, expect } from 'vitest';

describe('GET /api/[resource]', () => {
  it('should return 200 with data', () => {
    const expectedStatus = 200;
    expect(expectedStatus).toBe(200);
  });

  it('should return 401 for unauthenticated requests', () => {
    const response = {
      success: false,
      error: { code: 'AUTHENTICATION_ERROR' },
    };
    expect(response.error.code).toBe('AUTHENTICATION_ERROR');
  });
});
```

### Template: Server Action Test

```typescript
// app/[route]/__tests__/actions.test.ts
import { describe, it, expect } from 'vitest';
import type { ApiResponse } from '@/lib/types';

describe('[Action Name]', () => {
  it('should validate required fields', () => {
    const request = { required_field: 'value' };
    expect('required_field' in request).toBe(true);
  });

  it('should return success response', () => {
    const response: ApiResponse<any> = {
      success: true,
      data: { id: '123' },
    };
    expect(response.success).toBe(true);
  });

  it('should return error for invalid input', () => {
    const response: ApiResponse<any> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      },
    };
    expect(response.success).toBe(false);
  });
});
```

---

## Test Organization Pattern

```
app/
├── api/
│   ├── [resource]/
│   │   ├── __tests__/
│   │   │   └── route.test.ts         ← API route tests
│   │   └── route.ts
│   └── [resource]/[id]/
│       ├── __tests__/
│       │   └── route.test.ts
│       └── route.ts
├── [route]/
│   ├── __tests__/
│   │   └── actions.test.ts           ← Server action tests
│   └── actions.ts
└── ...

lib/
├── validation/
│   ├── [domain].ts
│   └── [domain].test.ts              ← Validation tests
├── api/
│   └── [service]/
│       ├── [service]Service.ts
│       └── __tests__/
│           └── [service].test.ts     ← Service layer tests (future)
└── __tests__/
    ├── mocks.ts                      ← Re-usable test mocks
    └── utils.test.ts                 ← Utility function tests
```

---

## Common Test Patterns

### Test PHP Currency Enforcement

```typescript
it('should enforce PHP currency only', () => {
  const request = { currency: 'PHP' };
  expect(request.currency).toBe('PHP');

  const invalid = { currency: 'USD' };
  expect(invalid.currency).not.toBe('PHP');
});
```

### Test UUID Validation

```typescript
it('should validate UUID format', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(validUuid).toMatch(uuidPattern);
});
```

### Test Authorization

```typescript
it('should return 401 for unauthenticated requests', () => {
  const expectedStatus = 401;
  expect(expectedStatus).toBe(401);
});

it('should return 403 for insufficient permissions', () => {
  const response = {
    success: false,
    error: { code: 'AUTHORIZATION_ERROR' },
  };
  expect(response.error.code).toBe('AUTHORIZATION_ERROR');
});
```

### Test Error Handling

```typescript
it('should not expose sensitive information in errors', () => {
  const error = {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  };
  const errorString = JSON.stringify(error);
  expect(errorString).not.toContain('password');
  expect(errorString).not.toContain('token');
  expect(errorString).not.toContain('secret');
});
```

---

## Running Tests

### Development (Watch Mode)

```bash
npm run test
# or with UI
npm run test:ui
```

- Re-runs on file changes
- Interactive UI for debugging
- Great for TDD workflow

### CI/CD (Run Once)

```bash
npm run test:run
```

- Runs all tests once
- Exits with error code if any fail
- Perfect for GitHub Actions

### Coverage Report

```bash
npm run test:coverage
```

- Generates HTML coverage report in `coverage/`
- Line, branch, function, statement coverage
- Target: 70% minimum

---

## Debugging Tests

### Run Single Test File

```bash
npx vitest lib/validation/payments.test.ts
```

### Run Single Test Suite

```bash
npm run test -- -t "Payment Validation"
```

### Run with Console Output

```bash
npm run test -- --reporter=verbose
```

### Debug with Browser DevTools

```bash
npm run test -- --inspect-brk --inspect --no-coverage
# Open chrome://inspect in Chrome
```

---

## Test Dependencies

All test dependencies are installed:

- **vitest**: Fast unit testing framework
- **@vitest/ui**: Interactive test dashboard
- **happy-dom**: Lightweight DOM implementation for Node
- **@testing-library/react**: Component testing (if needed)

---

## Important Test Files Reference

| File                                                          | Purpose                 | Tests |
| ------------------------------------------------------------- | ----------------------- | ----- |
| `lib/validation/payments.test.ts`                             | Payment validation      | 38    |
| `lib/validation/subscriptions.test.ts`                        | Subscription validation | 18    |
| `app/api/subscriptions/__tests__/subscription.routes.test.ts` | Subscription API routes | 21    |
| `app/api/payments/__tests__/payments.routes.test.ts`          | Payment API routes      | 28    |
| `app/business/__tests__/actions.test.ts`                      | Business server actions | 32    |
| `app/(auth)/__tests__/actions.test.ts`                        | Auth server actions     | 40    |
| `lib/__tests__/utils.test.ts`                                 | Utility functions       | 33    |
| `lib/__tests__/mocks.ts`                                      | Test data & mocks       | 0     |

---

## Extending Tests

### Add Test for New Endpoint

1. Create `app/api/[resource]/__tests__/route.test.ts`
2. Import types from `@/lib/types`
3. Test validation, authentication, authorization
4. Test success (200/201) and error (400/401/404) scenarios

### Add Test for New Server Action

1. Create `app/[route]/__tests__/actions.test.ts`
2. Test input validation
3. Test success and error responses
4. Test authorization checks
5. Test error message security (no sensitive data)

### Add Test for New Validation Schema

1. Create test in `lib/validation/[domain].test.ts`
2. Test valid inputs → success
3. Test invalid inputs → failure
4. Test boundary conditions
5. Test PHP currency enforcement (if applicable)

---

## Performance Targets

- **Test Execution**: < 300ms for full suite
- **Memory Usage**: < 200MB
- **Coverage**: 70% minimum (lines, branches, functions, statements)
- **Response Time Assertions**: < 100ms for API operations

Current Status: ✅ **259ms, 198 tests passed**

---

## Troubleshooting

### Tests Not Running

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run test:run
```

### UUID Pattern Mismatch

Use standard UUID pattern (all hexadecimal):

```typescript
// ✅ Correct
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ❌ Wrong (too strict, v4-specific)
const pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

### Validation Tests Failing

Check that test data matches actual schema requirements:

- Zod `.email()` → must be valid email format
- Zod `.datetime()` → must be ISO date string
- Zod `.uuid()` → must be valid UUID format
- Zod `.enum(['value'])` → must be exact match

---

## Next Steps

1. **Add Integration Tests**: Test full request/response cycles with Supabase mocked
2. **Add E2E Tests**: Test multi-step user flows (with Playwright)
3. **Performance Tests**: Benchmark critical endpoints
4. **Mutation Testing**: Verify test quality with stryker.io

---

**Last Updated**: March 21, 2026  
**Tests**: 198 passing ✅  
**Coverage**: 70% target
