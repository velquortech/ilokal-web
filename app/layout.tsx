import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { InstallPrompt } from '@/components/custom/pwa/InstallPrompt';
import { ServiceWorkerRegistrar } from '@/components/custom/pwa/ServiceWorkerRegistrar';
import { fontVariables } from './fonts';
import './globals.css';

/**
 * Facebook, Messenger, X and LinkedIn all read Open Graph, and every one of
 * them needs ABSOLUTE image URLs — a crawler has no page to resolve `/foo.png`
 * against. `metadataBase` is what lets Next build those, and without it the
 * `app/opengraph-image.png` file convention silently produces nothing usable.
 *
 * It is deliberately not derived from the request: a crawler can be pointed at
 * any host, and a Host header is attacker-controlled. Falls back to localhost
 * so dev and tests do not throw; set `NEXT_PUBLIC_APP_URL` in every deployed
 * environment or previews will advertise localhost image URLs.
 */
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'iLokal — discover through experience',
    template: '%s · iLokal',
  },
  description:
    'iLokal is a hyperlocal discovery platform that helps Filipinos find and support nearby cafés, restaurants, boutiques, and other homegrown brands.',
  // `canonical: './'` resolves per-page against metadataBase, so each route
  // advertises itself rather than every page claiming to be the home page.
  alternates: { canonical: './' },
  openGraph: {
    title: 'iLokal — discover through experience',
    description:
      'Find and support nearby cafés, restaurants, boutiques, and other homegrown brands.',
    siteName: 'iLokal',
    type: 'website',
    locale: 'en_PH',
    url: './',
  },
  twitter: { card: 'summary_large_image' },
  /**
   * iOS ignores most of the web app manifest. What it DOES read is this trio,
   * emitted by Next as `apple-mobile-web-app-capable`,
   * `apple-mobile-web-app-title` and `apple-mobile-web-app-status-bar-style` —
   * without them, "Add to Home Screen" on an iPhone produces a bookmark that
   * opens in Safari with its full chrome, not the standalone window Android
   * gets from the manifest. The touch icon it also needs is already served by
   * `app/apple-icon.png`.
   */
  /**
   * 🔴 Next 16 renders `appleWebApp.capable` as the modern
   * `mobile-web-app-capable` and does NOT emit the `apple-` prefixed name —
   * confirmed by reading the served `<head>` on this app, not from the docs.
   * Apple's own guidance still names `apple-mobile-web-app-capable`, so
   * relying on the alias is a bet on Safari honouring a tag Apple never
   * documented. One extra tag removes the bet.
   */
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    title: 'iLokal',
    // `default` keeps the status bar legible over the app's own background.
    // `black-translucent` would let content run under it, which on this app
    // means the sticky dashboard header sitting behind the clock.
    statusBarStyle: 'default',
  },
};

/** Brick Ember light / Charcoal dark — paints the mobile browser chrome. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D70005' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A1A' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /**
     * The `bg-*` pair that used to live here (`bg-white dark:bg-gray-900`)
     * predated the token system and painted the html element a colour the app
     * no longer uses. `body` carries `bg-background` instead, so the overscroll
     * area matches Porcelain / Charcoal.
     *
     * `dir="ltr"` is pinned, not left to the browser: `lang="en"` does NOT
     * force a direction, so on a device whose system language is RTL (Arabic,
     * Hebrew, Urdu...) the whole document — including every form input —
     * renders right-to-left, and typing Latin text displays reversed. This
     * app is English-only Latin script, so LTR is always correct.
     */
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${fontVariables} bg-background antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
          {/* Renders nothing. Registers `public/sw.js` in production only —
              see the component for why dev is excluded. */}
          <ServiceWorkerRegistrar />
          {/* One instance, in the root layout, for the same reason there is
              one <Toaster>: two of these would race for the single-use
              `beforeinstallprompt` event and only one would ever work. */}
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
