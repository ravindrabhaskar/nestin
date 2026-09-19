import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Map as MapIcon, ShieldCheck, Star } from 'lucide-react';
import { PropertyListing, ViewMode, FindPGFilterState } from '../types';
import { usePropertyListing } from '../context/PropertyListingContext';
import { ApiClient, type CatalogueSearchParams } from '../lib/apiClient';
import type { OwnerPropertyListing } from '../types/property';
import { useAuth } from '../context/AuthContext';
import { PropertyCard } from './PropertyCard';
import { FilterBar, DEFAULT_FILTERS } from './FilterBar';
import { GuestBanner } from './GuestBanner';
import { Pagination } from './Pagination';
import { InteractiveMap } from './InteractiveMap';
import { EmptyState } from './ui/EmptyState';
import { RecentlyViewed, addPropertyToRecentlyViewed } from './RecentlyViewed';
import { MarketplaceSearchHeader } from './search-filter/MarketplaceSearchHeader';
import { PropertyGridSkeleton, PropertyListSkeleton, PropertyMapSidebarSkeleton } from './ui/LoadingSkeleton';

interface FindPGPageProps {
  onSelectProperty: (property: PropertyListing) => void;
  onOpenAuth: () => void;
  initialSearchQuery?: string;
}

const ITEMS_PER_PAGE = 20;

