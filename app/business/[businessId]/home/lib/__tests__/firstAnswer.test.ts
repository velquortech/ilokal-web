import { describe, it, expect } from 'vitest';
import { buildFirstAnswer } from '../firstAnswer';
import type { MonthlyTrendPoint } from '@/lib/types';

const point = (month: string, redemptions: number): MonthlyTrendPoint => ({
  month,
  followers: 0,
  redemptions,
});

/**
 * The value of this function is entirely in its branches: what a dashboard says
 * when there is no data, when a shop has nothing live, when the number fell.
 * Each of those is a different sentence and the wrong one is worse than none —
 * congratulating a shop whose redemptions halved, or reporting "0" as though it
 * were an achievement.
 */
describe('buildFirstAnswer', () => {
  it('asks for a deal when nothing is live, instead of reporting a zero', () => {
    const answer = buildFirstAnswer([point('Jan', 0)], 0);
    expect(answer.value).toBeNull();
    expect(answer.headline).toBe('No live deals right now');
    expect(answer.cta).toEqual({ label: 'Create a deal', href: 'coupons' });
    expect(answer.tone).toBe('attention');
  });

  it('takes the CURRENT month from the last point, not the first', () => {
    const answer = buildFirstAnswer([point('Jan', 3), point('Feb', 11)], 2);
    expect(answer.value).toBe(11);
  });

  it('reports growth against last month', () => {
    const answer = buildFirstAnswer([point('Jan', 4), point('Feb', 10)], 2);
    expect(answer.value).toBe(10);
    expect(answer.detail).toBe('6 more than last month.');
    expect(answer.tone).toBe('good');
  });

  it('reports a drop as a drop — never dressed up as growth', () => {
    const answer = buildFirstAnswer([point('Jan', 10), point('Feb', 4)], 2);
    expect(answer.detail).toBe('6 fewer than last month.');
    expect(answer.tone).toBe('attention');
  });

  it('says so when the month matched exactly', () => {
    const answer = buildFirstAnswer([point('Jan', 7), point('Feb', 7)], 1);
    expect(answer.detail).toBe('Exactly the same as last month.');
    expect(answer.tone).toBe('flat');
  });

  it('does not fabricate a comparison in the first month', () => {
    const answer = buildFirstAnswer([point('Jan', 5)], 1);
    expect(answer.detail).toContain('first month');
    expect(answer.tone).toBe('flat');
  });

  it('handles an empty trend with live deals as "nothing redeemed yet"', () => {
    const answer = buildFirstAnswer([], 3);
    expect(answer.value).toBe(0);
    expect(answer.headline).toBe('Nothing redeemed yet this month');
    expect(answer.detail).toBe('3 deals are live and waiting.');
  });

  it('gets singular/plural right at one', () => {
    expect(buildFirstAnswer([], 1).detail).toBe('1 deal is live and waiting.');
    expect(buildFirstAnswer([point('Jan', 1)], 1).headline).toBe(
      'deal redeemed this month',
    );
  });
});
