import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { scrollToTarget } from './SmoothScroll';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate scroll progress percentage (0 to 100)
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
        setScrollProgress(progress);
      }

      // Show button after scrolling past hero (~350px or 40% of viewport)
      const threshold = Math.min(400, window.innerHeight * 0.45);
      if (scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    scrollToTarget(0, { duration: 1.15 });
  };

  // SVG circular progress parameters
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 18 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-40 pointer-events-auto"
        >
          <motion.button
            type="button"
            onClick={handleScrollToTop}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Scroll to top of page"
            title="Scroll to top"
            className="relative group w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-900/95 hover:bg-slate-950 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md border border-slate-700/60 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635]"
          >
            {/* Circular Progress Ring SVG */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5"
              viewBox="0 0 48 48"
            >
              {/* Background ring */}
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-slate-700/40"
                strokeWidth="2.5"
                fill="none"
              />
              {/* Active progress ring */}
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-[#a3e635] transition-all duration-150 ease-out"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Icon */}
            <ArrowUp className="w-5 h-5 text-white group-hover:text-[#a3e635] transition-colors stroke-[2.5] relative z-10 group-hover:-translate-y-0.5 transition-transform duration-200" />

            {/* Hover Tooltip for desktop */}
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-md border border-slate-700">
              Back to top
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
