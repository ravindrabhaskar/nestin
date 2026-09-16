import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'lime' | 'emerald' | 'amber' | 'slate' | 'rose' | 'dark';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'lime',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const variantClasses = {
    lime: 'bg-[#a3e635]/20 text-[#121820] border border-[#a3e635]/60',
    emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-900 border border-amber-200/60',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    dark: 'bg-slate-900 text-white border border-slate-800',
  }[variant];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-sans tracking-tight shrink-0 select-none ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
