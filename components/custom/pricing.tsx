import React from 'react';
import { phFormat } from '@/lib/helpers/currency';
import FadeInOnScroll from './FadeInOnScroll';

interface CheckIconProps {
  className?: string;
}

export const CheckIcon = ({ className = 'w-6 h-6' }: CheckIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface ProPlanIconProps {
  className?: string;
}

export const ProPlanIcon = ({ className = 'w-5 h-5' }: ProPlanIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path>
    <path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"></path>
  </svg>
);

interface TagProps {
  text: string;
}

export const Tag = ({ text }: TagProps) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold tracking-wider text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
    <span className="h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400"></span>
    {text}
  </div>
);

interface GetStartedButtonProps {
  isFeatured: boolean;
  label?: string;
}

export const GetStartedButton = ({
  isFeatured,
  label = 'Get Started',
}: GetStartedButtonProps) => (
  <button
    type="button"
    aria-label={label}
    className={`text-md w-full transform rounded-lg py-3.5 text-center font-semibold transition-all duration-300 ease-in-out hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
      isFeatured
        ? 'bg-white text-orange-700 ring-orange-500 ring-offset-orange-500/20 hover:text-orange-800 dark:bg-gray-900 dark:text-orange-300 dark:hover:text-orange-200'
        : 'bg-gray-200 text-gray-800 ring-gray-300 ring-offset-white hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:ring-offset-black dark:hover:bg-gray-600'
    }`}
  >
    {label}
  </button>
);

interface FeatureListItemProps {
  children: React.ReactNode;
  isFeatured: boolean;
}

const FeatureListItem = ({ children, isFeatured }: FeatureListItemProps) => (
  <li className="flex items-start gap-3">
    <div
      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
        isFeatured ? 'bg-white/25' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <CheckIcon
        className={`${isFeatured ? 'text-white' : 'text-gray-700 dark:text-gray-300'} h-3.5 w-3.5`}
      />
    </div>
    <span
      className={`text-sm ${isFeatured ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}
    >
      {children}
    </span>
  </li>
);

export const Header = ({ numberOfUsers }: { numberOfUsers: string }) => (
  <header className="relative z-10 mb-12 px-4 text-center md:mb-20">
    <div
      className="absolute top-1/2 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-200/50 opacity-40 blur-3xl filter dark:bg-red-900/30"
      aria-hidden="true"
    ></div>

    <FadeInOnScroll>
      <div
        className="animate-fade-in-down mb-4 flex justify-center"
        style={{ animationDelay: '0.2s' }}
      >
        <Tag text={`OVER ${numberOfUsers} USERS`} />
      </div>
    </FadeInOnScroll>

    <FadeInOnScroll>
      <h1 className="text-4xl leading-tight font-extrabold tracking-tighter text-gray-900 sm:text-5xl md:text-6xl dark:text-white">
        Pricing made for <br />
        <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
          teams of all sizes
        </span>
      </h1>
    </FadeInOnScroll>

    <FadeInOnScroll>
      <p
        className="animate-fade-in-down mx-auto mt-6 max-w-2xl text-base text-gray-600 sm:text-lg dark:text-gray-300"
        style={{ animationDelay: '0.4s' }}
      >
        Choose the right plan to keep your projects on track and unlock your
        team&apos;s full potential.
      </p>
    </FadeInOnScroll>
  </header>
);

interface PricingCardProps {
  plan: string;
  price: number;
  description: string;
  features: string[];
  isFeatured?: boolean;
}

export const PricingCard = ({
  plan,
  price,
  description,
  features,
  isFeatured = false,
}: PricingCardProps) => (
  <article
    className={`relative transform rounded-2xl p-6 transition-all duration-300 ease-in-out hover:-translate-y-2 md:p-8 ${
      isFeatured
        ? 'bg-gradient-to-b from-red-500 to-orange-500 text-white shadow-2xl lg:scale-105'
        : 'bg-white text-gray-900 shadow-lg dark:bg-black dark:text-white dark:shadow-gray-800/50'
    }`}
    aria-label={`${plan} plan`}
  >
    {isFeatured && (
      <div className="absolute -top-3 right-6">
        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
          Most popular
        </span>
      </div>
    )}
    <div className="mb-6 flex items-center gap-3">
      <ProPlanIcon
        className={`h-5 w-5 ${isFeatured ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}
      />
      <h3
        className={`text-xs font-bold tracking-widest uppercase ${
          isFeatured ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {plan}
      </h3>
    </div>

    <div className="mb-6 flex items-baseline gap-1.5">
      {price === 0 ? (
        <>
          <span
            className={`text-4xl font-bold sm:text-5xl ${isFeatured ? 'text-white' : 'text-gray-900 dark:text-white'}`}
          >
            Free
          </span>
          <span
            className={`${isFeatured ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'} text-sm`}
          >
            &nbsp;Forever
          </span>
        </>
      ) : (
        <>
          <span
            className={`text-4xl font-bold sm:text-5xl ${isFeatured ? 'text-white' : 'text-gray-900 dark:text-white'}`}
          >
            {phFormat.format(price)}
          </span>
          <span
            className={`${isFeatured ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'} text-sm`}
          >
            &nbsp;/ month
          </span>
        </>
      )}
    </div>

    <p
      className={`mb-8 min-h-[4.5rem] text-sm ${isFeatured ? 'text-white/85' : 'text-gray-600 dark:text-gray-300'}`}
    >
      {description}
    </p>

    <div className="mb-8">
      <GetStartedButton
        isFeatured={isFeatured}
        label={price === 0 ? 'Get Started Free' : 'Get Started'}
      />
    </div>

    <ul className="space-y-4">
      {features.map((feature, index) => (
        <FeatureListItem key={`${plan}-${index}`} isFeatured={isFeatured}>
          {feature}
        </FeatureListItem>
      ))}
    </ul>
  </article>
);
