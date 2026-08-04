import { describe, it, expect } from 'vitest';
import {
  toUserMessage,
  serverErrorText,
  isRedactedMessage,
  isNetworkError,
  GENERIC_ERROR,
} from '@/lib/utils/errorMessage';

/**
 * The literal string a user reported seeing inside the sign-in form. Pinned
 * verbatim: this suite exists to prove it can never be rendered again.
 */
const NEXT_REDACTION =
  'An error occurred in the Server Components render. The specific message is ' +
  'omitted in production builds to avoid leaking sensitive details. A digest ' +
  'property is included on this error instance which may provide additional ' +
  'details about the nature of the error.';

describe('serverErrorText — the reported bug', () => {
  it('never renders Next’s production redaction notice', () => {
    const redacted = new Error(NEXT_REDACTION);
    expect(serverErrorText(redacted, 'Incorrect email or password.')).toBe(
      'Incorrect email or password.',
    );
  });

  it('is why the old `instanceof Error` check failed', () => {
    // The old code was: error instanceof Error ? error.message : fallback.
    // The redacted object IS an Error, so the fallback was unreachable.
    const redacted = new Error(NEXT_REDACTION);
    expect(redacted instanceof Error).toBe(true);
    const oldBehaviour =
      redacted instanceof Error ? redacted.message : 'fallback';
    expect(oldBehaviour).toBe(NEXT_REDACTION);
    expect(serverErrorText(redacted, 'fallback')).toBe('fallback');
  });

  it('still shows a real, hand-written message', () => {
    expect(serverErrorText(new Error('Incorrect email or password.'))).toBe(
      'Incorrect email or password.',
    );
  });

  it('falls back for a non-Error, an empty message, or nothing', () => {
    expect(serverErrorText(undefined, 'nope')).toBe('nope');
    expect(serverErrorText({ weird: true }, 'nope')).toBe('nope');
    expect(serverErrorText(new Error(''), 'nope')).toBe('nope');
  });

  it('accepts a plain string but still screens it', () => {
    expect(serverErrorText('Too many attempts.', 'x')).toBe(
      'Too many attempts.',
    );
    expect(serverErrorText(NEXT_REDACTION, 'x')).toBe('x');
  });

  it('names a connection failure as one, because retrying is the fix', () => {
    const offline = new TypeError('Failed to fetch');
    expect(serverErrorText(offline, 'unused')).toMatch(/connection/i);
  });

  it('defaults to the shared generic copy', () => {
    expect(serverErrorText(undefined)).toBe(GENERIC_ERROR);
  });
});

describe('isRedactedMessage', () => {
  it('matches the notice across wording changes', () => {
    expect(isRedactedMessage(NEXT_REDACTION)).toBe(true);
    expect(
      isRedactedMessage('The specific message is omitted in production builds'),
    ).toBe(true);
    expect(
      isRedactedMessage('A digest property is included on this error'),
    ).toBe(true);
  });

  it('treats an absent message as unusable', () => {
    expect(isRedactedMessage('')).toBe(true);
    expect(isRedactedMessage(null)).toBe(true);
    expect(isRedactedMessage(undefined)).toBe(true);
  });

  it('leaves real copy alone', () => {
    expect(isRedactedMessage('Incorrect email or password.')).toBe(false);
    expect(isRedactedMessage('That coupon code is already in use.')).toBe(
      false,
    );
  });
});

describe('isNetworkError', () => {
  it('recognises a failed fetch', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isNetworkError(new TypeError('NetworkError when attempting to fetch')),
    ).toBe(true);
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true);
  });

  it('does not claim a server refusal is a network problem', () => {
    expect(isNetworkError(new Error('Incorrect email or password.'))).toBe(
      false,
    );
    expect(isNetworkError(new TypeError('x is not a function'))).toBe(false);
    expect(isNetworkError('offline')).toBe(false);
  });
});

describe('toUserMessage — SQLSTATE to copy', () => {
  it('explains a duplicate, with the noun when given one', () => {
    expect(toUserMessage({ code: '23505' }, { noun: 'coupon' })).toMatch(
      /coupon already exists/i,
    );
    expect(toUserMessage({ code: '23505' })).toMatch(/already exists/i);
  });

  it('explains why a delete was refused', () => {
    expect(toUserMessage({ code: '23503' }, { noun: 'section' })).toMatch(
      /still in use/i,
    );
  });

  it('points at the form for a constraint violation', () => {
    for (const code of ['23514', '22001', '22P02']) {
      expect(toUserMessage({ code }), code).toMatch(
        /aren’t valid|check the form/i,
      );
    }
  });

  it('names a missing required field', () => {
    expect(toUserMessage({ code: '23502' })).toMatch(/required/i);
  });

  it('says permission, not failure, for an RLS denial', () => {
    expect(toUserMessage({ code: '42501' })).toMatch(/permission/i);
  });

  it('says gone for a missing row', () => {
    expect(toUserMessage({ code: 'PGRST116' }, { noun: 'branch' })).toMatch(
      /branch no longer/i,
    );
    expect(toUserMessage({ code: 'P0002' })).toMatch(/no longer exists/i);
  });

  it('invites a retry only when the failure is transient', () => {
    expect(toUserMessage({ code: '40001' })).toMatch(/try again/i);
    expect(toUserMessage({ code: '08006' })).toMatch(/too long|try again/i);
  });

  it('surfaces the private IL0xx class, because only our own RPCs raise it', () => {
    expect(
      toUserMessage({ code: 'IL002', message: 'that slot was just taken' }),
    ).toBe('That slot was just taken');
  });

  it('falls back when IL0xx carries no message', () => {
    expect(
      toUserMessage({ code: 'IL001', message: '' }, { fallback: 'nope' }),
    ).toBe('nope');
  });

  it('🔴 never forwards a raw driver message', () => {
    // The whole reason this mapper exists: driver text names tables, columns
    // and constraints (CLAUDE.md §Error leakage).
    const leaky = {
      code: '23505',
      message:
        'duplicate key value violates unique constraint "coupons_business_id_code_key"',
      details: 'Key (business_id, code)=(uuid, SUMMER20) already exists.',
      hint: 'Perhaps you meant to update?',
    };
    const shown = toUserMessage(leaky, { noun: 'coupon' });
    expect(shown).not.toContain('coupons_business_id_code_key');
    expect(shown).not.toContain('duplicate key');
    expect(shown).not.toContain('business_id');
    expect(shown).not.toContain('Perhaps you meant');
  });

  it('does not leak on an unrecognised code either', () => {
    const shown = toUserMessage({
      code: 'XX000',
      message: 'internal error: relation "profiles" does not exist',
    });
    expect(shown).toBe(GENERIC_ERROR);
    expect(shown).not.toContain('profiles');
  });

  it('handles null/undefined without throwing', () => {
    expect(toUserMessage(null)).toBe(GENERIC_ERROR);
    expect(toUserMessage(undefined, { fallback: 'x' })).toBe('x');
  });
});
