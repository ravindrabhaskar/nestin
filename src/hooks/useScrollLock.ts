import { useEffect } from 'react';
import { getLenis } from '../components/SmoothScroll';

let globalLockCount = 0;

/**
 * Force release all body and document scroll locks.
 * Safe to call on route changes or unmount events.
 */
export function releaseAllScrollLocks() {
  globalLockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
  getLenis()?.start();
}

/**
 * Clean, safe React hook to manage body scroll locking exclusively when a modal/overlay is open.
 * Restores natural browser scrolling immediately upon modal close or component unmount.
 * Uses reference counting so opening/closing nested or sequential modals never permanently locks the page.
 */
export function useScrollLock(isLocked: boolean = false) {
  useEffect(() => {
    if (!isLocked) {
      if (globalLockCount === 0 && typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        getLenis()?.start();
      }
      return;
    }

    globalLockCount += 1;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      getLenis()?.stop();
    }

    return () => {
      globalLockCount = Math.max(0, globalLockCount - 1);
      if (globalLockCount === 0 && typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        getLenis()?.start();
      }
    };
  }, [isLocked]);
}

