import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Layers,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  IndianRupee,
  Eye,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  ListFilter,
  Flame,
  Check,
  X,
} from 'lucide-react';
import { useCRM } from '../../../context/CRMContext';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { LeadItem, LeadStage, LeadSource } from '../../../types/crm';
import { exportToCSV } from '../../../utils/csvExport';
import { AddLeadModal } from './AddLeadModal';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { CreateBookingModal } from './CreateBookingModal';

const STAGES: { key: LeadStage; label: string; color: string; bg: string; border: string }[] = [
  { key: 'New', label: 'New', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'Contacted', label: 'Contacted', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'Visit Scheduled', label: 'Visit Scheduled', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'Visited', label: 'Visited', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'Interested', label: 'Interested', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { key: 'Booking Requested', label: 'Booking Requested', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'Converted', label: 'Converted', color: 'text-green-800', bg: 'bg-[#a3e635]/20', border: 'border-[#a3e635]' },
  { key: 'Lost', label: 'Lost', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
];

export const LeadsView: React.FC = () => {
  const {
    leads,
    updateLeadStage,
    deleteLead,
    addLeadNote,
    logLeadContact,
    importLeads,
  } = useCRM();
  const { ownerProperties } = usePropertyListing();

  // View state
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeLeadDetails, setActiveLeadDetails] = useState<LeadItem | null>(null);
  const [scheduleVisitLead, setScheduleVisitLead] = useState<LeadItem | null>(null);
  const [createBookingLead, setCreateBookingLead] = useState<LeadItem | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Bulk CSV sample state
  const [importText, setImportText] = useState('');

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        lead.fullName.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        lead.propertyName.toLowerCase().includes(q) ||
        lead.roomType.toLowerCase().includes(q);

      const matchesProperty =
        selectedPropertyFilter === 'ALL' || lead.propertyId === selectedPropertyFilter;
      const matchesStage = selectedStageFilter === 'ALL' || lead.stage === selectedStageFilter;
      const matchesSource =
        selectedSourceFilter === 'ALL' || lead.source === selectedSourceFilter;

      return matchesQuery && matchesProperty && matchesStage && matchesSource;
    });
  }, [leads, searchQuery, selectedPropertyFilter, selectedStageFilter, selectedSourceFilter]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.stage === 'New').length;
    const contacted = leads.filter((l) => l.stage === 'Contacted').length;
    const visitScheduled = leads.filter((l) => l.stage === 'Visit Scheduled').length;
    const interested = leads.filter((l) => l.stage === 'Interested' || l.stage === 'Visited').length;
    const converted = leads.filter((l) => l.stage === 'Converted').length;
    const lost = leads.filter((l) => l.stage === 'Lost').length;
    return { total, newCount, contacted, visitScheduled, interested, converted, lost };
  }, [leads]);

  // CSV Export
  const handleExport = () => {
    const exportData = filteredLeads.map((l) => ({
      ID: l.id,
      FullName: l.fullName,
      Phone: l.phone,
      Email: l.email || '',
      Property: l.propertyName,
      RoomType: l.roomType,
      Budget: l.budget,
      Source: l.source,
      Stage: l.stage,
      AssignedTo: l.assignedTo,
      LastContact: l.lastContactDate || '',
      NextFollowUp: l.nextFollowUpDate || '',
      CreatedAt: l.createdAt,
    }));
    exportToCSV('nestin_crm_leads', exportData);
  };

  // CSV Import handler
  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n');
    const newItems: any[] = [];

    lines.forEach((line) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        newItems.push({
          fullName: parts[0],
          phone: parts[1],
          email: parts[2] || undefined,
          propertyName: parts[3] || ownerProperties[0]?.name || 'Banyan Stay Premium',
          propertyId: ownerProperties[0]?.id || 'prop-banyan-premium',
          roomType: parts[4] || 'Single Sharing',
          budget: Number(parts[5]) || 12000,
          source: (parts[6] as LeadSource) || 'Website',
          stage: 'New' as LeadStage,
          assignedTo: 'Ramesh (Operations)',
          notes: 'Imported via CSV batch.',
        });
      }
    });

    if (newItems.length > 0) {
      importLeads(newItems);
      setImportText('');
      setShowImportModal(false);
    }
  };

  const handleAddNote = (leadId: string) => {
    if (!newNoteInput.trim()) return;
    addLeadNote(leadId, newNoteInput.trim());
    setNewNoteInput('');
    // Refresh active modal lead
    const updated = leads.find((l) => l.id === leadId);
    if (updated) setActiveLeadDetails(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">Leads</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635]/20 text-emerald-900 border border-[#a3e635] text-xs font-black">
              {leads.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Track enquiries and convert prospects into bookings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Import Leads</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-heading"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">Total</span>
          <p className="text-lg font-black text-slate-900 font-heading mt-0.5">{metrics.total}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 font-heading">New Leads</span>
          <p className="text-lg font-black text-blue-700 font-heading mt-0.5">{metrics.newCount}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 font-heading">Contacted</span>
          <p className="text-lg font-black text-indigo-700 font-heading mt-0.5">{metrics.contacted}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 font-heading">Visits</span>
          <p className="text-lg font-black text-purple-700 font-heading mt-0.5">{metrics.visitScheduled}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 font-heading">Interested</span>
          <p className="text-lg font-black text-cyan-700 font-heading mt-0.5">{metrics.interested}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 font-heading">Converted</span>
          <p className="text-lg font-black text-emerald-700 font-heading mt-0.5">{metrics.converted}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 font-heading">Lost</span>
          <p className="text-lg font-black text-rose-700 font-heading mt-0.5">{metrics.lost}</p>
        </div>
      </div>

      {/* 3. TOOLBAR & CONTROLS */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, phone, property..."
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
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Sources</option>
            <option value="Nestin">Nestin</option>
            <option value="Website">Website</option>
            <option value="Phone">Phone</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Referral">Referral</option>
          </select>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Mode switch */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'pipeline' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* 4. PIPELINE OR TABLE VIEW */}
      {viewMode === 'pipeline' ? (
        /* PIPELINE KANBAN BOARD */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-[1280px]">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className="flex-1 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-w-[220px]"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className={`text-xs font-black font-heading ${stage.color}`}>{stage.label}</span>
                    <span className="w-5 h-5 rounded-full bg-white text-slate-700 text-[11px] font-black flex items-center justify-center shadow-xs border border-slate-200">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 flex-1 min-h-[300px]">
                    {stageLeads.length === 0 ? (
                      <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[11px]">
                        No leads in this stage
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setActiveLeadDetails(lead)}
                          className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{lead.fullName}</h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {lead.source}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <p className="truncate font-medium text-slate-700">{lead.propertyName}</p>
                            <p className="text-[10px] text-slate-400">{lead.roomType}</p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                            <span className="font-black text-slate-900">₹{lead.budget.toLocaleString('en-IN')}/mo</span>
                            <span className="text-[10px] text-slate-400">{lead.assignedTo.split(' ')[0]}</span>
                          </div>

                          {/* Quick action strip */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between pt-1 gap-1"
                          >
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => logLeadContact(lead.id, 'call')}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                                title="Call"
                              >
                                <Phone className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => logLeadContact(lead.id, 'whatsapp')}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setScheduleVisitLead(lead)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-purple-600"
                                title="Schedule Visit"
                              >
                                <Calendar className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Stage move dropdown */}
                            <select
                              value={lead.stage}
                              onChange={(e) => updateLeadStage(lead.id, e.target.value as LeadStage)}
                              className="text-[10px] py-0.5 px-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700"
                            >
                              {STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  → {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Interested Property</th>
                  <th className="py-3 px-4">Room & Budget</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Assigned Host</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No leads match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const stageConfig = STAGES.find((s) => s.key === lead.stage) || STAGES[0];
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setActiveLeadDetails(lead)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                              {lead.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{lead.fullName}</p>
                              <p className="text-[10px] text-slate-400">{lead.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">{lead.phone}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{lead.propertyName}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">₹{lead.budget.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block">{lead.roomType}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {lead.source}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}
                          >
                            {lead.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{lead.assignedTo}</td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => logLeadContact(lead.id, 'whatsapp')}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-emerald-600"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduleVisitLead(lead)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-purple-600"
                              title="Schedule Visit"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCreateBookingLead(lead)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-emerald-600"
                              title="Create Booking"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveLeadDetails(lead)}
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
      )}

      {/* 5. LEAD DETAILS DRAWER / MODAL */}
      {activeLeadDetails && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#a3e635] text-slate-950 font-black flex items-center justify-center text-base">
                  {activeLeadDetails.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black font-heading text-white">{activeLeadDetails.fullName}</h3>
                  <p className="text-xs text-slate-400">{activeLeadDetails.phone} · {activeLeadDetails.email || 'No email'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeadDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Quick Actions Ribbon */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => logLeadContact(activeLeadDetails.id, 'call')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => logLeadContact(activeLeadDetails.id, 'whatsapp')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleVisitLead(activeLeadDetails);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Schedule Visit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateBookingLead(activeLeadDetails);
                  }}
                  className="px-3 py-1.5 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Create Booking</span>
                </button>
              </div>

              {/* Lead Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Property</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeLeadDetails.propertyName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Room Preference</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeLeadDetails.roomType}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Budget</span>
                  <p className="font-bold text-slate-900 mt-0.5">₹{activeLeadDetails.budget.toLocaleString('en-IN')}/mo</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Source</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeLeadDetails.source}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Stage</span>
                  <select
                    value={activeLeadDetails.stage}
                    onChange={(e) => {
                      updateLeadStage(activeLeadDetails.id, e.target.value as LeadStage);
                      setActiveLeadDetails({ ...activeLeadDetails, stage: e.target.value as LeadStage });
                    }}
                    className="w-full mt-0.5 py-0.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Assigned To</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeLeadDetails.assignedTo}</p>
                </div>
              </div>

              {/* Notes & Add Note */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                  Requirements & Notes
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 whitespace-pre-line">
                  {activeLeadDetails.notes || 'No notes added yet.'}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new follow-up note..."
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddNote(activeLeadDetails.id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                  Activity Timeline
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeLeadDetails.timeline.map((act) => (
                    <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#a3e635] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-[10px] text-slate-400">{act.date} · {act.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  deleteLead(activeLeadDetails.id);
                  setActiveLeadDetails(null);
                }}
                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLeadDetails(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. IMPORT LEADS MODAL */}
      {showImportModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#a3e635]" />
                <h3 className="text-sm font-black font-heading text-white">Import Leads CSV</h3>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">
                Paste comma-separated rows in the following format:
                <br />
                <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-mono text-slate-800">
                  FullName, Phone, Email, Property, RoomType, Budget, Source
                </code>
              </p>
              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Manish Rao, +91 98451 99001, manish@tech.com, Banyan Stay Premium, Double Sharing, 12000, Website&#10;Kavita Sen, +91 97220 11223, kavita@wipro.com, Banyan Stay Premium, Single Sharing, 16000, Nestin"
                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="px-5 py-2 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-heading font-black text-xs rounded-xl"
                >
                  Parse & Import Leads
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}

      {/* Schedule Visit Modal */}
      {scheduleVisitLead && (
        <ScheduleVisitModal
          initialLead={scheduleVisitLead}
          onClose={() => setScheduleVisitLead(null)}
        />
      )}

      {/* Create Booking Modal */}
      {createBookingLead && (
        <CreateBookingModal
          initialLead={createBookingLead}
          onClose={() => setCreateBookingLead(null)}
        />
      )}
    </div>
  );
};