export const FindPGPage: React.FC<FindPGPageProps> = ({ onOpenAuth, initialSearchQuery = 'Hyderabad' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cityParam = searchParams.get('city') || searchParams.get('location');
  const viewParam = searchParams.get('view') as ViewMode | null;

  const effectiveInitialSearch = cityParam || initialSearchQuery;

  const [searchQuery, setSearchQuery] = useState(effectiveInitialSearch);
  const [currentLocationText, setCurrentLocationText] = useState(effectiveInitialSearch);
  const [viewMode, setViewMode] = useState<ViewMode>(viewParam || 'grid');
  const { toFindPGListing } = usePropertyListing();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMapProperty, setSelectedMapProperty] = useState<PropertyListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Filter state (declared before the effects that reset it on URL changes)
  const [filters, setFilters] = useState<FindPGFilterState>({
    ...DEFAULT_FILTERS,
    searchQuery: effectiveInitialSearch,
  });

  // Helper to sync URL search params without page reload
  const updateUrlParams = (city: string, view?: ViewMode) => {
    const params: Record<string, string> = {};
    if (city.trim()) {
      params.city = city.trim();
    }
    if (view) {
      params.view = view;
    } else if (viewMode) {
      params.view = viewMode;
    }
    setSearchParams(params, { replace: true });
  };

  // Synchronize when query parameters change (e.g. back/forward navigation or URL updates)
  useEffect(() => {
    if (cityParam) {
      setSearchQuery(cityParam);
      setCurrentLocationText(cityParam);
      setFilters((prev) => ({ ...prev, searchQuery: cityParam }));
      setCurrentPage(1);
    }
    if (viewParam) {
      setViewMode(viewParam);
    }
  }, [cityParam, viewParam]);

  const navigate = useNavigate();
  const { requireAuth } = useAuth();

  const getPropertySlug = (prop: PropertyListing) => {
    return (
      prop.slug ||
      (prop.name || prop.title || prop.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );
  };

  // View Details: navigate directly to /property/:propertyId or /property/:slug without requiring login
  const handleViewDetails = (property: PropertyListing) => {
    addPropertyToRecentlyViewed(property);
    const targetSlug = getPropertySlug(property);
    navigate(`/property/${targetSlug}`);
  };

  // Book Now: require authentication first (Google-only), preserving the exact property and booking action
  const handleBookNow = (property: PropertyListing) => {
    addPropertyToRecentlyViewed(property);
    const targetSlug = getPropertySlug(property);
    requireAuth(() => {
      navigate(`/property/${targetSlug}?action=book`);
    }, 'Please sign in with Google to reserve your room and complete your booking.');
  };

  // Results come from the SQL-backed catalogue search, so filtering scales with the database rather
  // than the browser. One request per (filters, page); the map view asks for a wider page.
  const [results, setResults] = useState<PropertyListing[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [nearMe, setNearMe] = useState<{ lat: number; lng: number } | null>(null);

  const searchParamsFor = useCallback(
    (f: FindPGFilterState, page: number, pageSize: number): CatalogueSearchParams => {
      const roomTypes = f.roomTypes
        .map((rt) => rt.toLowerCase())
        .map((rt) => (rt.startsWith('private') ? 'single' : rt.replace(' sharing', '')))
        .filter((v, i, arr) => arr.indexOf(v) === i);
      const gender = f.gender.toLowerCase();
      const category =
        /boy|men/.test(gender) && !/women/.test(gender)
          ? 'Men'
          : /girl|women/.test(gender)
            ? 'Women'
            : /co/.test(gender)
              ? 'Co-ed'
              : undefined;
      const sort: CatalogueSearchParams['sort'] =
        f.sortBy === 'price-asc'
          ? 'rent_asc'
          : f.sortBy === 'price-desc'
            ? 'rent_desc'
            : f.sortBy === 'rating-desc'
              ? 'rating'
              : nearMe
                ? 'nearest'
                : 'relevance';
      return {
        q: f.searchQuery.trim() || undefined,
        maxRent: f.maxRent < 35000 ? f.maxRent : undefined,
        category,
        food: f.foodPreference !== 'Any' ? true : undefined,
        roomTypes: roomTypes.length ? roomTypes.join(',') : undefined,
        amenities: f.selectedAmenities.length ? f.selectedAmenities.join(',') : undefined,
        verified: f.verifiedOnly || undefined,
        available: f.availableNow || undefined,
        minRating: f.minRating > 0 ? f.minRating : undefined,
        lat: nearMe?.lat,
        lng: nearMe?.lng,
        radiusKm: nearMe ? (f.maxDistance < 30 ? f.maxDistance : 30) : undefined,
        sort,
        page,
        pageSize,
      };
    },
    [nearMe]
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const pageSize = viewMode === 'map' ? 200 : ITEMS_PER_PAGE;
    const timer = window.setTimeout(() => {
      ApiClient.properties
        .search(searchParamsFor(filters, viewMode === 'map' ? 1 : currentPage, pageSize))
        .then(({ data, metadata }) => {
          if (cancelled) return;
          setResults((data as OwnerPropertyListing[]).map(toFindPGListing));
          setTotalItems(Number(metadata.total || data.length));
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setTotalItems(0);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters, currentPage, viewMode, searchParamsFor, toFindPGListing]);

  // Handle hero search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, searchQuery }));
    setCurrentPage(1);
    if (searchQuery.trim()) {
      setCurrentLocationText(searchQuery);
      updateUrlParams(searchQuery);
    }
  };

  const handleUseCurrentLocation = () => {
    const loc = 'Kukatpally, Hyderabad';
    setSearchQuery(loc);
    setCurrentLocationText('Kukatpally, Hyderabad');
    setFilters((prev) => ({ ...prev, searchQuery: loc }));
    setCurrentPage(1);
    updateUrlParams(loc);
  };

  const handleNearMe = () => {
    const fallback = () => {
      const loc = 'Hyderabad';
      setSearchQuery(loc);
      setCurrentLocationText('Near me • Hyderabad');
      setFilters((prev) => ({ ...prev, searchQuery: loc }));
      setCurrentPage(1);
      updateUrlParams(loc);
    };
    if (!('geolocation' in navigator)) return fallback();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSearchQuery('');
        setCurrentLocationText('Near me • your location');
        setFilters((prev) => ({ ...prev, searchQuery: '', sortBy: 'nearest' }));
        setCurrentPage(1);
        setSearchParams({ view: viewMode }, { replace: true });
      },
      fallback,
      { timeout: 5000, maximumAge: 300_000 }
    );
  };

  const handleSelectSuggestedLocation = (location: string) => {
    setSearchQuery(location);
    setCurrentLocationText(location);
    setFilters((prev) => ({ ...prev, searchQuery: location }));
    setCurrentPage(1);
    updateUrlParams(location);
  };

  const filteredProperties = results;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginatedProperties = viewMode === 'map' ? results.slice(0, ITEMS_PER_PAGE) : results;

  const handleFilterChange = (newFilters: FindPGFilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const locationDisplayTitle = filters.searchQuery || 'Kukatpally, Hyderabad';

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#121820] pt-24 pb-16 font-sans w-full min-w-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 w-full min-w-0">
        <div id="pg-results-start" />

        {/* HERO SEARCH BAR HEADER */}
        <MarketplaceSearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onUseCurrentLocation={handleUseCurrentLocation}
          onNearMe={handleNearMe}
          onSelectSuggestedLocation={handleSelectSuggestedLocation}
          viewMode={viewMode}
          setViewMode={(mode) => {
            setViewMode(mode);
            updateUrlParams(searchQuery, mode);
          }}
          currentLocationText={currentLocationText}
        />

        {/* FILTER CHIPS TOOLBAR */}
        <FilterBar filters={filters} onFilterChange={handleFilterChange} totalCount={totalItems} />

        {/* GUEST BANNER */}
        <GuestBanner onCreateAccount={onOpenAuth} />

        {/* RESULTS HEADER TITLE */}
        <div className="space-y-1 pt-2 min-w-0">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-semibold text-slate-600 mb-2 max-w-full truncate">
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + paginatedProperties.length)} of {totalItems}{' '}
            verified PGs • page {currentPage} of {totalPages}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
            {totalItems} verified stays near {locationDisplayTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans">
            Transparent pricing, zero brokerage, every property physically verified by nestin
          </p>
        </div>

        {/* VIEW MODE CONTENT */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <PropertyGridSkeleton count={8} />
          ) : viewMode === 'list' ? (
            <PropertyListSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 min-h-[600px] lg:h-[750px]">
              <div className="lg:col-span-5 overflow-y-auto space-y-3.5 pr-1 max-h-[400px] lg:max-h-[750px]">
                <PropertyMapSidebarSkeleton count={5} />
              </div>
              <div className="lg:col-span-7 h-full flex flex-col relative rounded-3xl overflow-hidden shadow-sm border border-slate-200/90 bg-slate-100/80 animate-pulse items-center justify-center">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <MapIcon className="w-5 h-5 animate-pulse" />
                  <span>Loading interactive map stays...</span>
                </div>
              </div>
            </div>
          )
        ) : totalItems === 0 ? (
          <EmptyState
            title="No verified PGs found"
            description={`No properties match your current filter criteria near ${locationDisplayTitle}. Try adjusting budget, gender, sharing, or reset filters.`}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            resetText="Reset All Filters"
          />
        ) : viewMode === 'grid' ? (
          /* RESPONSIVE GRID: 1-COL MOBILE, 2-COL TABLET, 4-COL DESKTOP WHERE WIDTH ALLOWS WITH MATCHED HEIGHTS */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2 items-stretch auto-rows-fr w-full min-w-0"
          >
            {paginatedProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} onViewDetails={handleViewDetails} onBookNow={handleBookNow} />
            ))}
          </motion.div>
        ) : viewMode === 'list' ? (
          /* RESPONSIVE LIST VIEW */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 pt-2"
          >
            {paginatedProperties.map((prop) => (
              <div
                key={prop.id}
                onClick={() => handleViewDetails(prop)}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs hover:shadow-lg transition-all flex flex-col md:flex-row items-stretch gap-4 sm:gap-5 cursor-pointer group"
              >
                <div className="relative w-full md:w-72 h-44 sm:h-52 md:h-auto rounded-xl sm:rounded-2xl overflow-hidden shrink-0 aspect-[16/10] md:aspect-auto">
                  <img
                    src={prop.image}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {prop.verified && (
                    <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-white/90 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-slate-900 flex items-center gap-1">
                      <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#88d900]" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg font-heading group-hover:text-emerald-950 transition-colors leading-tight">
                        {prop.title}
                      </h3>
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold shrink-0">
                        <Star className="w-3 sm:w-3.5 h-3 sm:w-3.5 fill-amber-500 text-amber-500" />
                        <span>{prop.rating}</span>
                        <span className="text-slate-400 font-normal">({prop.reviewsCount})</span>
                      </div>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{prop.address}</span>
                      <span>•</span>
                      <span className="shrink-0">{prop.distance}</span>
                    </p>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                      {prop.sharing.map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-700 px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                      {prop.food && (
                        <span className="bg-emerald-50 text-emerald-800 px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold">
                          Food included
                        </span>
                      )}
                      <span className="bg-[#a3e635]/20 text-slate-900 px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold">
                        {prop.available}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 pt-0.5">{prop.description}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-900 font-black text-lg sm:text-xl font-heading">
                        ₹{prop.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-400 text-xs font-normal">/month</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(prop);
                        }}
                        className="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all text-center cursor-pointer"
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookNow(prop);
                        }}
                        className="flex-1 sm:flex-initial min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold text-[#0F5132] bg-[#a3e635] hover:bg-[#92d428] transition-all text-center cursor-pointer font-heading"
                      >
                        Book now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          /* MAP VIEW */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 min-h-[600px] lg:h-[750px]"
          >
            {/* PROPERTIES LIST SIDEBAR */}
            <div className="lg:col-span-5 overflow-y-auto space-y-3.5 pr-1 max-h-[400px] lg:max-h-[750px]">
              {paginatedProperties.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => {
                    setSelectedMapProperty(prop);
                  }}
                  className={`bg-white rounded-2xl border p-3 sm:p-3.5 transition-all cursor-pointer flex gap-3 ${
                    selectedMapProperty?.id === prop.id
                      ? 'border-[#a3e635] ring-2 ring-[#a3e635]/30 shadow-md'
                      : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <img
                    src={prop.image}
                    alt={prop.title}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm font-heading truncate">
                        {prop.title}
                      </h4>
                      <span className="text-[11px] sm:text-xs font-bold text-amber-600 shrink-0">★ {prop.rating}</span>
                    </div>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">{prop.address || prop.city}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs sm:text-sm font-extrabold font-heading text-slate-900">
                        ₹{(prop.rent || prop.price).toLocaleString('en-IN')}/mo
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(prop);
                        }}
                        className="text-[10.5px] sm:text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-[#a3e635] hover:text-slate-950 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* INTERACTIVE LEAFLET MAP CANVAS */}
            <div className="lg:col-span-7 h-full flex flex-col relative rounded-3xl overflow-hidden shadow-sm border border-slate-200/90">
              {/* MAP HEADER BADGE */}
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-md flex items-center gap-2 text-xs font-bold text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Map View — {locationDisplayTitle} ({totalItems} Stays)
                </span>
              </div>

              <InteractiveMap
                properties={filteredProperties}
                selectedProperty={selectedMapProperty}
                onSelectProperty={(prop) => setSelectedMapProperty(prop)}
                onOpenDetail={(prop) => handleViewDetails(prop)}
                className="w-full h-full"
              />
            </div>
          </motion.div>
        )}

        {/* RECENTLY VIEWED SECTION */}
        <RecentlyViewed onSelectProperty={handleViewDetails} />

        {/* PAGINATION */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};
