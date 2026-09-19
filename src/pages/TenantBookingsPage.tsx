import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Bed, CheckCircle2, Clock, XCircle, X, Phone } from 'lucide-react';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { MoveOutCard } from '../components/resident/MoveOutCard';
import { SurveyPrompt } from '../components/resident/ReferralAndLifestyle';
import { TenantBookingItem } from '../types';
import { ApiClient } from '../lib/apiClient';
import { useApiResource } from '../hooks/useApiResource';
import { useAuth } from '../context/AuthContext';

export const TenantBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data: bookings,
    setData: setBookings,
    isLoading,
  } = useApiResource<TenantBookingItem[]>(() => ApiClient.tenant.bookings(), [], {
    enabled: !!user,
    key: user?.id,
    label: 'Could not load your bookings',
  });
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async (booking: TenantBookingItem) => {
    if (!window.confirm(`Cancel booking ${booking.bookingNumber}? The owner will be notified.`)) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await ApiClient.tenant.cancelBooking(booking.id, 'Cancelled by resident');
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSelectedBooking(updated);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel this booking.');
    } finally {
      setCancelling(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Active' | 'Completed' | 'Cancelled'>('Active');
  const [selectedBooking, setSelectedBooking] = useState<TenantBookingItem | null>(null);

  const filteredBookings = bookings.filter((b) => {
    const s = (b.status || '').toLowerCase();
    if (activeTab === 'Active') return s === 'active' || s === 'confirmed';
    if (activeTab === 'Upcoming') return s === 'upcoming' || s === 'pending';
    if (activeTab === 'Completed') return s === 'completed';
    if (activeTab === 'Cancelled') return s === 'cancelled';
    return true;
  });

  const getStatusBadge = (status: string, approval?: string) => {
    const s = status.toLowerCase();
    if (approval === 'Pending') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-700 border border-sky-500/30 flex items-center gap-1 font-heading">
          <Clock className="w-3 h-3" />
          <span>Awaiting confirmation</span>
        </span>
      );
    }
    if (s === 'active' || s === 'confirmed') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#a3e635]/25 text-[#3d6800] border border-[#a3e635]/40 flex items-center gap-1 font-heading">
          <CheckCircle2 className="w-3 h-3" />
          <span>Active</span>
        </span>
      );
    }
    if (s === 'upcoming' || s === 'pending') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center gap-1 font-heading">
          <Clock className="w-3 h-3" />
          <span>Upcoming</span>
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 font-heading">
          <CheckCircle2 className="w-3 h-3" />
          <span>Completed</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 font-heading">
        <XCircle className="w-3 h-3" />
        <span>Cancelled</span>
      </span>
    );
  };

  return (
    <TenantAccountLayout title="My Bookings" subtitle="View and manage your PG bookings." activeNav="/my-bookings">
      <div className="space-y-6">
        <SurveyPrompt />
        <MoveOutCard hasActiveStay={bookings.some((b) => b.status === 'active')} />
        {/* TAB FILTER BUTTONS */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-1 flex flex-wrap gap-1 shadow-2xs">
          {(['Upcoming', 'Active', 'Completed', 'Cancelled'] as const).map((tab) => {
            const count = bookings.filter((b) => {
              const s = (b.status || '').toLowerCase();
              if (tab === 'Active') return s === 'active' || s === 'confirmed';
              if (tab === 'Upcoming') return s === 'upcoming' || s === 'pending';
              if (tab === 'Completed') return s === 'completed';
              if (tab === 'Cancelled') return s === 'cancelled';
              return false;
            }).length;

            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-heading flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-[#a3e635] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold leading-none ${
                      isActive ? 'bg-white/20 text-[#a3e635]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* BOOKINGS LIST */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                  <img
                    src={booking.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500&q=80'}
                    alt={booking.pgName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 border border-slate-100"
                  />

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 truncate">
                        {booking.pgName}
                      </h3>
                      {getStatusBadge(booking.status, booking.approval)}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {booking.location}, {booking.city}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5">
                      <div className="flex items-center gap-1 font-medium">
                        <Bed className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {booking.roomNumber || 'Room 304'} • {booking.bedNumber || 'Bed A'}
                        </span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Check-in: {booking.checkInDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-400">Monthly Rent</div>
                    <div className="text-sm sm:text-base font-bold font-heading text-slate-900">
                      ₹{booking.monthlyRent.toLocaleString()}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer font-heading"
                  >
                    View booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
            <h3 className="text-sm font-bold font-heading text-slate-900">No {activeTab.toLowerCase()} bookings</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not have any {activeTab.toLowerCase()} PG bookings at the moment.
            </p>
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
      </div>

      {/* VIEW BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">Booking Details</h3>
                <p className="text-xs text-slate-500">Ref: {selectedBooking.bookingNumber || selectedBooking.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <img
                src={selectedBooking.image}
                alt={selectedBooking.pgName}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold font-heading text-slate-900 truncate">{selectedBooking.pgName}</div>
                <div className="text-xs text-slate-500 truncate">
                  {selectedBooking.location}, {selectedBooking.city}
                </div>
                <div className="mt-1">{getStatusBadge(selectedBooking.status, selectedBooking.approval)}</div>
                {selectedBooking.approval === 'Pending' && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    The owner reviews requests within 24 hours. Your bed is held until they respond.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-medium">Room & Sharing</div>
                <div className="font-bold text-slate-900 font-heading mt-0.5">
                  {selectedBooking.roomNumber || 'Room 304'} • {selectedBooking.sharingType || '2-Sharing'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-medium">Bed Allotted</div>
                <div className="font-bold text-slate-900 font-heading mt-0.5">
                  {selectedBooking.bedNumber || 'Bed A'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-medium">Check-in Date</div>
                <div className="font-bold text-slate-900 font-heading mt-0.5">{selectedBooking.checkInDate}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-medium">Monthly Rent</div>
                <div className="font-bold text-slate-900 font-heading mt-0.5">
                  ₹{selectedBooking.monthlyRent.toLocaleString()}
                </div>
              </div>
            </div>

            {selectedBooking.ownerPhone && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Caretaker: {selectedBooking.ownerName || 'Property Caretaker'}</span>
                </div>
                <a
                  href={`tel:${selectedBooking.ownerPhone}`}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold hover:bg-slate-100 transition-colors"
                >
                  Call
                </a>
              </div>
            )}

            {cancelError && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {cancelError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              {(selectedBooking.status === 'upcoming' || selectedBooking.status === 'active') && (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => handleCancel(selectedBooking)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer font-heading"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Booking'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-heading"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantAccountLayout>
  );
};
