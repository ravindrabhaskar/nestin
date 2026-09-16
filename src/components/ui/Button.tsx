import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-bold rounded-xl transition-colors duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a3e635] focus-visible:ring-offset-2';

  const variantClasses = {
    primary:
      'bg-[#a3e635] text-slate-950 hover:bg-[#92d428] font-black font-heading border border-[#8ec725]',
    secondary:
      'bg-slate-900 text-white hover:bg-slate-800 font-heading border border-slate-800',
    outline:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 font-semibold border border-rose-700',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 font-semibold border border-emerald-700',
  }[variant];

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5 rounded-lg',
    md: 'text-xs sm:text-sm px-4 py-2 h-10 gap-2 rounded-xl',
    lg: 'text-sm sm:text-base px-5 py-2.5 h-11 gap-2.5 rounded-xl',
  }[size];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Icon name="refresh" size={16} className="animate-spin text-current shrink-0" />
      ) : (
        leftIcon
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon}
    </button>
  );
};
