import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Bookmark, ArrowRight } from 'lucide-react';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { useWishlist } from '../context/WishlistContext';

export const TenantSavedPage: React.FC = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist } = useWishlist();

  const handleSelectProperty = (pg: any) => {
    const targetSlug =
      pg.slug ||
      (pg.name || pg.title || pg.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    navigate(`/properties/${targetSlug}`);
  };

  return (
    <TenantAccountLayout
      title="Saved PGs"
      subtitle="Properties you've saved while exploring Nestin."
      activeNav="/saved"
    >
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wishlist.map((pg) => {
            const displayImage =
              (pg as any).image ||
              (pg as any).coverImage ||
              (pg as any).images?.[0] ||
              'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500&q=80';

            return (
              <div
                key={pg.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* CARD IMAGE */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={displayImage}
                      alt={(pg as any).name || (pg as any).title || 'PG Property'}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />

                    {/* REMOVE BOOKMARK BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(pg.id);
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-rose-500 flex items-center justify-center shadow-xs hover:bg-white transition-colors cursor-pointer"
                      title="Remove from saved"
                    >
                      <Bookmark className="w-4 h-4 fill-rose-500 text-rose-500" />
                    </button>

                    {/* RATING BADGE */}
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1 font-heading">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{(pg as any).rating || '4.8'}</span>
                    </div>
                  </div>

                  {/* CARD CONTENT */}
                  <div className="p-4 space-y-1.5">
                    <h3 className="text-sm font-bold font-heading text-slate-900 truncate">
                      {(pg as any).name || (pg as any).title}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {(pg as any).location}, {(pg as any).city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-3 pt-3">
                  <div>
                    <div className="text-sm font-bold font-heading text-slate-900">
                      ₹{(pg as any).price?.toLocaleString() || '9,500'}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectProperty(pg)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[#a3e635] text-xs font-bold rounded-xl transition-colors cursor-pointer font-heading flex items-center gap-1"
                  >
                    <span>View PG</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MINIMAL EMPTY STATE */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold font-heading text-slate-900">No saved PGs yet.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Save PGs you like while exploring Nestin.</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/find-pg')}
              className="px-4 py-2 bg-slate-900 text-[#a3e635] text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer font-heading"
            >
              Explore PGs
            </button>
          </div>
        </div>
      )}
    </TenantAccountLayout>
  );
};
