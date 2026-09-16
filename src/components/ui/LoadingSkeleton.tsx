import React from 'react';

/**
 * PropertyCardSkeleton
 * Matches the exact proportions, border radii, and internal layout of PropertyCard
 * with smooth shimmer effects to improve perceived loading performance.
 */
export const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-nestin-md overflow-hidden flex flex-col justify-between h-full w-full min-w-0 select-none">
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* IMAGE SKELETON WITH SHIMMER: EXACT 16/10 RATIO */}
        <div className="relative aspect-[16/10] w-full bg-slate-200/90 animate-shimmer overflow-hidden shrink-0">
          {/* TOP BADGE PLACEHOLDERS */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <div className="h-6 w-20 bg-white/80 rounded-full shadow-2xs" />
            <div className="h-6 w-16 bg-white/80 rounded-full shadow-2xs" />
          </div>
          {/* WISHLIST BUTTON PLACEHOLDER */}
          <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 shadow-2xs" />
        </div>

        {/* INFO CONTENT SKELETON: MATCHED PADDING & EQUALIZED VERTICAL RHYTHM */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0 w-full">
          <div className="space-y-2.5 min-w-0 w-full">
            {/* ROW 1: TITLE & RATING */}
            <div className="flex items-start justify-between gap-2">
              <div className="h-10 sm:h-11 animate-shimmer rounded-md w-3/5" />
              <div className="h-6 animate-shimmer rounded-full w-14 shrink-0" />
            </div>

            {/* ROW 2: LOCATION */}
            <div className="h-5 flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full animate-shimmer shrink-0" />
              <div className="h-3.5 animate-shimmer rounded-md w-4/5" />
            </div>

            {/* ROW 3: BADGES */}
            <div className="h-6 sm:h-6.5 flex items-center gap-1.5">
              <div className="h-5.5 sm:h-6 w-16 animate-shimmer rounded-md" />
              <div className="h-5.5 sm:h-6 w-20 animate-shimmer rounded-md" />
              <div className="h-5.5 sm:h-6 w-14 animate-shimmer rounded-md" />
            </div>

            {/* ROW 4: AMENITIES */}
            <div className="h-6 sm:h-6.5 flex items-center gap-1.5 overflow-hidden">
              <div className="h-5.5 sm:h-6 w-16 animate-shimmer rounded-full" />
              <div className="h-5.5 sm:h-6 w-16 animate-shimmer rounded-full" />
              <div className="h-5.5 sm:h-6 w-16 animate-shimmer rounded-full" />
            </div>
          </div>

          {/* ROW 5: PRICE */}
          <div className="pt-3 mt-auto flex items-baseline gap-2 h-8">
            <div className="h-6.5 animate-shimmer rounded-md w-28" />
            <div className="h-3.5 animate-shimmer rounded-md w-12" />
          </div>
        </div>
      </div>

      {/* FOOTER BUTTONS SKELETON: EXACT SAME 40px (h-10) BUTTONS */}
      <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5 mt-auto shrink-0 w-full">
        <div className="flex-1 h-10 animate-shimmer rounded-full" />
        <div className="flex-1 h-10 animate-shimmer rounded-full bg-[#a3e635]/30" />
      </div>
    </div>
  );
};

/**
 * PropertyGridSkeleton
 * Renders multiple property card skeletons in matching responsive grid columns
 */
export const PropertyGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2 items-stretch auto-rows-fr w-full min-w-0">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * PropertyListCardSkeleton
 * Matches the list view structure on Find PG page
 */
