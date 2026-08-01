'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCelebrate } from '@/components/custom/Celebrate';

/**
 * The third success moment (§2 of the revamp plan): a shop going verified.
 *
 * The other two moments fire from the mutation that caused them. This one has
 * no such moment — an admin approves the shop somewhere else, and the owner
 * finds out by loading their dashboard later. So it fires on the first render
 * that sees `verified`, and has to remember that it already did.
 *
 * The marker is `localStorage`, deliberately: this is a decoration, and writing
 * a "celebrated" column to the database to hold it would be a schema change for
 * confetti. The cost is per-browser — a second device gets the burst again,
 * which is a far better failure than a shop being congratulated on every single
 * page load forever.
 *
 * Renders nothing. `celebrate()` already no-ops under `prefers-reduced-motion`;
 * the toast carries the whole message in that case.
 */
export function VerifiedCelebration({
  businessId,
  status,
}: {
  businessId?: string;
  status?: string | null;
}) {
  const celebrate = useCelebrate();
  // StrictMode mounts effects twice in dev; the storage write happens before
  // the burst, but this makes the double-fire impossible either way.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!businessId || status !== 'verified') return;

    const key = `ilokal-verified-celebrated:${businessId}`;
    let alreadySeen = true;
    try {
      alreadySeen = window.localStorage.getItem(key) !== null;
      if (!alreadySeen) window.localStorage.setItem(key, '1');
    } catch {
      // Private mode / storage disabled: skip rather than celebrate on every
      // load, which would be worse than never celebrating.
      return;
    }
    if (alreadySeen) return;

    fired.current = true;
    celebrate();
    toast.success('Your shop is verified — it is live on iLokal.', {
      id: 'business-verified',
      description: 'Customers can find you, follow you and redeem your deals.',
    });
  }, [businessId, status, celebrate]);

  return null;
}
