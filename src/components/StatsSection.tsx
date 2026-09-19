import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { usePlatformStats } from '../lib/usePlatformData';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, suffix = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const duration = 1600;
    let frame = 0;

    const updateCounter = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));
      if (progress < 1) frame = requestAnimationFrame(updateCounter);
    };

    frame = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value]);

  return (
    <span ref={ref} className="inline-block">
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

/**
 * Live platform numbers. Every figure comes from /public/stats — nothing here is marketing copy,
 * so a new deployment honestly shows small numbers until real supply exists.
 */
export const StatsSection: React.FC = () => {
  const { value: stats, loaded } = usePlatformStats();

  const items = [
    { label: 'Verified stays', value: stats.verifiedListings, suffix: '' },
    { label: 'Beds listed', value: stats.bedsListed, suffix: '' },
    { label: 'Cities live', value: stats.cities, suffix: '' },
    { label: 'Residents housed', value: stats.residentsHoused, suffix: '' },
  ];

  return (
    <section
      className="pt-10 pb-12 sm:pt-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      aria-label="Platform statistics"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center py-4">
        {items.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center space-y-1 p-2"
          >
            <div className="text-h1 sm:text-4xl md:text-5xl font-black tracking-tight text-[#121820]">
              {loaded ? (
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              ) : (
                <span className="inline-block text-slate-300">—</span>
              )}
            </div>
            <div className="text-small font-medium text-slate-500 tracking-wide">{stat.label}</div>
          </motion.div>
        ))}
      </div>
      <p className="text-center text-[11px] text-slate-400 mt-2">
        Live numbers from the NestIn platform
        {loaded && stats.generatedAt
          ? ` · updated ${new Date(stats.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
          : ''}
        .
      </p>
    </section>
  );
};
