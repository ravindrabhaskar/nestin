import React from 'react';
import { AuthorityLevel } from '../../../types/rbac';

interface AuthorityMeterProps {
  level: AuthorityLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AuthorityMeter: React.FC<AuthorityMeterProps> = ({ level, showLabel = true, size = 'md' }) => {
  const getLevelConfig = (lvl: AuthorityLevel) => {
    switch (lvl) {
      case 'full':
        return {
          label: 'Full Access',
          filledBars: 4,
          totalBars: 4,
          colorClass: 'bg-[#a3e635]',
          textColorClass: 'text-emerald-950',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'high':
        return {
          label: 'High',
          filledBars: 3,
          totalBars: 4,
          colorClass: 'bg-emerald-500',
          textColorClass: 'text-emerald-700',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'medium':
        return {
          label: 'Medium',
          filledBars: 2,
          totalBars: 4,
          colorClass: 'bg-amber-500',
          textColorClass: 'text-amber-700',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'low':
        return {
          label: 'Low',
          filledBars: 1,
          totalBars: 4,
          colorClass: 'bg-orange-500',
          textColorClass: 'text-orange-700',
          badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'limited':
      default:
        return {
          label: 'Limited',
          filledBars: 1,
          totalBars: 4,
          colorClass: 'bg-rose-500',
          textColorClass: 'text-rose-700',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
    }
  };

  const config = getLevelConfig(level);

  return (
    <div className="flex items-center gap-2 select-none">
      {showLabel && (
        <span className={`text-[11px] font-extrabold uppercase font-heading ${config.textColorClass}`}>
          {config.label}
        </span>
      )}

      {/* 4-bar authority indicator matching visual reference */}
      <div className="flex items-center gap-1">
        {Array.from({ length: config.totalBars }).map((_, idx) => {
          const isFilled = idx < config.filledBars;
          return (
            <div
              key={idx}
              className={`rounded-full transition-all ${
                size === 'sm' ? 'w-1 h-2.5' : size === 'lg' ? 'w-1.5 h-4' : 'w-1.5 h-3'
              } ${isFilled ? config.colorClass : 'bg-slate-200'}`}
              title={`${config.label} Authority (${config.filledBars}/${config.totalBars})`}
            />
          );
        })}
      </div>
    </div>
  );
};
