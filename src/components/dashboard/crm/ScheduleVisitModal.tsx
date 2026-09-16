import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Building2, Users, FileText, CheckCircle2 } from 'lucide-react';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { useCRM } from '../../../context/CRMContext';
import { useRBAC } from '../../../context/RBACContext';
import { useAuth } from '../../../context/AuthContext';
import { LeadItem } from '../../../types/crm';
import { CalendarDatePicker } from '../../ui/CalendarDatePicker';

interface ScheduleVisitModalProps {
  initialLead?: LeadItem | null;
  onClose: () => void;
  onSuccess?: (visitorId: string) => void;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  initialLead,
  onClose,
  onSuccess,
}) => {
  const { ownerProperties } = usePropertyListing();
  const { leads, scheduleVisit } = useCRM();
  const { employees } = useRBAC();
  const { user: currentUser } = useAuth();
  // Assignable staff: active team members from the RBAC directory, with the signed-in user first.
  const staffOptions = Array.from(
    new Set([currentUser?.name || 'Owner', ...employees.filter((e) => e.status === 'active').map((e) => e.name)])
  );

  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || '');
  const [visitorName, setVisitorName] = useState(initialLead?.fullName || '');
  const [phone, setPhone] = useState(initialLead?.phone || '');
  const [email, setEmail] = useState(initialLead?.email || '');
  const [propertyId, setPropertyId] = useState(initialLead?.propertyId || ownerProperties[0]?.id || '');
  const [preferredRoom, setPreferredRoom] = useState(initialLead?.roomType || 'Double Sharing AC');
  
  // Default tomorrow at 04:00 PM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [visitDate, setVisitDate] = useState(tomorrowStr);
  const [visitTime, setVisitTime] = useState('04:00 PM');
  const [numberOfVisitors, setNumberOfVisitors] = useState(1);
  const [purpose, setPurpose] = useState('Physical Room Walkthrough & Food Tasting');
  const [assignedTo, setAssignedTo] = useState(initialLead?.assignedTo || 'Ramesh (Operations)');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedProperty = ownerProperties.find((p) => p.id === propertyId);

  // If user picks a lead from dropdown, autofill
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const targetLead = leads.find((l) => l.id === leadId);
    if (targetLead) {
      setVisitorName(targetLead.fullName);
      setPhone(targetLead.phone);
      if (targetLead.email) setEmail(targetLead.email);
      if (targetLead.propertyId) setPropertyId(targetLead.propertyId);
      if (targetLead.roomType) setPreferredRoom(targetLead.roomType);
      if (targetLead.assignedTo) setAssignedTo(targetLead.assignedTo);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!visitorName.trim()) {
      setError('Please provide the visitor name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide a valid phone number.');
      return;
    }
    if (!propertyId) {
      setError('Please choose a property.');
      return;
    }
    if (!visitDate) {
      setError('Please choose a scheduled visit date.');
      return;
    }

    const visitorId = scheduleVisit({
      visitorName: visitorName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      propertyId,
      propertyName: selectedProperty?.name || 'Selected Property',
      preferredRoom,
      visitDate,
      visitTime,
      numberOfVisitors,
      purpose,
      assignedTo,
      status: 'Scheduled',
      notes: notes.trim() || undefined,
      leadId: selectedLeadId || undefined,
    });

    if (onSuccess) onSuccess(visitorId);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#a3e635] text-slate-950 flex items-center justify-center font-black">
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-heading text-white">Schedule Property Visit</h3>
              <p className="text-[11px] text-slate-400">Book in-person or virtual walkthrough slot</p>
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

          {/* Link to existing lead */}
          <div>
            <label className="block text-xs font-black text-slate-700 font-heading mb-1">
              Link to Existing CRM Lead (Optional)
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
            >
              <option value="">-- Direct New Visitor / Walk-in --</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullName} ({l.phone}) - {l.propertyName} [{l.stage}]
                </option>
              ))}
            </select>
          </div>

          {/* Visitor Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Visitor Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sneha Patel"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>
            </div>
          </div>

          {/* Property & Preferred Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Property to Visit <span className="text-rose-500">*</span>
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
                Target Room Type
              </label>
              <input
                type="text"
                placeholder="e.g. Single Private AC Room"
                value={preferredRoom}
                onChange={(e) => setPreferredRoom(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              />
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <CalendarDatePicker
                id="crm-schedule-visit-date"
                label="Visit Date"
                value={visitDate}
                onChange={setVisitDate}
                minDate={new Date().toISOString().split('T')[0]}
                inquiryType="viewing"
                quickPresets={true}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Time Slot
              </label>
              <select
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              >
                <option value="10:00 AM">10:00 AM (Morning)</option>
                <option value="11:30 AM">11:30 AM (Morning)</option>
                <option value="02:00 PM">02:00 PM (Afternoon)</option>
                <option value="04:00 PM">04:00 PM (Evening)</option>
                <option value="05:30 PM">05:30 PM (Evening)</option>
                <option value="07:00 PM">07:00 PM (Late Evening)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Group Size
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={numberOfVisitors}
                onChange={(e) => setNumberOfVisitors(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              />
            </div>
          </div>

          {/* Assigned Host & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Assigned Host / Caretaker
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

            <div>
              <label className="block text-xs font-black text-slate-700 font-heading mb-1">
                Visit Purpose
              </label>
              <input
                type="text"
                placeholder="Walkthrough, Food Tasting, Guardian Visit"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              />
            </div>
          </div>

          {/* Special Requests / Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 font-heading mb-1">
              Host Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Visitor wants to check 4th floor corner room and ask about parking..."
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
              Confirm & Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
