import Image from 'next/image';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { explorePath } from '@/config/routeConfig';
import type { FeedDeal } from '@/lib/api/customer/customerQuery';
import { brandToneIndex } from '@/lib/utils/brandTone';
import { BUSINESS_TIME_ZONE } from '@/lib/utils/operatingHours';

/**
 * A deal, as a card you would actually want to tap.
 *
 * The old row put the discount — the only reason anyone is on this page — in a
 * 12px pill at the right edge of a 44px row, which made the most exciting
 * content in the product look like a settings screen. Here the number is
 * display type and the card is colour-blocked, matching the landing's deals
 * wall so /explore and / read as one product.
 *
 * Colour is assigned from the deal id, not at random: the same deal keeps the
 * same colour between renders and between pages, so the wall is stable rather
 * than reshuffling under you on every navigation.
 */

const TONES = [
  'bg-[#D70005] text-[#FEF8D6] [--rule:rgba(254,248,214,.3)] [--dim:rgba(254,248,214,.78)]',
  'bg-[#FEE87B] text-[#1A1A1A] [--rule:rgba(26,26,26,.18)] [--dim:rgba(26,26,26,.66)]',
  'bg-[#FCD9F7] text-[#1A1A1A] [--rule:rgba(26,26,26,.18)] [--dim:rgba(26,26,26,.66)]',
  'bg-[#FEF8D6] text-[#1A1A1A] [--rule:rgba(26,26,26,.16)] [--dim:rgba(26,26,26,.64)]',
] as const;

/**
 * Stable per-deal tone. Shares `brandToneIndex` with the directory card and the
 * shop hero so the same id lands on the same colour everywhere — these classes
 * carry extra custom properties (rules, dimmed text) the other surfaces don't.
 */
function toneFor(id: string): string {
  return TONES[brandToneIndex(id, TONES.length)];
}

function discountLabel(discount: FeedDeal['discount']): string {
  if (!discount) return 'Deal';
  return discount.type === 'percentage'
    ? `${discount.value}%`
    : `₱${discount.value}`;
}

export function DealCard({
  deal,
  flash,
  featured,
}: {
  deal: FeedDeal;
  flash?: boolean;
  featured?: boolean;
}) {
  const ends = new Date(deal.expiry_date).toLocaleDateString('en-PH', {
    // Pinned, like bookings: the server renders in UTC, so a deal expiring on
    // a Manila evening would otherwise read as ending the day before.
    timeZone: BUSINESS_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={explorePath(deal.business_id)}
      className={cn(
        'group flex flex-col justify-between rounded-2xl p-5 outline-hidden',
        'shadow-[0_10px_30px_-14px_rgba(60,10,10,.35)]',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:shadow-[0_22px_50px_-18px_rgba(60,10,10,.45)]',
        'focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2',
        'motion-safe:hover:-translate-y-1',
        featured ? 'min-h-52 sm:p-7' : 'min-h-44',
        toneFor(deal.id),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-black/10">
            {deal.business_logo_url && (
              <Image
                src={deal.business_logo_url}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
              />
            )}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold">
            {deal.business_name}
          </span>
        </div>
        {flash && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase">
            <Zap className="size-3" />
            Flash
          </span>
        )}
      </div>

      <p
        className={cn(
          'font-display mt-4 leading-none font-bold tracking-tight tabular-nums',
          featured ? 'text-6xl sm:text-7xl' : 'text-5xl',
        )}
      >
        {discountLabel(deal.discount)}
        <span className="ml-1.5 align-baseline text-[0.34em] font-bold tracking-normal">
          off
        </span>
      </p>

      <p
        className={cn('mt-3 leading-snug', featured ? 'text-base' : 'text-sm')}
        style={{ color: 'var(--dim)' }}
      >
        {deal.description ?? deal.code}
      </p>

      <div
        className="mt-5 flex items-center justify-between border-t pt-3 text-xs font-semibold tracking-[0.12em] uppercase"
        style={{ borderColor: 'var(--rule)' }}
      >
        <span>Ends {ends}</span>
        {deal.slots_remaining != null && (
          <span className="tabular-nums" style={{ color: 'var(--dim)' }}>
            {deal.slots_remaining} left
          </span>
        )}
      </div>
    </Link>
  );
}
