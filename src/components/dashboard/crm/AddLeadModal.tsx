import React, { useState } from 'react';
import { X, Sparkles, Building2, User, Phone, Mail, IndianRupee, Calendar, Layers, FileText } from 'lucide-react';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { useCRM } from '../../../context/CRMContext';
import { useRBAC } from '../../../context/RBACContext';
import { useAuth } from '../../../context/AuthContext';
import { LeadSource } from '../../../types/crm';

interface AddLeadModalProps {
  onClose: () => void;
  onSuccess?: (leadId: string) => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ onClose, onSuccess }) => {
  const { ownerProperties } = usePropertyListing();
  const { createLead } = useCRM();
  const { employees } = useRBAC();
  const { user: currentUser } = useAuth();
  // Assignable staff: active team members from the RBAC directory, with the signed-in user first.
  const staffOptions = Array.from(
    new Set([currentUser?.name || 'Owner', ...employees.filter((e) => e.status === 'active').map((e) => e.name)])
  );

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [propertyId, setPropertyId] = useState(ownerProperties[0]?.id || '');
  const [roomType, setRoomType] = useState('Single Sharing');
  const [budget, setBudget] = useState('12000');
  const [preferredMoveInDate, setPreferredMoveInDate] = useState('');
  const [source, setSource] = useState<LeadSource>('Nestin');
  const [assignedTo, setAssignedTo] = useState('Ramesh (Operations)');
  const [notes, setNotes] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedProperty = ownerProperties.find((p) => p.id === propertyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please provide lead full name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setError('Please provide a valid contact phone number.');
      return;
    }
    if (!propertyId) {
      setError('Please select an interested property.');
      return;
    }

    const leadId = createLead({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      propertyId,
      propertyName: selectedProperty?.name || 'Selected Property',
      roomType,
      budget: Number(budget) || 10000,
      preferredMoveInDate: preferredMoveInDate || undefined,
      preferredLocation: preferredLocation.trim() || selectedProperty?.location.area || undefined,
      source,
      stage: 'New',
      assignedTo,
      notes: notes.trim() || undefined,
    });

    if (onSuccess) onSuccess(leadId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#a3e635] text-slate-950 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-heading text-white">Add New Lead</h3>
              <p className="text-[11px] text-slate-400">Capture an enquiry into the Owner CRM pipeline</p>
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

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635] focus:border-slate-400"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635] focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Email & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635] focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Preferred Locality / Metro
              </label>
              <input
                type="text"
                placeholder="e.g. Near JNTU / HITEC City"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635] focus:border-slate-400"
              />
            </div>
          </div>

          {/* Interested Property & Room Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Interested Property <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                {ownerProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.location.area || p.location.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Interested Room Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value="Single Sharing">Single Sharing (AC / Private)</option>
                <option value="Double Sharing">Double Sharing (AC)</option>
                <option value="Triple Sharing">Triple Sharing (Standard)</option>
                <option value="Four Sharing">Four Sharing (Budget)</option>
                <option value="Dormitory">Dormitory Style</option>
              </select>
            </div>
          </div>

          {/* Budget & Preferred Move-in Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Monthly Budget (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="number"
                  placeholder="12000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Target Move-in Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={preferredMoveInDate}
                  onChange={(e) => setPreferredMoveInDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>
          </div>

          {/* Lead Source & Assigned Employee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Enquiry Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value="Nestin">Nestin Marketplace</option>
                <option value="Website">Direct Website</option>
                <option value="Phone">Phone Enquiry</option>
                <option value="WhatsApp">WhatsApp Chat</option>
                <option value="Walk-in">Walk-in Reception</option>
                <option value="Referral">Resident Referral</option>
                <option value="Other">Other Source</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Assigned Employee / Host
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                {staffOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 font-heading mb-1">
              Initial Notes & Resident Requirements
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Working at tech firm nearby, needs AC room with balcony and morning breakfast..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635] resize-none"
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Initial Pipeline Stage:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              New (Stage 1)
            </span>
          </div>

          {/* Submit Actions */}
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
              Create Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
