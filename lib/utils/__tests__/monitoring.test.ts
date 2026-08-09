import { describe, it, expect } from 'vitest';
import {
  REDACTED,
  isExpectedError,
  isRedemptionCode,
  isSensitiveKey,
  scrubEntry,
  scrubHeaders,
  scrubObject,
  scrubUrl,
} from '../monitoring';

describe('isSensitiveKey', () => {
  it('matches the obvious credential keys', () => {
    for (const key of [
      'password',
      'secret',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
      'jwt',
      'otp',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it('matches hyphenated header names, not just snake_case', () => {
    // The `[_-]` prefix group exists for exactly these.
    expect(isSensitiveKey('x-api-key')).toBe(true);
    expect(isSensitiveKey('set-cookie')).toBe(true);
    expect(isSensitiveKey('Authorization')).toBe(true);
  });

  it('matches personal data this app actually stores', () => {
    for (const key of [
      'email',
      'contact_email',
      'phone',
      'phone_number',
      'address',
      'lat',
      'lng',
      'latitude',
      'longitude',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it('leaves ordinary keys alone', () => {
    for (const key of [
      'business_id',
      'shop_name',
      'status',
      'message',
      'route',
      'digest',
    ]) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe('isRedemptionCode', () => {
  it('accepts the 6- and 7-character cashier shapes', () => {
    expect(isRedemptionCode('A3KMPQ')).toBe(true);
    expect(isRedemptionCode('A3KMPQ7')).toBe(true);
  });

  it('rejects values containing the excluded characters', () => {
    // gen_redemption_code's alphabet omits 0, 1, I, L and O.
    expect(isRedemptionCode('A3KMP0')).toBe(false);
    expect(isRedemptionCode('A3KMP1')).toBe(false);
    expect(isRedemptionCode('A3KMPI')).toBe(false);
    expect(isRedemptionCode('A3KMPL')).toBe(false);
    expect(isRedemptionCode('A3KMPO')).toBe(false);
  });

  it('rejects the wrong lengths and non-strings', () => {
    expect(isRedemptionCode('A3KMP')).toBe(false);
    expect(isRedemptionCode('A3KMPQ78')).toBe(false);
    expect(isRedemptionCode(42)).toBe(false);
    expect(isRedemptionCode(null)).toBe(false);
  });
});

describe('scrubEntry — the code-key compromise', () => {
  it('redacts a `code` that really is a cashier code', () => {
    expect(scrubEntry('code', 'A3KMPQ')).toBe(REDACTED);
    expect(scrubEntry('redemption_code', 'A3KMPQ')).toBe(REDACTED);
  });

  it('KEEPS a Postgres SQLSTATE under the same key', () => {
    // This is the whole reason the rule is key AND shape. `42P01` is the
    // single most useful field in a failed-query event; blanket-redacting
    // `code` would strip it.
    expect(scrubEntry('code', '42P01')).toBeUndefined();
    expect(scrubEntry('code', '42703')).toBeUndefined();
  });

  it("KEEPS the app's own ApiResponse error codes", () => {
    expect(scrubEntry('code', 'VALIDATION_ERROR')).toBeUndefined();
    expect(scrubEntry('code', 'NOT_FOUND')).toBeUndefined();
    expect(scrubEntry('code', 'RATE_LIMITED')).toBeUndefined();
  });

  it('redacts a sensitive key regardless of its value shape', () => {
    expect(scrubEntry('email', 'x')).toBe(REDACTED);
    expect(scrubEntry('access_token', '')).toBe(REDACTED);
  });
});

describe('isExpectedError', () => {
  it('treats a redirect as expected', () => {
    expect(isExpectedError({ digest: 'NEXT_REDIRECT;replace;/sign-in' })).toBe(
      true,
    );
  });

  it('treats notFound() as expected, in both digest spellings', () => {
    expect(isExpectedError({ digest: 'NEXT_NOT_FOUND' })).toBe(true);
    expect(isExpectedError({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })).toBe(
      true,
    );
  });

  it('treats an aborted request as expected', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    expect(isExpectedError(error)).toBe(true);
  });

  it('does NOT swallow a real error', () => {
    expect(isExpectedError(new Error('boom'))).toBe(false);
    expect(isExpectedError({ digest: 'abc123' })).toBe(false);
    expect(isExpectedError(null)).toBe(false);
    expect(isExpectedError('NEXT_REDIRECT')).toBe(false);
  });
});

describe('scrubUrl', () => {
  it('leaves a clean URL untouched', () => {
    expect(scrubUrl('/explore/abc?menuPage=2')).toBe('/explore/abc?menuPage=2');
  });

  it('redacts sensitive params but keeps the path', () => {
    expect(scrubUrl('/reset-password?token_hash=abc&reset=1')).toBe(
      `/reset-password?token_hash=${encodeURIComponent(REDACTED)}&reset=1`,
    );
  });

  it('keeps a relative path relative', () => {
    const out = scrubUrl('/sign-in?email=a@b.com');
    expect(out.startsWith('/sign-in?')).toBe(true);
    expect(out).not.toContain('placeholder.invalid');
    expect(out).not.toContain('a@b.com');
  });

  it('keeps an absolute URL absolute', () => {
    const out = scrubUrl('https://ilokal.shop/sign-in?email=a@b.com');
    expect(out.startsWith('https://ilokal.shop/sign-in?')).toBe(true);
    expect(out).not.toContain('a@b.com');
  });

  it('replaces an unparseable value wholesale rather than guessing', () => {
    expect(scrubUrl('http://[')).toBe(REDACTED);
  });

  it('redacts the PKCE ?code= even though it is not cashier-shaped', () => {
    // Deliberately stricter than scrubEntry: this is the OAuth authorization
    // code, and no error code ever travels in a query string.
    const out = scrubUrl('/api/auth/callback?code=abc-123-not-cashier-shaped');
    expect(out).not.toContain('abc-123');
  });
});

describe('scrubObject', () => {
  it('redacts nested sensitive keys and keeps the rest', () => {
    const out = scrubObject({
      business_id: 'b-1',
      user: { email: 'a@b.com', id: 'u-1' },
      error: { code: '42P01', message: 'relation does not exist' },
    });

    expect(out).toEqual({
      business_id: 'b-1',
      user: { email: REDACTED, id: 'u-1' },
      error: { code: '42P01', message: 'relation does not exist' },
    });
  });

  it('preserves array length', () => {
    const out = scrubObject({ items: [{ email: 'a@b.com' }, { id: 'x' }] });
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toEqual({ email: REDACTED });
  });

  it('does not recurse forever on a cyclic payload', () => {
    const cyclic: Record<string, unknown> = { id: 'x' };
    cyclic.self = cyclic;
    expect(() => scrubObject(cyclic)).not.toThrow();
  });

  it('passes primitives through', () => {
    expect(scrubObject('hello')).toBe('hello');
    expect(scrubObject(7)).toBe(7);
    expect(scrubObject(null)).toBeNull();
  });
});

describe('scrubHeaders', () => {
  it('redacts credentials and keeps routing headers', () => {
    expect(
      scrubHeaders({
        authorization: 'Bearer abc',
        cookie: 'sb-x-auth-token=y',
        'content-type': 'application/json',
        'x-verified-user-id': 'u-1',
      }),
    ).toEqual({
      authorization: REDACTED,
      cookie: REDACTED,
      'content-type': 'application/json',
      'x-verified-user-id': 'u-1',
    });
  });
});

describe('email inside a value (PR #43 review)', () => {
  it('redacts an address Postgres embedded in error text', () => {
    // Key-based redaction misses this: the key is `details`, which is not
    // sensitive and must survive — it names the constraint that fired.
    const scrubbed = scrubObject({
      code: '23505',
      details: 'Key (email)=(owner@shop.ph) already exists.',
    }) as Record<string, string>;

    expect(scrubbed.details).not.toContain('owner@shop.ph');
    expect(scrubbed.details).toContain('Key (email)=');
    // The SQLSTATE is the most useful field in the event and must not be eaten.
    expect(scrubbed.code).toBe('23505');
  });

  it('leaves ordinary text alone', () => {
    const scrubbed = scrubObject({
      message: 'relation "view_events" does not exist',
    }) as Record<string, string>;

    expect(scrubbed.message).toBe('relation "view_events" does not exist');
  });
});
