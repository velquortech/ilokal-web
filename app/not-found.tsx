'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';

export default function NotFound() {
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

  const floatingVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8 },
    },
    float: {
      y: [0, -20, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
      },
    },
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12">
      {/* Animated background elements*/}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 h-72 w-72 animate-pulse rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute right-10 bottom-20 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? 'visible' : 'hidden'}
        className="relative z-10 max-w-2xl text-center"
      >
        {/* 404 Number */}
        <motion.div
          variants={floatingVariants}
          animate={isLoaded ? 'float' : ''}
        >
          <div className="mb-6 bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-9xl leading-none font-bold text-transparent md:text-[12rem]">
            404
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            Page Could Not Be Found
          </h1>
          <p className="text-lg leading-relaxed text-slate-300 md:text-xl">
            Oops! The page you're looking for seems to have wandered off into
            the digital void. Let's help you get back on track.
          </p>
        </motion.div>

        {/* Search suggestion */}
        <motion.div
          variants={itemVariants}
          className="mb-8 flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-slate-300">
            <Search className="h-4 w-4" />
            <span className="text-sm">Error Code: 404 · Page Not Found</span>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          variants={itemVariants}
          className="mb-12 flex flex-col justify-center gap-4 sm:flex-row"
        >
          {/* Home button */}
          <Link href={ROUTES.BUSINESS.home}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-purple-600 to-purple-700 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-purple-500 hover:to-purple-600 hover:shadow-purple-500/50"
            >
              <Home className="h-5 w-5" />
              Go to Home
            </motion.button>
          </Link>

          {/* Back button */}
          <motion.button
            onClick={() => window.history.back()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-8 py-3 font-semibold text-white transition-all duration-300 hover:border-slate-500 hover:bg-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </motion.button>
        </motion.div>

        {/* Helpful suggestions */}
        <motion.div variants={itemVariants} className="text-left">
          <p className="mb-4 text-sm font-semibold text-slate-400">
            What you can try:
          </p>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-purple-400">→</span>
              <span>Check if the URL is typed correctly</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-purple-400">→</span>
              <span>Return to the home page and navigate from there</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-bold text-purple-400">→</span>
              <span>Contact support if you believe this is an error</span>
            </li>
          </ul>
        </motion.div>

        {/* Footer note */}
        <motion.div
          variants={itemVariants}
          className="mt-12 border-t border-slate-700/50 pt-8"
        >
          <p className="text-sm text-slate-400">
            Lost in the digital wilderness? Let's get you back home.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
