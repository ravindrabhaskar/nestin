import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Star } from 'lucide-react';
import { TESTIMONIALS_DATA } from '../data/landingData';
import { LazyImage } from './LazyImage';

interface TestimonialsSectionProps {
  isLoading?: boolean;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ isLoading = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto slide timer
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS_DATA.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const current = TESTIMONIALS_DATA[activeIndex];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      <div className="space-y-8">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#121820] font-heading"
        >
          Our residents speak
        </motion.h2>

        {/* Large Quote Symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex justify-center text-slate-800"
        >
          <Quote className="w-12 h-12 rotate-180 text-slate-800" />
        </motion.div>

        {/* Loading Skeleton vs Quote Content */}
        {isLoading ? (
          <div className="min-h-[140px] flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto animate-pulse">
            <div className="h-5 bg-slate-200 rounded-full w-3/4" />
            <div className="h-5 bg-slate-200 rounded-full w-1/2" />
            <div className="flex gap-1 pt-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="w-4 h-4 bg-slate-200 rounded-full" />
              ))}
            </div>
          </div>
        ) : (
          <div className="min-h-[140px] sm:min-h-[120px] flex items-center justify-center px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="space-y-4 max-w-3xl"
              >
                <p className="text-lg sm:text-xl md:text-2xl font-medium text-slate-700 italic leading-relaxed font-sans">
                  "{current.text}"
                </p>

                {/* Star Rating */}
                <div className="flex justify-center gap-1 text-[#88d900]">
                  {[...Array(current.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Star className="w-4 h-4 fill-[#a3e635] text-[#88d900]" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Avatar Selector Pills Below */}
        {!isLoading && (
          <div className="flex items-center justify-center gap-3 pt-6">
            {TESTIMONIALS_DATA.map((item, idx) => {
              const isActive = activeIndex === idx;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveIndex(idx)}
                  className={`transition-all duration-300 rounded-full flex items-center gap-2.5 p-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#063826] text-white px-4 py-1.5 shadow-lg border border-[#a3e635]/50'
                      : 'bg-stone-200/80 text-slate-700 hover:bg-stone-300 w-10 h-10 justify-center'
                  }`}
                >
                  <LazyImage
                    src={item.avatar}
                    alt={item.name}
                    className="w-7 h-7 rounded-full flex-shrink-0 ring-1 ring-white/50"
                    imgClassName="w-full h-full object-cover rounded-full"
                    placeholderColor="bg-stone-300"
                  />

                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-left whitespace-nowrap overflow-hidden"
                    >
                      <span className="block text-xs font-bold font-heading text-white leading-tight">{item.name}</span>
                      <span className="block text-[10px] text-[#a3e635] font-sans">{item.role}</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
