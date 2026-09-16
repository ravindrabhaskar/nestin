import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  Phone,
  Mail,
  ChevronDown,
  Plus,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { TenantSupportTicket } from '../types';
import { ApiClient } from '../lib/apiClient';
import { useApiResource } from '../hooks/useApiResource';
import { useAuth } from '../context/AuthContext';

export const TenantSupportPage: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TenantSupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: tickets, setData: setTickets } = useApiResource<TenantSupportTicket[]>(() => ApiClient.tenant.tickets(), [], {
    enabled: !!user,
    key: user?.id,
    label: 'Could not load your support tickets',
  });

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Rent & Deposit');
  const [ticketMessage, setTicketMessage] = useState('');

  const faqs = [
    {
      q: 'How do I schedule an in-person PG visit?',
      a: 'Navigate to any PG listing on Nestin, click "Schedule Visit", select your preferred date and time slot, and our property manager will be ready to show you around.',
    },
    {
      q: 'When and how is the security deposit refunded?',
      a: 'Security deposits are 100% refundable upon checkout, subject to standard room inspection as agreed in the tenancy agreement. Refunds are processed directly to your bank account within 3–5 working days.',
    },
    {
      q: 'Can I change my bed or room sharing type after booking?',
      a: 'Yes, room upgrades or bed shifts can be requested subject to availability by raising a support request or speaking directly with the property manager.',
    },
    {
      q: 'What is included in the monthly rent?',
      a: 'Most verified Nestin PGs include high-speed WiFi, regular housekeeping, water, and basic maintenance. Specific inclusions (like 3-time meals or AC power usage) are listed clearly on each property page.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    try {
      const created = await ApiClient.tenant.createTicket({ subject: ticketSubject, category: ticketCategory, description: ticketMessage, priority: 'Medium' });
      setTickets((prev) => [created, ...prev]);
      setTicketSubject('');
      setTicketMessage('');
      setNewTicketModalOpen(false);
      showToast(`Support ticket ${created.ticketNumber} created.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create the ticket.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    const text = replyText;
    setReplyText('');
    try {
      const updated = await ApiClient.tenant.replyTicket(selectedTicket.id, text);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTicket(updated);
    } catch (err) {
      setReplyText(text);
      showToast(err instanceof Error ? err.message : 'Could not send your reply.');
    }
  };

  return (
    <TenantAccountLayout
      title="Help & Support"
      subtitle="Get answers to your questions or reach our resident support team."
      activeNav="/support"
      headerAction={
        <button
          type="button"
          onClick={() => setNewTicketModalOpen(true)}
          className="px-4 py-2 bg-slate-900 text-[#a3e635] text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 transition-colors cursor-pointer font-heading flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Request</span>
        </button>
      }
    >
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-[#a3e635] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold font-heading border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">

        {/* SEARCH HELP BAR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics (e.g. deposit refund, booking visit, WiFi)..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all font-sans"
            />
          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quick answers to common questions about bookings, deposits, and stays.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFaqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div key={faq.q} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full text-left flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 font-heading group-hover:text-slate-700">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180 text-slate-900' : ''
                      }`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-2 text-xs text-slate-600 leading-relaxed font-sans pr-6">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CONTACT SUPPORT */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900">
              Contact Support
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Our resident support team is available 24/7 to assist you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold font-heading text-slate-900">Email Support</div>
                <a href="mailto:support@nestin.app" className="text-xs text-slate-500 hover:text-slate-900 truncate block">
                  support@nestin.app
                </a>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold font-heading text-slate-900">Phone Helpline</div>
                <a href="tel:+918000998877" className="text-xs text-slate-500 hover:text-slate-900 truncate block">
                  +91 8000 998 877
                </a>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold font-heading text-slate-900">WhatsApp Desk</div>
                <span className="text-xs text-slate-500">9 AM - 9 PM Daily</span>
              </div>
            </div>
          </div>
        </div>

        {/* MY SUPPORT REQUESTS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">
                My Support Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track status and replies for your raised inquiries.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNewTicketModalOpen(true)}
              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer font-heading"
            >
              + Create ticket
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-heading text-slate-900 truncate">
                        {ticket.subject}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-heading ${
                          (ticket.status || '').toLowerCase().includes('open')
                            ? 'bg-amber-500/15 text-amber-700'
                            : 'bg-[#a3e635]/25 text-[#3d6800]'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>ID: {ticket.id}</span>
                      <span>•</span>
                      <span>{ticket.category}</span>
                      <span>•</span>
                      <span>Updated: {ticket.updatedAt || ticket.createdAt}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start sm:self-center"
                  >
                    View Thread
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No support tickets raised yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CREATE TICKET MODAL */}
      {newTicketModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading text-slate-900">
                Create Support Request
              </h3>
              <button
                type="button"
                onClick={() => setNewTicketModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                  Category
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Rent & Deposit">Rent & Deposit Inquiries</option>
                  <option value="Maintenance">Room / Amenity Maintenance</option>
                  <option value="Booking & Check-in">Booking & Check-in</option>
                  <option value="WiFi & Utilities">WiFi & Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-[#a3e635] hover:bg-slate-800 transition-colors cursor-pointer font-heading"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TICKET THREAD MODAL */}
      {selectedTicket && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 truncate">
                  {selectedTicket.subject}
                </h3>
                <p className="text-xs text-slate-500">ID: {selectedTicket.id} • {selectedTicket.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-72">
              {(selectedTicket.messages || []).map((m, idx) => (
                <div
                  key={m.id || `msg-${idx}`}
                  className={`p-3.5 rounded-xl text-xs ${
                    m.sender === 'support'
                      ? 'bg-[#a3e635]/15 border border-[#a3e635]/30 text-slate-900 mr-6'
                      : 'bg-slate-100 text-slate-800 ml-6'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1 font-heading">
                    <span>{m.senderName || (m.sender === 'support' ? 'NestIn Support Desk' : 'You')}</span>
                    <span className="text-slate-400 font-normal">{m.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{m.text || m.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message reply..."
                className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="submit"
                className="px-4 h-10 bg-slate-900 text-[#a3e635] text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer font-heading flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </TenantAccountLayout>
  );
};
