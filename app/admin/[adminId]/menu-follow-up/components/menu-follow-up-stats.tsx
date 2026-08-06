import { StatCard } from '@/components/custom/StatCard';
import { ListX, TicketX, MailCheck } from 'lucide-react';
import type { MissingMenuBusiness } from '@/lib/api/admin/menuFollowUpQuery';

/**
 * Counts across the WHOLE filtered set (not the current page). An em dash on a
 * failed read, so an outage never shows three confident zeros.
 */
export function MenuFollowUpStats({
  rows,
  failed,
}: {
  rows: MissingMenuBusiness[];
  failed: boolean;
}) {
  const dash = (n: number) => (failed ? '—' : n);
  const noPromo = rows.filter((r) => !r.has_live_promo).length;
  const nudged = rows.filter((r) => r.menu_reminder_sent_at).length;

  const items = [
    { title: 'Shops with no menu', icon: ListX, value: dash(rows.length) },
    { title: 'Also no live deal', icon: TicketX, value: dash(noPromo) },
    { title: 'Already reminded', icon: MailCheck, value: dash(nudged) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
