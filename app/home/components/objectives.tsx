import {
  SkeletonOne,
  SkeletonTwo,
  SkeletonThree,
  SkeletonFour,
  FeatureCard,
  FeatureTitle,
  FeatureDescription,
} from './Skeleton';
import FadeInOnScroll from '@/components/custom/FadeInOnScroll';

import { JSX } from 'react';

export function Objectives(): JSX.Element {
  const features = [
    {
      title: 'Seamless Transaction',
      description:
        'Our user-friendly website makes booking a karaoke box quick and hassle-free, with a smooth reservation process that confirms your spot in just a few clicks.',
      skeleton: <SkeletonOne />,
      className:
        'col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800',
    },
    {
      title: 'Role-based Access',
      description: `Enjoy top-notch sound systems, extensive song libraries, and comfortable private rooms designed to elevate your singing experience, whether you're a solo star or with a group.`,
      skeleton: <SkeletonTwo />,
      className: 'border-b col-span-1 lg:col-span-2 dark:border-neutral-800',
    },
    {
      title: 'Approval Queue',
      description:
        'We guarantee your karaoke is ready exactly when you need it, with precise scheduling and priority booking options to fit your plans perfectly',
      skeleton: <SkeletonThree />,
      className:
        'col-span-1 lg:col-span-3 lg:border-r  dark:border-neutral-800',
    },
    {
      title: 'Guardrail Engine',
      description:
        'Get premium karaoke experiences at budget-friendly prices, with packages tailored to every group size, ensuring everyone can sing like a star without breaking the bank.',
      skeleton: <SkeletonFour />,
      className: 'col-span-1 lg:col-span-3 border-b lg:border-none',
    },
  ];

  return (
    <div className="pt-18">
      <section className="flex items-end">
        <h1 className="max-w-2xl flex-1 text-6xl font-bold">
          Built for Fast Moving Teams That Need Control.
        </h1>
        <span className="flex-1 text-2xl text-gray-500">
          Agents work inside your existing tools, with built-in approvals, brand
          and policy guardrails, and ful ltraceability. Every action is
          auditable, every outcome accountable.
        </span>
      </section>

      <FadeInOnScroll>
        <div className="relative">
          <div className="mt-12 grid grid-cols-1 rounded-md bg-white lg:grid-cols-6 xl:border dark:border-neutral-800">
            {features.map((feature) => (
              <FeatureCard key={feature.title} className={feature.className}>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
                <div className="h-full w-full">{feature.skeleton}</div>
              </FeatureCard>
            ))}
          </div>
        </div>
      </FadeInOnScroll>
    </div>
  );
}
