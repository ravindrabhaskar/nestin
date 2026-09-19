import React, { useState, useMemo } from 'react';
import { Download, Eye, Plus, Search, Trash2, User, X, CheckCircle2, XCircle } from 'lucide-react';
import { useCRM } from '../../../context/CRMContext';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { VisitorItem, VisitorStatus } from '../../../types/crm';
import { exportToCSV } from '../../../utils/csvExport';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { CreateBookingModal } from './CreateBookingModal';

const STATUS_BADGES: Record<VisitorStatus, { label: string; color: string; bg: string; border: string }> = {
  Scheduled: { label: 'Scheduled', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  Confirmed: { label: 'Confirmed Slot', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  Completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  'No-show': { label: 'No-show', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export const VisitorsView: React.FC<{ onNavigateToLead?: (leadId: string) => void }> = ({ onNavigateToLead }) => {
  const { visitors, updateVisitorStatus, deleteVisitor } = useCRM();
  const { ownerProperties } = usePropertyListing();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeVisitorDetails, setActiveVisitorDetails] = useState<VisitorItem | null>(null);
  const [createBookingVisitor, setCreateBookingVisitor] = useState<VisitorItem | null>(null);

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered Visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        v.visitorName.toLowerCase().includes(q) ||
        v.phone.toLowerCase().includes(q) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        v.propertyName.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q);

      const matchesProperty = selectedPropertyFilter === 'ALL' || v.propertyId === selectedPropertyFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || v.status === selectedStatusFilter;

      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        matchesDate = v.visitDate === todayStr;
      } else if (dateFilter === 'UPCOMING') {
        matchesDate = v.visitDate >= todayStr;
      } else if (dateFilter === 'PAST') {
        matchesDate = v.visitDate < todayStr;
      }

      return matchesQuery && matchesProperty && matchesStatus && matchesDate;
    });
  }, [visitors, searchQuery, selectedPropertyFilter, selectedStatusFilter, dateFilter, todayStr]);

  // Metrics
  const metrics = useMemo(() => {
    const todayVisits = visitors.filter((v) => v.visitDate === todayStr).length;
    const upcoming = visitors.filter(
      (v) => v.visitDate >= todayStr && v.status !== 'Completed' && v.status !== 'Cancelled'
    ).length;
    const completed = visitors.filter((v) => v.status === 'Completed').length;
    const cancelled = visitors.filter((v) => v.status === 'Cancelled').length;
    const noShow = visitors.filter((v) => v.status === 'No-show').length;

    return { todayVisits, upcoming, completed, cancelled, noShow };
  }, [visitors, todayStr]);

  // CSV Export
  const handleExport = () => {
    const data = filteredVisitors.map((v) => ({
      VisitorName: v.visitorName,
      Phone: v.phone,
      Email: v.email || '',
      Property: v.propertyName,
      VisitDate: v.visitDate,
      VisitTime: v.visitTime,
      GroupSize: v.numberOfVisitors,
      Purpose: v.purpose,
      AssignedTo: v.assignedTo,
      Status: v.status,
      LeadID: v.leadId || '',
      CreatedAt: v.createdAt,
    }));
    exportToCSV('nestin_crm_visitors', data);
  };

  const handleStatusChange = (id: string, newStatus: VisitorStatus) => {
    updateVisitorStatus(id, newStatus);
    if (activeVisitorDetails && activeVisitorDetails.id === id) {
      const updated = visitors.find((v) => v.id === id);
      if (updated) setActiveVisitorDetails({ ...updated, status: newStatus });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">Visitors</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635]/20 text-emerald-900 border border-[#a3e635] text-xs font-black">
              {visitors.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage property visits and scheduled tenant enquiries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-heading self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Schedule Visit</span>
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 font-heading">
            Today's Visits
          </span>
          <p className="text-lg font-black text-purple-700 font-heading mt-0.5">{metrics.todayVisits}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 font-heading">Upcoming</span>
          <p className="text-lg font-black text-blue-700 font-heading mt-0.5">{metrics.upcoming}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 font-heading">
            Completed
          </span>
          <p className="text-lg font-black text-emerald-700 font-heading mt-0.5">{metrics.completed}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Cancelled</span>
          <p className="text-lg font-black text-slate-700 font-heading mt-0.5">{metrics.cancelled}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 font-heading">No-show</span>
          <p className="text-lg font-black text-rose-700 font-heading mt-0.5">{metrics.noShow}</p>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitor name, phone, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPropertyFilter}
            onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Properties</option>
            {ownerProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed Slot</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-show">No-show</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today Only</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="PAST">Past Visits</option>
          </select>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Export Visitors CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. TABLE VIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3 px-4">Visitor</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Assigned Host</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No visitor appointments found matching filters.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((visitor) => {
                  const statusConfig = STATUS_BADGES[visitor.status] || STATUS_BADGES.Scheduled;
                  const isToday = visitor.visitDate === todayStr;

                  return (
                    <tr
                      key={visitor.id}
                      onClick={() => setActiveVisitorDetails(visitor)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center border border-purple-200">
                            {visitor.visitorName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{visitor.visitorName}</p>
                            <p className="text-[10px] text-slate-400">{visitor.numberOfVisitors} person(s)</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{visitor.phone}</td>

                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{visitor.propertyName}</p>
                        <p className="text-[10px] text-slate-400">{visitor.preferredRoom || 'General Walkthrough'}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-bold ${isToday ? 'text-purple-700 font-black' : 'text-slate-900'}`}>
                          {visitor.visitDate} {isToday && '(Today)'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">{visitor.visitTime}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-[160px] truncate">{visitor.purpose}</td>

                      <td className="py-3 px-4 text-slate-700">{visitor.assignedTo}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {visitor.status !== 'Completed' && visitor.status !== 'Cancelled' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(visitor.id, 'Completed')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(visitor.id, 'No-show')}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                title="Mark No-show"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveVisitorDetails(visitor)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. VISITOR DETAILS MODAL */}
      {activeVisitorDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#a3e635] text-slate-950 font-black flex items-center justify-center text-base">
                  {activeVisitorDetails.visitorName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black font-heading text-white">{activeVisitorDetails.visitorName}</h3>
                  <p className="text-xs text-slate-400">
                    {activeVisitorDetails.phone} · {activeVisitorDetails.email || 'No email provided'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVisitorDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Status Action Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Current Status:</span>
                  <select
                    value={activeVisitorDetails.status}
                    onChange={(e) => handleStatusChange(activeVisitorDetails.id, e.target.value as VisitorStatus)}
                    className="py-1 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed Slot</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No-show">No-show</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {activeVisitorDetails.leadId && onNavigateToLead && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToLead(activeVisitorDetails.leadId!);
                        setActiveVisitorDetails(null);
                      }}
                      className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>View Connected Lead</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCreateBookingVisitor(activeVisitorDetails);
                    }}
                    className="px-3.5 py-1.5 bg-[#a3e635] text-slate-950 font-black rounded-xl hover:bg-[#92d428] font-heading flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Create Booking</span>
                  </button>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Property</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeVisitorDetails.propertyName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Room Target</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeVisitorDetails.preferredRoom || 'General'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Slot Date & Time</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {activeVisitorDetails.visitDate} @ {activeVisitorDetails.visitTime}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Party Size</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeVisitorDetails.numberOfVisitors} Person(s)</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Assigned Host</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeVisitorDetails.assignedTo}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Purpose</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeVisitorDetails.purpose}</p>
                </div>
              </div>

              {/* Notes */}
              {activeVisitorDetails.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                    Visit Notes & Special Requests
                  </span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                    {activeVisitorDetails.notes}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                  Visit Activity Timeline
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {activeVisitorDetails.timeline.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#a3e635] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-[10px] text-slate-400">
                            {act.date} · {act.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  deleteVisitor(activeVisitorDetails.id);
                  setActiveVisitorDetails(null);
                }}
                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel & Remove Visit</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVisitorDetails(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && <ScheduleVisitModal onClose={() => setShowScheduleModal(false)} />}

      {/* Create Booking Modal linked from visitor */}
      {createBookingVisitor && (
        <CreateBookingModal
          initialLead={{
            id: createBookingVisitor.leadId || `lead-from-vis-${createBookingVisitor.id}`,
            fullName: createBookingVisitor.visitorName,
            phone: createBookingVisitor.phone,
            email: createBookingVisitor.email,
            propertyId: createBookingVisitor.propertyId,
            propertyName: createBookingVisitor.propertyName,
            roomType: createBookingVisitor.preferredRoom || 'Double Sharing',
            budget: 12000,
            source: 'Website',
            stage: 'Interested',
            assignedTo: createBookingVisitor.assignedTo,
            createdAt: createBookingVisitor.createdAt,
            timeline: [],
          }}
          onClose={() => setCreateBookingVisitor(null)}
        />
      )}
    </div>
  );
};
