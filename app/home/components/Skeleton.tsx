'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function FeatureCard({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(`relative overflow-hidden p-4 sm:p-8`, className)}>
      {children}
    </div>
  );
}

export function SkeletonOne() {
  return (
    <div className="relative flex h-full gap-10 px-2 py-8">
      <div className="group mx-auto h-full w-full bg-white p-5 shadow-2xl dark:bg-neutral-900">
        <div className="flex h-full w-full flex-1 flex-col space-y-2">
          <Image
            src="/images/dashboard-sample.png"
            alt="header"
            width={800}
            height={800}
            className="aspect-square h-full w-full rounded-sm object-cover object-left-top"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-60 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-60 w-full bg-gradient-to-b from-white via-transparent to-transparent dark:from-black" />
    </div>
  );
}

export function SkeletonThree() {
  return (
    <div className="group mx-auto h-full w-full bg-transparent dark:bg-transparent">
      <div className="relative flex h-full w-full flex-1 flex-col space-y-2">
        <Image
          src="/images/dashboard-sample.png"
          alt="header"
          width={800}
          height={800}
          className="aspect-square h-full w-full rounded-sm object-cover object-center blur-none transition-all duration-200 group-hover/image:blur-md"
        />
      </div>
    </div>
  );
}

export function SkeletonTwo() {
  const images = [
    '/images/dashboard-sample.png',
    '/images/dashboard-sample.png',
    '/images/dashboard-sample.png',
    '/images/dashboard-sample.png',
    '/images/dashboard-sample.png',
    '/images/dashboard-sample.png',
  ];

  const imageVariants = {
    whileHover: {
      scale: 1.1,
      rotate: 0,
      zIndex: 100,
    },
    whileTap: {
      scale: 1.1,
      rotate: 0,
      zIndex: 100,
    },
  };
  return (
    <div className="relative flex h-full flex-col items-start gap-10 overflow-hidden p-8">
      <div className="-ml-20 flex flex-row">
        {images.map((image, idx) => (
          <motion.div
            suppressHydrationWarning
            variants={imageVariants}
            key={'images-first' + idx}
            style={{
              rotate: Math.random() * 20 - 10,
            }}
            whileHover="whileHover"
            whileTap="whileTap"
            className="mt-4 -mr-4 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <Image
              src={image}
              alt="bali images"
              width="500"
              height="500"
              className="h-20 w-20 shrink-0 rounded-lg object-cover md:h-40 md:w-40"
            />
          </motion.div>
        ))}
      </div>
      <div className="flex flex-row">
        {images.map((image, idx) => (
          <motion.div
            suppressHydrationWarning
            key={'images-second' + idx}
            style={{
              rotate: Math.random() * 20 - 10,
            }}
            variants={imageVariants}
            whileHover="whileHover"
            whileTap="whileTap"
            className="mt-4 -mr-4 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <Image
              src={image}
              alt="bali images"
              width="500"
              height="500"
              className="h-20 w-20 shrink-0 rounded-lg object-cover md:h-40 md:w-40"
            />
          </motion.div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-[100] h-full w-20 bg-gradient-to-r from-white to-transparent dark:from-black" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[100] h-full w-20 bg-gradient-to-l from-white to-transparent dark:from-black" />
    </div>
  );
}

export function SkeletonFour() {
  return (
    <div className="relative mt-10 flex h-60 flex-col items-center bg-transparent md:h-60 dark:bg-transparent">
      <Image
        src="/images/dashboard-sample.png"
        alt="header"
        width={800}
        height={800}
        className="aspect-square h-screen w-full rounded-sm object-cover object-left-top"
      />
    </div>
  );
}

export function FeatureTitle({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-5xl text-left text-xl tracking-tight text-black md:text-2xl md:leading-snug dark:text-white">
      {children}
    </p>
  );
}

export function FeatureDescription({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        'mx-auto max-w-4xl text-left text-sm md:text-base',
        'text-center font-normal text-neutral-500 dark:text-neutral-300',
        'mx-0 my-2 max-w-sm text-left md:text-sm',
      )}
    >
      {children}
    </p>
  );
}
