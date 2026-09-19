import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Users, Search, ChevronDown, Check, X } from 'lucide-react';
import { SearchFilterState } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';

interface HeroProps {
  onSearch: (filters: SearchFilterState) => void;
}

const CITIES = ['Bengaluru', 'Hyderabad', 'Pune', 'Delhi NCR', 'Chennai', 'Mumbai'];
const OCCUPANT_OPTIONS = ['1 Occupant', '2 Occupants', '3+ Occupants', 'Private Room', 'Whole Flat'];

export const Hero: React.FC<HeroProps> = ({ onSearch }) => {
  const [filters, setFilters] = useState<SearchFilterState>({
    location: 'Bengaluru',
    moveInDate: '2026-08-15',
    occupants: '1 Occupant',
  });

  const [activeDropdown, setActiveDropdown] = useState<'location' | 'date' | 'occupants' | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  useScrollLock(isVideoModalOpen);

  // Close dropdowns on outside click or when page is scrolled
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };

    const handleScroll = () => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeDropdown]);

  const handleSearchClick = () => {
    setActiveDropdown(null);
    onSearch(filters);
  };

  return (
    <section className="relative pt-20 sm:pt-24 md:pt-28 pb-14 md:pb-16 px-4 sm:px-8 lg:px-12 max-w-[1360px] mx-auto overflow-visible">
      {/* Outer Rounded Hero Frame */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full min-h-[440px] sm:min-h-[490px] md:min-h-[530px] rounded-[2rem] sm:rounded-[2.6rem] md:rounded-[3rem] shadow-2xl flex flex-col justify-center items-center text-center p-4 sm:p-8 md:p-12 pb-16 sm:pb-20 bg-[#252c36] border border-slate-800/60"
      >
        {/* Inner Background Container with smooth zoom */}
        <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.6rem] md:rounded-[3rem] overflow-hidden pointer-events-none select-none">
          {/* PG Room Image with smooth zoom */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className="absolute inset-0 w-full h-full bg-cover bg-center brightness-90 shadow-inner pointer-events-none"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=2200&q=80')`,
            }}
          />

          {/* Subtle Dark Vignette for High Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-slate-950/30 pointer-events-none" />
        </div>

        {/* Hero Text Content */}
        <div className="max-w-4xl mx-auto z-10 space-y-3 sm:space-y-4 mb-14 sm:mb-20 md:mb-24 flex flex-col items-center px-2 pointer-events-auto">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.18] font-heading"
          >
            Find your space. <span className="text-[#a3e635]">Move in with</span>
            <br className="hidden sm:block" />
            <span className="text-[#a3e635] sm:mt-1 inline-block">confidence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-slate-200/90 text-xs sm:text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed px-2"
          >
            Verified PGs, hostels and co-living homes across India
          </motion.p>
        </div>

        {/* Floating Search Bar Widget Overlapping Bottom */}
        <motion.div
          ref={searchBarRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -bottom-12 sm:-bottom-8 left-3 right-3 sm:left-auto sm:right-auto w-[calc(100%-1.5rem)] sm:w-[92%] lg:w-[860px] mx-auto z-30 pointer-events-auto"
        >
          <div className="bg-white/95 backdrop-blur-xl border border-white/80 p-2 sm:p-2.5 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-stretch md:items-center gap-1 md:gap-0 justify-between text-left">
            {/* Field 1: LOCATION */}
            <div className="relative flex-1 w-full md:w-auto px-3.5 sm:px-5 py-2 border-b md:border-b-0 md:border-r border-slate-200/80 cursor-pointer group">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'location' ? null : 'location')}
                className="w-full text-left flex items-center justify-between gap-2 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase font-heading">
                    <MapPin className="w-3.5 h-3.5 text-[#84cc00]" />
                    <span>LOCATION</span>
                  </div>
                  <div className="text-slate-900 font-extrabold text-xs sm:text-sm lg:text-base mt-0.5 flex items-center gap-1">
                    <span>{filters.location}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                </div>
              </button>

              {/* Location Dropdown */}
              <AnimatePresence>
                {activeDropdown === 'location' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50"
                  >
                    {CITIES.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, location: city });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs sm:text-sm rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          filters.location === city
                            ? 'bg-[#a3e635]/20 text-slate-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{city}</span>
                        {filters.location === city && <Check className="w-4 h-4 text-[#84cc00]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Field 2: MOVE IN */}
            <div className="relative flex-1 w-full md:w-auto px-3.5 sm:px-5 py-2 border-b md:border-b-0 md:border-r border-slate-200/80 cursor-pointer group">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
                className="w-full text-left flex items-center justify-between gap-2 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase font-heading">
                    <Calendar className="w-3.5 h-3.5 text-[#84cc00]" />
                    <span>MOVE IN</span>
                  </div>
                  <div className="text-slate-900 font-extrabold text-xs sm:text-sm lg:text-base mt-0.5">
                    {filters.moveInDate || 'dd-mm-yyyy'}
                  </div>
                </div>
              </button>

              {/* Date Input Dropdown */}
              <AnimatePresence>
                {activeDropdown === 'date' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute top-full left-0 md:left-1/2 md:-translate-x-1/2 mt-2 p-3 sm:p-4 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 w-60 sm:w-64"
                  >
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Move-in Date</label>
                    <input
                      type="date"
                      value={filters.moveInDate}
                      onChange={(e) => {
                        setFilters({ ...filters, moveInDate: e.target.value });
                        setActiveDropdown(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Field 3: OCCUPANTS */}
            <div className="relative flex-1 w-full md:w-auto px-3.5 sm:px-5 py-2 cursor-pointer group">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'occupants' ? null : 'occupants')}
                className="w-full text-left flex items-center justify-between gap-2 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase font-heading">
                    <Users className="w-3.5 h-3.5 text-[#84cc00]" />
                    <span>OCCUPANTS</span>
                  </div>
                  <div className="text-slate-900 font-extrabold text-xs sm:text-sm lg:text-base mt-0.5 flex items-center gap-1">
                    <span>{filters.occupants}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                </div>
              </button>

              {/* Occupants Dropdown */}
              <AnimatePresence>
                {activeDropdown === 'occupants' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50"
                  >
                    {OCCUPANT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setFilters({ ...filters, occupants: opt });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs sm:text-sm rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          filters.occupants === opt
                            ? 'bg-[#a3e635]/20 text-slate-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {filters.occupants === opt && <Check className="w-4 h-4 text-[#84cc00]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Field 4: Search Button */}
            <div className="p-1">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleSearchClick}
                className="w-full md:w-12 md:h-12 lg:w-13 lg:h-13 h-11 bg-[#a3e635] hover:bg-[#8ece28] text-[#0F5132] rounded-xl md:rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all duration-200 cursor-pointer group gap-2 px-4 md:px-0"
                aria-label="Search PGs"
              >
                <Search className="w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 text-[#0F5132]" />
                <span className="inline md:hidden font-extrabold text-[#0F5132]">Search PGs</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Video Tour Modal Overlay */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0F5132]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-[#0F5132] rounded-3xl overflow-hidden shadow-2xl border border-emerald-700/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-800/80 bg-[#0F5132]/95">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#a3e635] animate-pulse" />
                  <h3 className="text-white font-bold text-base sm:text-lg font-heading">
                    Verified PG Room & Facility Video Tour
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-emerald-900/80 text-emerald-200 hover:text-white hover:bg-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video w-full bg-black">
                <video controls autoPlay playsInline className="w-full h-full object-cover">
                  <source
                    src="https://assets.mixkit.co/videos/preview/mixkit-modern-interior-design-of-a-living-room-41315-large.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Modal Footer Info */}
              <div className="p-5 sm:p-6 bg-[#0F5132] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-emerald-800/80">
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-base font-heading">
                    NestIn Premium Co-living & PG Spaces
                  </h4>
                  <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5 font-sans">
                    100% On-site verified rooms with air conditioning, attached bath, bi-weekly cleaning & high-speed
                    Wi-Fi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsVideoModalOpen(false);
                    onSearch(filters);
                  }}
                  className="px-5 py-2.5 bg-[#a3e635] text-[#0F5132] font-extrabold text-xs sm:text-sm rounded-xl hover:bg-[#8ece28] transition-colors cursor-pointer flex-shrink-0 font-heading"
                >
                  Explore Available Rooms
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
