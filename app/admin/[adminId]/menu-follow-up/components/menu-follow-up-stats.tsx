import { StatCard } from '@/components/custom/StatCard';
import { ListX, TicketX, MailCheck } from 'lucide-react';

/**
 * Uncapped totals from the stats RPC (NOT counted from the fetched page, which
 * PostgREST caps at 1000). An em dash on a failed read, so an outage never
 * shows three confident zeros.
 */
export function MenuFollowUpStats({
  total,
  noPromo,
  reminded,
  failed,
}: {
  total: number;
  noPromo: number;
  reminded: number;
  failed: boolean;
}) {
  const dash = (n: number) => (failed ? '—' : n);

  const items = [
    { title: 'Shops with no menu', icon: ListX, value: dash(total) },
    { title: 'Also no live deal', icon: TicketX, value: dash(noPromo) },
    { title: 'Already reminded', icon: MailCheck, value: dash(reminded) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
