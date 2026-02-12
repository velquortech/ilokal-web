import { JSX } from 'react';
import { PricingCard, Header } from '@/components/custom/pricing';
import { pricingPlans } from '../helpers/constants';

export function Pricing(): JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-white font-sans dark:bg-black">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <Header numberOfUsers="10,000" />
        <main className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 lg:grid-cols-3 lg:gap-10">
          {pricingPlans.map((plan, index) => (
            <PricingCard key={`${plan.plan}-${index}`} {...plan} />
          ))}
        </main>
      </div>
    </div>
  );
}
