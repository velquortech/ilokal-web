import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'iLokal — Discover Iloilo’s best local shops and deals',
  description:
    'Find verified local cafés, restaurants, and stores near you in Iloilo City. Claim exclusive coupons, follow your favorites, and support Ilonggo businesses.',
};

/**
 * Pass-through layout. The landing (`LandingPage`) ships its own sticky nav,
 * footer, and self-contained theme, so this route no longer injects the generic
 * Navigation/Footer chrome. `<html>`/`<body>`, fonts, and ThemeProvider come from
 * the root `app/layout.tsx`.
 */
export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
