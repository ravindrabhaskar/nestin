import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePropertyListing } from '../context/PropertyListingContext';
import { PropertyDetailsView } from '../components/property-details/PropertyDetailsView';
import { PropertyNotFoundPage } from './PropertyNotFoundPage';
import { PropertyDetailsSkeleton } from '../components/ui/LoadingSkeleton';
import { ChevronLeft, Home } from 'lucide-react';
import { OwnerPropertyListing } from '../types/property';

export const PropertyDetailsPage: React.FC = () => {
  const { slug, propertyId } = useParams<{ slug?: string; propertyId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getPropertyBySlug, fetchPropertyBySlug, isLoading: catalogLoading } = usePropertyListing();
  const [isLoading, setIsLoading] = useState(true);
  const [fetched, setFetched] = useState<OwnerPropertyListing | null>(null);
  const [notFound, setNotFound] = useState(false);

  const effectiveSlug = slug || propertyId || '';
  const actionParam = searchParams.get('action');
  const bookParam = searchParams.get('book');
  const initialOpenBooking = actionParam === 'book' || bookParam === 'true';

  const cached = effectiveSlug ? getPropertyBySlug(effectiveSlug) : null;

  // Deep links may arrive before the catalogue has loaded (or point at a listing outside it), so fall
  // back to fetching the single listing from the API.
  useEffect(() => {
    let active = true;
    setNotFound(false);
    setFetched(null);
    if (cached && !cached.summary) {
      setIsLoading(false);
      return;
    }
    if (catalogLoading) return;
    setIsLoading(true);
    fetchPropertyBySlug(effectiveSlug).then((listing) => {
      if (!active) return;
      if (listing) setFetched(listing);
      else setNotFound(true);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSlug, catalogLoading, !!cached, cached?.summary]);

  const property: OwnerPropertyListing | null = (cached && !cached.summary ? cached : fetched) || cached;

  if (isLoading && !property) {
    return <PropertyDetailsSkeleton />;
  }

  if (!property || notFound) {
    return <PropertyNotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-between font-sans">
      {/* Top Breadcrumb Header for Tenant Ease */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-slate-900 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <Link
              to="/find-pg"
              className="hover:text-slate-900 transition-colors"
            >
              Find PG
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-extrabold truncate max-w-[200px] sm:max-w-xs">
              {property.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/find-pg')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to search</span>
          </button>
        </div>
      </header>

      {/* Main Tenant Facing Property Details */}
      <main className="flex-1">
        <PropertyDetailsView
          property={property}
          initialOpenBooking={initialOpenBooking}
          onBookSuccess={(bookingNumber) => {
            // Success handler
          }}
        />
      </main>
    </div>
  );
};

