import Link from 'next/link';
import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { businessCouponsPath } from '@/config/routeConfig';
import { buildFirstAnswer } from '../../lib/firstAnswer';
import type { MonthlyTrendPoint } from '@/lib/types';

/**
 * The dashboard's lead — and the **one accent on the screen**.
 *
 * Everything below it stays neutral by design (§8 of the revamp plan): brand
 * red neighbours the destructive colour, so a dashboard that spends colour
 * everywhere makes real alerts invisible. This card is where the budget goes,
 * and it is warm rather than loud — Cornsilk, not a red flood — because the
 * owner reads this screen every morning.
 */

const TONE_STYLES = {
  good: 'bg-[#FEF8D6] text-[#1A1A1A] dark:bg-[#FEF8D6]/10 dark:text-foreground',
  flat: 'bg-secondary text-secondary-foreground',
  attention:
    'bg-[#FCD9F7] text-[#1A1A1A] dark:bg-[#FCD9F7]/10 dark:text-foreground',
} as const;

const TONE_ICON = {
  good: TrendingUp,
  flat: Minus,
  attention: TrendingDown,
} as const;

export function FirstAnswerCard({
  trend,
  activeDeals,
  businessId,
  branchId,
}: {
  trend: MonthlyTrendPoint[];
  activeDeals: number;
  businessId: string;
  branchId?: string;
}) {
  const answer = buildFirstAnswer(trend, activeDeals);
  const Icon = TONE_ICON[answer.tone];
  const couponsHref = branchId
    ? `${businessCouponsPath(businessId)}?branch=${branchId}`
    : businessCouponsPath(businessId);

  return (
    <section
      className={cn(
        'flex flex-wrap items-center justify-between gap-6 rounded-2xl px-6 py-7',
        TONE_STYLES[answer.tone],
      )}
    >
      <div className="flex min-w-0 items-center gap-5">
        {answer.value !== null && (
          <span className="font-display text-6xl leading-none font-bold tracking-tight tabular-nums">
            {answer.value}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight font-bold tracking-tight">
            {answer.headline}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm opacity-80">
            <Icon aria-hidden className="h-4 w-4 shrink-0" />
            {answer.detail}
          </p>
        </div>
      </div>

      {answer.cta && (
        <Button asChild size="lg">
          <Link href={couponsHref}>
            {answer.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </section>
  );
}
