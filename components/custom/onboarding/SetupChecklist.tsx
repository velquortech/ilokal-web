'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CircleAlert, Clock, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOnboardingTourContext } from './OnboardingTourProvider';
import { dismissOnboardingChecklistAction } from '@/app/actions/onboardingActions';
import type { OnboardingItem, OnboardingProgress } from '@/lib/types';

/**
 * Per-business, so an owner with two shops sets each one up.
 *
 * Since phase 3 the authoritative marker is
 * `business_settings.onboarding_checklist_dismissed_at`, passed in as
 * `dismissed`. This key survives as a LOCAL ECHO: it keeps the card hidden on
 * this device even if the server write fails. It can only ever hide the card,
 * never resurrect one the server says was dismissed.
 */
const dismissKey = (businessId: string) =>
  `ilokal-onboarding-hidden:${businessId}`;

export function SetupChecklist({
  businessId,
  progress,
  welcome = false,
  cleanUrl,
  dismissed = false,
}: {
  businessId: string;
  progress: OnboardingProgress;
  /**
   * True on the post-registration arrival only. Read on the SERVER from
   * `searchParams` and passed down, rather than via `useSearchParams()` —
   * that hook opts the subtree into a Suspense boundary whose fallback would
   * have to render something, and this card has nothing sensible to show
   * before it knows.
   */
  welcome?: boolean;
  /** Same URL with `?welcome` removed; every other param preserved. */
  cleanUrl?: string;
  /**
   * `business_settings.onboarding_checklist_dismissed_at != null`, read on the
   * server — so hiding the card on one device hides it on every device. Seeds
   * the initial state directly, which means an already-dismissed card is never
   * painted and then yanked away.
   */
  dismissed?: boolean;
}) {
  const router = useRouter();
  const { enabled: tourEnabled, startTour } = useOnboardingTourContext();

  // Seeded from the SERVER's answer, so both renders agree. The localStorage
  // echo is still read after mount — it can only add a "hidden", never undo
  // one, so it cannot contradict the server.
  const [hidden, setHidden] = useState(dismissed);
  // Snapshotted at mount: the URL is cleaned a tick later, and the card must
  // not silently swap back to its ordinary heading when that lands.
  const [welcomed] = useState(welcome);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Recomputed, not merely OR'd in: the key is per business, so switching
    // shops must be able to bring the card BACK. `dismissed` still wins, so the
    // echo can never contradict what the server recorded.
    setHidden(
      dismissed || window.localStorage.getItem(dismissKey(businessId)) === '1',
    );
  }, [businessId, dismissed]);

  // Consume the one-shot marker: keep the welcome state for this visit, then
  // strip the param so a refresh, a bookmark or a shared link cannot replay it.
  useEffect(() => {
    if (!welcome || !cleanUrl) return;
    router.replace(cleanUrl, { scroll: false });
  }, [welcome, cleanUrl, router]);

  const dismiss = () => {
    setHidden(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey(businessId), '1');
    }
    // Fire-and-forget: the card is already gone, and a failed write is logged
    // server-side. The owner did not ask for a save, so nothing here is worth a
    // toast — and the echo above keeps this device quiet regardless.
    void dismissOnboardingChecklistAction(businessId).catch(() => {});
  };

  if (hidden) return null;

  // Outage ≠ empty. Unchecked boxes here would tell the owner to redo work
  // they already did, so say what actually happened instead — and say it
  // INSTEAD of the list, since a checklist rendered from nothing reads as
  // "you have done none of this".
  if (progress.failed) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <CircleAlert className="text-muted-foreground h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">
              We couldn&rsquo;t load your setup checklist
            </p>
            <p className="text-muted-foreground text-sm">
              Your shop is fine — refresh in a moment to see what&rsquo;s left.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Nothing left to do: the card has said everything it has to say.
  if (progress.complete && !welcomed) return null;

  const pct = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <Card
      aria-labelledby="setup-checklist-heading"
      // The tour's first step points here. Attribute on the card that already
      // exists — no wrapper whose only job is to be measured.
      data-tour="setup-checklist"
      className={cn(welcomed && 'ring-primary/40 ring-2')}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle id="setup-checklist-heading" className="text-xl">
              {welcomed
                ? 'Your shop is registered — here’s what’s next'
                : 'Finish setting up your shop'}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {progress.complete
                ? 'Everything is set up. Nice work.'
                : 'A shopper sees a finished shop, not a half-filled one.'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {tourEnabled && (
              <Button variant="outline" size="sm" onClick={startTour}>
                <Compass className="mr-1.5 size-4" aria-hidden />
                Take the tour
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Hide
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Progress value={pct} aria-hidden />
          {/* Announced once, politely — the bar itself is decorative. */}
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {progress.completed} of {progress.total} done
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="divide-border divide-y">
          {progress.items.map((item) => (
            <ChecklistRow key={item.id} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ChecklistRow({ item }: { item: OnboardingItem }) {
  const Icon = item.done ? Check : item.readOnly ? Clock : ArrowRight;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'group flex items-start gap-3 py-3 transition-colors',
          'hover:bg-muted/50 focus-visible:ring-ring rounded-md px-2 focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border',
            item.done
              ? 'border-transparent bg-green-600 text-white'
              : 'text-muted-foreground bg-background',
          )}
        >
          <Icon className="size-3.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm font-medium',
              item.done && 'text-muted-foreground',
            )}
          >
            {item.label}
            {/* The tick is aria-hidden, so state has to be readable some other
                way or every row announces identically. */}
            <span className="sr-only">
              {item.done ? ' — done' : ' — not done yet'}
            </span>
          </span>
          <span className="text-muted-foreground block text-sm">
            {item.detail}
          </span>
        </span>
      </Link>
    </li>
  );
}
