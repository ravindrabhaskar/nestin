import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className = '', id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-700 font-heading tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`w-full bg-white border text-xs sm:text-sm text-slate-900 rounded-[18px] transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#a3e635] focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-10' : 'pl-4'
            } ${rightIcon ? 'pr-10' : 'pr-4'} ${
              error
                ? 'border-rose-500 ring-1 ring-rose-500'
                : 'border-slate-200/90 hover:border-slate-300'
            } py-3 shadow-2xs ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-slate-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] font-semibold text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
