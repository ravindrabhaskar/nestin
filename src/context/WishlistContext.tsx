import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PropertyListing } from '../types';
import { useAuth } from './AuthContext';

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

const LOCAL_STORAGE_KEY = 'nestin_wishlist_properties_v1';

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<PropertyListing[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load wishlist from localStorage:', e);
      return [];
    }
  });

  const [quickLoginToast, setQuickLoginToast] = useState<QuickLoginToastState>({
    isOpen: false,
    property: null,
  });

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage:', e);
    }
  }, [wishlist]);

  const showQuickLoginToast = useCallback((property: PropertyListing) => {
    setQuickLoginToast({
      isOpen: true,
      property,
    });
  }, []);

  const hideQuickLoginToast = useCallback(() => {
    setQuickLoginToast((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const addToWishlist = useCallback((property: PropertyListing) => {
    setWishlist((prev) => {
      if (prev.some((p) => p.id === property.id)) return prev;
      return [property, ...prev];
    });
  }, []);

  const removeFromWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => prev.filter((p) => p.id !== propertyId));
  }, []);

  const toggleWishlist = useCallback((property: PropertyListing) => {
    if (!isAuthenticated) {
      showQuickLoginToast(property);
      return;
    }
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === property.id);
      if (exists) {
        return prev.filter((p) => p.id !== property.id);
      } else {
        return [property, ...prev];
      }
    });
  }, [isAuthenticated, showQuickLoginToast]);

  const isWishlisted = useCallback((propertyId: string) => {
    return wishlist.some((p) => p.id === propertyId);
  }, [wishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isWishlisted,
        clearWishlist,
        wishlistCount: wishlist.length,
        quickLoginToast,
        showQuickLoginToast,
        hideQuickLoginToast,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
