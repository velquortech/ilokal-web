import type { MonthlyTrendPoint } from '@/lib/types';

/**
 * The one question a dashboard should answer before you scroll.
 *
 * The page previously opened with four equal stat cards, two charts, a funnel
 * and a table — every element the same weight, so it answered nothing and the
 * owner had to assemble the answer themselves at 7am. This picks the single
 * fact that matters ("did people actually use my deals this month") and states
 * it in a sentence, with the rest demoted to supporting detail.
 *
 * Pure, and separate from the component, because the interesting part is the
 * copy decisions — no data at all, a first month with no comparison, a drop, a
 * shop with nothing live — and each of those is a branch worth testing without
 * rendering a chart.
 */

export type FirstAnswerTone = 'good' | 'flat' | 'attention';

export type FirstAnswer = {
  /** The number, at display size. `null` when there is nothing to count yet. */
  value: number | null;
  /** What the number is. */
  headline: string;
  /** The comparison, or what to do about it. */
  detail: string;
  tone: FirstAnswerTone;
  /** Set when the useful next step is an action, not a number. */
  cta?: { label: string; href: 'coupons' };
};

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function buildFirstAnswer(
  trend: MonthlyTrendPoint[],
  activeDeals: number,
): FirstAnswer {
  // The RPC returns oldest-first, so the current month is the last point.
  const current = trend.length > 0 ? trend[trend.length - 1] : null;
  const previous = trend.length > 1 ? trend[trend.length - 2] : null;

  // No live deal is the one state where a number would be beside the point:
  // nothing can be redeemed, so the answer is the action.
  if (activeDeals === 0) {
    return {
      value: null,
      headline: 'No live deals right now',
      detail:
        'Customers can follow your shop, but there is nothing for them to redeem yet.',
      tone: 'attention',
      cta: { label: 'Create a deal', href: 'coupons' },
    };
  }

  const redemptions = current?.redemptions ?? 0;

  if (redemptions === 0) {
    return {
      value: 0,
      headline: 'Nothing redeemed yet this month',
      detail: `${activeDeals} ${plural(activeDeals, 'deal is', 'deals are')} live and waiting.`,
      tone: 'attention',
    };
  }

  const headline = `${plural(redemptions, 'deal', 'deals')} redeemed this month`;

  if (!previous) {
    return {
      value: redemptions,
      headline,
      detail: 'Your first month of data — next month gets a comparison.',
      tone: 'flat',
    };
  }

  const delta = redemptions - previous.redemptions;
  if (delta === 0) {
    return {
      value: redemptions,
      headline,
      detail: 'Exactly the same as last month.',
      tone: 'flat',
    };
  }

  const up = delta > 0;
  return {
    value: redemptions,
    headline,
    detail: `${Math.abs(delta)} ${up ? 'more' : 'fewer'} than last month.`,
    tone: up ? 'good' : 'attention',
  };
}
