import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PhoneCall, Calendar, Clock, CheckCircle2, User, Phone, Globe } from 'lucide-react';
import { DetailedProperty } from '../../data/propertyDetailsHelper';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CalendarDatePicker } from '../ui/CalendarDatePicker';

interface BookACallModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: DetailedProperty;
}

export const BookACallModal: React.FC<BookACallModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState('11:00 AM');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('Pricing & Rent Inquiry');
  const [language, setLanguage] = useState('English');
  const [submitted, setSubmitted] = useState(false);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleClose = () => {
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
          onClick={handleClose}
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
            onClick={handleClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <PhoneCall className="w-6 h-6 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold font-heading text-slate-900">
                    Request Immediate Callback
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    Speak with Host {property.owner?.name || 'Manager'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <CalendarDatePicker
                    id="call-inquiry-date-picker"
                    label="Preferred Date"
                    value={date}
                    onChange={setDate}
                    minDate={new Date().toISOString().split('T')[0]}
                    inquiryType="call"
                    quickPresets={true}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Time</label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                  >
                    <option>10:00 AM</option>
                    <option>11:00 AM</option>
                    <option>02:00 PM</option>
                    <option>04:00 PM</option>
                    <option>06:00 PM</option>
                    <option>08:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Your Phone Number</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Call Purpose</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                >
                  <option>Pricing & Rent Breakdown Inquiry</option>
                  <option>Room Availability & Move-in Date</option>
                  <option>Food & Mess Menu Questions</option>
                  <option>Security Deposit & Refund Terms</option>
                  <option>Schedule In-Person Walkthrough</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Language</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Telugu</option>
                    <option>Kannada</option>
                    <option>Tamil</option>
                    <option>Marathi</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-[#a3e635]" />
                <span>Book Callback Now</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black font-heading text-slate-900">
                Callback Confirmed!
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {property.owner?.name || 'Property Manager'} will call you at{' '}
                <strong className="text-slate-900">{phone}</strong> on{' '}
                <strong className="text-slate-900">{date} at {time}</strong> in {language}.
              </p>
              <button
                type="button"
                onClick={handleClose}
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