export const PropertyListCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch gap-4 sm:gap-5 w-full select-none">
      {/* IMAGE PLACEHOLDER */}
      <div className="relative w-full md:w-72 h-44 sm:h-52 md:h-auto rounded-xl sm:rounded-2xl animate-shimmer shrink-0 aspect-[16/10] md:aspect-auto overflow-hidden" />

      {/* CONTENT PLACEHOLDER */}
      <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0 w-full">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="h-5.5 animate-shimmer rounded-md w-1/2" />
            <div className="h-5 w-14 animate-shimmer rounded-full" />
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full animate-shimmer shrink-0" />
            <div className="h-3.5 animate-shimmer rounded-md w-2/3" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-5.5 w-16 animate-shimmer rounded-lg" />
            <div className="h-5.5 w-24 animate-shimmer rounded-lg" />
            <div className="h-5.5 w-20 animate-shimmer rounded-lg" />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="h-3 animate-shimmer rounded-md w-full" />
            <div className="h-3 animate-shimmer rounded-md w-4/5" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="h-7 animate-shimmer rounded-md w-32" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-28 min-h-[38px] sm:min-h-[40px] animate-shimmer rounded-xl" />
            <div className="flex-1 sm:w-28 min-h-[38px] sm:min-h-[40px] animate-shimmer rounded-xl bg-[#a3e635]/30" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PropertyListSkeleton
 * Renders multiple list view item skeletons
 */
export const PropertyListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4 pt-2 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyListCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * PropertyMapSidebarSkeleton
 * Matches the map sidebar listing cards
 */
export const PropertyMapSidebarSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3.5 pr-1 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs flex gap-3 select-none"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 animate-shimmer rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4.5 animate-shimmer rounded-md w-3/5" />
              <div className="h-3.5 animate-shimmer rounded-md w-8" />
            </div>
            <div className="h-3 animate-shimmer rounded-md w-4/5" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-4.5 animate-shimmer rounded-md w-16" />
              <div className="h-6 animate-shimmer rounded-lg w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * CityCardSkeleton
 * Skeleton placeholder for popular city carousel items
 */
export const CityCardSkeleton: React.FC = () => {
  return (
    <div className="w-[260px] sm:w-[300px] md:w-[320px] shrink-0 rounded-3xl overflow-hidden bg-slate-900 border border-white/10 p-4 space-y-4 select-none">
      <div className="w-full aspect-[4/3] rounded-2xl animate-shimmer-dark" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 rounded-md animate-shimmer-dark" />
          <div className="h-4 w-12 rounded-md animate-shimmer-dark" />
        </div>
        <div className="h-3.5 w-40 rounded-md animate-shimmer-dark" />
      </div>
    </div>
  );
};

/**
 * PropertyDetailsSkeleton
 * Full page skeleton for property detail view
 */
export const PropertyDetailsSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-24 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* TOP BREADCRUMB / ACTION BAR */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 rounded-xl animate-shimmer" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-xl animate-shimmer" />
            <div className="h-8 w-20 rounded-xl animate-shimmer" />
          </div>
        </div>

        {/* HERO GALLERY SKELETON */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-3xl overflow-hidden h-[340px] sm:h-[420px]">
          <div className="md:col-span-2 h-full animate-shimmer" />
          <div className="hidden md:grid grid-rows-2 gap-3 h-full">
            <div className="h-full animate-shimmer" />
            <div className="h-full animate-shimmer" />
          </div>
        </div>

        {/* 2-COL DETAILS & STICKY BOOKING */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-4">
              <div className="flex gap-2">
                <div className="h-5 w-24 rounded-full animate-shimmer" />
                <div className="h-5 w-20 rounded-full animate-shimmer" />
              </div>
              <div className="h-8 w-3/4 rounded-lg animate-shimmer" />
              <div className="h-4 w-1/2 rounded-md animate-shimmer" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                <div className="h-16 rounded-2xl animate-shimmer" />
                <div className="h-16 rounded-2xl animate-shimmer" />
                <div className="h-16 rounded-2xl animate-shimmer" />
                <div className="h-16 rounded-2xl animate-shimmer" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-4">
              <div className="h-6 w-40 rounded-md animate-shimmer" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl animate-shimmer" />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT STICKY BOOKING WIDGET */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 space-y-4 shadow-sm">
            <div className="h-7 w-32 rounded-md animate-shimmer" />
            <div className="h-12 w-full rounded-2xl animate-shimmer" />
            <div className="h-12 w-full rounded-2xl animate-shimmer bg-[#a3e635]/30" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton = PropertyGridSkeleton;
