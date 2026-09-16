import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  X,
  SlidersHorizontal,
  Check,
  Calendar,
  ShieldCheck,
  Star,
  MapPin,
  Sparkles,
  Wifi,
  Shirt,
  Car,
  Zap,
  Dumbbell,
  BookOpen,
  Utensils,
  Wind,
  Building,
  RotateCcw,
} from 'lucide-react';
import { FindPGFilterState } from '../../types';

interface FilterDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FindPGFilterState;
  onFilterChange: (newFilters: FindPGFilterState) => void;
  onResetFilters: () => void;
  totalCount: number;
  activeFilterCount: number;
}

const PRICE_BRACKETS = [
  { label: 'Under ₹10k', value: 10000 },
  { label: 'Under ₹15k', value: 15000 },
  { label: 'Under ₹20k', value: 20000 },
  { label: 'Under ₹25k', value: 25000 },
  { label: 'Any Budget', value: 35000 },
];

const ROOM_TYPE_OPTIONS = [
  'Single sharing',
  'Double sharing',
  'Triple sharing',
  'Four sharing',
  'Private room',
];

const FOOD_OPTIONS: ('Any' | 'Veg' | 'Non-veg' | 'Both')[] = ['Any', 'Veg', 'Non-veg', 'Both'];

const GENDER_OPTIONS = [
  { label: 'All Stays', value: 'Any' },
  { label: "Men's PG", value: 'Boys' },
  { label: "Women's PG", value: 'Girls' },
  { label: 'Co-living PG', value: 'Co-living' },
];

const AMENITIES_WITH_ICONS = [
  { name: 'WiFi', icon: Wifi },
  { name: 'Laundry', icon: Shirt },
  { name: 'Parking', icon: Car },
  { name: 'Power Backup', icon: Zap },
  { name: 'Gym', icon: Dumbbell },
  { name: 'Study Room', icon: BookOpen },
  { name: 'Kitchen', icon: Utensils },
  { name: 'AC', icon: Wind },
  { name: 'Lift', icon: Building },
];

const RATING_OPTIONS = [
  { label: 'Any Rating', value: 0 },
  { label: '4.0+ ★', value: 4.0 },
  { label: '4.5+ ★', value: 4.5 },
  { label: '4.8+ ★', value: 4.8 },
];

