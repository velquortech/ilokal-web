import { StatCard } from '@/components/custom/StatCard';
import { UserX, Footprints, MailCheck } from 'lucide-react';

/**
 * Uncapped totals from the stats RPC (NOT counted from the fetched page, which
 * PostgREST caps at 1000). An em dash on a failed read, so an outage never
 * shows three confident zeros — "0 owners need a nudge" is the one wrong answer
 * this surface must never give.
 */
export function RegistrationFollowUpStats({
  total,
  started,
  reminded,
  failed,
}: {
  total: number;
  started: number;
  reminded: number;
  failed: boolean;
}) {
  const dash = (value: number) => (failed ? '—' : value);

  const items = [
    { title: 'Signed up, no shop', icon: UserX, value: dash(total) },
    // Deliberately not called "abandoned": the funnel table only began
    // recording on 2026-08-15, so a NULL step means we never saw them, not that
    // they never tried.
    { title: 'Started the form', icon: Footprints, value: dash(started) },
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
