import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  CalendarCheck,
  KeyRound,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { STEPS_DATA } from '../data/landingData';

const STEP_ICONS = [
  <Search className="w-6 h-6 text-[#121820]" strokeWidth={2} key="search" />,
  <SlidersHorizontal className="w-6 h-6 text-[#121820]" strokeWidth={2} key="filter" />,
  <CalendarCheck className="w-6 h-6 text-[#121820]" strokeWidth={2} key="calendar" />,
  <KeyRound className="w-6 h-6 text-[#121820]" strokeWidth={2} key="key" />,
];

interface StepsSectionProps {
  onStepAction: (stepIdx: number) => void;
}

export const StepsSection: React.FC<StepsSectionProps> = ({ onStepAction }) => {
  const [activeStep, setActiveStep] = useState<number | null>(1);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Touch gesture state for mobile swiping
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // The step currently highlighted (either hovered or active)
  const highlightedStep = hoveredStep !== null ? hoveredStep : (activeStep ?? 0);

  const handleStepClick = (idx: number) => {
    if (activeStep === idx) {
      setActiveStep(null);
    } else {
      setActiveStep(idx);
    }
  };

  // Touch gesture handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY) * 1.2;
    const minSwipeDistance = 35;

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      const current = activeStep ?? 0;
      if (distanceX > 0) {
        // Swipe left -> Next step
        const next = Math.min(STEPS_DATA.length - 1, current + 1);
        setActiveStep(next);
      } else {
        // Swipe right -> Previous step
        const prev = Math.max(0, current - 1);
        setActiveStep(prev);
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const activeData =
    hoveredStep !== null ? STEPS_DATA[hoveredStep] : activeStep !== null ? STEPS_DATA[activeStep] : null;

  // Precise path length stops corresponding to step circle centers
  const pathLengthValue = (highlightedStep + 1) / 4;

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative overflow-visible">
      {/* Header matching exact screenshot typography */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 md:mb-20">
        <span className="text-caption font-extrabold tracking-widest text-slate-400 uppercase font-heading">
          SIMPLE STEPS
        </span>
        <h2 className="text-h1 sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#121820] leading-[1.15]">
          Simple steps to your <span className="text-[#a3e635]">new home.</span>
        </h2>
        <p className="text-slate-500 text-body max-w-2xl mx-auto">
          From searching to viewing to moving in — finding a verified stay stays effortless.
        </p>
      </div>

      {/* Steps Container with Organic Wave Line & Touch Swipe support */}
      <div
        className="relative touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Continuous Organic Wavy Line behind icons passing through circle centers */}
        <div className="hidden lg:block absolute top-[36px] left-0 right-0 h-[80px] sm:h-[88px] z-0 pointer-events-none">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 100" fill="none" preserveAspectRatio="none">
            {/* Gray background path */}
            <path
              d="M 10,60 C 60,60 95,50 125,50 C 180,50 220,30 270,30 C 320,30 350,50 375,50 C 420,50 470,68 520,68 C 570,68 600,50 625,50 C 670,50 720,32 770,32 C 820,32 850,50 875,50 C 910,50 940,55 990,55"
              stroke="#e2e8f0"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Dynamic Lime Green path overlay up to active/hovered step */}
            <motion.path
              d="M 10,60 C 60,60 95,50 125,50 C 180,50 220,30 270,30 C 320,30 350,50 375,50 C 420,50 470,68 520,68 C 570,68 600,50 625,50 C 670,50 720,32 770,32 C 820,32 850,50 875,50 C 910,50 940,55 990,55"
              stroke="#a3e635"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: pathLengthValue }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </div>

        {/* 4 Steps Columns matching exact borderless design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 relative z-10">
          {STEPS_DATA.map((stepItem, idx) => {
            const isHighlighted = highlightedStep === idx;

            return (
              <motion.div
                key={stepItem.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                onClick={() => handleStepClick(idx)}
                onMouseEnter={() => setHoveredStep(idx)}
                onMouseLeave={() => setHoveredStep(null)}
                className="flex flex-col items-center text-center cursor-pointer select-none group"
              >
                {/* Step Number label */}
                <span
                  className={`text-xs font-bold font-heading tracking-widest mb-3 transition-colors ${
                    isHighlighted ? 'text-[#7ac800] font-extrabold' : 'text-slate-400'
                  }`}
                >
                  {stepItem.step}
                </span>

                {/* Circle Icon Badge with Aura Ring when Highlighted */}
                <div className="my-2 relative flex items-center justify-center">
                  {/* Outer Lime Halo Ring for Highlighted Step */}
                  {isHighlighted && (
                    <motion.div
                      layoutId="halo-ring"
                      className="absolute -inset-3.5 rounded-full bg-[#a3e635]/30 border border-[#a3e635]/60 -z-10"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  <motion.div
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.96 }}
                    className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                      isHighlighted
                        ? 'bg-[#a3e635] text-[#121820] shadow-[0_4px_20px_rgba(163,230,53,0.4)]'
                        : 'bg-white text-[#121820] border border-slate-200/80 shadow-xs hover:border-[#a3e635]'
                    }`}
                  >
                    {STEP_ICONS[idx]}
                  </motion.div>
                </div>

                {/* Title & Description */}
                <div className="mt-6 mb-3 space-y-2 max-w-xs">
                  <h3 className="text-base sm:text-lg font-extrabold font-heading inline-block relative transition-colors duration-200">
                    <span
                      className={
                        isHighlighted
                          ? 'border-b-2 border-[#a3e635] pb-0.5 text-[#7ac800] font-black'
                          : 'text-[#121820] group-hover:text-[#7ac800]'
                      }
                    >
                      {stepItem.title}
                    </span>
                  </h3>

                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed px-2">{stepItem.description}</p>
                </div>

                {/* Bottom CTA Link */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStepClick(idx);
                  }}
                  className={`mt-2 inline-flex items-center gap-1 text-xs font-bold font-heading transition-colors cursor-pointer ${
                    isHighlighted ? 'text-[#7ac800]' : 'text-[#7ac800]/80 group-hover:text-[#7ac800]'
                  }`}
                >
                  <span>{stepItem.cta}</span>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile Swipe Indicators & Navigation Controls */}
        <div className="flex lg:hidden items-center justify-between mt-8 px-4">
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.max(0, (prev ?? 0) - 1))}
            disabled={(activeStep ?? 0) === 0}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#a3e635] hover:text-[#7ac800] transition-colors cursor-pointer shadow-xs"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {STEPS_DATA.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  highlightedStep === idx ? 'w-7 bg-[#a3e635]' : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(STEPS_DATA.length - 1, (prev ?? 0) + 1))}
            disabled={(activeStep ?? 0) === STEPS_DATA.length - 1}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#a3e635] hover:text-[#7ac800] transition-colors cursor-pointer shadow-xs"
            aria-label="Next step"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Swipe hint text on mobile */}
        <p className="text-center text-[11px] text-slate-400 font-medium mt-2 lg:hidden tracking-wide">
          Swipe left or right to explore steps
        </p>

        {/* Expandable Detail Drawer below grid when step is selected */}
        <div className="mt-12">
          <AnimatePresence mode="wait">
            {activeData && (
              <motion.div
                key={activeData.step}
                initial={{ opacity: 0, y: 15, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#a3e635]/60 max-w-3xl mx-auto relative overflow-hidden"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveStep(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-3 pr-8">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-widest text-slate-950 bg-[#a3e635] px-3 py-1 rounded-full uppercase font-heading">
                      STEP {activeData.step}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-heading">VERIFIED PROCESS</span>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-extrabold text-[#121820] font-heading">{activeData.title}</h4>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{activeData.popoverText}</p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onStepAction(highlightedStep);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#a3e635] text-[#0F5132] hover:bg-[#8ece28] font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#a3e635]/20 font-heading"
                    >
                      <span>{activeData.cta.replace('→', '').trim()}</span>
                      <ArrowRight className="w-4 h-4 text-[#0F5132]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
