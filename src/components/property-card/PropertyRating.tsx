import React from 'react';
import { Icon } from '../ui/Icon';

interface PropertyRatingProps {
  rating: number;
  reviewCount: number;
}

export const PropertyRating: React.FC<PropertyRatingProps> = ({ rating, reviewCount }) => {
  return (
    <div className="h-6 flex items-center gap-1 font-sans shrink-0 px-2 py-0.5 rounded-full bg-amber-50/90 border border-amber-200/60 text-slate-900">
      <Icon name="star" size={14} className="text-amber-500 fill-amber-400" />
      <span className="font-extrabold text-xs text-slate-900 leading-none">{rating.toFixed(1)}</span>
      <span className="text-slate-400 text-[10px] font-normal leading-none">({reviewCount})</span>
    </div>
  );
};
