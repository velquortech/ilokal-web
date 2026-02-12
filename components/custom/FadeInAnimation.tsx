'use client';

import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface FadeInAnimation {
  children: ReactNode;
  delay: number;
}

export const FadeInAnimation = ({ children, delay }: FadeInAnimation) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: [0.42, 0, 0.58, 1],
      }}
    >
      {children}
    </motion.div>
  );
};
