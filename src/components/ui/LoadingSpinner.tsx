import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'google' | 'dark' | 'light' | 'primary' | 'slate';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'google',
  className = '',
  label,
}) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-[2.5px]',
    lg: 'w-6 h-6 border-3',
    xl: 'w-8 h-8 border-4',
  }[size];

  if (variant === 'google') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {/* Google-styled multicolor spinner */}
        <div
          role="status"
          aria-label={label || 'Connecting to Google'}
          className={`relative ${
            size === 'xs'
              ? 'w-3.5 h-3.5'
              : size === 'sm'
                ? 'w-4 h-4'
                : size === 'md'
                  ? 'w-5 h-5'
                  : size === 'lg'
                    ? 'w-6 h-6'
                    : 'w-8 h-8'
          } animate-spin shrink-0`}
        >
          <svg className="w-full h-full viewBox-0-0-24-24" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-100" fill="#4285F4" d="M12 2a10 10 0 0 1 10 10h-3.5a6.5 6.5 0 0 0-6.5-6.5V2z" />
            <path className="opacity-100" fill="#34A853" d="M22 12a10 10 0 0 1-10 10v-3.5a6.5 6.5 0 0 0 6.5-6.5H22z" />
            <path className="opacity-100" fill="#FBBC05" d="M12 22A10 10 0 0 1 2 12h3.5a6.5 6.5 0 0 0 6.5 6.5V22z" />
            <path className="opacity-100" fill="#EA4335" d="M2 12A10 10 0 0 1 12 2v3.5A6.5 6.5 0 0 0 5.5 12H2z" />
          </svg>
        </div>
        {label && <span className="font-semibold text-slate-700 font-sans">{label}</span>}
      </div>
    );
  }

  const borderColors = {
    dark: 'border-slate-900 border-t-transparent',
    light: 'border-white border-t-transparent',
    primary: 'border-[#a3e635] border-t-transparent',
    slate: 'border-slate-400 border-t-transparent',
  }[variant];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        role="status"
        aria-label={label || 'Loading'}
        className={`${sizeClasses} ${borderColors} rounded-full animate-spin shrink-0`}
      />
      {label && <span className="font-semibold font-sans">{label}</span>}
    </div>
  );
};
