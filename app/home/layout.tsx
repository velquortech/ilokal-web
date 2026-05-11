import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Navigation } from '@/components/custom/Navigation';
import { Footer } from '@/components/custom/Footer';

const manrope = Manrope({
  variable: '--font-manrope',
  display: 'swap',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ilokal web application',
  description:
    'Ilokal will help local business to gain more customers through their own products',
};

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} antialiased`}
        suppressHydrationWarning
      >
        <main className="container mx-auto py-8">
          <Navigation />
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
