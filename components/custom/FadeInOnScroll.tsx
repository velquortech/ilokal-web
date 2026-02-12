'use client'; // This component uses client-side hooks

import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const fadeInVariants = {
  hidden: { opacity: 0, y: 50 }, // Starts 50px down and invisible
  visible: {
    opacity: 1,
    y: 0, // Ends at original position and fully visible
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

const FadeInOnScroll = ({ children }: { children: React.ReactNode }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true, // Animation only runs once
    threshold: 0.1, // Triggers when 10% of the item is visible
  });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={fadeInVariants}
    >
      {children}
    </motion.div>
  );
};

export default FadeInOnScroll;
