import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { FindPGFilterState } from '../../types';
import { FilterDrawerModal } from './FilterDrawerModal';

interface FilterToolbarProps {
  filters: FindPGFilterState;
  onFilterChange: (newFilters: FindPGFilterState) => void;
  totalCount: number;
  locationTitle: string;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Lowest Rent' },
  { value: 'price-desc', label: 'Highest Rent' },
  { value: 'rating-desc', label: 'Highest Rated' },
];

export const FilterToolbar: React.FC<FilterToolbarProps> = ({ filters, onFilterChange, totalCount }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Compute active filters count for the drawer badge
  const activeFiltersCount =
    (filters.maxRent < 35000 ? 1 : 0) +
    (filters.maxDistance < 30 ? 1 : 0) +
    (filters.moveInDate !== '' ? 1 : 0) +
    filters.roomTypes.length +
    (filters.foodPreference !== 'Any' ? 1 : 0) +
    (filters.gender !== 'Any' ? 1 : 0) +
    filters.selectedAmenities.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.availableNow ? 1 : 0);

  const handleResetFilters = () => {
    onFilterChange({
      ...filters,
      maxRent: 35000,
      maxDistance: 30,
      moveInDate: '',
      roomTypes: [],
      foodPreference: 'Any',
      gender: 'Any',
      selectedAmenities: [],
      minRating: 0,
      verifiedOnly: false,
      availableNow: false,
    });
  };

  const handleGenderToggle = (genderVal: string) => {
    onFilterChange({
      ...filters,
      gender: filters.gender === genderVal ? 'Any' : genderVal,
    });
  };

  return (
    <>
      {/* SECOND ROW: FILTERS & CHIPS BAR */}
      <div className="pt-3 pb-1 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-slate-200/60">
        {/* LEFT: FILTERS BUTTON & FILTER CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* ALL FILTERS BUTTON */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="px-4 py-2 rounded-full bg-white border border-slate-200/90 text-slate-900 font-bold text-xs flex items-center gap-2 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#a3e635] stroke-[2.5]" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#a3e635] text-slate-950 text-[10px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* VERTICAL SEPARATOR */}
          <div className="h-5 w-px bg-slate-200/80 mx-0.5 shrink-0 hidden sm:block" />

          {/* QUICK FILTER CHIPS matching the reference image */}
          {/* BOYS */}
          <button
            type="button"
            onClick={() => handleGenderToggle('Boys')}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filters.gender === 'Boys'
                ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-2xs'
                : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Boys
          </button>

          {/* GIRLS */}
          <button
            type="button"
            onClick={() => handleGenderToggle('Girls')}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filters.gender === 'Girls'
                ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-2xs'
                : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Girls
          </button>

          {/* CO-LIVING */}
          <button
            type="button"
            onClick={() => handleGenderToggle('Co-living')}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filters.gender === 'Co-living'
                ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-2xs'
                : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Co-living
          </button>

          {/* VERIFIED ONLY */}
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filters.verifiedOnly
                ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-2xs'
                : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Verified only
          </button>

          {/* AVAILABLE NOW */}
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, availableNow: !filters.availableNow })}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filters.availableNow
                ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-2xs'
                : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Available now
          </button>

          {/* 4.5+ RATING */}
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, minRating: filters.minRating === 4.5 ? 0 : 4.5 })}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filters.minRating === 4.5
                ? 'bg-[#a3e635] text-slate-950 border-[#88d900] shadow-2xs'
                : 'bg-white text-slate-800 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            4.5+ rating
          </button>
        </div>

        {/* RIGHT: COUNT & SORT BY DROPDOWN */}
        <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
          <span className="text-xs text-slate-600 font-medium">{totalCount} stays</span>
          <span className="text-xs text-slate-600 font-medium">Sort by</span>
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  sortBy: e.target.value as FindPGFilterState['sortBy'],
                })
              }
              className="appearance-none bg-white border border-slate-200/90 rounded-full px-4 py-2 pr-8 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none shadow-2xs hover:bg-slate-50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* FILTER DRAWER MODAL */}
      <FilterDrawerModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={handleResetFilters}
        totalCount={totalCount}
        activeFilterCount={activeFiltersCount}
      />
    </>
  );
};
