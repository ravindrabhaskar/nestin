import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Printer,
  X,
  CreditCard,
} from 'lucide-react';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { INITIAL_TENANT_PAYMENTS } from '../data/tenantData';
import { TenantPaymentItem } from '../types';

export const TenantPaymentsPage: React.FC = () => {
  const [payments] = useState<TenantPaymentItem[]>(() => {
    try {
      const saved = localStorage.getItem('nestin_tenant_payments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TENANT_PAYMENTS;
  });

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
                      <td className="py-4 px-5 text-slate-700 font-medium">
                        {item.propertyName}
                      </td>
                      <td className="py-4 px-5 text-slate-600">
                        {item.date}
                      </td>
                      <td className="py-4 px-5 font-bold font-heading text-slate-900">
                        ₹{item.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-5">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-4 px-5 text-right">
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
              <div className="p-8 text-center text-slate-400 text-xs">
                No payment records found.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* RECEIPT / INVOICE MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  Payment Receipt
                </h3>
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
                <span className="font-extrabold text-slate-900 font-heading">₹{selectedReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
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
