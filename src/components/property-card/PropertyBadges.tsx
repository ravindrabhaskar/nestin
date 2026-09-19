import React from 'react';
import { Utensils, Users } from 'lucide-react';

interface PropertyBadgesProps {
  verified?: boolean;
  featured?: boolean;
  sharing?: string[];
  gender?: 'Boys' | 'Girls' | 'Co-living' | string;
  food?: boolean;
  availability?: string;
}

export const PropertyBadges: React.FC<PropertyBadgesProps> = ({
  sharing = ['Double', 'Triple'],
  gender,
  food = true,
  availability,
}) => {
  const sharingText = Array.isArray(sharing) ? sharing.slice(0, 2).join(' · ') : sharing;
  const isAvailableNow =
    availability && (availability.toLowerCase().includes('now') || availability.toLowerCase().includes('available'));

  return (
    <div className="h-6 sm:h-6.5 flex items-center gap-1.5 overflow-hidden text-nowrap text-[10.5px] sm:text-[11px] font-medium text-slate-700 select-none">
      {gender && (
        <span className="h-5.5 sm:h-6 px-2 rounded-md bg-slate-100/90 text-slate-800 font-semibold flex items-center gap-1 shrink-0">
          <Users className="w-3 h-3 text-slate-500" />
          <span>{gender}</span>
        </span>
      )}

      {sharingText && (
        <span className="h-5.5 sm:h-6 px-2 rounded-md bg-slate-100/90 text-slate-700 font-medium flex items-center shrink-0">
          {sharingText}
        </span>
      )}

      {food && (
        <span className="h-5.5 sm:h-6 px-2 rounded-md bg-slate-100/90 text-slate-700 font-medium flex items-center gap-1 shrink-0">
          <Utensils className="w-3 h-3 text-slate-500 stroke-[1.75]" />
          <span>Food</span>
        </span>
      )}

      {availability && (
        <span
          className={`h-5.5 sm:h-6 px-2 rounded-md text-[10px] sm:text-[10.5px] flex items-center shrink-0 ${
            isAvailableNow
              ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/50'
              : 'bg-slate-100/90 text-slate-600 font-medium'
          }`}
        >
          {isAvailableNow ? 'Available Now' : availability.startsWith('From') ? availability : `From ${availability}`}
        </span>
      )}
    </div>
  );
};
