import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  CreditCard,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Receipt,
  Printer,
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import {
  exportMonthlyReportPDF,
  SAMPLE_PROPERTIES_FINANCIAL,
  SAMPLE_TRANSACTIONS,
  SAMPLE_EXPENSES,
  formatCurrency,
} from '../../utils/pdfExport';

interface ReportsViewProps {
  ownerName: string;
  ownerEmail: string;
  onOpenExportModal: () => void;
  showToast: (msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  ownerName,
  ownerEmail,
  onOpenExportModal,
  showToast,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('August');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState<'all' | 'revenue' | 'occupancy' | 'expenses'>('all');

  const totalBilled = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.monthlyRevenueBilled, 0);
  const totalCollected = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.revenueCollected, 0);
  const totalExpenses = SAMPLE_EXPENSES.reduce((acc, e) => acc + e.amount, 0);
  const totalBeds = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.totalBeds, 0);
  const occupiedBeds = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.occupiedBeds, 0);
  const netPayout = totalCollected - totalExpenses;

  const quickExport = (month: string, year: number) => {
    try {
      exportMonthlyReportPDF({
        month,
        year,
        propertyName: 'All Properties (Consolidated)',
        ownerName: ownerName || 'Property Owner',
        ownerEmail: ownerEmail || 'owner.partner@nestin.io',
        reportType: 'full',
        includeLedger: true,
        includeExpenses: true,
      });
      showToast(`Exported ${month} ${year} PDF Statement!`);
    } catch (err) {
      showToast('Error generating PDF report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Reports Header & Quick Export Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635]/20 text-slate-900 font-extrabold text-[10px] uppercase font-heading">
                Accounting & Compliance
              </span>
              <span className="text-xs text-slate-500 font-semibold">SAC 997212</span>
            </div>
            <h2 className="text-2xl font-black font-heading text-slate-900 mt-1">
              Monthly Financial & Occupancy Reports
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Download GST-ready PDF audit statements, tenant rent ledgers, and property occupancy files.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => quickExport('August', 2026)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#a3e635] font-black text-xs rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4 stroke-[2]" />
              <span>Export August 2026 PDF</span>
            </button>

            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-bold text-xs rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Custom PDF Builder</span>
            </button>
          </div>
        </div>

        {/* 4 Quick Executive Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Billed Rent</div>
            <div className="text-xl font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(totalBilled)}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
              3 Properties Active
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Realized Collections</div>
            <div className="text-xl font-black text-emerald-700 font-heading mt-0.5">
              {formatCurrency(totalCollected)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              95.3% Collection Efficiency
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Overall Occupancy</div>
            <div className="text-xl font-black text-slate-900 font-heading mt-0.5">
              {((occupiedBeds / totalBeds) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {occupiedBeds} / {totalBeds} Total Beds
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Net Owner Cash Flow</div>
            <div className="text-xl font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(netPayout)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              After ₹{(totalExpenses / 1000).toFixed(0)}k Deductions
            </div>
          </div>
        </div>
      </div>

      {/* Available Monthly Statements Cards (1-Click PDF Download) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 font-heading">
              Ready-to-Download Monthly Statements
            </h3>
            <p className="text-xs text-slate-500">
              One-click PDF download for accounting, IT return filing, and CA verification
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            FY 2026 - 2027
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              month: 'August',
              year: 2026,
              badge: 'Current Cycle',
              revenue: '₹9,63,000',
              occupancy: '89.4%',
              beds: '89/100 Beds',
              status: 'Active Audit',
              isCurrent: true,
            },
            {
              month: 'July',
              year: 2026,
              badge: 'Settled & Verified',
              revenue: '₹9,45,000',
              occupancy: '88.0%',
              beds: '88/100 Beds',
              status: 'CA Verified',
              isCurrent: false,
            },
            {
              month: 'June',
              year: 2026,
              badge: 'Settled & Verified',
              revenue: '₹9,20,000',
              occupancy: '86.0%',
              beds: '86/100 Beds',
              status: 'CA Verified',
              isCurrent: false,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                item.isCurrent
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                      item.isCurrent
                        ? 'bg-[#a3e635] text-slate-950'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <h4 className="text-lg font-black font-heading">
                    {item.month} {item.year}
                  </h4>
                  <div
                    className={`text-xs mt-0.5 ${
                      item.isCurrent ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Statement & Ledger Report
                  </div>
                </div>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    item.isCurrent
                      ? 'bg-white/10 text-[#a3e635]'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileText className="w-5 h-5 stroke-[2]" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200/20">
                <div className="flex justify-between">
                  <span className={item.isCurrent ? 'text-slate-400' : 'text-slate-500'}>
                    Total Revenue:
                  </span>
                  <span className="font-bold">{item.revenue}</span>
                </div>
                <div className="flex justify-between">
                  <span className={item.isCurrent ? 'text-slate-400' : 'text-slate-500'}>
                    Occupancy Rate:
                  </span>
                  <span className="font-bold">{item.occupancy}</span>
                </div>
                <div className="flex justify-between">
                  <span className={item.isCurrent ? 'text-slate-400' : 'text-slate-500'}>
                    Occupied Capacity:
                  </span>
                  <span className="font-bold">{item.beds}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => quickExport(item.month, item.year)}
                className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  item.isCurrent
                    ? 'bg-[#a3e635] text-slate-950 hover:bg-[#92d428]'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <FileDown className="w-3.5 h-3.5 stroke-[2]" />
                <span>Download PDF Statement</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Property-Level Summary Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 font-heading">
              Property Performance Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Live occupancy and rent collection numbers for August 2026
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenExportModal}
            className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
          >
            <span>Export Table as PDF</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                <th className="p-3 pl-4 rounded-l-xl">Property Name</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-center">Occupancy</th>
                <th className="p-3 text-center">Rate</th>
                <th className="p-3 text-right">Billed (INR)</th>
                <th className="p-3 text-right">Collected (INR)</th>
                <th className="p-3 text-right">Expenses (INR)</th>
                <th className="p-3 pr-4 text-right rounded-r-xl">Net Payout (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {SAMPLE_PROPERTIES_FINANCIAL.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 pl-4 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3 text-slate-500">{p.location}</td>
                  <td className="p-3 text-center font-semibold">
                    {p.occupiedBeds} / {p.totalBeds} Beds
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 bg-[#ecfccb] text-[#3f6212] rounded-full font-bold text-[10px]">
                      {p.occupancyRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-right">{formatCurrency(p.monthlyRevenueBilled)}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">
                    {formatCurrency(p.revenueCollected)}
                  </td>
                  <td className="p-3 text-right text-rose-600 font-semibold">
                    {formatCurrency(p.expenses)}
                  </td>
                  <td className="p-3 pr-4 text-right font-black text-slate-950">
                    {formatCurrency(p.netPayout)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100/70 font-black text-slate-950 text-xs">
                <td className="p-3 pl-4 rounded-l-xl">CONSOLIDATED TOTALS</td>
                <td className="p-3">All Properties</td>
                <td className="p-3 text-center">{occupiedBeds} / {totalBeds} Beds</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 bg-slate-900 text-[#a3e635] rounded-full font-bold text-[10px]">
                    {((occupiedBeds / totalBeds) * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="p-3 text-right">{formatCurrency(totalBilled)}</td>
                <td className="p-3 text-right text-emerald-800">{formatCurrency(totalCollected)}</td>
                <td className="p-3 text-right text-rose-700">{formatCurrency(totalExpenses)}</td>
                <td className="p-3 pr-4 text-right text-slate-950 rounded-r-xl">
                  {formatCurrency(netPayout)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recent Ledger Transactions Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 font-heading">
              Recent Tenant Rent Receipts & Payments
            </h3>
            <p className="text-xs text-slate-500">
              Live settlement log included in the monthly accounting statement
            </p>
          </div>
          <button
            type="button"
            onClick={() => quickExport('August', 2026)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Ledger PDF</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                <th className="p-3 pl-4 rounded-l-xl">Receipt #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Tenant Name</th>
                <th className="p-3">Unit / Bed</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 pr-4 text-right rounded-r-xl">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {SAMPLE_TRANSACTIONS.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 pl-4 font-mono font-bold text-slate-800">{t.receiptNo}</td>
                  <td className="p-3 text-slate-500">{t.date}</td>
                  <td className="p-3 font-bold text-slate-900">{t.tenantName}</td>
                  <td className="p-3 text-slate-600">{t.unit}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px]">
                      {t.paymentMode}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        t.status === 'Settled'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : t.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right font-black text-slate-950">
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
