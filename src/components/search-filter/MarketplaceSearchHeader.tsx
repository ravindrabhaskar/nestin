import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Target,
  MapPin,
  LayoutGrid,
  List,
  Map as MapIcon,
  X,
  Building2,
  GraduationCap,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { ViewMode } from '../../types';

interface MarketplaceSearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentLocationText: string;
  onSearchSubmit: (e: React.FormEvent) => void;
  onUseCurrentLocation: () => void;
  onNearMe: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onSelectSuggestedLocation: (loc: string) => void;
}

// Location suggestions
const SUGGESTED_HOTSPOTS = [
  {
    category: 'Popular Areas',
    icon: MapPin,
    items: [
      { title: 'Kukatpally', subtitle: 'Hyderabad • Metro Connected • Top PG Hub' },
      { title: 'Gachibowli', subtitle: 'Hyderabad • IT Hub • Near Financial District' },
      { title: 'Madhapur', subtitle: 'Hyderabad • Near Mindspace IT Park' },
      { title: 'Hitec City', subtitle: 'Hyderabad • Corporate & Tech Corridor' },
      { title: 'Jubilee Hills', subtitle: 'Hyderabad • Premium Residential' },
      { title: 'Kondapur', subtitle: 'Hyderabad • Near Google & Tech Parks' },
    ],
  },
  {
    category: 'Colleges & Universities',
    icon: GraduationCap,
    items: [
      { title: 'JNTU Hyderabad', subtitle: 'Kukatpally • Student Accommodation' },
      { title: 'ISB Gachibowli', subtitle: 'Indian School of Business Area' },
      { title: 'CBIT Gandipet', subtitle: 'Engineering College Zone' },
      { title: 'University of Hyderabad', subtitle: 'HCU Campus Area, Gachibowli' },
    ],
  },
  {
    category: 'Tech Parks & IT Hubs',
    icon: Briefcase,
    items: [
      { title: 'Mindspace IT Park', subtitle: 'Madhapur • 100+ Corporate Offices' },
      { title: 'DLF Cyber City', subtitle: 'Gachibowli • Major IT Companies' },
      { title: 'Financial District', subtitle: 'Nanakramguda • Tech Hub' },
    ],
  },
  {
    category: 'Major Cities',
    icon: Building2,
    items: [
      { title: 'Hyderabad', subtitle: 'Telangana • 500+ Verified Stays' },
      { title: 'Bengaluru', subtitle: 'Karnataka • Koramangala, HSR, Indiranagar' },
      { title: 'Pune', subtitle: 'Maharashtra • Hinjewadi, Kharadi, Viman Nagar' },
    ],
  },
];

export const MarketplaceSearchHeader: React.FC<MarketplaceSearchHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  currentLocationText,
  onSearchSubmit,
  onUseCurrentLocation,
  onNearMe,
  viewMode,
  setViewMode,
  onSelectSuggestedLocation,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationClick = (locTitle: string) => {
    onSelectSuggestedLocation(locTitle);
    setIsFocused(false);
  };

  const handleGpsClick = () => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      onUseCurrentLocation();
    }, 500);
  };

  // Filter suggested hotspots based on user input
  const filteredSuggestions = SUGGESTED_HOTSPOTS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="relative z-30 space-y-2.5" ref={containerRef}>
      {/* TOP ROW: SEARCH BAR CONTAINER & VIEW MODE TOGGLE */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* MAIN SEARCH BAR PILL */}
        <div className="relative flex-1 bg-white rounded-[32px] p-2 pl-6 border border-slate-200/90 shadow-nestin-lg flex items-center justify-between gap-3 min-h-[64px]">
          <form
            onSubmit={(e) => {
              onSearchSubmit(e);
              setIsFocused(false);
            }}
            className="flex items-center justify-between w-full gap-3"
          >
            {/* SEARCH INPUT WITH 'WHERE TO' LABEL */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <Search className="w-5 h-5 text-[#a3e635] stroke-[2.5] shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 font-heading leading-tight">
                  WHERE TO
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="City, area, college, office, metro or landmark"
                  className="bg-transparent text-sm font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none truncate"
                  aria-label="City, area, college, office, metro or landmark"
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ACTION PILLS: CURRENT LOCATION, NEAR ME, SEARCH */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* CURRENT LOCATION */}
              <button
                type="button"
                onClick={handleGpsClick}
                disabled={isLocating}
                className="hidden sm:flex px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#faf9f5] hover:bg-slate-100 border border-slate-200/80 text-slate-900 text-xs font-bold items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 text-[#a3e635] animate-spin" />
                ) : (
                  <Target className="w-4 h-4 text-[#a3e635] stroke-[2.5] shrink-0" />
                )}
                <span>{isLocating ? 'Locating...' : 'Current location'}</span>
              </button>

              {/* NEAR ME */}
              <button
                type="button"
                onClick={onNearMe}
                className="hidden md:block px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#faf9f5] hover:bg-slate-100 border border-slate-200/80 text-slate-900 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Near me
              </button>

              {/* SEARCH BUTTON */}
              <button
                type="submit"
                className="px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#a3e635] hover:bg-[#92d428] text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span className="hidden xs:inline">Search</span>
              </button>
            </div>
          </form>

          {/* AUTOCOMPLETE SUGGESTIONS POPOVER */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-4 max-h-[380px] overflow-y-auto z-50 divide-y divide-slate-100"
              >
                <div className="flex items-center justify-between pb-3 px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                    Popular Locations & Hotspots
                  </span>
                </div>

                {filteredSuggestions.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs font-medium">
                    No locations found for "{searchQuery}".
                  </div>
                ) : (
                  filteredSuggestions.map((category) => {
                    const CatIcon = category.icon;
                    return (
                      <div key={category.category} className="py-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading mb-2 px-2">
                          <CatIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{category.category}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {category.items.map((item) => (
                            <button
                              key={item.title}
                              type="button"
                              onClick={() => handleLocationClick(item.title)}
                              className="w-full text-left p-2.5 rounded-2xl hover:bg-slate-50 transition-colors flex items-start gap-3 group cursor-pointer"
                            >
                              <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#a3e635] group-hover:text-slate-950 transition-colors shrink-0 mt-0.5">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                                <div className="text-[11px] text-slate-500 truncate font-normal">{item.subtitle}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* VIEW MODE SWITCHER TOGGLE (GRID | LIST | MAP) */}
        <div className="flex items-center bg-[#f8f8f6] p-1.5 rounded-full border border-slate-200/80 shrink-0 self-start lg:self-center">
          {[
            { id: 'grid', label: 'Grid', icon: LayoutGrid },
            { id: 'list', label: 'List', icon: List },
            { id: 'map', label: 'Map', icon: MapIcon },
          ].map((item) => {
            const isSelected = viewMode === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setViewMode(item.id as ViewMode)}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#a3e635] text-slate-950 shadow-2xs font-extrabold'
                    : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTEXT LOCATION INDICATOR */}
      <div className="text-xs text-slate-500 font-sans pl-2 pt-0.5">
        Showing PGs near your current location — <span className="font-bold text-slate-900">{currentLocationText}</span>
      </div>
    </div>
  );
};
