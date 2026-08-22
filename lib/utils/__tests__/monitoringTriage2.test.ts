import { describe, it, expect } from 'vitest';
import {
  isClockSkewError,
  isExpectedError,
  isReactStreamingRevealError,
} from '@/lib/utils/monitoring';
import { isRangeNotSatisfiable } from '@/app/api/helpers/response';

describe('isClockSkewError (PGRST303)', () => {
  it('matches the production shape', () => {
    // Verbatim from JAVASCRIPT-NEXTJS-7 / -H.
    expect(
      isClockSkewError({
        code: 'PGRST303',
        details: null,
        hint: null,
        message: 'JWT issued at future',
      }),
    ).toBe(true);
  });

  it('is reached through isExpectedError, so nothing has to call it directly', () => {
    expect(
      isExpectedError({ code: 'PGRST303', message: 'JWT issued at future' }),
    ).toBe(true);
  });

  it('does not swallow a neighbouring PostgREST code', () => {
    // PGRST301/302 are real auth failures worth seeing, and 42501 is an RLS
    // denial. Only the clock-skew code is dropped.
    for (const code of ['PGRST301', 'PGRST302', 'PGRST103', '42501', '23503']) {
      expect(isClockSkewError({ code })).toBe(false);
      expect(isExpectedError({ code })).toBe(false);
    }
  });

  it('is false for a plain Error carrying the same words', () => {
    expect(isClockSkewError(new Error('JWT issued at future'))).toBe(false);
  });
});

describe('isRangeNotSatisfiable (PGRST103)', () => {
  it('matches the production shape', () => {
    // Verbatim from JAVASCRIPT-NEXTJS-9 (197 events).
    expect(
      isRangeNotSatisfiable({
        code: 'PGRST103',
        details: 'An offset of 10 was requested, but there are only 1 rows.',
        hint: null,
        message: 'Requested range not satisfiable',
      }),
    ).toBe(true);
  });

  it('is false for anything else', () => {
    expect(isRangeNotSatisfiable({ code: '22P02' })).toBe(false);
    expect(
      isRangeNotSatisfiable(new Error('Requested range not satisfiable')),
    ).toBe(false);
    expect(isRangeNotSatisfiable(null)).toBe(false);
    expect(isRangeNotSatisfiable('PGRST103')).toBe(false);
  });
});

describe('isReactStreamingRevealError', () => {
  const reveal = {
    exception: {
      values: [
        {
          stacktrace: {
            frames: [{ function: '?' }, { function: '$RS' }],
          },
        },
      ],
    },
  };

  it('drops the streaming-reveal event', () => {
    expect(isReactStreamingRevealError(reveal)).toBe(true);
  });

  it('drops its siblings from the same inline bootstrap', () => {
    for (const fn of ['$RC', '$RM']) {
      expect(
        isReactStreamingRevealError({
          exception: {
            values: [{ stacktrace: { frames: [{ function: fn }] } }],
          },
        }),
      ).toBe(true);
    }
  });

  /**
   * 🔴 The point of matching on the frame rather than the message. A real
   * null-parent bug in this app's own code must still be reported — an
   * `ignoreErrors` entry for "Cannot read properties of null (reading
   * 'parentNode')" would have taken this with it.
   */
  it('keeps a parentNode error that has an application frame', () => {
    expect(
      isReactStreamingRevealError({
        exception: {
          values: [
            {
              stacktrace: {
                frames: [
                  { function: 'removeGalleryTile' },
                  { function: 'onClick' },
                ],
              },
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it('does not match a function that merely starts with $R', () => {
    expect(
      isReactStreamingRevealError({
        exception: {
          values: [{ stacktrace: { frames: [{ function: '$RSomething' }] } }],
        },
      }),
    ).toBe(false);
  });

  it('is false for an event with no frames at all', () => {
    expect(isReactStreamingRevealError({})).toBe(false);
    expect(isReactStreamingRevealError({ exception: { values: [] } })).toBe(
      false,
    );
    expect(isReactStreamingRevealError({ exception: { values: [{}] } })).toBe(
      false,
    );
  });
});
