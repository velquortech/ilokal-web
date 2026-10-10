import type { Metadata } from 'next';
import { BrandMark } from '@/components/custom/BrandLogo';

export const metadata: Metadata = {
  title: 'You are offline',
  // Nothing here is worth indexing, and a search result landing on it would be
  // actively misleading.
  robots: { index: false, follow: false },
};

/**
 * The offline fallback, precached by `public/sw.js` and served only when a
 * navigation cannot reach the network at all.
 *
 * It deliberately does NOT claim the app works offline. Nothing in it does:
 * every dashboard read is a cookie-scoped server render, and the worker caches
 * no page and no API response on purpose. Telling someone "you're offline,
 * here's your cached dashboard" would be a lie that costs them a decision.
 *
 * A plain server component with no client JavaScript — the one page that must
 * render when the network is gone should not be waiting on a bundle.
 */
export default function OfflinePage() {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <BrandMark size={48} />
      <h1 className="font-display mt-6 text-2xl font-bold tracking-tight">
        You&rsquo;re offline
      </h1>
      <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
        iLokal needs a connection to load shops, deals and your dashboard. Check
        your data or Wi-Fi and try again.
      </p>
      {/*
        A plain anchor, not a router link: this page renders when the network
        is gone, so a client-side navigation would have nothing to fetch. A
        full reload is exactly the retry that is wanted, and the worker will
        serve this page again if it still fails.
      */}
      <a
        href="/home"
        className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background mt-8 inline-flex h-11 items-center rounded-md px-6 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      >
        Try again
      </a>
    </main>
  );
}
