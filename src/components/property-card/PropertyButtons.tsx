import React from 'react';

interface PropertyButtonsProps {
  onViewDetails: (e: React.MouseEvent) => void;
  onBookNow: (e: React.MouseEvent) => void;
}

export const PropertyButtons: React.FC<PropertyButtonsProps> = ({ onViewDetails, onBookNow }) => {
  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <button
        type="button"
        onClick={onViewDetails}
        className="flex-1 h-10 py-2 px-3 rounded-full text-xs font-bold text-slate-800 bg-white border border-slate-300/90 hover:bg-slate-50 hover:text-slate-950 transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-98 text-center shadow-xs flex items-center justify-center"
      >
        View details
      </button>

      <button
        type="button"
        onClick={onBookNow}
        className="flex-1 h-10 py-2 px-3 rounded-full text-xs font-extrabold text-slate-950 bg-[#a3e635] hover:bg-[#91d923] transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-98 text-center shadow-xs flex items-center justify-center"
      >
        Book now
      </button>
    </div>
  );
};
