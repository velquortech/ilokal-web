import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'iLokal — discover through experience',
    template: '%s · iLokal',
  },
  description:
    'iLokal is a hyperlocal discovery platform that helps Filipinos find and support nearby cafés, restaurants, boutiques, and other homegrown brands.',
  openGraph: {
    title: 'iLokal — discover through experience',
    description:
      'Find and support nearby cafés, restaurants, boutiques, and other homegrown brands.',
    siteName: 'iLokal',
    type: 'website',
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
