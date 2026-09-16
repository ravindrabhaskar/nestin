import React from 'react';
import nestinLogo from '../assets/images/nestin_logo.png';

interface NestInLogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // light = for light backgrounds, dark = for dark backgrounds
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  customSrc?: string;
}

export const NestInLogo: React.FC<NestInLogoProps> = ({
  className = '',
  variant = 'light',
  showTagline = true,
  size = 'md',
  customSrc,
}) => {
  const isDarkBg = variant === 'dark';
  const logoSrc = customSrc || (isDarkBg ? '/nestin_logo_dark.png' : (nestinLogo || '/nestin_logo.png'));

  const heightClasses = {
    sm: showTagline ? 'h-9 sm:h-10' : 'h-7 sm:h-8',
    md: showTagline ? 'h-11 sm:h-13' : 'h-8 sm:h-10',
    lg: showTagline ? 'h-14 sm:h-16' : 'h-11 sm:h-13',
  }[size];

  return (
    <div className={`inline-block select-none group cursor-pointer ${className}`}>
      <img
        src={logoSrc}
        alt="Nestin - Find Your Space"
        referrerPolicy="no-referrer"
        className={`${heightClasses} w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]`}
      />
    </div>
  );
};


