import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { PropertyListing } from '../types';
import { useAuth } from './AuthContext';
import { usePropertyListing } from './PropertyListingContext';
import { ApiClient } from '../lib/apiClient';
import { reportSyncError } from '../lib/syncBus';

export interface QuickLoginToastState {
  isOpen: boolean;
  property: PropertyListing | null;
}

interface WishlistContextType {
  wishlist: PropertyListing[];
  addToWishlist: (property: PropertyListing) => void;
  removeFromWishlist: (propertyId: string) => void;
  toggleWishlist: (property: PropertyListing) => void;
  isWishlisted: (propertyId: string) => boolean;
  clearWishlist: () => void;
  wishlistCount: number;
  quickLoginToast: QuickLoginToastState;
  showQuickLoginToast: (property: PropertyListing) => void;
  hideQuickLoginToast: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

/**
 * Saved properties. Persisted server-side per account so the list follows the user across devices.
 * Guests are prompted to sign in (QuickLoginToast) instead of getting a device-only list.
 */
export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toFindPGListing } = usePropertyListing();
  const [wishlist, setWishlist] = useState<PropertyListing[]>([]);
  const [quickLoginToast, setQuickLoginToast] = useState<QuickLoginToastState>({ isOpen: false, property: null });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    let mounted = true;
    ApiClient.tenant.wishlist()
      .then((listings) => {
        if (mounted) setWishlist(listings.map(toFindPGListing));
      })
      .catch((err) => reportSyncError('Could not load saved properties', err));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]);

  const showQuickLoginToast = useCallback((property: PropertyListing) => setQuickLoginToast({ isOpen: true, property }), []);
  const hideQuickLoginToast = useCallback(() => setQuickLoginToast((prev) => ({ ...prev, isOpen: false })), []);

  const addToWishlist = useCallback(
    (property: PropertyListing) => {
      if (!isAuthenticated) {
        showQuickLoginToast(property);
        return;
      }
      setWishlist((prev) => (prev.some((p) => p.id === property.id) ? prev : [property, ...prev]));
      ApiClient.tenant.saveToWishlist(property.id).catch((err) => {
        setWishlist((prev) => prev.filter((p) => p.id !== property.id));
        reportSyncError('Could not save the property', err);
      });
    },
    [isAuthenticated, showQuickLoginToast]
  );

  const removeFromWishlist = useCallback(
    (propertyId: string) => {
      const removed = wishlist.find((p) => p.id === propertyId);
      setWishlist((prev) => prev.filter((p) => p.id !== propertyId));
      if (!isAuthenticated) return;
      ApiClient.tenant.removeFromWishlist(propertyId).catch((err) => {
        if (removed) setWishlist((prev) => [removed, ...prev]);
        reportSyncError('Could not remove the saved property', err);
      });
    },
    [isAuthenticated, wishlist]
  );

  const toggleWishlist = useCallback(
    (property: PropertyListing) => {
      if (!isAuthenticated) {
        showQuickLoginToast(property);
        return;
      }
      if (wishlist.some((p) => p.id === property.id)) removeFromWishlist(property.id);
      else addToWishlist(property);
    },
    [isAuthenticated, wishlist, addToWishlist, removeFromWishlist, showQuickLoginToast]
  );

  const isWishlisted = useCallback((propertyId: string) => wishlist.some((p) => p.id === propertyId), [wishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    if (isAuthenticated) ApiClient.tenant.clearWishlist().catch((err) => reportSyncError('Could not clear saved properties', err));
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({ wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isWishlisted, clearWishlist, wishlistCount: wishlist.length, quickLoginToast, showQuickLoginToast, hideQuickLoginToast }),
    [wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isWishlisted, clearWishlist, quickLoginToast, showQuickLoginToast, hideQuickLoginToast]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