export const FilterDrawerModal: React.FC<FilterDrawerModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  activeFilterCount,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const toggleRoomType = (rt: string) => {
    const current = filters.roomTypes;
    const exists = current.includes(rt);
    const updated = exists ? current.filter((item) => item !== rt) : [...current, rt];
    onFilterChange({ ...filters, roomTypes: updated });
  };

  const toggleAmenity = (amenity: string) => {
    const current = filters.selectedAmenities;
    const exists = current.includes(amenity);
    const updated = exists ? current.filter((item) => item !== amenity) : [...current, amenity];
    onFilterChange({ ...filters, selectedAmenities: updated });
  };

  // 1. Strict Body Scroll Lock via global useScrollLock hook
  useScrollLock(isOpen);

  // 2. Keyboard accessibility (Escape key to close, Arrow/Space navigation inside sidebar)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const scrollKeys = ['ArrowUp', 'ArrowDown', 'Space', ' ', 'PageUp', 'PageDown', 'Home', 'End'];
      if (scrollKeys.includes(e.key)) {
        const targetElement = e.target as HTMLElement | null;
        const targetTag = targetElement?.tagName || '';
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag);
        const isRange = (targetElement as HTMLInputElement)?.type === 'range';

        if (!isInput || !isRange) {
          const scrollContainer = scrollableRef.current;
          if (scrollContainer) {
            if (e.key === 'ArrowDown') {
              scrollContainer.scrollBy({ top: 50 });
              e.preventDefault();
            } else if (e.key === 'ArrowUp') {
              scrollContainer.scrollBy({ top: -50 });
              e.preventDefault();
            } else if (e.key === 'PageDown' || e.key === 'Space' || e.key === ' ') {
              if (!isInput) {
                scrollContainer.scrollBy({ top: scrollContainer.clientHeight * 0.8 });
                e.preventDefault();
              }
            } else if (e.key === 'PageUp') {
              scrollContainer.scrollBy({ top: -scrollContainer.clientHeight * 0.8 });
              e.preventDefault();
            } else if (e.key === 'Home') {
              scrollContainer.scrollTo({ top: 0 });
              e.preventDefault();
            } else if (e.key === 'End') {
              scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
              e.preventDefault();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 3. Focus Trap inside drawer
  useEffect(() => {
    if (!isOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusables = drawer.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const currentFocusables = drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (currentFocusables.length === 0) return;

      const firstElement = currentFocusables[0];
      const lastElement = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTabTrap);
    return () => window.removeEventListener('keydown', handleTabTrap);
  }, [isOpen]);

  // 4. Capture wheel and touch events to stop propagation & prevent scroll chaining
  useEffect(() => {
    if (!isOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();

      const scrollContainer = scrollableRef.current;
      if (!scrollContainer) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const delta = e.deltaY;

      if (delta > 0 && scrollTop + clientHeight >= scrollHeight - 1) {
        scrollContainer.scrollTop = scrollHeight;
        e.preventDefault();
      } else if (delta < 0 && scrollTop <= 0) {
        scrollContainer.scrollTop = 0;
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation();

      const scrollContainer = scrollableRef.current;
      if (!scrollContainer || !scrollContainer.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    drawer.addEventListener('wheel', handleWheel, { passive: false });
    drawer.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      drawer.removeEventListener('wheel', handleWheel);
      drawer.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* BACKDROP BLUR */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm cursor-pointer z-0"
          />

          {/* SLIDE-OVER DRAWER CONTAINER */}
          <motion.div
            id="filter-sidebar"
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative w-full max-w-xl bg-white shadow-nestin-floating flex flex-col z-10"
            style={{
              height: '100vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              scrollbarGutter: 'stable',
            }}
          >
            {/* MODAL HEADER */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-stone-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#a3e635]/30 text-slate-950 border border-[#88d900]">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black font-heading text-slate-900 tracking-tight">
                      Filters
                    </h2>
                    {activeFilterCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635] text-slate-950 font-black text-xs">
                        {activeFilterCount} Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Customize your stay preferences & budget
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-200/60 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-2xl bg-stone-200/80 hover:bg-stone-300 text-slate-700 transition-all cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL SCROLLABLE CONTENT */}
            <div
              ref={scrollableRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 space-y-8 scrollbar-thin"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                scrollbarGutter: 'stable',
              }}
            >
              {/* SECTION 1: BUDGET RANGE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                    Monthly Rent Budget
                  </label>
                  <span className="text-xs font-extrabold bg-[#d9f99d] text-slate-950 px-3 py-1 rounded-full border border-[#a3e635]">
                    Up to ₹{filters.maxRent.toLocaleString('en-IN')}/mo
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min={5000}
                    max={35000}
                    step={1000}
                    value={filters.maxRent}
                    onChange={(e) =>
                      onFilterChange({ ...filters, maxRent: Number(e.target.value) })
                    }
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#88d900]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                    <span>₹5,000</span>
                    <span>₹20,000</span>
                    <span>₹35,000+</span>
                  </div>
                </div>

                {/* BUDGET PRESETS */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {PRICE_BRACKETS.map((bracket) => {
                    const isSelected = filters.maxRent === bracket.value;
                    return (
                      <button
                        key={bracket.label}
                        type="button"
                        onClick={() => onFilterChange({ ...filters, maxRent: bracket.value })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-xs'
                            : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        {bracket.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: GENDER / STAY TYPE */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                  Gender & Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GENDER_OPTIONS.map((g) => {
                    const isSelected =
                      filters.gender === g.value ||
                      (g.value === 'Boys' && (filters.gender === 'Men' || filters.gender === "Men's")) ||
                      (g.value === 'Girls' && (filters.gender === 'Women' || filters.gender === "Women's"));
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => onFilterChange({ ...filters, gender: g.value })}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-xs ring-1 ring-[#88d900]'
                            : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: ROOM OCCUPANCY */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                  Room Sharing / Occupancy
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ROOM_TYPE_OPTIONS.map((rt) => {
                    const isSelected = filters.roomTypes.includes(rt);
                    return (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => toggleRoomType(rt)}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-xs font-black'
                            : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{rt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: FOOD PREFERENCE */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                  Food Preference
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FOOD_OPTIONS.map((f) => {
                    const isSelected = filters.foodPreference === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => onFilterChange({ ...filters, foodPreference: f })}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-xs'
                            : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{f}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 5: MOVE-IN DATE & AVAILABILITY */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                      Move-In Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={filters.moveInDate}
                        onChange={(e) =>
                          onFilterChange({ ...filters, moveInDate: e.target.value })
                        }
                        className="w-full bg-stone-50 border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                      />
                      <Calendar className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                      Immediate Availability
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onFilterChange({ ...filters, availableNow: !filters.availableNow })
                      }
                      className={`w-full py-2.5 px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                        filters.availableNow
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                          : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>Available Immediately</span>
                      <div
                        className={`w-4 h-4 rounded-full border border-white/50 flex items-center justify-center ${
                          filters.availableNow ? 'bg-white text-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        {filters.availableNow && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 6: DISTANCE RADIUS */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                    Max Distance Radius
                  </label>
                  <span className="text-xs font-extrabold text-slate-800 bg-stone-100 px-3 py-1 rounded-full border border-slate-200">
                    Within {filters.maxDistance} km
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={filters.maxDistance}
                  onChange={(e) =>
                    onFilterChange({ ...filters, maxDistance: Number(e.target.value) })
                  }
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#88d900]"
                />
              </div>

              {/* SECTION 7: AMENITIES GRID */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                  Must-Have Amenities
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AMENITIES_WITH_ICONS.map((amenity) => {
                    const isSelected = filters.selectedAmenities.includes(amenity.name);
                    const Icon = amenity.icon;
                    return (
                      <button
                        key={amenity.name}
                        type="button"
                        onClick={() => toggleAmenity(amenity.name)}
                        className={`p-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-xs font-black'
                            : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`} />
                        <span className="truncate">{amenity.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 8: RATING & VERIFICATION */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 font-heading">
                    Minimum Rating
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {RATING_OPTIONS.map((r) => {
                      const isSelected = filters.minRating === r.value;
                      return (
                        <button
                          key={r.label}
                          type="button"
                          onClick={() => onFilterChange({ ...filters, minRating: r.value })}
                          className={`py-2 px-2.5 rounded-2xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-xs'
                              : 'bg-stone-50 border-slate-200/90 text-slate-700 hover:bg-stone-100'
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange({ ...filters, verifiedOnly: !filters.verifiedOnly })
                    }
                    className={`w-full p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                      filters.verifiedOnly
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-stone-50 border-slate-200/90 text-slate-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#a3e635]" />
                      <span>Physically Verified Properties Only</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        filters.verifiedOnly ? 'bg-[#a3e635] text-slate-950' : 'bg-slate-300'
                      }`}
                    >
                      {filters.verifiedOnly && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* MODAL STICKY FOOTER */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onResetFilters}
                className="px-5 py-3 rounded-2xl border border-slate-200 hover:bg-stone-100 text-slate-700 text-xs font-extrabold transition-all cursor-pointer"
              >
                Clear All
              </button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onClose}
                className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#b0f040] to-[#a3e635] hover:from-[#a3e635] hover:to-[#88d900] text-slate-950 text-xs sm:text-sm font-black text-center shadow-[0_4px_16px_rgba(163,230,53,0.35)] transition-all cursor-pointer border border-[#88d900]"
              >
                Apply Filters ({totalCount} Stays)
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

