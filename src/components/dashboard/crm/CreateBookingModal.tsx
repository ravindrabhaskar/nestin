import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Building2, User, Phone, Mail, IndianRupee, Calendar, Layers, ShieldCheck, Bed } from 'lucide-react';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { useCRM } from '../../../context/CRMContext';
import { LeadItem } from '../../../types/crm';

interface CreateBookingModalProps {
  initialLead?: LeadItem | null;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
}

export const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  initialLead,
  onClose,
  onSuccess,
}) => {
  const { ownerProperties } = usePropertyListing();
  const { createBooking, approveBooking } = useCRM();

  const [tenantName, setTenantName] = useState(initialLead?.fullName || '');
  const [tenantPhone, setTenantPhone] = useState(initialLead?.phone || '');
  const [tenantEmail, setTenantEmail] = useState(initialLead?.email || '');
  const [propertyId, setPropertyId] = useState(initialLead?.propertyId || ownerProperties[0]?.id || '');
  const [roomId, setRoomId] = useState('');
  const [bedId, setBedId] = useState('');
  const [moveInDate, setMoveInDate] = useState(initialLead?.preferredMoveInDate || new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(11);
  const [monthlyRent, setMonthlyRent] = useState(12500);
  const [securityDeposit, setSecurityDeposit] = useState(25000);
  const [bookingFee, setBookingFee] = useState(999);
  const [maintenanceCharges, setMaintenanceCharges] = useState(800);
  const [notes, setNotes] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedProperty = ownerProperties.find((p) => p.id === propertyId);
  const availableRooms = selectedProperty?.rooms || [];
  const selectedRoom = availableRooms.find((r) => r.id === roomId) || availableRooms[0];
  const availableBeds = selectedRoom?.beds || [];
  const selectedBed = availableBeds.find((b) => b.id === bedId) || availableBeds[0];

  // Sync rooms and rent when property changes
  useEffect(() => {
    if (selectedProperty && selectedProperty.rooms.length > 0) {
      const firstRoom = selectedProperty.rooms[0];
      setRoomId(firstRoom.id);
      setMonthlyRent(firstRoom.monthlyRent || 12000);
      setSecurityDeposit(firstRoom.securityDeposit || (firstRoom.monthlyRent || 12000) * 2);
      if (firstRoom.beds.length > 0) {
        const freeBed = firstRoom.beds.find((b) => !b.isOccupied) || firstRoom.beds[0];
        setBedId(freeBed.id);
      }
    }
  }, [propertyId]);

  // Sync bed and rent when room changes
  useEffect(() => {
    if (selectedRoom) {
      setMonthlyRent(selectedRoom.monthlyRent || 12000);
      setSecurityDeposit(selectedRoom.securityDeposit || (selectedRoom.monthlyRent || 12000) * 2);
      const freeBed = selectedRoom.beds.find((b) => !b.isOccupied) || selectedRoom.beds[0];
      if (freeBed) {
        setBedId(freeBed.id);
      }
    }
  }, [roomId]);

  const totalAmount = monthlyRent + securityDeposit + bookingFee + maintenanceCharges;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tenantName.trim()) {
      setError('Please provide tenant name.');
      return;
    }
    if (!tenantPhone.trim()) {
      setError('Please provide tenant phone number.');
      return;
    }
    if (!propertyId || !selectedProperty) {
      setError('Please choose a property.');
      return;
    }
    if (!selectedRoom) {
      setError('Please choose a room.');
      return;
    }
    if (!selectedBed) {
      setError('Please choose a bed allotment.');
      return;
    }

    const bookingId = createBooking({
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      tenantEmail: tenantEmail.trim() || `${tenantName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      propertyId,
      propertyName: selectedProperty.name,
      propertyAddress: selectedProperty.location.formattedAddress || selectedProperty.location.city,
      propertyImage: selectedProperty.coverImage,
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      roomType: selectedRoom.type,
      bedId: selectedBed.id,
      bedNumber: selectedBed.bedNumber,
      moveInDate,
      durationMonths: Number(durationMonths) || 11,
      monthlyRent: Number(monthlyRent) || 12000,
      securityDeposit: Number(securityDeposit) || 24000,
      bookingFee: Number(bookingFee) || 999,
      maintenanceCharges: Number(maintenanceCharges) || 800,
      totalAmount,
      paidAmount: autoConfirm ? totalAmount : bookingFee,
      paymentStatus: autoConfirm ? 'Paid' : 'Pending',
      bookingStatus: autoConfirm ? 'Confirmed' : 'Pending',
      notes: notes.trim() || undefined,
      leadId: initialLead?.id || undefined,
    });

    if (autoConfirm) {
      approveBooking(bookingId);
    }

    if (onSuccess) onSuccess(bookingId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#a3e635] text-slate-950 flex items-center justify-center font-black">
              <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-heading text-white">Create Booking Allotment</h3>
              <p className="text-[11px] text-slate-400">Allot room & bed with automatic tenant record & inventory sync</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* Tenant Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Tenant Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>
          </div>

          {/* Property, Room & Bed Allotment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Target Property <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                {ownerProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Select Room <span className="text-rose-500">*</span>
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type} - {r.availableBedsCount} beds free)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Select Bed Allotment <span className="text-rose-500">*</span>
              </label>
              <select
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} {b.isOccupied ? `(Occupied: ${b.occupantName || 'Tenant'})` : '(Available)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Move-in Date & Tenure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Move-in Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Lease Tenure (Months)
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={11}>11 Months (Standard)</option>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
              Financial Breakdown & Amounts
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Monthly Rent</label>
                <input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Security Deposit</label>
                <input
                  type="number"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Booking Token Fee</label>
                <input
                  type="number"
                  value={bookingFee}
                  onChange={(e) => setBookingFee(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Maintenance Fee</label>
                <input
                  type="number"
                  value={maintenanceCharges}
                  onChange={(e) => setMaintenanceCharges(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold text-slate-700">Total Move-in Package:</span>
              <span className="text-sm font-black text-slate-900 font-heading">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Auto Confirmation Toggle */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">Instant Approval & Inventory Allocation</p>
                <p className="text-[11px] text-emerald-700">
                  Instantly reserves bed, updates occupancy & creates customer profile
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#a3e635]"></div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 font-heading mb-1">
              Internal Booking Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Deposit collected via GooglePay transaction #..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer font-heading"
            >
              {autoConfirm ? 'Confirm & Allot Booking' : 'Create Pending Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
