import { describe, it, expect } from 'vitest';
import { isRedirectError } from '@/lib/utils/redirectError';

describe('isRedirectError', () => {
  it('matches on the NEXT_REDIRECT digest (message may be empty in prod)', () => {
    expect(isRedirectError({ digest: 'NEXT_REDIRECT;replace;/x;307;' })).toBe(
      true,
    );
    expect(isRedirectError({ digest: 'NEXT_REDIRECT', message: '' })).toBe(
      true,
    );
  });

  it('falls back to the message marker', () => {
    expect(isRedirectError(new Error('NEXT_REDIRECT'))).toBe(true);
  });

  it('rejects ordinary errors and non-objects', () => {
    expect(isRedirectError(new Error('Invalid email or password'))).toBe(false);
    expect(isRedirectError({ digest: 'NEXT_NOT_FOUND' })).toBe(false);
    expect(isRedirectError('NEXT_REDIRECT')).toBe(false);
    expect(isRedirectError(null)).toBe(false);
    expect(isRedirectError(undefined)).toBe(false);
  });
});
