import React, { useState, useMemo } from 'react';
import { Download, Eye, Plus, Search, User, X, XCircle, AlertTriangle, Receipt } from 'lucide-react';
import { useCRM } from '../../../context/CRMContext';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { BookingItem, BookingStatus, PaymentStatus } from '../../../types/crm';
import { exportToCSV } from '../../../utils/csvExport';
import { CreateBookingModal } from './CreateBookingModal';
import { CustomerReceiptModal } from './CustomerReceiptModal';

const STATUS_BADGES: Record<BookingStatus, { label: string; color: string; bg: string; border: string }> = {
  Pending: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  Confirmed: { label: 'Confirmed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Rejected: { label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  Cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  Completed: { label: 'Active Stay', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const PAYMENT_BADGES: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  Paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  Partial: { label: 'Partial', color: 'text-amber-700', bg: 'bg-amber-50' },
  Pending: { label: 'Pending', color: 'text-rose-700', bg: 'bg-rose-50' },
  Overdue: { label: 'Overdue', color: 'text-red-800', bg: 'bg-red-100' },
  Refunded: { label: 'Refunded', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export const BookingsView: React.FC<{ onNavigateToCustomer?: (customerId: string) => void }> = ({
  onNavigateToCustomer,
}) => {
  const { bookings, approveBooking, rejectBooking, cancelBooking, completeMoveIn } = useCRM();
  const { ownerProperties } = usePropertyListing();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeBookingDetails, setActiveBookingDetails] = useState<BookingItem | null>(null);
  const [rejectReasonModalBooking, setRejectReasonModalBooking] = useState<BookingItem | null>(null);
  const [cancelReasonModalBooking, setCancelReasonModalBooking] = useState<BookingItem | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showReceiptForBooking, setShowReceiptForBooking] = useState<BookingItem | null>(null);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        b.bookingNumber.toLowerCase().includes(q) ||
        b.tenantName.toLowerCase().includes(q) ||
        b.tenantPhone.toLowerCase().includes(q) ||
        b.propertyName.toLowerCase().includes(q) ||
        b.roomName.toLowerCase().includes(q);

      const matchesProperty = selectedPropertyFilter === 'ALL' || b.propertyId === selectedPropertyFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || b.bookingStatus === selectedStatusFilter;
      const matchesPayment = selectedPaymentFilter === 'ALL' || b.paymentStatus === selectedPaymentFilter;

      return matchesQuery && matchesProperty && matchesStatus && matchesPayment;
    });
  }, [bookings, searchQuery, selectedPropertyFilter, selectedStatusFilter, selectedPaymentFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.bookingStatus === 'Pending').length;
    const confirmed = bookings.filter((b) => b.bookingStatus === 'Confirmed').length;
    const upcomingMoveIns = bookings.filter(
      (b) => b.bookingStatus === 'Confirmed' && new Date(b.moveInDate) >= new Date()
    ).length;
    const completed = bookings.filter((b) => b.bookingStatus === 'Completed').length;
    const cancelled = bookings.filter((b) => b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Rejected').length;
    const totalRevenue = bookings
      .filter((b) => b.paymentStatus === 'Paid' || b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed')
      .reduce((sum, b) => sum + (b.paidAmount || b.totalAmount), 0);

    return { total, pending, confirmed, upcomingMoveIns, completed, cancelled, totalRevenue };
  }, [bookings]);

  // CSV Export
  const handleExport = () => {
    const data = filteredBookings.map((b) => ({
      BookingID: b.bookingNumber,
      TenantName: b.tenantName,
      Phone: b.tenantPhone,
      Email: b.tenantEmail,
      Property: b.propertyName,
      Room: b.roomName,
      Bed: b.bedNumber,
      MoveInDate: b.moveInDate,
      MonthlyRent: b.monthlyRent,
      TotalAmount: b.totalAmount,
      PaidAmount: b.paidAmount,
      PaymentStatus: b.paymentStatus,
      BookingStatus: b.bookingStatus,
      CreatedAt: b.createdAt,
    }));
    exportToCSV('nestin_crm_bookings', data);
  };

  const handleApprove = (bookingId: string) => {
    approveBooking(bookingId);
    if (activeBookingDetails && activeBookingDetails.id === bookingId) {
      const updated = bookings.find((b) => b.id === bookingId);
      if (updated) setActiveBookingDetails(updated);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectReasonModalBooking) return;
    rejectBooking(rejectReasonModalBooking.id, actionReason.trim() || 'Criteria mismatch');
    setRejectReasonModalBooking(null);
    setActionReason('');
    if (activeBookingDetails && activeBookingDetails.id === rejectReasonModalBooking.id) {
      setActiveBookingDetails(null);
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelReasonModalBooking) return;
    cancelBooking(cancelReasonModalBooking.id, actionReason.trim() || 'Cancelled upon tenant request');
    setCancelReasonModalBooking(null);
    setActionReason('');
    if (activeBookingDetails && activeBookingDetails.id === cancelReasonModalBooking.id) {
      setActiveBookingDetails(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">Bookings</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635]/20 text-emerald-900 border border-[#a3e635] text-xs font-black">
              {bookings.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage booking requests, confirmations and move-ins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-heading self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Booking</span>
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">Total</span>
          <p className="text-lg font-black text-slate-900 font-heading mt-0.5">{metrics.total}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 font-heading">Pending</span>
          <p className="text-lg font-black text-amber-700 font-heading mt-0.5">{metrics.pending}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 font-heading">
            Confirmed
          </span>
          <p className="text-lg font-black text-emerald-700 font-heading mt-0.5">{metrics.confirmed}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 font-heading">Upcoming</span>
          <p className="text-lg font-black text-blue-700 font-heading mt-0.5">{metrics.upcomingMoveIns}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 font-heading">
            Active Stay
          </span>
          <p className="text-lg font-black text-teal-700 font-heading mt-0.5">{metrics.completed}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Cancelled</span>
          <p className="text-lg font-black text-slate-700 font-heading mt-0.5">{metrics.cancelled}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#062817] font-heading">Revenue</span>
          <p className="text-lg font-black text-emerald-800 font-heading mt-0.5">
            ₹{Math.round(metrics.totalRevenue / 1000)}k
          </p>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking ID, tenant, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by Properties"
            value={selectedPropertyFilter}
            onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Properties</option>
            {ownerProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Booking Statuses"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Booking Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Active Stay / Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            aria-label="Filter by Payment Statuses"
            value={selectedPaymentFilter}
            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Export Bookings CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. BOOKINGS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Property & Room</th>
                <th className="py-3 px-4">Bed Allotment</th>
                <th className="py-3 px-4">Move-in Date</th>
                <th className="py-3 px-4">Package Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Booking Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No bookings found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const statusConfig = STATUS_BADGES[booking.bookingStatus] || STATUS_BADGES.Pending;
                  const payConfig = PAYMENT_BADGES[booking.paymentStatus] || PAYMENT_BADGES.Pending;

                  return (
                    <tr
                      key={booking.id}
                      onClick={() => setActiveBookingDetails(booking)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{booking.bookingNumber}</td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center">
                            {booking.tenantName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{booking.tenantName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{booking.tenantPhone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{booking.propertyName}</p>
                        <p className="text-[10px] text-slate-400">{booking.roomName}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {booking.bedNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">{booking.moveInDate}</td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">₹{booking.totalAmount.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          (₹{booking.monthlyRent}/mo)
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${payConfig.bg} ${payConfig.color}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {booking.bookingStatus === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(booking.id)}
                                className="px-2 py-1 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-[10px] rounded-lg shadow-xs transition-colors cursor-pointer"
                                title="Approve & Allot"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectReasonModalBooking(booking)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {booking.bookingStatus === 'Confirmed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => completeMoveIn(booking.id)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                title="Verify Move-in"
                              >
                                Mark Move-in
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowReceiptForBooking(booking)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                title="View Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveBookingDetails(booking)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BOOKING DETAILS MODAL */}
      {activeBookingDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black font-heading text-[#a3e635] tracking-wider uppercase">
                    Booking Allotment
                  </span>
                  <span className="font-mono text-xs text-slate-300">#{activeBookingDetails.bookingNumber}</span>
                </div>
                <h3 className="text-base font-black font-heading text-white mt-0.5">
                  {activeBookingDetails.tenantName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveBookingDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Status Header Strip */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Booking Status</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
                    {activeBookingDetails.bookingStatus}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Status</span>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">
                    {activeBookingDetails.paymentStatus} (₹{activeBookingDetails.paidAmount.toLocaleString('en-IN')})
                  </p>
                </div>
              </div>

              {/* Action Controls for Pending */}
              {activeBookingDetails.bookingStatus === 'Pending' && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-emerald-950">Awaiting Owner Confirmation</p>
                    <p className="text-[11px] text-emerald-700">
                      Approving will immediately allocate bed {activeBookingDetails.bedNumber} and create customer
                      record.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectReasonModalBooking(activeBookingDetails)}
                      className="px-3 py-1.5 bg-white text-rose-700 border border-rose-200 rounded-xl font-bold hover:bg-rose-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(activeBookingDetails.id)}
                      className="px-4 py-1.5 bg-[#a3e635] text-slate-950 font-black rounded-xl hover:bg-[#92d428] font-heading shadow-xs"
                    >
                      Approve & Allocate
                    </button>
                  </div>
                </div>
              )}

              {/* Stay & Room Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Property</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBookingDetails.propertyName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Room & Type</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBookingDetails.roomName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Allocated Bed</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBookingDetails.bedNumber}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Move-in Date</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBookingDetails.moveInDate}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Lease Tenure</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBookingDetails.durationMonths} Months</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Contact Phone</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBookingDetails.tenantPhone}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                  Financial Breakdown
                </div>
                <div className="divide-y divide-slate-200/60 text-xs">
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Monthly Accommodation Rent</span>
                    <span className="font-bold text-slate-900">
                      ₹{activeBookingDetails.monthlyRent.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Refundable Security Deposit</span>
                    <span className="font-bold text-slate-900">
                      ₹{activeBookingDetails.securityDeposit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>One-time Booking Token Fee</span>
                    <span className="font-bold text-slate-900">
                      ₹{activeBookingDetails.bookingFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Maintenance & Utility Surcharge</span>
                    <span className="font-bold text-slate-900">
                      ₹{activeBookingDetails.maintenanceCharges.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-sm font-black text-slate-900 font-heading">
                    <span>Total Move-in Package</span>
                    <span className="text-emerald-700">
                      ₹{activeBookingDetails.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                  Booking History & Timeline
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {activeBookingDetails.timeline.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#a3e635] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-[10px] text-slate-400">
                            {act.date} · {act.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              {activeBookingDetails.bookingStatus === 'Confirmed' && (
                <button
                  type="button"
                  onClick={() => setCancelReasonModalBooking(activeBookingDetails)}
                  className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Cancel Booking</span>
                </button>
              )}
              {activeBookingDetails.customerId && onNavigateToCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToCustomer(activeBookingDetails.customerId!);
                    setActiveBookingDetails(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer ml-auto mr-3"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View Customer Profile</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveBookingDetails(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectReasonModalBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black font-heading text-slate-900">Reject Booking Request</h3>
            <p className="text-xs text-slate-500">
              Please enter the reason for rejecting booking #{rejectReasonModalBooking.bookingNumber}:
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Requested room type unavailable on requested move-in date..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-400 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectReasonModalBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelReasonModalBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black font-heading text-slate-900">Cancel Confirmed Booking</h3>
            <p className="text-xs text-slate-500">
              Cancelling will release bed {cancelReasonModalBooking.bedNumber} back to available inventory.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Tenant relocation plans changed..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-400 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelReasonModalBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptForBooking && (
        <CustomerReceiptModal
          customer={{
            id: showReceiptForBooking.customerId || 'cust-tmp',
            fullName: showReceiptForBooking.tenantName,
            phone: showReceiptForBooking.tenantPhone,
            email: showReceiptForBooking.tenantEmail,
            propertyName: showReceiptForBooking.propertyName,
            propertyAddress: showReceiptForBooking.propertyAddress,
            roomId: showReceiptForBooking.roomId,
            roomName: showReceiptForBooking.roomName,
            roomType: showReceiptForBooking.roomType,
            bedId: showReceiptForBooking.bedId,
            bedNumber: showReceiptForBooking.bedNumber,
            moveInDate: showReceiptForBooking.moveInDate,
            monthlyRent: showReceiptForBooking.monthlyRent,
            securityDeposit: showReceiptForBooking.securityDeposit,
            paymentStatus: 'Paid',
            tenantStatus: 'Active',
            createdAt: showReceiptForBooking.createdAt,
            documents: [],
            paymentHistory: [],
            visitHistory: [],
            timeline: [],
            propertyId: showReceiptForBooking.propertyId,
          }}
          payment={{
            id: 'pay-bk',
            paymentId: `PAY-${showReceiptForBooking.bookingNumber}`,
            date: showReceiptForBooking.moveInDate,
            propertyId: showReceiptForBooking.propertyId,
            propertyName: showReceiptForBooking.propertyName,
            rentAmount: showReceiptForBooking.monthlyRent,
            additionalCharges: showReceiptForBooking.securityDeposit + showReceiptForBooking.bookingFee,
            totalAmount: showReceiptForBooking.totalAmount,
            paymentMethod: 'UPI',
            status: 'Completed',
            receiptNumber: `REC-${showReceiptForBooking.bookingNumber.replace(/\D/g, '')}`,
            description: 'Move-in Booking Deposit & Accommodation Advance',
          }}
          onClose={() => setShowReceiptForBooking(null)}
        />
      )}

      {/* Create Booking Modal */}
      {showCreateModal && <CreateBookingModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};
