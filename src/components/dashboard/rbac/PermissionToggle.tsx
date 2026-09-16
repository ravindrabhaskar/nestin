import React from 'react';
import { motion } from 'motion/react';

interface PermissionToggleProps {
  checked: boolean;
  onChange?: (nextState: boolean) => void;
  disabled?: boolean;
  disabledTooltip?: string;
  size?: 'sm' | 'md';
  id?: string;
  ariaLabel?: string;
}

export const PermissionToggle: React.FC<PermissionToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  disabledTooltip,
  size = 'md',
  id,
  ariaLabel,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange(!checked);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (checked ? 'Access Granted' : 'Access Denied')}
        disabled={disabled}
        onClick={handleClick}
        title={disabled ? disabledTooltip || 'Permission locked' : checked ? 'Access Granted (Click to revoke)' : 'Access Denied (Click to grant)'}
        className={`group relative inline-flex items-center justify-center transition-all duration-200 outline-none select-none rounded-full ${
          disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[#062817] focus-visible:ring-offset-2'
        }`}
      >
        {/* Toggle Track */}
        <div
          className={`relative flex items-center justify-between rounded-full border transition-all duration-200 ${
            isSmall ? 'w-10 h-5 px-0.5' : 'w-12 h-6 px-1'
          } ${
            checked
              ? 'bg-emerald-50 border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'bg-rose-50/60 border-rose-200/90'
          }`}
        >
          {/* Visual ON/OFF indicator dot */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`rounded-full flex items-center justify-center shadow-xs transition-colors ${
              isSmall ? 'w-4 h-4' : 'w-4 h-4'
            } ${
              checked
                ? 'bg-emerald-600 text-white ml-auto'
                : 'bg-rose-500 text-white mr-auto'
            }`}
          >
            {checked ? (
              <span className="w-1.5 h-1.5 rounded-full bg-white block" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-white block" />
            )}
          </motion.div>
        </div>
      </button>
    </div>
  );
};
