import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Users,
  X,
  XCircle,
  Building2,
  Bed,
  FileCheck,
  AlertTriangle,
  CreditCard,
  History,
} from 'lucide-react';
import { useCRM } from '../../../context/CRMContext';
import { usePropertyListing } from '../../../context/PropertyListingContext';
import { CustomerItem, CustomerTenantStatus, PaymentStatus } from '../../../types/crm';
import { exportToCSV } from '../../../utils/csvExport';
import { CustomerReceiptModal } from './CustomerReceiptModal';

const TENANT_STATUS_BADGES: Record<CustomerTenantStatus, { label: string; color: string; bg: string; border: string }> = {
  Active: { label: 'Active Tenant', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Upcoming: { label: 'Upcoming Move-in', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  Vacating: { label: 'Vacating Soon', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  Inactive: { label: 'Past Resident', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
};

const PAYMENT_BADGES: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  Paid: { label: 'Paid Up-to-date', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  Partial: { label: 'Partial Due', color: 'text-amber-700', bg: 'bg-amber-50' },
  Pending: { label: 'Rent Pending', color: 'text-rose-700', bg: 'bg-rose-50' },
  Overdue: { label: 'Overdue', color: 'text-red-800', bg: 'bg-red-100' },
  Refunded: { label: 'Refunded', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export const CustomersView: React.FC<{ initialCustomerId?: string | null }> = ({
  initialCustomerId,
}) => {
  const {
    customers,
    updateCustomer,
    addCustomerDocument,
    verifyCustomerDocument,
    addCustomerPayment,
    recordCustomerMoveOut,
    deleteCustomer,
  } = useCRM();
  const { ownerProperties } = usePropertyListing();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('ALL');
  const [selectedTenantStatusFilter, setSelectedTenantStatusFilter] = useState('ALL');
  const [selectedPaymentStatusFilter, setSelectedPaymentStatusFilter] = useState('ALL');

  // Active customer drawer/modal
  const [activeCustomer, setActiveCustomer] = useState<CustomerItem | null>(() => {
    if (initialCustomerId) {
      return customers.find((c) => c.id === initialCustomerId) || null;
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'payments' | 'timeline'>('overview');

  // Sub modals inside profile
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Credit Card' | 'Cash' | 'Auto-Debit'>('UPI');
  const [paymentDesc, setPaymentDesc] = useState('Monthly PG Accommodation Rent');

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<'govt_id' | 'address_proof' | 'employment_proof' | 'agreement' | 'other'>('govt_id');
  const [docNumber, setDocNumber] = useState('');

  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [moveOutReason, setMoveOutReason] = useState('End of lease tenure');

  const [receiptPayment, setReceiptPayment] = useState<{ customer: CustomerItem; payment: any } | null>(null);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.propertyName.toLowerCase().includes(q) ||
        c.roomName.toLowerCase().includes(q) ||
        c.bedNumber.toLowerCase().includes(q);

      const matchesProperty = selectedPropertyFilter === 'ALL' || c.propertyId === selectedPropertyFilter;
      const matchesTenantStatus = selectedTenantStatusFilter === 'ALL' || c.tenantStatus === selectedTenantStatusFilter;
      const matchesPayment = selectedPaymentStatusFilter === 'ALL' || c.paymentStatus === selectedPaymentStatusFilter;

      return matchesQuery && matchesProperty && matchesTenantStatus && matchesPayment;
    });
  }, [customers, searchQuery, selectedPropertyFilter, selectedTenantStatusFilter, selectedPaymentStatusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.tenantStatus === 'Active').length;
    const upcoming = customers.filter((c) => c.tenantStatus === 'Upcoming').length;
    const vacating = customers.filter((c) => c.tenantStatus === 'Vacating').length;
    const past = customers.filter((c) => c.tenantStatus === 'Inactive').length;
    const outstanding = customers.filter((c) => c.paymentStatus === 'Pending' || c.paymentStatus === 'Overdue').length;

    return { total, active, upcoming, vacating, past, outstanding };
  }, [customers]);

  // CSV Export
  const handleExport = () => {
    const data = filteredCustomers.map((c) => ({
      FullName: c.fullName,
      Phone: c.phone,
      Email: c.email,
      Property: c.propertyName,
      Room: c.roomName,
      Bed: c.bedNumber,
      MoveInDate: c.moveInDate,
      MonthlyRent: c.monthlyRent,
      Deposit: c.securityDeposit,
      TenantStatus: c.tenantStatus,
      PaymentStatus: c.paymentStatus,
      EmergencyContact: c.emergencyContact ? `${c.emergencyContact.name} (${c.emergencyContact.phone})` : '',
    }));
    exportToCSV('nestin_crm_customers', data);
  };

  const handleLogPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !paymentAmount) return;
    addCustomerPayment(activeCustomer.id, {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      propertyId: activeCustomer.propertyId,
      propertyName: activeCustomer.propertyName,
      rentAmount: Number(paymentAmount) || activeCustomer.monthlyRent,
      additionalCharges: 0,
      totalAmount: Number(paymentAmount) || activeCustomer.monthlyRent,
      paymentMethod,
      status: 'Completed',
      description: paymentDesc,
      paymentId: `PAY-MAN-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    const updated = customers.find((c) => c.id === activeCustomer.id);
    if (updated) setActiveCustomer(updated);
    setShowLogPaymentModal(false);
    setPaymentAmount('');
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !docName.trim()) return;
    addCustomerDocument(activeCustomer.id, {
      name: docName.trim(),
      type: docType,
      documentNumber: docNumber.trim() || undefined,
      fileName: `${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSize: '1.5 MB',
      verificationStatus: 'verified',
    });

    const updated = customers.find((c) => c.id === activeCustomer.id);
    if (updated) setActiveCustomer(updated);
    setShowAddDocModal(false);
    setDocName('');
    setDocNumber('');
  };

  const handleConfirmMoveOut = () => {
    if (!activeCustomer) return;
    recordCustomerMoveOut(activeCustomer.id, moveOutDate, moveOutReason);
    const updated = customers.find((c) => c.id === activeCustomer.id);
    if (updated) setActiveCustomer(updated);
    setShowMoveOutModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">Customers</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#a3e635]/20 text-emerald-900 border border-[#a3e635] text-xs font-black">
              {customers.length} Tenants
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage tenants and customers across your properties.
          </p>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">Total</span>
          <p className="text-lg font-black text-slate-900 font-heading mt-0.5">{metrics.total}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 font-heading">Active</span>
          <p className="text-lg font-black text-emerald-700 font-heading mt-0.5">{metrics.active}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 font-heading">Upcoming</span>
          <p className="text-lg font-black text-blue-700 font-heading mt-0.5">{metrics.upcoming}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 font-heading">Vacating</span>
          <p className="text-lg font-black text-amber-700 font-heading mt-0.5">{metrics.vacating}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Past / Inactive</span>
          <p className="text-lg font-black text-slate-700 font-heading mt-0.5">{metrics.past}</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 font-heading">Dues Pending</span>
          <p className="text-lg font-black text-rose-700 font-heading mt-0.5">{metrics.outstanding}</p>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant name, phone, room, bed..."
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
            value={selectedTenantStatusFilter}
            onChange={(e) => setSelectedTenantStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Tenant Statuses</option>
            <option value="Active">Active Tenants</option>
            <option value="Upcoming">Upcoming Move-ins</option>
            <option value="Vacating">Vacating Soon</option>
            <option value="Inactive">Past Residents</option>
          </select>

          <select
            value={selectedPaymentStatusFilter}
            onChange={(e) => setSelectedPaymentStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Export Customers CSV"
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
                <th className="py-3 px-4">Customer / Tenant</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Room & Bed</th>
                <th className="py-3 px-4">Move-in Date</th>
                <th className="py-3 px-4">Monthly Rent</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No customers found matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const statusConfig = TENANT_STATUS_BADGES[customer.tenantStatus] || TENANT_STATUS_BADGES.Active;
                  const payConfig = PAYMENT_BADGES[customer.paymentStatus] || PAYMENT_BADGES.Paid;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setActiveCustomer(customer)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-700">
                            {customer.avatar ? (
                              <img
                                src={customer.avatar}
                                alt={customer.fullName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              customer.fullName.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{customer.fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{customer.phone}</td>

                      <td className="py-3 px-4 font-medium text-slate-800">{customer.propertyName}</td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{customer.roomName}</p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-bold">
                          {customer.bedNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">{customer.moveInDate}</td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{customer.monthlyRent.toLocaleString('en-IN')}/mo
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${payConfig.bg} ${payConfig.color}`}>
                          {customer.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCustomer(customer);
                              setActiveTab('payments');
                            }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-emerald-600"
                            title="Payment History"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCustomer(customer);
                              setActiveTab('documents');
                            }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600"
                            title="Documents"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCustomer(customer);
                              setActiveTab('overview');
                            }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="View Profile"
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

      {/* 5. CUSTOMER PROFILE DRAWER / MODAL */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Top Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-[#a3e635] overflow-hidden flex items-center justify-center font-black text-white text-base">
                  {activeCustomer.avatar ? (
                    <img
                      src={activeCustomer.avatar}
                      alt={activeCustomer.fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    activeCustomer.fullName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black font-heading text-white">{activeCustomer.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#a3e635] text-slate-950 text-[10px] font-black uppercase">
                      {activeCustomer.tenantStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {activeCustomer.phone} · {activeCustomer.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-[#a3e635] text-slate-950 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Stay Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'documents'
                    ? 'border-[#a3e635] text-slate-950 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Documents</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {activeCustomer.documents.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'payments'
                    ? 'border-[#a3e635] text-slate-950 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Payments & Receipts</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {activeCustomer.paymentHistory.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'border-[#a3e635] text-slate-950 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Activity Timeline
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Property</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeCustomer.propertyName}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Room & Sharing</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeCustomer.roomName}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Bed Number</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeCustomer.bedNumber}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Move-in Date</span>
                      <p className="font-bold text-slate-900 mt-0.5">{activeCustomer.moveInDate}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Monthly Rent</span>
                      <p className="font-bold text-slate-900 mt-0.5">₹{activeCustomer.monthlyRent.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-black">Security Deposit</span>
                      <p className="font-bold text-slate-900 mt-0.5">₹{activeCustomer.securityDeposit.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                      Emergency Contact Details
                    </div>
                    {activeCustomer.emergencyContact ? (
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{activeCustomer.emergencyContact.name}</p>
                          <p className="text-slate-500">Relation: {activeCustomer.emergencyContact.relation}</p>
                        </div>
                        <p className="font-mono font-bold text-slate-800">{activeCustomer.emergencyContact.phone}</p>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">No emergency contact provided yet.</p>
                    )}
                  </div>

                  {/* Move-out Action */}
                  {activeCustomer.tenantStatus === 'Active' && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-amber-950">Tenant Move-out Management</p>
                        <p className="text-[11px] text-amber-800">
                          Process checkout, release bed {activeCustomer.bedNumber} & archive resident.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMoveOutModal(true)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Record Move-out
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. DOCUMENTS TAB */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Resident KYC & Leases</span>
                    <button
                      type="button"
                      onClick={() => setShowAddDocModal(true)}
                      className="px-3 py-1.5 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 rounded-xl font-black flex items-center gap-1.5 cursor-pointer font-heading"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {activeCustomer.documents.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        No documents uploaded for this resident.
                      </div>
                    ) : (
                      activeCustomer.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{doc.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {doc.fileName} · {doc.fileSize} · Uploaded: {doc.uploadedAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                doc.verificationStatus === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {doc.verificationStatus === 'verified' ? 'Verified' : 'In Review'}
                            </span>
                            {doc.verificationStatus !== 'verified' && (
                              <button
                                type="button"
                                onClick={() => verifyCustomerDocument(activeCustomer.id, doc.id, 'verified')}
                                className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                title="Approve & Verify"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 3. PAYMENTS TAB */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Payment Transactions & Receipts</span>
                    <button
                      type="button"
                      onClick={() => setShowLogPaymentModal(true)}
                      className="px-3 py-1.5 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 rounded-xl font-black flex items-center gap-1.5 cursor-pointer font-heading"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Payment</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {activeCustomer.paymentHistory.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        No payment records logged yet.
                      </div>
                    ) : (
                      activeCustomer.paymentHistory.map((pay) => (
                        <div
                          key={pay.id}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{pay.description}</p>
                              <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 text-[10px] font-mono">
                                #{pay.receiptNumber}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {pay.date} · Method: <span className="font-bold">{pay.paymentMethod}</span> · ID: {pay.paymentId}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p className="font-black text-slate-900 text-sm">
                                ₹{pay.totalAmount.toLocaleString('en-IN')}
                              </p>
                              <span className="text-[10px] text-emerald-700 font-bold">{pay.status}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReceiptPayment({ customer: activeCustomer, payment: pay })}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-slate-600" />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 4. TIMELINE TAB */}
              {activeTab === 'timeline' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                    Resident Activity Timeline
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeCustomer.timeline.map((act) => (
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
              )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  deleteCustomer(activeCustomer.id);
                  setActiveCustomer(null);
                }}
                className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Resident Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCustomer(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {showLogPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black font-heading text-slate-900">Record Rent / Deposit Payment</h3>
            <form onSubmit={handleLogPaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder={String(activeCustomer?.monthlyRent || 12000)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#a3e635]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank NEFT / IMPS</option>
                  <option value="Auto-Debit">Auto-Debit e-NACH</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Cash">Cash to Caretaker</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Description / Month</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#a3e635] text-slate-950 text-xs font-black font-heading rounded-xl"
                >
                  Save & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black font-heading text-slate-900">Upload Resident Document</h3>
            <form onSubmit={handleAddDocSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aadhaar Card / Rental Agreement"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                >
                  <option value="govt_id">Government ID (Aadhaar/PAN/Passport)</option>
                  <option value="agreement">Rental Agreement (Signed)</option>
                  <option value="employment_proof">Employment / College ID</option>
                  <option value="address_proof">Permanent Address Proof</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Document / ID Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. XXXX-XXXX-8921"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#a3e635] text-slate-950 text-xs font-black font-heading rounded-xl"
                >
                  Upload & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move out modal */}
      {showMoveOutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-black font-heading text-slate-900">Record Tenant Move-out</h3>
            <p className="text-xs text-slate-500">
              This will update tenant status to Inactive and mark bed {activeCustomer?.bedNumber} as available for new bookings.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black text-slate-700 mb-1">Move-out Date</label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-black text-slate-700 mb-1">Reason for Move-out</label>
                <input
                  type="text"
                  value={moveOutReason}
                  onChange={(e) => setMoveOutReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMoveOutModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveOut}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
              >
                Confirm Move-out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {receiptPayment && (
        <CustomerReceiptModal
          customer={receiptPayment.customer}
          payment={receiptPayment.payment}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
};
