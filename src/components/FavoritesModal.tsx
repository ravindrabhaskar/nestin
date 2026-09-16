import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Trash2, ArrowRight, ShieldCheck, Star, MapPin, Sparkles } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { PropertyListing } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPropertyDetails: (property: PropertyListing) => void;
  onBookProperty: (property: PropertyListing) => void;
  onNavigateToFindPG: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  onViewPropertyDetails,
  onBookProperty,
  onNavigateToFindPG,
}) => {
  const { wishlist, removeFromWishlist, clearWishlist, wishlistCount } = useWishlist();
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-end sm:p-4 overflow-hidden">
        {/* BACKDROP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* MODAL / SLIDE-OVER DRAWER */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-2xl h-full sm:h-[92vh] bg-white sm:rounded-3xl shadow-nestin-floating flex flex-col z-10 overflow-hidden border border-slate-200/80"
        >
          {/* HEADER */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-500 shadow-2xs">
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold font-heading text-slate-900">My Favorites</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {wishlistCount === 0
                    ? 'No saved properties'
                    : `${wishlistCount} saved ${wishlistCount === 1 ? 'property' : 'properties'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wishlistCount > 0 && (
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear all</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {wishlistCount === 0 ? (
              /* EMPTY STATE */
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-6 space-y-5">
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-300 border border-rose-100">
                  <Heart className="w-10 h-10" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-extrabold font-heading text-slate-900">
                    Your wishlist is empty
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                    Explore our verified student & working professional PGs. Click the heart icon on any stay to save it to your favorites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToFindPG();
                  }}
                  className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Verified PGs</span>
                  <ArrowRight className="w-4 h-4 text-[#a3e635]" />
                </button>
              </div>
            ) : (
              /* FAVORITES LIST */
              <div className="space-y-4">
                {wishlist.map((prop) => {
                  const rentVal = prop.rent || prop.price || 10000;
                  const nameToDisplay = prop.name || prop.title;

                  return (
                    <motion.div
                      key={prop.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                    >
                      <div
                        className="flex items-center gap-3.5 min-w-0 cursor-pointer w-full sm:w-auto"
                        onClick={() => {
                          onViewPropertyDetails(prop);
                          onClose();
                        }}
                      >
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                          <img
                            src={prop.image}
                            alt={nameToDisplay}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {prop.verified && (
                            <span className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-full text-emerald-600 shadow-2xs">
                              <ShieldCheck className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 font-heading truncate group-hover:text-emerald-950 transition-colors">
                              {nameToDisplay}
                            </h4>
                          </div>

                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{prop.address || `${prop.area || prop.city}, ${prop.city}`}</span>
                          </p>

                          <div className="flex items-center gap-3 pt-0.5">
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{prop.rating || 4.5}</span>
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              ₹{rentVal.toLocaleString('en-IN')}
                              <span className="text-slate-400 font-normal text-[11px]">/mo</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            onViewPropertyDetails(prop);
                            onClose();
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onBookProperty(prop);
                            onClose();
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-[#a3e635] hover:bg-[#92d428] transition-colors cursor-pointer"
                        >
                          Book
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromWishlist(prop.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                          title="Remove from favorites"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          {wishlistCount > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Saved PGs persist automatically in your browser</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToFindPG();
                }}
                className="font-bold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Find more PGs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
