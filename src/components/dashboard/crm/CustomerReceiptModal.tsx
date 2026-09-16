import React from 'react';
import { X, Printer, Download, CheckCircle2, Building2, User, Calendar, IndianRupee } from 'lucide-react';
import { CustomerItem, CustomerPaymentRecord } from '../../../types/crm';

interface CustomerReceiptModalProps {
  customer: CustomerItem;
  payment: CustomerPaymentRecord;
  onClose: () => void;
}

export const CustomerReceiptModal: React.FC<CustomerReceiptModalProps> = ({
  customer,
  payment,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider uppercase bg-[#a3e635] text-slate-950 px-2 py-0.5 rounded-full font-heading">
              Official Rent Receipt
            </span>
            <span className="text-xs text-slate-400 font-mono">#{payment.receiptNumber}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-6 space-y-6 overflow-y-auto print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-heading tracking-tight text-slate-900">NESTIN</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Verified Stay
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{customer.propertyName}</p>
              <p className="text-[11px] text-slate-400">{customer.propertyAddress || 'Hyderabad, Telangana'}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PAID</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Date: {payment.date}</p>
            </div>
          </div>

          {/* Tenant Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
              Billed To Resident
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-slate-900">{customer.fullName}</p>
                <p className="text-xs text-slate-500">{customer.phone} · {customer.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{customer.roomName}</p>
                <p className="text-xs text-slate-500">{customer.bedNumber}</p>
              </div>
            </div>
          </div>

          {/* Payment Line Items */}
          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
              Payment Breakdown
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex justify-between items-center p-3 bg-white text-xs">
                <span className="text-slate-600 font-medium">{payment.description || 'Monthly PG Accommodation Rent'}</span>
                <span className="font-bold text-slate-900">₹{payment.rentAmount.toLocaleString('en-IN')}</span>
              </div>
              {payment.additionalCharges > 0 && (
                <div className="flex justify-between items-center p-3 bg-white text-xs">
                  <span className="text-slate-600 font-medium">Security Deposit / Maintenance / Utilities</span>
                  <span className="font-bold text-slate-900">₹{payment.additionalCharges.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-3.5 bg-slate-900 text-white font-bold text-sm">
                <span>Total Amount Paid</span>
                <span className="text-[#a3e635] text-base font-black">₹{payment.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-black">Payment Method</span>
              <p className="font-bold text-slate-800 mt-0.5">{payment.paymentMethod}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-black">Transaction ID</span>
              <p className="font-mono text-slate-800 mt-0.5 truncate">{payment.paymentId}</p>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-[10px] text-slate-400 text-center italic">
            This is a computer-generated digital receipt issued under Nestin Property Management System.
          </p>
        </div>

        {/* Action Controls */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
