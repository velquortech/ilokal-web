import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
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
     */
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} bg-background antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
