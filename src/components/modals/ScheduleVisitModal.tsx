import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, CheckCircle2, User, Phone, Mail, Sparkles, Building } from 'lucide-react';
import { DetailedProperty } from '../../data/propertyDetailsHelper';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CalendarDatePicker } from '../ui/CalendarDatePicker';

interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: DetailedProperty;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('Morning');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#FAF9F5] text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 overflow-hidden"
        >
          <button
            type="button"
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#a3e635]/30 text-slate-950 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold font-heading text-slate-900">
                    Schedule In-Person Visit
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {property.name || property.title} • {property.area}, {property.city}
                  </p>
                </div>
              </div>

              {/* Select Date with CalendarDatePicker */}
              <CalendarDatePicker
                id="schedule-modal-viewing-date"
                label="Select Preferred Date"
                value={selectedDate}
                onChange={setSelectedDate}
                minDate={new Date().toISOString().split('T')[0]}
                inquiryType="viewing"
                quickPresets={true}
                required
                helperText="Select a date for an in-person guided room walkthrough with property manager."
              />

              {/* Select Time Slot */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Select Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { slot: 'Morning', time: '9 AM - 12 PM' },
                    { slot: 'Afternoon', time: '12 PM - 4 PM' },
                    { slot: 'Evening', time: '4 PM - 8 PM' },
                  ].map((item) => (
                    <button
                      key={item.slot}
                      type="button"
                      onClick={() => setSelectedSlot(item.slot)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedSlot === item.slot
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.slot}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{item.time}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Your Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-extrabold text-sm transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirm Visit Request</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black font-heading text-slate-900">
                Visit Scheduled!
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your visit to <strong className="text-slate-900">{property.name || property.title}</strong> is set for{' '}
                <strong className="text-slate-900">{selectedDate}</strong> ({selectedSlot} Slot).
              </p>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span>{property.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>Host Contact: {property.owner?.phone || '+91 98765 43210'}</span>
                </div>
                <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl font-medium">
                  ✓ Instant SMS and Email notifications dispatched to {phone || 'your phone'} & {email || 'your email'}.
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
