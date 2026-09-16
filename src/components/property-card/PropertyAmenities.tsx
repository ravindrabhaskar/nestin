import React from 'react';
import { getAmenityIconComponent } from '../ui/AmenityIcons';

interface PropertyAmenitiesProps {
  amenities: string[];
  maxDisplay?: number;
  onMoreClick?: (e: React.MouseEvent) => void;
}

export const PropertyAmenities: React.FC<PropertyAmenitiesProps> = ({
  amenities = [],
  maxDisplay = 3,
  onMoreClick,
}) => {
  const visible = amenities.slice(0, maxDisplay);
  const extraCount = amenities.length > maxDisplay ? amenities.length - maxDisplay : 0;

  return (
    <div className="h-6 sm:h-6.5 flex items-center gap-1.5 overflow-hidden text-nowrap text-xs text-slate-600 select-none">
      {visible.map((amenity, idx) => (
        <span
          key={idx}
          className="h-5.5 sm:h-6 px-2 rounded-full border border-slate-200/80 bg-slate-50/90 text-[10px] sm:text-[10.5px] font-semibold text-slate-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
          title={amenity}
        >
          {getAmenityIconComponent(amenity, 'w-3 h-3 text-slate-600 shrink-0')}
          <span className="truncate max-w-[85px]">{amenity}</span>
        </span>
      ))}

      {extraCount > 0 && (
        <button
          type="button"
          onClick={onMoreClick}
          className="h-5.5 sm:h-6 px-2 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-slate-200 text-[10px] sm:text-[10.5px] font-bold text-slate-600 transition-colors cursor-pointer shrink-0"
        >
          +{extraCount} more
        </button>
      )}
    </div>
  );
};

