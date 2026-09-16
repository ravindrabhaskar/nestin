import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { STATS_DATA } from '../data/landingData';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  displayOverride?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  suffix = '',
  displayOverride,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || displayOverride) return;

    let startTime: number;
    const duration = 2000; // 2 seconds

    const updateCounter = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [isInView, value, displayOverride]);

  if (displayOverride) {
    return (
      <span ref={ref} className="inline-block">
        {displayOverride}
      </span>
    );
  }

  return (
    <span ref={ref} className="inline-block">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

export const StatsSection: React.FC = () => {
  return (
    <section className="pt-10 pb-12 sm:pt-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center py-4">
        {STATS_DATA.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center space-y-1 p-2"
          >
            <div className="text-h1 sm:text-4xl md:text-5xl font-black tracking-tight text-[#121820]">
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                displayOverride={stat.display}
              />
            </div>
            <div className="text-small font-medium text-slate-500 tracking-wide">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
