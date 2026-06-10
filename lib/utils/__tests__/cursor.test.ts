/**
 * Keyset cursor helper tests — round-trip, malformed input, edge cases.
 */

import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, type Cursor } from '../cursor';

const sample: Cursor = {
  created_at: '2026-06-09T11:44:10.123+00:00',
  id: '11111111-1111-1111-1111-111111111111',
};

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a cursor', () => {
    const encoded = encodeCursor(sample);
    expect(decodeCursor(encoded)).toEqual(sample);
  });

  it('produces an opaque (non-plaintext) string', () => {
    const encoded = encodeCursor(sample);
    expect(encoded).not.toContain(sample.id);
    expect(encoded).not.toContain('|');
  });

  it('preserves ids that contain no separator collisions', () => {
    const c: Cursor = { created_at: '2026-01-01T00:00:00Z', id: 'abc-def' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it('returns null for null/undefined/empty input', () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('returns null for malformed base64 / missing separator', () => {
    // base64 of "no-separator-here" (no pipe) → should be rejected
    const noSep = Buffer.from('no-separator-here', 'utf8').toString(
      'base64url',
    );
    expect(decodeCursor(noSep)).toBeNull();
  });

  it('returns null when either component is empty', () => {
    const emptyId = Buffer.from('2026-01-01T00:00:00Z|', 'utf8').toString(
      'base64url',
    );
    const emptyDate = Buffer.from('|some-id', 'utf8').toString('base64url');
    expect(decodeCursor(emptyId)).toBeNull();
    expect(decodeCursor(emptyDate)).toBeNull();
  });
});
