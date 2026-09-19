import React from 'react';
import { FindPGFilterState } from '../types';
import { FilterToolbar } from './search-filter/FilterToolbar';

interface FilterBarProps {
  filters: FindPGFilterState;
  onFilterChange: (newFilters: FindPGFilterState) => void;
  totalCount: number;
}

export const DEFAULT_FILTERS: FindPGFilterState = {
  searchQuery: '',
  maxRent: 35000,
  moveInDate: '',
  maxDistance: 30,
  roomTypes: [],
  foodPreference: 'Any',
  gender: 'Any',
  selectedAmenities: [],
  minRating: 0,
  verifiedOnly: false,
  availableNow: false,
  sortBy: 'nearest',
};

export const FilterBar: React.FC<FilterBarProps> = React.memo(({ filters, onFilterChange, totalCount }) => {
  const locationTitle = filters.searchQuery || 'Kukatpally, Hyderabad';

  return (
    <FilterToolbar
      filters={filters}
      onFilterChange={onFilterChange}
      totalCount={totalCount}
      locationTitle={locationTitle}
    />
  );
});

FilterBar.displayName = 'FilterBar';
