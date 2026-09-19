import React, { useState, useEffect, useRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface LazyImageProps extends Omit<HTMLMotionProps<'img'>, 'src' | 'alt'> {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  placeholderColor?: string;
  rootMargin?: string;
  threshold?: number;
  useMotion?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  placeholderColor = 'bg-slate-800/40',
  rootMargin = '200px',
  threshold = 0.01,
  useMotion = false,
  onLoad,
  onError,
  ...motionProps
}) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  useEffect(() => {
    // Fallback if IntersectionObserver is not supported
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (imgRef.current) {
              observer.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImgSrc('https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fm=webp&fit=crop&w=1200&q=80');
    setIsLoaded(true);
    if (onError) {
      onError(e);
    }
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Skeleton placeholder while image is loading or waiting for intersection */}
      {!isLoaded && <div className={`absolute inset-0 animate-pulse ${placeholderColor} z-0`} />}

      {/* Render image when observed in viewport */}
      {isInView &&
        (useMotion ? (
          <motion.img
            src={imgSrc}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-opacity duration-500 relative z-10 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${imgClassName}`}
            {...motionProps}
          />
        ) : (
          <img
            src={imgSrc}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-opacity duration-500 relative z-10 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${imgClassName}`}
          />
        ))}
    </div>
  );
};
