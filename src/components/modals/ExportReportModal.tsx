import React, { useState } from 'react';
import { X, FileDown, Calendar, Building2, ShieldCheck } from 'lucide-react';
import { exportMonthlyReportPDF, SAMPLE_PROPERTIES_FINANCIAL } from '../../utils/pdfExport';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerName: string;
  ownerEmail: string;
  onSuccessToast: (msg: string) => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  ownerName,
  ownerEmail,
  onSuccessToast,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('August');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedProperty, setSelectedProperty] = useState('All Properties (Consolidated)');
  const [reportType] = useState<'full' | 'revenue' | 'occupancy' | 'tax'>('full');
  const [includeLedger, setIncludeLedger] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const years = [2026, 2025, 2024];

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportMonthlyReportPDF({
        month: selectedMonth,
        year: selectedYear,
        propertyName: selectedProperty,
        ownerName: ownerName || 'Property Owner',
        ownerEmail: ownerEmail || 'owner.partner@nestin.io',
        reportType,
        includeLedger,
        includeExpenses,
      });
      onSuccessToast(`Exported ${selectedMonth} ${selectedYear} Accounting PDF Report!`);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('PDF export error:', err);
      setIsExporting(false);
      onSuccessToast('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      data-lenis-prevent="true"
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]"
        data-lenis-prevent="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 text-slate-900 flex items-center justify-center">
              <FileDown className="w-5 h-5 stroke-[2] text-slate-950" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                Export Accounting PDF Report
              </h3>
              <p className="text-xs text-slate-500">Monthly revenue, occupancy breakdown, & CA audit statement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Month Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Select Billing Period</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { m: 'August', y: 2026, label: 'Aug 2026 (Current)' },
              { m: 'July', y: 2026, label: 'Jul 2026 (Last Mo)' },
              { m: 'June', y: 2026, label: 'Jun 2026' },
              { m: 'May', y: 2026, label: 'May 2026' },
            ].map((p, idx) => {
              const isSelected = selectedMonth === p.m && selectedYear === p.y;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(p.m);
                    setSelectedYear(p.y);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-[#a3e635] border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full p-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Property Scope */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Property Scope</span>
          </label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full p-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="All Properties (Consolidated)">All Properties (Consolidated Portfolio - 3 PGs)</option>
            {SAMPLE_PROPERTIES_FINANCIAL.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} ({p.location})
              </option>
            ))}
          </select>
        </div>

        {/* Report Customization Modules */}
        <div className="space-y-2.5 pt-1">
          <label className="text-xs font-bold text-slate-700 block">Include Accounting Modules in PDF:</label>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Executive Financial Summary & Occupancy Rate</span>
                <span className="text-[11px] text-slate-500">
                  Gross billed rent, collections, occupancy percentage, and net owner payout.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={includeExpenses}
                onChange={(e) => setIncludeExpenses(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Operating Expenses & Maintenance Deductions</span>
                <span className="text-[11px] text-slate-500">
                  Commercial electricity, Wi-Fi fiber lease, housekeeping, and repairs.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={includeLedger}
                onChange={(e) => setIncludeLedger(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Detailed Tenant Rent & Receipt Ledger</span>
                <span className="text-[11px] text-slate-500">
                  Unit-by-unit resident names, payment modes (UPI/Bank), and receipt numbers.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Audit Compliance Notice */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold block">Chartered Accountant & GST Ready (SAC 997212)</span>
            Generated PDF statements include digital audit verification hash, Section 194-I TDS notes, and compliant
            owner declaration signatures.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-[#a3e635] font-black text-xs rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#a3e635] border-t-transparent rounded-full animate-spin" />
                <span>Compiling PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 stroke-[2]" />
                <span>Download Accounting PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
