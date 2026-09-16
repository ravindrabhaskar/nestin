import React, { useState } from 'react';
import {
  TrendingUp,
  FileDown,
  BedDouble,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  IndianRupee,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import {
  exportMonthlyReportPDF,
  SAMPLE_PROPERTIES_FINANCIAL,
  formatCurrency,
} from '../../utils/pdfExport';

interface AnalyticsViewProps {
  ownerName: string;
  ownerEmail: string;
  onOpenExportModal: () => void;
  showToast: (msg: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  ownerName,
  ownerEmail,
  onOpenExportModal,
  showToast,
}) => {
  const [selectedRange, setSelectedRange] = useState<'6m' | '1y' | 'all'>('6m');

  const totalBeds = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.totalBeds, 0);
  const occupiedBeds = SAMPLE_PROPERTIES_FINANCIAL.reduce((acc, p) => acc + p.occupiedBeds, 0);
  const vacantBeds = totalBeds - occupiedBeds;
  const overallOccupancy = ((occupiedBeds / totalBeds) * 100).toFixed(1);

  const monthlyHistory = [
    { month: 'Mar', revenue: 840000, occupancy: 82, leads: 42, bookings: 18 },
    { month: 'Apr', revenue: 875000, occupancy: 84, leads: 48, bookings: 21 },
    { month: 'May', revenue: 910000, occupancy: 86, leads: 54, bookings: 24 },
    { month: 'Jun', revenue: 920000, occupancy: 86, leads: 59, bookings: 26 },
    { month: 'Jul', revenue: 945000, occupancy: 88, leads: 65, bookings: 29 },
    { month: 'Aug', revenue: 963000, occupancy: 89.4, leads: 72, bookings: 32 },
  ];

  const handleExportPDF = () => {
    try {
      exportMonthlyReportPDF({
        month: 'August',
        year: 2026,
        propertyName: 'All Properties (Consolidated)',
        ownerName: ownerName || 'Paritala Venkata Vaibhav',
        ownerEmail: ownerEmail || 'owner.partner@nestin.io',
        reportType: 'occupancy',
        includeLedger: true,
        includeExpenses: true,
      });
      showToast('Exported August 2026 Analytics & Occupancy PDF!');
    } catch (err) {
      showToast('Error exporting PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Top Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635]/20 text-slate-900 font-extrabold text-[10px] uppercase font-heading">
                Performance Intelligence
              </span>
              <span className="text-xs text-slate-500 font-semibold">Real-Time Occupancy & Yield</span>
            </div>
            <h2 className="text-2xl font-black font-heading text-slate-900 mt-1">
              Portfolio Analytics & Occupancy Insights
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Historical revenue growth, bed utilization, and tenant inquiry conversion metrics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#a3e635] font-black text-xs rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4 stroke-[2]" />
              <span>Export Analytics PDF</span>
            </button>

            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-bold text-xs rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Select Statement Month</span>
            </button>
          </div>
        </div>

        {/* Key Rate Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Portfolio Occupancy</div>
            <div className="text-2xl font-black text-slate-900 font-heading mt-0.5">
              {overallOccupancy}%
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+7.4% vs March 2026</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Beds Occupied</div>
            <div className="text-2xl font-black text-slate-900 font-heading mt-0.5">
              {occupiedBeds} / {totalBeds}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {vacantBeds} Vacant Beds Available
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Avg Yield Per Bed</div>
            <div className="text-2xl font-black text-slate-900 font-heading mt-0.5">
              ₹10,820
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
              +₹450 YoY Growth
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Lead-to-Move-In</div>
            <div className="text-2xl font-black text-slate-900 font-heading mt-0.5">
              44.4%
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Avg 3.2 Days Decision Cycle
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Occupancy Trend Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Revenue & Occupancy Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Monthly Revenue Growth Trend (FY 26-27)
              </h3>
              <p className="text-xs text-slate-500">
                Gross rent billed and realized revenue across all 3 properties
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              +14.6% 6-Mo Growth
            </span>
          </div>

          {/* Bar Chart Representation */}
          <div className="pt-4 pb-2 space-y-4">
            <div className="grid grid-cols-6 gap-3 items-end h-48 border-b border-slate-100 pb-3">
              {monthlyHistory.map((item, idx) => {
                const maxRev = 1000000;
                const heightPercent = Math.round((item.revenue / maxRev) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{(item.revenue / 100000).toFixed(2)}L
                    </div>
                    <div className="w-full max-w-[40px] bg-slate-100 rounded-xl overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-xl transition-all duration-500 ${
                          idx === monthlyHistory.length - 1
                            ? 'bg-[#a3e635] shadow-xs'
                            : 'bg-slate-900 group-hover:bg-slate-800'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600">{item.month}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-slate-900 rounded-sm" />
                  <span>Historical Months</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#a3e635] rounded-sm" />
                  <span>Current Statement (August)</span>
                </div>
              </div>
              <span className="font-semibold text-slate-700">Total 6M Volume: ₹54.53 Lakhs</span>
            </div>
          </div>
        </div>

        {/* Occupancy Utilization Breakdown */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 font-heading">
              Bed Occupancy Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Live capacity breakdown across sharing types
            </p>
          </div>

          <div className="space-y-3">
            {[
              { type: 'Single Private Rooms', occupied: 18, total: 20, pct: 90, color: 'bg-slate-900' },
              { type: 'Double Sharing Rooms', occupied: 44, total: 48, pct: 91.6, color: 'bg-[#a3e635]' },
              { type: 'Triple Sharing Rooms', occupied: 27, total: 32, pct: 84.3, color: 'bg-emerald-500' },
            ].map((room, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-800">{room.type}</span>
                  <span className="font-extrabold text-slate-900">{room.occupied}/{room.total} Beds</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${room.pct}%` }}
                    className={`h-full rounded-full ${room.color}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Utilization: {room.pct.toFixed(1)}%</span>
                  <span>{room.total - room.occupied} Vacant</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenExportModal}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Generate Full Occupancy PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
