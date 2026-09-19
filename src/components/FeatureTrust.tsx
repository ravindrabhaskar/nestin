import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { TRUST_POINTS } from '../data/landingData';

const trustImage = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80';

export const FeatureTrust: React.FC = () => {
  return (
    <section className="py-10 md:py-16 px-4 sm:px-8 lg:px-12 max-w-[1360px] mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          <div className="space-y-3">
            <span className="text-[11px] sm:text-xs font-bold tracking-widest text-slate-400 uppercase font-heading">
              LISTINGS YOU'LL ACTUALLY TRUST
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight text-[#121820] font-heading leading-[1.15]">
              Every stay is checked <span className="text-[#a3e635]">for you.</span>
            </h2>
          </div>

          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
            We verify every property for safety, cleanliness and authenticity — so you never book blind.
          </p>

          {/* Bullet List */}
          <div className="space-y-3 pt-2">
            {TRUST_POINTS.map((point, idx) => (
              <motion.div
                key={point}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + idx * 0.08 }}
                className="flex items-center gap-3 group cursor-default"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#d9f99d] flex items-center justify-center text-slate-950">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm sm:text-base font-semibold text-slate-700">{point}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Feature Image Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="relative h-[320px] sm:h-[420px] md:h-[460px] w-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-200/50">
            <img
              src={trustImage}
              alt="Every stay is checked for you - Verified Bedroom"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
