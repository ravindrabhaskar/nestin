import React from 'react';
import { motion } from 'motion/react';
import { Icon } from './ui/Icon';
import { PropertyListing } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { PropertyBadges } from './property-card/PropertyBadges';
import { PropertyAmenities } from './property-card/PropertyAmenities';
import { PropertyRating } from './property-card/PropertyRating';
import { PropertyButtons } from './property-card/PropertyButtons';

interface PropertyCardProps {
  property: PropertyListing;
  onViewDetails: (property: PropertyListing) => void;
  onBookNow: (property: PropertyListing) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = React.memo(({
  property,
  onViewDetails,
  onBookNow,
}) => {
  const { isWishlisted, toggleWishlist, showQuickLoginToast } = useWishlist();
  const { isAuthenticated } = useAuth();
  const isLiked = isWishlisted(property.id);

  const nameToDisplay = property.name || property.title || 'Nestin Co-Living';
  const ratingToDisplay = property.rating || 4.5;
  const reviewsCount = property.reviewsCount || property.reviews || 117;

  const sharingList = property.sharing || ['Double', 'Triple'];
  const amenitiesList = property.amenities || [
    'WiFi',
    'Laundry',
    'Kitchen',
    'Power Backup',
  ];
  const availabilityText = property.available || '01 Aug 2026';
  const distanceText = property.distance || '3.4 km away';
  const addressText =
    property.address ||
    `${property.area || 'Madhapur'}, ${property.city || 'Hyderabad'}`;

  const fullLocationString = `${addressText} • ${distanceText}`;
  const priceToDisplay = property.price || property.rent || 16500;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-nestin-md hover:shadow-nestin-floating transition-all duration-300 flex flex-col justify-between overflow-hidden group cursor-pointer h-full w-full min-w-0 select-none"
      onClick={() => onViewDetails(property)}
    >
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* TOP IMAGE & BADGES CONTAINER: EXACT 16/10 RATIO */}
        <div className="relative aspect-[16/10] w-full overflow-hidden shrink-0 bg-slate-100">
          <img
            src={property.image}
            alt={nameToDisplay}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* TOP LEFT BADGES */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 select-none">
            {property.verified !== false && (
              <div className="h-6 px-2.5 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-bold flex items-center gap-1 shadow-2xs border border-white/60 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#a3e635] flex items-center justify-center shrink-0">
                  <Icon name="shieldCheck" size={12} className="text-[#0F5132] stroke-[2.5]" />
                </span>
                <span>Verified</span>
              </div>
            )}

            {property.featured && (
              <div className="h-6 px-2.5 rounded-full bg-[#a3e635] text-[#0F5132] text-[11px] font-extrabold flex items-center gap-1 shadow-2xs whitespace-nowrap">
                <Icon name="sparkles" size={12} className="text-[#0F5132]" />
                <span>Featured</span>
              </div>
            )}
          </div>

          {/* TOP RIGHT WISHLIST HEART BUTTON: EXACT 36px (w-9 h-9) */}
          <button
            type="button"
            id={`property-favorite-btn-${property.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated) {
                showQuickLoginToast(property);
                return;
              }
              toggleWishlist(property);
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md hover:bg-white flex items-center justify-center shadow-md active:scale-90 transition-transform z-10 cursor-pointer"
            aria-label={isLiked ? "Remove from favorites" : "Save to favorites"}
            title={isLiked ? "Remove from favorites" : "Save to favorites"}
          >
            <Icon
              name="heart"
              size={16}
              className={`transition-colors ${
                isLiked
                  ? 'fill-red-500 text-red-500 scale-110'
                  : 'text-slate-800 hover:text-slate-950'
              }`}
            />
          </button>
        </div>

        {/* PROPERTY INFO CONTENT: UNIFORM PADDING & EXACT VERTICAL RHYTHM */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0 w-full">
          <div className="space-y-2.5 min-w-0 w-full">
            {/* ROW 1: TITLE (LOCKED 2-LINE HEIGHT) & RATING */}
            <div className="flex items-start justify-between gap-2 min-w-0 w-full">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-heading tracking-tight group-hover:text-[#5fa000] transition-colors leading-snug line-clamp-2 h-10 sm:h-11 flex items-start overflow-hidden flex-1 min-w-0">
                {nameToDisplay}
              </h3>
              <PropertyRating rating={ratingToDisplay} reviewCount={reviewsCount} />
            </div>

            {/* ROW 2: LOCATION WITH MAP PIN (EXACT 1-LINE TRUNCATED) */}
            <div className="h-5 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-sans min-w-0 w-full truncate">
              <Icon name="location" size={14} className="text-[#a3e635] shrink-0" />
              <span className="truncate min-w-0 flex-1">{fullLocationString}</span>
            </div>

            {/* ROW 3: SHARING, GENDER, FOOD & AVAILABILITY (EXACT 1-LINE ROW) */}
            <PropertyBadges
              verified={property.verified}
              featured={property.featured}
              sharing={sharingList}
              gender={property.gender}
              food={property.food !== false}
              availability={availabilityText}
            />

            {/* ROW 4: AMENITIES PILLS (EXACT 1-LINE ROW) */}
            <PropertyAmenities
              amenities={amenitiesList}
              maxDisplay={3}
              onMoreClick={(e) => {
                e.stopPropagation();
                onViewDetails(property);
              }}
            />
          </div>

          {/* ROW 5: PRICE SECTION (PINNED ABOVE FOOTER, EXACT HEIGHT) */}
          <div className="pt-3 mt-auto flex items-baseline gap-1 font-sans min-w-0 h-8">
            <span className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight leading-none">
              ₹{priceToDisplay.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal leading-none">/month</span>
          </div>
        </div>
      </div>

      {/* FOOTER ACTION BUTTONS: VIEW DETAILS & BOOK NOW */}
      <div
        className="p-4 sm:p-5 pt-0 mt-auto border-t border-slate-100 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <PropertyButtons
          onViewDetails={(e) => {
            e.stopPropagation();
            onViewDetails(property);
          }}
          onBookNow={(e) => {
            e.stopPropagation();
            onBookNow(property);
          }}
        />
      </div>
    </motion.div>
  );
});
