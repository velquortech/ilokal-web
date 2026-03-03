import { Manrope } from 'next/font/google';
import { Navigation } from '@/components/custom/Navigation';
import { Footer } from '@/components/custom/Footer';

const manrope = Manrope({
  variable: '--font-manrope',
  display: 'swap',
  subsets: ['latin'],
});

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${manrope.variable} antialiased`}>
      <main className="container mx-auto py-8">
        <Navigation />
        {children}
      </main>
      <Footer />
    </div>
  );
}
