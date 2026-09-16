import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'dark' | 'outline';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverEffect = true,
  className = '',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-white border border-slate-200/90 shadow-nestin-sm text-slate-900',
    glass: 'glass-panel text-slate-900 shadow-nestin-glass',
    dark: 'glass-dark text-white shadow-nestin-floating',
    outline: 'bg-transparent border border-slate-200 text-slate-900',
  }[variant];

  const hoverClasses = hoverEffect
    ? 'hover:shadow-nestin-md hover:-translate-y-0.5 transition-all duration-300'
    : '';

  return (
    <div
      className={`rounded-[24px] p-5 sm:p-6 overflow-hidden ${variantClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
