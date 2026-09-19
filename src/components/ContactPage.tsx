import { ApiClient } from '../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';

interface ContactPageProps {
  onNavigate: (page: 'home' | 'about' | 'contact', sectionId?: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [searchParams] = useSearchParams();
  const subjectParam = searchParams.get('subject');
  const roleParam = searchParams.get('role');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    userRole: 'Tenant / Resident',
    subject: '',
    message: '',
    preferredContact: 'Email',
  });

  useEffect(() => {
    if (subjectParam === 'owner-demo' || roleParam === 'owner') {
      setFormData((prev) => ({
        ...prev,
        userRole: 'PG Property Owner',
        subject: 'Request a Demo / Owner Partnership',
        message:
          prev.message ||
          'Hi Nestin team, I am interested in listing my property and would like to request a demo of the Nestin Owner Platform.',
      }));
    } else if (subjectParam === 'owner-pricing') {
      setFormData((prev) => ({
        ...prev,
        userRole: 'PG Property Owner',
        subject: 'Owner Pricing & Listing Inquiry',
        message:
          prev.message ||
          'Hi Nestin team, I would like to know more about the pricing plans and listing options for PG owners.',
      }));
    }
  }, [subjectParam, roleParam]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.message) {
      alert('Please fill in your name, email, and message.');
      return;
    }

    setSubmitting(true);
    ApiClient.public
      .contact(formData)
      .then((res) => {
        setSubmitted(true);
        setTicketId(res.ticketNumber);
      })
      .catch((err) => alert(err instanceof Error ? err.message : 'Could not send your message. Please try again.'))
      .finally(() => setSubmitting(false));
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      userRole: 'Tenant / Resident',
      subject: '',
      message: '',
      preferredContact: 'Email',
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 lg:space-y-20 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 font-heading">
        <button onClick={() => onNavigate('home')} className="hover:text-black transition-colors cursor-pointer">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[#5fa000] font-bold">Contact Us</span>
      </div>

      {/* Hero Title */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
          GET IN TOUCH
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#121820] font-heading leading-[1.12]">
          We're Here to Help You Find Your Ideal Stay.
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Have questions about a PG listing, visit scheduling, or listing your property? Our support team is active 7
          days a week.
        </p>
      </div>

      {/* Support Info Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center text-[#5fa000]">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 font-heading uppercase tracking-wider">
              CUSTOMER HELPLINE
            </h3>
            <p className="text-base font-extrabold text-[#121820] font-heading mt-1">+91 1800-NESTIN-01</p>
            <p className="text-xs text-slate-500 mt-0.5">+91 8000 123 456</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center text-[#5fa000]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 font-heading uppercase tracking-wider">EMAIL SUPPORT</h3>
            <p className="text-base font-extrabold text-[#121820] font-heading mt-1">support@nestinfinds.app</p>
            <p className="text-xs text-slate-500 mt-0.5">owners@nestinfinds.app</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center text-[#5fa000]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 font-heading uppercase tracking-wider">SUPPORT HOURS</h3>
            <p className="text-base font-extrabold text-[#121820] font-heading mt-1">
              Mon – Sun: 8:00 AM – 10:00 PM IST
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Average response: &lt; 15 mins
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center text-[#5fa000]">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 font-heading uppercase tracking-wider">HEADQUARTERS</h3>
            <p className="text-xs font-extrabold text-[#121820] font-heading mt-1 leading-snug">
              Nestin Technologies Pvt Ltd
            </p>
            <p className="text-xs text-slate-500 mt-0.5">100ft Road, Indiranagar, Bengaluru 560038</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Contact Form + Location Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Contact Form (Col 1-7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl sm:rounded-[36px] p-6 sm:p-10 border border-slate-200 shadow-md">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-[#a3e635]/30 border-2 border-[#a3e635] flex items-center justify-center text-[#5fa000] mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#121820] font-heading">Message Submitted Successfully!</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  Thank you for reaching out to Nestin. Our support specialist will review your request and contact you
                  shortly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200 max-w-xs mx-auto text-left space-y-1">
                <p className="text-[11px] font-bold text-slate-400 font-heading uppercase">TICKET REFERENCE ID</p>
                <p className="text-lg font-mono font-bold text-[#121820]">{ticketId}</p>
                <p className="text-xs text-slate-500">A confirmation email has been sent to {formData.email}</p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="bg-[#0F5132] hover:bg-[#146c43] text-white font-bold text-sm px-7 py-3 rounded-full transition-all cursor-pointer shadow-md font-heading"
              >
                Send Another Message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">Send Us a Message</h2>
                <p className="text-xs text-slate-500 font-sans">
                  Fill in your contact details and message below. We will respond promptly.
                </p>
              </div>

              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 font-heading">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#a3e635] focus:bg-white text-sm font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 font-heading">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="rahul@example.com"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#a3e635] focus:bg-white text-sm font-medium transition-all"
                  />
                </div>
              </div>

              {/* Phone & Role Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 font-heading">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#a3e635] focus:bg-white text-sm font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 font-heading">I am a...</label>
                  <select
                    aria-label="I am a"
                    name="userRole"
                    value={formData.userRole}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#a3e635] focus:bg-white text-sm font-medium transition-all"
                  >
                    <option value="Tenant / Resident">Tenant / Looking for PG</option>
                    <option value="PG Property Owner">PG / Hostel Property Owner</option>
                    <option value="Corporate / Franchise Partner">Corporate / Partner</option>
                    <option value="Press / Media Inquiry">Press / Media</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-heading">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="How can we help you today?"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#a3e635] focus:bg-white text-sm font-medium transition-all"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-heading">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Provide details about your query, city preference, or property address..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#a3e635] focus:bg-white text-sm font-medium transition-all resize-none"
                />
              </div>

              {/* Preferred Contact Method */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 font-heading block">Preferred Contact Method</label>
                <div className="flex items-center gap-6">
                  {['Email', 'Phone Call', 'WhatsApp'].map((method) => (
                    <label
                      key={method}
                      className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700"
                    >
                      <input
                        type="radio"
                        name="preferredContact"
                        value={method}
                        checked={formData.preferredContact === method}
                        onChange={handleChange}
                        className="accent-[#5fa000]"
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#a3e635] text-[#0F5132] hover:bg-[#8ece28] font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 font-heading"
              >
                {submitting ? (
                  <span>Submitting Message...</span>
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send className="w-4 h-4 text-[#0F5132]" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Office Info & Map Card (Col 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Contact FAQ Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold font-heading text-base">
              <HelpCircle className="w-5 h-5 text-[#5fa000]" />
              <h3>Frequently Asked Questions</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-slate-200/80 space-y-1">
                <p className="font-bold text-[#121820]">How quickly can I schedule a PG visit?</p>
                <p className="text-slate-600">
                  You can schedule a visit instantly on Nestin. Site visits are confirmed within 10 minutes.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-slate-200/80 space-y-1">
                <p className="font-bold text-[#121820]">Are there any brokerage charges?</p>
                <p className="text-slate-600">
                  No! Nestin is 100% zero brokerage for tenants searching for verified PGs and hostels.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-slate-200/80 space-y-1">
                <p className="font-bold text-[#121820]">I am a PG Owner. How do I list my property?</p>
                <p className="text-slate-600">
                  Click 'List your property' or call our owner hotline at +91 1800-NESTIN-01 to get verified within 24
                  hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
