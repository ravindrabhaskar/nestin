import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { History, Trash2, ArrowLeft, ArrowRight, Star, MapPin, ShieldCheck, Lock, LogIn } from 'lucide-react';
import { PropertyListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { ALL_PROPERTIES_DATA } from '../data/propertiesData';

interface RecentlyViewedProps {
  onSelectProperty: (property: PropertyListing) => void;
  currentPropertyId?: string;
}

const LOCAL_STORAGE_KEY = 'nestin_recently_viewed_properties_v1';

// Helper to save a viewed property
export const addPropertyToRecentlyViewed = (property: PropertyListing) => {
  if (typeof window === 'undefined' || !property || !property.id) return;
  try {
    const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    let items: PropertyListing[] = existingStr ? JSON.parse(existingStr) : [];
    
    // Remove if duplicate exists
    items = items.filter((p) => p.id !== property.id);
    
    // Prepend new view
    items.unshift(property);
    
    // Keep max 10
    if (items.length > 10) items = items.slice(0, 10);
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving recently viewed property:', e);
  }
};

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  onSelectProperty,
  currentPropertyId,
}) => {
  const { isAuthenticated, requireAuth } = useAuth();
  const [history, setHistory] = useState<PropertyListing[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.75;
      const scrollAmount = direction === 'left' ? -amount : amount;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const items: PropertyListing[] = JSON.parse(saved);
          setHistory(items);
        }
      } catch (e) {
        console.error('Error loading recently viewed history:', e);
      }
    };

    loadHistory();

    // Listen for custom event or storage updates
    const handleStorageChange = () => loadHistory();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentPropertyId]);

  const handleClearHistory = () => {
    requireAuth(() => {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setHistory([]);
      } catch (e) {
        console.error('Error clearing history:', e);
      }
    }, 'Log in to clear your recently viewed stays history.');
  };

  const handleSelect = (property: PropertyListing) => {
    requireAuth(() => {
      onSelectProperty(property);
    }, 'Log in to view details of your recently viewed stay.');
  };

  const handleGuestInteraction = () => {
    requireAuth(() => {}, 'Log in or sign up to view your recently viewed stays.');
  };

  // When logged out and no local history saved, use sample properties as teaser preview
  const displayItems = history.length > 0 ? history : ALL_PROPERTIES_DATA.slice(0, 4);

  // If logged in and history is empty, don't display
  if (isAuthenticated && history.length === 0) return null;

  return (
    <div className="relative bg-gradient-to-b from-stone-50/60 to-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs my-8 space-y-4 overflow-hidden">
      {/* GUEST OVERLAY LOCK */}
      {!isAuthenticated && (
        <div 
          onClick={handleGuestInteraction}
          className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-[6px] flex flex-col items-center justify-center p-6 text-center cursor-pointer group transition-all duration-300 hover:bg-slate-900/40"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 max-w-md border border-white/40 shadow-xl space-y-4 group-hover:scale-[1.02] transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#0F5132] text-[#a3e635] flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xl font-black font-heading text-slate-900">
                Recently Viewed Stays
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed font-sans">
                Log in to view your recently browsed PGs and co-living spaces across devices.
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGuestInteraction();
              }}
              className="w-full py-3 px-5 rounded-xl bg-[#0F5132] hover:bg-[#146c43] text-[#a3e635] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer font-heading"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to View Stays</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* HEADER */}
      <div className={`flex items-center justify-between ${!isAuthenticated ? 'filter blur-[3px] select-none pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0F5132] text-[#a3e635] flex items-center justify-center shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black font-heading text-slate-900">
              Recently Viewed Stays
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Quickly jump back to PGs and co-living stays you checked earlier
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {displayItems.length > 3 && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label="Scroll left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label="Scroll right"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear history</span>
          </button>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE CAROUSEL */}
      <div className={`relative ${!isAuthenticated ? 'filter blur-[3px] select-none pointer-events-none' : ''}`}>
        <div
          ref={scrollRef}
          className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth snap-x"
        >
        {displayItems.map((prop) => {
          const nameToDisplay = prop.name || prop.title;
          const rentVal = prop.rent || prop.price || 10000;

          return (
            <motion.div
              key={prop.id}
              whileHover={isAuthenticated ? { y: -3 } : undefined}
              onClick={() => handleSelect(prop)}
              className="min-w-[240px] max-w-[260px] bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer shrink-0 snap-start space-y-2.5 group"
            >
              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={prop.image}
                  alt={nameToDisplay}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {prop.verified && (
                  <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs p-1 rounded-full text-emerald-600 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 truncate font-heading group-hover:text-emerald-950 transition-colors">
                  {nameToDisplay}
                </h4>
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{prop.area || prop.city}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-xs font-black text-slate-900">
                  ₹{rentVal.toLocaleString('en-IN')}
                  <span className="text-slate-400 font-normal text-[10px]">/mo</span>
                </span>
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{prop.rating || 4.5}</span>
                </span>
              </div>
            </motion.div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

