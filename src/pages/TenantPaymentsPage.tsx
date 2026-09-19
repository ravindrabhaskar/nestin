import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, Download, Printer, X, CreditCard } from 'lucide-react';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { TenantPaymentItem } from '../types';
import { ApiClient, tokenStore } from '../lib/apiClient';
import { useApiResource } from '../hooks/useApiResource';
import { useAuth } from '../context/AuthContext';
import { payOnline } from '../lib/checkout';

/** Downloads the server-generated receipt with the session token attached. */
async function downloadReceipt(payment: TenantPaymentItem) {
  const res = await fetch(`/api/v1/tenant/payments/${payment.id}/receipt`, {
    headers: { Authorization: `Bearer ${tokenStore.get() || ''}` },
  });
  if (!res.ok) throw new Error('Receipt is not available for this payment.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${payment.invoiceNumber}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export const TenantPaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    data: payments,
    setData: setPayments,
    isLoading,
  } = useApiResource<TenantPaymentItem[]>(() => ApiClient.tenant.payments(), [], {
    enabled: !!user,
    key: user?.id,
    label: 'Could not load your payments',
  });
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payNotice, setPayNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  /** Settle an existing pending charge (e.g. a booking token when the gateway is live). */
  const handlePayPending = async (item: TenantPaymentItem) => {
    setIsPaying(true);
    setPayNotice(null);
    try {
      const paid = await payOnline({ paymentId: item.id });
      setPayments((prev) => prev.map((x) => (x.id === paid.id ? paid : x)));
      setPayNotice({ kind: 'ok', text: `Payment successful. Invoice ${paid.invoiceNumber}.` });
    } catch (err) {
      setPayNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Payment failed.' });
    } finally {
      setIsPaying(false);
    }
  };

  const handlePayRent = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    setIsPaying(true);
    setPayNotice(null);
    try {
      // Real Razorpay checkout when the gateway is configured; simulated otherwise (same flow).
      const paid = await payOnline({ amount, type: 'Rent', paymentMethod: 'UPI / GPay' });
      setPayments((prev) => [paid, ...prev.filter((x) => x.id !== paid.id)]);
      setPayAmount('');
      setPayNotice({ kind: 'ok', text: `Payment successful. Invoice ${paid.invoiceNumber} generated.` });
    } catch (err) {
      setPayNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Payment failed.' });
    } finally {
      setIsPaying(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'All' | 'Paid' | 'Pending' | 'Refunded'>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<TenantPaymentItem | null>(null);

  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'All') return true;
    return (p.status || '').toLowerCase() === activeTab.toLowerCase();
  });

  const getStatusBadge = (status: TenantPaymentItem['status']) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#a3e635]/25 text-[#3d6800] border border-[#a3e635]/40 flex items-center gap-1 font-heading">
          <CheckCircle2 className="w-3 h-3" />
          <span>Paid</span>
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center gap-1 font-heading">
          <Clock className="w-3 h-3" />
          <span>Pending</span>
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 font-heading">
          <XCircle className="w-3 h-3" />
          <span>Failed</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 font-heading">
        <AlertCircle className="w-3 h-3" />
        <span>Refunded</span>
      </span>
    );
  };

  return (
    <TenantAccountLayout
      title="Payments"
      subtitle="View your Nestin booking and payment history."
      activeNav="/payments"
    >
      <div className="space-y-6">
        {/* PAY RENT ONLINE */}
        <form
          onSubmit={handlePayRent}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-heading">
              Pay rent or dues online
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-500">₹</span>
              <input
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Amount (e.g. 15000)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60"
              />
            </div>
            {payNotice && (
              <p
                className={`mt-2 text-xs font-semibold ${payNotice.kind === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}
              >
                {payNotice.text}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isPaying || !payAmount}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-black hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer font-heading flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isPaying ? 'Processing…' : 'Pay via UPI'}</span>
          </button>
        </form>

        {isLoading && (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* FILTER TAB BAR */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-1 flex flex-wrap gap-1 shadow-2xs">
          {(['All', 'Paid', 'Pending', 'Refunded'] as const).map((tab) => {
            const count = payments.filter((p) => {
              if (tab === 'All') return true;
              return (p.status || '').toLowerCase() === tab.toLowerCase();
            }).length;

            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-heading flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-[#a3e635] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <span>{tab === 'All' ? 'All Payments' : tab}</span>
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

        {/* PAYMENTS CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-heading">
                <tr>
                  <th className="py-3.5 px-5">Payment</th>
                  <th className="py-3.5 px-5">Property</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Amount</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 font-heading">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.id}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-medium">{item.propertyName}</td>
                      <td className="py-4 px-5 text-slate-600">{item.date}</td>
                      <td className="py-4 px-5 font-bold font-heading text-slate-900">
                        ₹{item.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-5">{getStatusBadge(item.status)}</td>
                      <td className="py-4 px-5 text-right space-x-2">
                        {item.status === 'Pending' && (
                          <button
                            type="button"
                            disabled={isPaying}
                            onClick={() => handlePayPending(item)}
                            className="px-3 py-1 bg-slate-900 text-[#a3e635] text-xs font-bold rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Pay now
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(item)}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE COMPACT CARDS */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredPayments.length > 0 ? (
              filteredPayments.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold font-heading text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.propertyName}</div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="text-slate-500">{item.date}</div>
                    <div className="font-bold font-heading text-slate-900">₹{item.amount.toLocaleString()}</div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(item)}
                      className="px-3 py-1 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">No payment records found.</div>
            )}
          </div>
        </div>
      </div>

      {/* RECEIPT / INVOICE MODAL */}
      {selectedReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">Payment Receipt</h3>
                <p className="text-xs text-slate-500">Ref: {selectedReceipt.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Property</span>
                <span className="font-bold text-slate-900 font-heading">{selectedReceipt.propertyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Description</span>
                <span className="font-medium text-slate-900">{selectedReceipt.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900">{selectedReceipt.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span>{getStatusBadge(selectedReceipt.status)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-900 font-heading">Total Paid</span>
                <span className="font-extrabold text-slate-900 font-heading">
                  ₹{selectedReceipt.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  downloadReceipt(selectedReceipt).catch((err) => setPayNotice({ kind: 'err', text: err.message }))
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer font-heading"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer font-heading"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-[#a3e635] hover:bg-slate-800 transition-colors cursor-pointer font-heading"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantAccountLayout>
  );
};
