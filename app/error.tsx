'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/config/routeConfig';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-900 via-red-900 to-slate-900 px-4 py-12">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 h-72 w-72 animate-pulse rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute right-10 bottom-20 h-96 w-96 animate-pulse rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? 'visible' : 'hidden'}
        className="relative z-10 max-w-2xl text-center"
      >
        {/* Alert Icon */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full border border-red-500/30 bg-red-500/20 p-4">
              <AlertTriangle className="h-12 w-12 text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            Something Went Wrong
          </h1>
          <p className="text-lg leading-relaxed text-slate-300 md:text-xl">
            An unexpected error occurred. Don't worry, our team has been
            notified and we're working to fix it. In the meantime, you can try
            the options below.
          </p>
        </motion.div>

        {/* Error Details (if available in development) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <motion.div variants={itemVariants} className="mb-8">
            <details className="text-left">
              <summary className="cursor-pointer text-sm font-semibold text-slate-400 hover:text-slate-300">
                Error Details (Development Only)
              </summary>
              <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-left">
                <p className="font-mono text-xs break-all text-slate-400">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-slate-500">
                    ID: {error.digest}
                  </p>
                )}
              </div>
            </details>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          variants={itemVariants}
          className="mb-12 flex flex-col justify-center gap-4 sm:flex-row"
        >
          {/* Retry button */}
          <motion.button
            onClick={() => reset()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-orange-600 to-red-600 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-orange-500 hover:to-red-500 hover:shadow-red-500/50"
          >
            <RotateCcw className="h-5 w-5" />
            Try Again
          </motion.button>

          {/* Home button */}
          <Link href={ROUTES.PUBLIC.HOME}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-8 py-3 font-semibold text-white transition-all duration-300 hover:border-slate-500 hover:bg-slate-700"
            >
              <Home className="h-5 w-5" />
              Go to Home
            </motion.button>
          </Link>
        </motion.div>

        {/* Helpful information */}
        <motion.div variants={itemVariants} className="text-left">
          <p className="mb-4 text-sm font-semibold text-slate-400">
            What just happened?
          </p>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-orange-400">•</span>
              <span>An unexpected error affected your session</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-orange-400">•</span>
              <span>We've been notified and are investigating</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-orange-400">•</span>
              <span>Try refreshing the page or going back to home</span>
            </li>
          </ul>
        </motion.div>

        {/* Footer note */}
        <motion.div
          variants={itemVariants}
          className="mt-12 border-t border-slate-700/50 pt-8"
        >
          <p className="text-sm text-slate-400">
            If the problem persists, please contact our support team.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
