/**
 * Next's dynamic-usage bailout guard.
 *
 * This exists because `cookies()` signals "this route cannot be static" by
 * THROWING. Every catch-all around a cookie-reading Supabase call sees that
 * throw, and answering it with a fallback bakes a wrong answer into the build:
 * the feature flag reads `false`, the session reads anonymous — permanently,
 * in the prerendered output.
 */

import { describe, it, expect } from 'vitest';
import { isDynamicUsageError } from '../dynamicUsage';

describe('isDynamicUsageError', () => {
  it('recognises the dynamic-server-usage bailout', () => {
    const error = Object.assign(new Error('Dynamic server usage: cookies'), {
      digest: 'DYNAMIC_SERVER_USAGE',
    });
    expect(isDynamicUsageError(error)).toBe(true);
  });

  it.each(['NEXT_REDIRECT', 'NEXT_NOT_FOUND', 'NEXT_REDIRECT;replace;/x;307;'])(
    'recognises %s — control flow, never a failure to swallow',
    (digest) => {
      expect(
        isDynamicUsageError(Object.assign(new Error('x'), { digest })),
      ).toBe(true);
    },
  );

  it('does NOT claim an ordinary error', () => {
    // A real fault must still be logged and handled, not rethrown past the
    // caller's fallback.
    expect(isDynamicUsageError(new Error('connection refused'))).toBe(false);
    expect(isDynamicUsageError({ message: 'boom' })).toBe(false);
    expect(isDynamicUsageError(null)).toBe(false);
    expect(isDynamicUsageError(undefined)).toBe(false);
    expect(isDynamicUsageError('a string')).toBe(false);
  });

  it('ignores a non-string digest', () => {
    expect(isDynamicUsageError({ digest: 42 })).toBe(false);
  });
});
