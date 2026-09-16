import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TenantAuthModal } from './TenantAuthModal';
import { SearchFilterState, CityItem } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';

interface ModalsProps {
  authOpen: boolean;
  onCloseAuth: () => void;
  listOpen?: boolean;
  onCloseList?: () => void;
  searchFilter: SearchFilterState | null;
  onCloseSearch: () => void;
  selectedCity: CityItem | null;
  onCloseCity: () => void;
}

export const Modals: React.FC<ModalsProps> = ({
  authOpen,
  onCloseAuth,
  searchFilter,
  onCloseSearch,
  selectedCity,
  onCloseCity,
}) => {
  const navigate = useNavigate();
  useScrollLock(Boolean(searchFilter || selectedCity));

  // Handle ESC key press for inline search and city preview modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchFilter) {
          onCloseSearch();
        } else if (selectedCity) {
          onCloseCity();
        }
      }
    };
    if (searchFilter || selectedCity) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFilter, selectedCity, onCloseSearch, onCloseCity]);

  return (
    <>
      {/* AUTH MODAL */}
      <TenantAuthModal
        isOpen={authOpen}
        onClose={onCloseAuth}
        initialTab="login"
      />

      {/* SELECTED CITY PREVIEW MODAL */}
      <AnimatePresence>
        {selectedCity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseCity}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl z-10 border border-slate-100"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={selectedCity.image}
                  alt={selectedCity.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                <button
                  type="button"
                  onClick={onCloseCity}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-6 text-white space-y-0.5">
                  <span className="text-xs font-bold text-[#a3e635] tracking-wide uppercase font-heading">
                    {selectedCity.stays}
                  </span>
                  <h3 className="text-3xl font-extrabold font-heading">{selectedCity.name}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                    Popular Tech & College Hubs
                  </h4>
                  <p className="text-slate-800 text-sm font-semibold mt-1">
                    {selectedCity.description}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Average Monthly Rent</span>
                  <span className="text-base font-extrabold text-[#5fa000] font-heading">
                    {selectedCity.avgPrice}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseCity();
                    navigate(`/find-pg?city=${encodeURIComponent(selectedCity.name)}`);
                  }}
                  className="w-full bg-[#121820] text-white font-bold text-sm py-3.5 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Explore Stays in {selectedCity.name}</span>
                  <ArrowRight className="w-4 h-4 text-[#a3e635]" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
