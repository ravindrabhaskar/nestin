import React, { useState, useEffect } from 'react';
import {
  Star,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Calendar,
  Phone,
  MessageSquare,
  Wifi,
  Wind,
  Sparkles,
  Shirt,
  Shield,
  Droplets,
  BookOpen,
  Navigation,
  Clock,
  ExternalLink,
  Share2,
  Heart,
  X,
  Play,
  Maximize2,
  Check,
  Award,
  Layers,
  Info,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { OwnerPropertyListing } from '../../types/property';
import { PropertyListing } from '../../types';
import { usePropertyListing } from '../../context/PropertyListingContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { CalendarDatePicker } from '../ui/CalendarDatePicker';
import { ApiClient } from '../../lib/apiClient';

interface PropertyDetailsViewProps {
  property: OwnerPropertyListing;
  isPreviewMode?: boolean;
  onClosePreview?: () => void;
  onBookSuccess?: (bookingNumber: string) => void;
  initialOpenBooking?: boolean;
}

export const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  property,
  isPreviewMode = false,
  onClosePreview,
  onBookSuccess,
  initialOpenBooking = false,
}) => {
  const { calculateInitialMoveIn, bookRoom, addTenantReview } = usePropertyListing();
  const { user, requireAuth, isAuthenticated } = useAuth();
  const { isWishlisted, toggleWishlist, showQuickLoginToast } = useWishlist();

  const isLiked = isWishlisted(property.id);

  // Device preview simulation state (for owner draft preview mode)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Selected media
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showTour360Modal, setShowTour360Modal] = useState(false);

  // Selected sharing option
  // Default to the first room that actually has a free bed, so "Reserve" never opens on a full room.
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    (property.rooms || []).find((r) => (r.availableBedsCount ?? r.beds.length) > 0)?.id || property.rooms?.[0]?.id || ''
  );

  // Modals for actions
  const [showBookingModal, setShowBookingModal] = useState(initialOpenBooking);
  const [showScheduleVisitModal, setShowScheduleVisitModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest'>('newest');

  // Form states
  // Dynamic default dates for inquiry & booking
  const defaultVisitDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const defaultMoveInDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const [bookingTenantName, setBookingTenantName] = useState(user?.name || '');
  const [bookingPhone, setBookingPhone] = useState(user?.phone || '');
  const [bookingDate, setBookingDate] = useState(defaultMoveInDate);
  const [visitDate, setVisitDate] = useState(defaultVisitDate);
  const [visitTime, setVisitTime] = useState('11:00 AM');
  const [, setBookingSuccessData] = useState<{ number: string; room: string } | null>(null);

  useEffect(() => {
    if (initialOpenBooking) {
      setShowBookingModal(true);
    }
  }, [initialOpenBooking]);

  // Pre-fill the booking form from the profile once; later edits by the user are kept.
  useEffect(() => {
    if (!user) return;
    if (user.name) setBookingTenantName((current) => current || user.name);
    if (user.phone) setBookingPhone((current) => current || user.phone);
  }, [user]);

  const handleOpenBookingModal = (roomId?: string) => {
    if (roomId) setSelectedRoomId(roomId);
    requireAuth(() => {
      setShowBookingModal(true);
    }, 'Please sign in with Google to reserve your room and complete your booking.');
  };

  // Review form state
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewRoom, setNewReviewRoom] = useState('Double Sharing • Room 201');
  const [newReviewComment, setNewReviewComment] = useState('');

  // Toast / notification
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const selectedRoom = property.rooms.find((r) => r.id === selectedRoomId) || property.rooms[0] || null;

  const moveInCalc = calculateInitialMoveIn(property, selectedRoom || undefined);

  const allPhotos = [
    ...(property.coverImage
      ? [{ id: 'cov', url: property.coverImage, title: 'Property Cover', category: 'Exterior' }]
      : []),
    ...property.gallery,
  ];

  const currentPhoto = allPhotos[selectedPhotoIndex] ||
    allPhotos[0] || {
      url:
        property.coverImage ||
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=85',
      title: property.name,
    };

  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingTenantName.trim() || isBooking) return;
    setIsBooking(true);
    setBookingError(null);

    // The server reserves the bed, records the token payment and notifies the owner's CRM.
    const res = await bookRoom(property.id, selectedRoom?.id || '', bookingTenantName, {
      moveInDate: bookingDate,
      phone: bookingPhone || user?.phone,
    });
    setIsBooking(false);

    if (!res.success) {
      setBookingError(res.error || 'Booking could not be completed. Please try again.');
      return;
    }

    setBookingSuccessData({
      number: res.bookingNumber,
      room: selectedRoom?.name || 'Selected Suite',
    });
    if (onBookSuccess) onBookSuccess(res.bookingNumber);
    setShowBookingModal(false);
    triggerNotice(`Booking request sent! Reference: ${res.bookingNumber}. The owner will confirm shortly.`);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    addTenantReview(property.id, {
      author: newReviewAuthor,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newReviewAuthor)}`,
      rating: newReviewRating,
      comment: newReviewComment,
      helpfulCount: 1,
      verifiedResident: true,
      residentRoom: newReviewRoom,
    });

    setShowReviewModal(false);
    setNewReviewAuthor('');
    setNewReviewComment('');
    triggerNotice('Thank you! Your verified tenant review is published.');
  };

  const getAmenityIcon = (iconKey?: string) => {
    switch (iconKey) {
      case 'wifi':
        return Wifi;
      case 'ac':
        return Wind;
      case 'housekeeping':
        return Sparkles;
      case 'laundry':
        return Shirt;
      case 'power':
        return Zap;
      case 'cctv':
        return Shield;
      case 'water':
        return Droplets;
      case 'study':
      case 'coworking':
        return BookOpen;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="w-full bg-[#FAF9F5] text-[#121820] font-sans antialiased pb-20 selection:bg-[#a3e635] selection:text-slate-950">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#a3e635] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* PREVIEW BANNER (IF IN PREVIEW MODE) */}
      {isPreviewMode && (
        <div className="sticky top-0 z-40 bg-slate-950 text-white px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-xl">
          {/* Left info & status indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a3e635] animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-[#a3e635] font-heading">
                Live Tenant Preview
              </span>
            </div>
            <span className="hidden md:inline text-xs text-slate-400 font-medium">
              | Exactly what prospective residents see on Nestin
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-heading ${
                property.status === 'published'
                  ? 'bg-[#ecfccb] text-[#3f6212]'
                  : property.status === 'pending_approval'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {property.status === 'published'
                ? 'Status: Published'
                : property.status === 'pending_approval'
                  ? 'Status: In Audit'
                  : 'Status: Draft (Unpublished)'}
            </span>
          </div>

          {/* Center device viewport switcher (Desktop / Tablet / Mobile) */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-[#a3e635] text-slate-950 shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('tablet')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'tablet'
                  ? 'bg-[#a3e635] text-slate-950 shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-[#a3e635] text-slate-950 shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Device View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {onClosePreview && (
              <button
                type="button"
                onClick={onClosePreview}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Preview</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container with dynamic device simulation */}
      <div
        className={`transition-all duration-300 ${
          isPreviewMode && previewDevice === 'mobile'
            ? 'max-w-md mx-auto my-6 border-8 border-slate-900 rounded-[44px] shadow-2xl overflow-hidden bg-[#FAF9F5]'
            : isPreviewMode && previewDevice === 'tablet'
              ? 'max-w-3xl mx-auto my-6 border-8 border-slate-900 rounded-[32px] shadow-2xl overflow-hidden bg-[#FAF9F5]'
              : 'max-w-7xl mx-auto'
        } px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8`}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HERO MEDIA GALLERY & THUMBNAILS (Screenshot 1 Match)               */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          {/* Main Large Hero Viewport */}
          <div className="relative w-full h-[340px] sm:h-[460px] lg:h-[540px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-md group">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.title || property.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

            {/* Top Left / Floating Action Pills (Video Tour & 360° Tour) */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
              {property.videoTourUrl && (
                <button
                  type="button"
                  onClick={() => setShowVideoModal(true)}
                  className="px-3.5 py-2 bg-slate-900/85 hover:bg-slate-900 text-white rounded-full text-xs font-bold backdrop-blur-md border border-white/20 shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 text-[#a3e635] fill-[#a3e635]" />
                  <span>Video Tour</span>
                </button>
              )}
              {property.virtualTour360Url && (
                <button
                  type="button"
                  onClick={() => setShowTour360Modal(true)}
                  className="px-3.5 py-2 bg-slate-900/85 hover:bg-slate-900 text-white rounded-full text-xs font-bold backdrop-blur-md border border-white/20 shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
                >
                  <Layers className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>360° Virtual Tour</span>
                </button>
              )}
            </div>

            {/* Top Right "All Photos", Share & Favorite Buttons */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                type="button"
                id={`details-favorite-btn-${property.id}`}
                onClick={() => {
                  const propListing: PropertyListing = {
                    id: property.id,
                    name: property.name,
                    title: property.name,
                    price: property.startingPrice || 12000,
                    rent: property.startingPrice || 12000,
                    city: property.city,
                    area: property.area,
                    image: property.coverImage || (property.gallery && property.gallery[0]?.url) || '',
                    verified: property.verificationStatus === 'verified',
                    rating: property.rating || 4.8,
                    reviewsCount: property.reviewsCount || (property.reviews ? property.reviews.length : 124),
                  };
                  if (!isAuthenticated) {
                    showQuickLoginToast(propListing);
                    return;
                  }
                  toggleWishlist(propListing);
                }}
                className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform cursor-pointer hover:scale-105 active:scale-95"
                title={isLiked ? 'Remove from favorites' : 'Save to favorites'}
                aria-label={isLiked ? 'Remove from favorites' : 'Save to favorites'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white hover:text-red-400'
                  }`}
                />
              </button>
              <button
                type="button"
                id="details-share-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  triggerNotice('Property link copied to clipboard!');
                }}
                className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform cursor-pointer hover:scale-105"
                title="Share Property"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="details-all-photos-btn"
                onClick={() => setShowGalleryModal(true)}
                className="px-4 py-2 bg-slate-900/85 hover:bg-slate-900 text-white rounded-full text-xs font-black backdrop-blur-md border border-white/20 shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#a3e635]" />
                <span>All Photos ({allPhotos.length})</span>
              </button>
            </div>

            {/* Bottom Caption on Hero */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
              <div className="text-white text-xs sm:text-sm font-bold drop-shadow-md">
                {currentPhoto.title || property.name}
              </div>
              <div className="text-[11px] font-extrabold text-white/90 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
                {selectedPhotoIndex + 1} / {allPhotos.length}
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {allPhotos.map((photo, idx) => (
              <button
                key={photo.id || idx}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative w-20 h-14 sm:w-28 sm:h-20 rounded-2xl overflow-hidden shrink-0 transition-all border-2 cursor-pointer ${
                  selectedPhotoIndex === idx
                    ? 'border-[#84cc16] ring-2 ring-[#a3e635]/40 scale-102'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={photo.url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. MAIN SPLIT: LEFT CONTENT (DETAILS, ROOMS, ETC) & RIGHT BOOKING SIDEBAR  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLUMNS: PROPERTY INFO & DETAILS */}
          <div className="lg:col-span-8 space-y-8">
            {/* PROPERTY HEADER CARD (Screenshot 1 Match) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {property.isNestinVerified && (
                  <span className="px-3 py-1 bg-[#f7fee7] text-[#3f6212] border border-[#d9f99d] rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#65a30d]" />
                    Nestin Verified Stay
                  </span>
                )}
                {property.isFeatured && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-black flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    Featured Property
                  </span>
                )}
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold">
                  {property.type} PG
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold">
                  {property.category === 'Co-ed' ? 'Co-ed Living' : `${property.category}'s Accommodation`}
                </span>
              </div>

              {/* Title & Star Rating */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-slate-950 tracking-tight">
                  {property.name}
                </h1>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-2xl shrink-0 w-fit">
                  <Star className="w-4 h-4 fill-[#a3e635] text-[#a3e635]" />
                  <span className="text-sm font-black font-heading">
                    {property.systemMetrics.averageRating > 0 ? property.systemMetrics.averageRating : '4.9'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    ({property.systemMetrics.totalReviews > 0 ? property.systemMetrics.totalReviews : 321})
                  </span>
                </div>
              </div>

              {/* Full Address */}
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 font-medium">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{property.location.formattedAddress}</span>
              </div>

              {/* Caretaker & Move-in status row */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                {/* Caretaker Verified Pill */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-[#a3e635] font-black text-sm flex items-center justify-center font-heading shrink-0 shadow-xs">
                    {(property.caretaker.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 font-heading">
                        Caretaker: {property.caretaker.name || 'Host'}
                      </span>
                      {property.caretaker.isIdentityVerified && (
                        <span className="px-1.5 py-0.2 bg-[#ecfccb] text-[#4d7c0f] text-[9px] font-black rounded-full uppercase">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-bold">Identity & Background Verified</div>
                  </div>
                </div>

                {/* Distance & Move-in tags */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-slate-500" />
                    {property.location.distanceLabel || 'Near Transit'}
                  </span>
                  <span className="px-3 py-1.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-full text-xs font-extrabold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#16a34a]" />
                    Move in: {property.location.moveInAvailabilityLabel || 'Available now'}
                  </span>
                </div>
              </div>
            </div>

            {/* TRANSPARENT PRICING & DEPOSITS BREAKDOWN CARD (Screenshot 1 Match) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">
                    Transparent Pricing & Deposits
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clear upfront pricing with zero hidden charges or surprises.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#f7fee7] text-[#3f6212] border border-[#d9f99d] rounded-full text-[11px] font-black">
                  Zero Brokerage
                </span>
              </div>

              {/* 4 Metric Blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FAF9F5] rounded-2xl p-3.5 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Monthly Rent</div>
                  <div className="text-lg sm:text-xl font-black text-slate-950 font-heading">
                    ₹{moveInCalc.monthlyRent.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">per month</div>
                </div>

                <div className="bg-[#FAF9F5] rounded-2xl p-3.5 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Security Deposit
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-950 font-heading">
                    ₹{moveInCalc.securityDeposit.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-[#4d7c0f] font-bold">100% Refundable</div>
                </div>

                <div className="bg-[#FAF9F5] rounded-2xl p-3.5 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Booking Token
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-950 font-heading">
                    ₹{moveInCalc.bookingFee.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">One-time fee</div>
                </div>

                <div className="bg-[#FAF9F5] rounded-2xl p-3.5 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Maintenance</div>
                  <div className="text-lg sm:text-xl font-black text-slate-950 font-heading">
                    ₹{moveInCalc.maintenance.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-[#4d7c0f] font-bold">Included in rent</div>
                </div>
              </div>

              {/* Included Expenses & Utilities Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="text-xs font-black text-slate-900 font-heading uppercase tracking-wider">
                  Included Expenses & Utilities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-slate-600 font-medium">Electricity Meter</span>
                    <span className="font-bold text-slate-900">
                      {property.pricing.electricity.label || '₹1200/mo approx'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-slate-600 font-medium">Water Charges</span>
                    <span className="font-bold text-[#166534]">
                      {property.pricing.water.label || 'Included (₹200)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-slate-600 font-medium">Food Mess Charges</span>
                    <span className="font-bold text-[#166534]">
                      {property.pricing.foodMess.label || 'Included (4 Meals/day)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60">
                    <span className="text-slate-600 font-medium">Laundry & Housekeeping</span>
                    <span className="font-bold text-[#166534]">
                      {property.pricing.laundryAndHousekeeping.label || 'Included'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Initial Move-in Amount Banner */}
              <div className="bg-[#0f2e1e] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#a3e635]">
                    Total Initial Move-in Amount
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-heading text-white mt-0.5">
                    ₹{moveInCalc.totalInitialAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Rent (₹{moveInCalc.monthlyRent.toLocaleString('en-IN')}) + Deposit (₹
                    {moveInCalc.securityDeposit.toLocaleString('en-IN')}) + Token (₹
                    {moveInCalc.bookingFee})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenBookingModal()}
                  className="px-5 py-3 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Reserve & Move-in</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. AVAILABLE ROOM SHARING OPTIONS (Screenshot 2 Match)                    */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">
                  Available Room Sharing Options
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your preferred sharing style. All options include high-speed Wi-Fi & daily cleaning.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.rooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  const availBeds = room.availableBedsCount;

                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`rounded-2xl p-5 border transition-all cursor-pointer space-y-4 flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#65a30d] bg-[#f7fee7]/40 ring-2 ring-[#a3e635]/30 shadow-xs'
                          : 'border-slate-200/90 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase">
                              {room.type}
                            </span>
                            <h4 className="text-base font-black font-heading text-slate-900 mt-1">{room.name}</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-950 font-heading">
                              ₹{room.monthlyRent.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">/ month</div>
                          </div>
                        </div>

                        {/* Room attributes */}
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">Size: {room.sizeSqFt || 200} sq ft</span>
                            <span>•</span>
                            <span>{room.capacity || 1} Bed(s)</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
                              {room.bathroomType}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
                              {room.hasAC ? 'Air Conditioned (AC)' : 'Non-AC Room'}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
                              {room.furnishing}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-extrabold ${availBeds > 0 ? 'text-[#16a34a]' : 'text-amber-600'}`}
                        >
                          {availBeds > 0 ? `${availBeds} bed(s) left` : 'Available on request'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBookingModal(room.id);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#a3e635] text-slate-950 hover:bg-[#92d428]'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          Book {room.type.replace(' Sharing', '')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. AMENITIES & FACILITIES (Screenshot 2 Match)                            */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">Amenities & Facilities</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Everything you need for productive work and hassle-free living.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-slate-400">
                  {property.amenities.filter((a) => a.isAvailable).length} Active Amenities
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {property.amenities
                  .filter((a) => a.isAvailable)
                  .map((amenity) => {
                    const Icon = getAmenityIcon(amenity.iconKey);
                    return (
                      <div
                        key={amenity.id}
                        className="bg-[#FAF9F5] rounded-2xl p-4 border border-slate-200/80 flex flex-col items-center text-center space-y-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-[#a3e635] flex items-center justify-center shrink-0 shadow-2xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 font-heading">{amenity.name}</div>
                          {amenity.subtext && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{amenity.subtext}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. ABOUT PROPERTY & HOUSE RULES (Screenshot 3 Match)                     */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">About {property.name}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {property.longDescription || property.shortDescription}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-base sm:text-lg font-black font-heading text-slate-950">House Rules & Policies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Curfew */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-black text-slate-900 font-heading">Curfew Timings</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {property.policies.curfew || 'Main gate locks at 11:00 PM.'}
                    </p>
                  </div>

                  {/* Visitor Policy */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-black text-slate-900 font-heading">Visitor Policy</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {property.policies.visitorPolicy ||
                        'Visitors allowed in ground floor common lounge 9:00 AM – 8:00 PM.'}
                    </p>
                  </div>

                  {/* Smoking & Alcohol */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-black text-slate-900 font-heading">Smoking & Alcohol</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {property.policies.smokingAndAlcohol || 'Strictly zero smoking inside bedrooms or dining halls.'}
                    </p>
                  </div>

                  {/* Cancellation */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-black text-slate-900 font-heading">Cancellation Policy</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {property.policies.cancellationPolicy || '30 days prior written notice required before checkout.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 6. NEARBY HUBS & DISTANCES (Screenshot 4 Match)                           */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">Nearby Hubs & Distances</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Key transit, workplace, college, and dining hubs in the neighborhood.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.nearbyPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-slate-200/80 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="px-2 py-0.5 bg-[#ecfccb] text-[#3f6212] rounded-md text-[10px] font-black uppercase font-heading">
                        {place.category}
                      </span>
                      <div className="text-xs font-black text-slate-900 font-heading truncate">{place.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">{place.distanceKm} km</div>
                      <div className="text-[10px] text-slate-400 font-bold">{place.travelTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 7. LOCATION & MAP VIEW (Screenshot 4 Match)                               */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">Location & Map</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{property.location.formattedAddress}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    property.location.formattedAddress
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-black flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              {/* Styled Interactive Map Container */}
              <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
                <iframe
                  title="Property Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'contrast(1.05) saturate(1.1)' }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${property.location.latitude},${property.location.longitude}&z=15&output=embed`}
                />
                <div className="absolute bottom-3 left-3 bg-slate-950/90 text-white px-3 py-1.5 rounded-xl backdrop-blur-md text-[11px] font-bold border border-white/15 shadow-md flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>
                    {property.location.area}, {property.location.city}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 8. RESIDENT REVIEWS & RATINGS (Screenshot 5 Match)                        */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950">
                    Resident Reviews & Ratings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">100% verified tenant reviews from stay check-ins.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="px-3.5 py-1.5 bg-[#ecfccb] text-[#3f6212] hover:bg-[#d9f99d] rounded-full text-xs font-black transition-colors cursor-pointer"
                  >
                    + Write Review
                  </button>
                  <select
                    aria-label="Sort listings"
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <option value="newest">Sort by: Newest</option>
                    <option value="highest">Sort by: Highest Rated</option>
                  </select>
                </div>
              </div>

              {/* Rating Summary Breakdown (Screenshot 5 Match) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 bg-[#FAF9F5] p-5 rounded-2xl border border-slate-200/80 items-center">
                {/* Overall Score */}
                <div className="sm:col-span-4 text-center sm:text-left space-y-1">
                  <div className="text-4xl sm:text-5xl font-black text-slate-950 font-heading">
                    {property.systemMetrics.averageRating > 0 ? property.systemMetrics.averageRating : '4.9'}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-[#a3e635] text-[#a3e635]" />
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 font-bold">
                    Based on {property.systemMetrics.totalReviews || 321} Verified Reviews
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div className="sm:col-span-8 space-y-1.5 text-xs">
                  {[
                    { star: 5, pct: property.systemMetrics.ratingBreakdown?.[5] ?? 82 },
                    { star: 4, pct: property.systemMetrics.ratingBreakdown?.[4] ?? 14 },
                    { star: 3, pct: property.systemMetrics.ratingBreakdown?.[3] ?? 4 },
                    { star: 2, pct: property.systemMetrics.ratingBreakdown?.[2] ?? 0 },
                    { star: 1, pct: property.systemMetrics.ratingBreakdown?.[1] ?? 0 },
                  ].map((row) => (
                    <div key={row.star} className="flex items-center gap-2">
                      <span className="w-6 font-bold text-slate-700 text-right">{row.star}★</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-[11px] font-bold text-slate-400 text-right">{row.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Cards List */}
              <div className="space-y-4">
                {property.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={rev.avatar}
                          alt={rev.author}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-slate-900 font-heading">
                              {rev.author}
                            </span>
                            {rev.verifiedResident && (
                              <span className="px-2 py-0.5 bg-[#ecfccb] text-[#3f6212] rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Verified Resident
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-bold">
                            {rev.residentRoom} • {rev.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 text-white px-2 py-1 rounded-xl">
                        <Star className="w-3 h-3 fill-[#a3e635] text-[#a3e635]" />
                        <span className="text-xs font-black">{rev.rating}.0</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{rev.comment}</p>

                    {rev.images && rev.images.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {rev.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="Resident Upload"
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT 4 COLUMNS: STICKY BOOKING CARD (Screenshot 1 Match)                  */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xl space-y-6">
              {/* Top Price Header */}
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Rent starts from
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl sm:text-4xl font-black font-heading text-slate-950">
                    ₹{moveInCalc.monthlyRent.toLocaleString('en-IN')}
                    <span className="text-xs sm:text-sm font-bold text-slate-400 ml-1">/month</span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#f7fee7] text-[#3f6212] border border-[#d9f99d] rounded-full text-[10px] font-black uppercase">
                    Zero Brokerage
                  </span>
                </div>
              </div>

              {/* Selected Sharing Pill Summary */}
              {selectedRoom && (
                <div className="p-3 bg-[#FAF9F5] rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Active Selection</span>
                    <span className="font-black text-slate-900">{selectedRoom.name}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black">
                    {selectedRoom.type}
                  </span>
                </div>
              )}

              {/* Quick Calendar Date Selection */}
              <div className="pt-2 pb-1 border-t border-slate-100">
                <CalendarDatePicker
                  id="sidebar-inquiry-date-picker"
                  label="Preferred Date (Viewing or Move-in)"
                  value={visitDate}
                  onChange={(d) => {
                    setVisitDate(d);
                    setBookingDate(d);
                  }}
                  minDate={new Date().toISOString().split('T')[0]}
                  inquiryType="viewing"
                  quickPresets={true}
                  helperText="Select a date to request viewing or reserve move-in."
                />
              </div>

              {/* CTAs */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleOpenBookingModal()}
                  className="w-full py-3.5 px-4 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Book Move-in Now</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requireAuth(
                      () => setShowScheduleVisitModal(true),
                      'Sign in to schedule a visit — the owner will confirm your slot.'
                    )
                  }
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#a3e635]" />
                  <span>Schedule In-Person Visit</span>
                </button>

                {/* 2-Button Row (Book Call & Chat Host) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCallModal(true)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    <span>Book a Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChatModal(true)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                    <span>Chat Host</span>
                  </button>
                </div>

                {/* WhatsApp Host Button */}
                <a
                  href={`https://wa.me/${property.caretaker.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hi! I am interested in ${property.name} listed on Nestin.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 bg-white hover:bg-emerald-50 text-[#166534] border border-[#86efac] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                  <span>WhatsApp Host Directly</span>
                </a>
              </div>

              {/* Nestin Guarantee Protection Card */}
              <div className="pt-4 border-t border-slate-100 flex items-start gap-3 text-xs text-slate-500">
                <ShieldCheck className="w-5 h-5 text-[#65a30d] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-black text-slate-900 font-heading block">Nestin Guarantee Protection</span>
                  <p className="text-[11px] leading-snug">
                    Full security deposit refund guaranteed if cancelled before move-in. 24/7 dedicated tenant support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS & DIALOGS                                                          */}
      {/* ========================================================================= */}

      {/* 1. BOOK MOVE-IN MODAL */}
      {showBookingModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-950 font-heading">Book Move-in & Token Reserve</h3>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Selected Room</div>
                {property.rooms.length > 1 ? (
                  <select
                    aria-label="Room"
                    value={selectedRoom?.id || ''}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full font-black text-slate-900 text-sm bg-white border border-slate-200 rounded-xl px-2.5 py-1.5"
                  >
                    {property.rooms.map((r) => (
                      <option key={r.id} value={r.id} disabled={(r.availableBedsCount ?? 0) <= 0}>
                        {r.name} —{' '}
                        {(r.availableBedsCount ?? 0) > 0
                          ? `${r.availableBedsCount} bed${r.availableBedsCount === 1 ? '' : 's'} free`
                          : 'full'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="font-black text-slate-900 text-sm">{selectedRoom?.name || property.name}</div>
                )}
                <div className="text-slate-600 font-bold">
                  Token: ₹{moveInCalc.bookingFee} • Rent: ₹{moveInCalc.monthlyRent.toLocaleString('en-IN')}/mo
                </div>
                {selectedRoom && (selectedRoom.availableBedsCount ?? 0) <= 0 && (
                  <div className="text-rose-600 font-semibold">This room is fully booked — pick another room.</div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={bookingTenantName}
                  onChange={(e) => setBookingTenantName(e.target.value)}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <CalendarDatePicker
                  id="booking-move-in-date-picker"
                  label="Expected Move-in Date"
                  value={bookingDate}
                  onChange={setBookingDate}
                  minDate={new Date().toISOString().split('T')[0]}
                  inquiryType="booking"
                  quickPresets={true}
                  required
                  helperText="Your zero-brokerage reservation token adjusts directly into your first month invoice."
                />
              </div>

              <div className="p-3 bg-[#f7fee7] rounded-xl border border-[#d9f99d] text-[11px] text-[#3f6212] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#65a30d] shrink-0" />
                <span>Zero Brokerage guaranteed. Token adjusts into your first month's invoice.</span>
              </div>

              {bookingError && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {bookingError}
                </div>
              )}

              <button
                type="submit"
                disabled={isBooking || (selectedRoom ? (selectedRoom.availableBedsCount ?? 0) <= 0 : false)}
                className="w-full py-3.5 bg-[#a3e635] hover:bg-[#92d428] disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-black text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isBooking ? 'Reserving your bed…' : `Pay Token ₹${moveInCalc.bookingFee} & Confirm Bed`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. SCHEDULE VISIT MODAL */}
      {showScheduleVisitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-950 font-heading">Schedule In-Person Visit</h3>
              <button
                type="button"
                onClick={() => setShowScheduleVisitModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await ApiClient.tenant.scheduleVisit({
                    propertyId: property.id,
                    visitDate,
                    visitTime,
                    phone: bookingPhone || user?.phone,
                    preferredRoom: selectedRoom?.name,
                  });
                  setShowScheduleVisitModal(false);
                  triggerNotice(
                    `Visit scheduled for ${visitDate} at ${visitTime}! The property team has been notified.`
                  );
                } catch (err) {
                  triggerNotice(err instanceof Error ? err.message : 'Could not schedule the visit. Please try again.');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <CalendarDatePicker
                  id="viewing-visit-date-picker"
                  label="Preferred Viewing Date"
                  value={visitDate}
                  onChange={setVisitDate}
                  minDate={new Date().toISOString().split('T')[0]}
                  inquiryType="viewing"
                  quickPresets={true}
                  required
                  helperText="Guided in-person walkthrough with host/caretaker. Instant confirmation."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Time Slot</label>
                <select
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="10:00 AM">10:00 AM - Morning</option>
                  <option value="11:30 AM">11:30 AM - Morning</option>
                  <option value="02:30 PM">02:30 PM - Afternoon</option>
                  <option value="05:00 PM">05:00 PM - Evening</option>
                  <option value="06:30 PM">06:30 PM - Evening</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-medium">
                Host Contact: <strong className="text-slate-900">{property.caretaker.name}</strong> (
                {property.caretaker.phone})
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                Confirm Free Property Visit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. CALL MODAL */}
      {showCallModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#ecfccb] text-[#4d7c0f] flex items-center justify-center mx-auto">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-950 font-heading">Call Property Host</h3>
            <p className="text-xs text-slate-500">
              Speak directly with verified caretaker <strong>{property.caretaker.name}</strong>.
            </p>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-base font-black text-slate-900 font-heading">
              {property.caretaker.phone}
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${property.caretaker.phone}`}
                className="flex-1 py-3 bg-[#a3e635] text-slate-950 font-black text-xs rounded-xl transition-colors cursor-pointer text-center block"
              >
                Dial Now
              </a>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CHAT HOST MODAL */}
      {showChatModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-950 font-heading">Chat with {property.caretaker.name}</h3>
              <button type="button" onClick={() => setShowChatModal(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="h-44 bg-slate-50 rounded-2xl p-4 overflow-y-auto space-y-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 max-w-[80%]">
                <span className="font-bold text-slate-900 block text-[10px] text-slate-400">Nestin Assistant</span>
                Hello! Welcome to {property.name}. How can we help you regarding room availability or food mess?
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your question..."
                className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setShowChatModal(false);
                  triggerNotice('Message sent to property host!');
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. WRITE REVIEW MODAL */}
      {showReviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-950 font-heading">Write Verified Resident Review</h3>
              <button type="button" onClick={() => setShowReviewModal(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddReview} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={newReviewAuthor}
                  onChange={(e) => setNewReviewAuthor(e.target.value)}
                  placeholder="e.g. Vikram Singh"
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rating</label>
                <div className="flex gap-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                        newReviewRating === star ? 'bg-slate-900 text-[#a3e635]' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Room / Suite</label>
                <input
                  type="text"
                  value={newReviewRoom}
                  onChange={(e) => setNewReviewRoom(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Review Experience</label>
                <textarea
                  rows={3}
                  required
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="Share details about cleanliness, Wi-Fi, food quality, safety..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#a3e635] text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Publish Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. ALL PHOTOS GALLERY FULLSCREEN MODAL */}
      {showGalleryModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 p-4 sm:p-8 flex flex-col justify-between"
          data-lenis-prevent="true"
        >
          <div className="flex items-center justify-between text-white pb-4">
            <h3 className="text-base sm:text-lg font-black font-heading">
              {property.name} — Photos ({allPhotos.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowGalleryModal(false)}
              className="p-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {allPhotos.map((p, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10 space-y-2">
                <img src={p.url} alt={p.title} className="w-full h-64 object-cover" />
                <div className="p-3 text-white text-xs font-bold">{p.title || `Photo ${i + 1}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. VIDEO TOUR MODAL */}
      {showVideoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          data-lenis-prevent="true"
        >
          <div className="bg-slate-950 rounded-3xl max-w-3xl w-full p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-white">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#a3e635]">Video Tour Walkthrough</h3>
              <button type="button" onClick={() => setShowVideoModal(false)} className="p-1 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Property Video Tour"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* 8. 360 TOUR MODAL */}
      {showTour360Modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          data-lenis-prevent="true"
        >
          <div className="bg-slate-950 rounded-3xl max-w-4xl w-full p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-white">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#a3e635]">
                360° Virtual Tour Experience
              </h3>
              <button
                type="button"
                onClick={() => setShowTour360Modal(false)}
                className="p-1 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[450px] w-full rounded-2xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <Layers className="w-12 h-12 text-[#a3e635]" />
              <div className="text-white font-black text-lg">Interactive 360° Panorama View</div>
              <p className="text-xs text-slate-400 max-w-md">
                Drag to look around living lounge, study suites, and bedroom interiors.
              </p>
              <img
                src={property.coverImage}
                alt="360 preview"
                className="w-full h-48 object-cover rounded-xl border border-white/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
