import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { releaseAllScrollLocks } from '../hooks/useScrollLock';

// Global Lenis singleton instance
let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function scrollToTarget(
  target: string | HTMLElement | number,
  options?: {
    offset?: number;
    duration?: number;
    immediate?: boolean;
    lock?: boolean;
  }
) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset: options?.offset ?? -80,
      duration: options?.duration ?? 1.2,
      immediate: options?.immediate ?? false,
      lock: options?.lock ?? false,
    });
  } else if (typeof window !== 'undefined') {
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: options?.immediate ? 'auto' : 'smooth' });
    } else if (typeof target === 'string') {
      const el = document.querySelector(target) || document.getElementById(target.replace(/^#/, ''));
      if (el) {
        el.scrollIntoView({ behavior: options?.immediate ? 'auto' : 'smooth' });
      }
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: options?.immediate ? 'auto' : 'smooth' });
    }
  }
}

interface SmoothScrollProps {
  children: React.ReactNode;
}

export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children }) => {
  const location = useLocation();
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
      autoResize: true,
    });

    lenisInstance = lenis;
    if (typeof window !== 'undefined') {
      (window as any).lenis = lenis;
    }

    function raf(time: number) {
      lenis.raf(time);
      reqIdRef.current = requestAnimationFrame(raf);
    }

    reqIdRef.current = requestAnimationFrame(raf);

    return () => {
      if (reqIdRef.current) {
        cancelAnimationFrame(reqIdRef.current);
      }
      lenis.destroy();
      lenisInstance = null;
      if (typeof window !== 'undefined' && (window as any).lenis === lenis) {
        (window as any).lenis = null;
      }
    };
  }, []);

  // Reset scroll on route change and ensure all scroll locks are released
  useEffect(() => {
    releaseAllScrollLocks();
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return <>{children}</>;
};
