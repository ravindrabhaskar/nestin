import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  CalendarCheck,
  Settings,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  LogOut,
  Award,
  ArrowRight,
  TrendingUp,
  MapPin,
  UserCheck,
  FileCheck,
  Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminBillingPanel, AdminOpsPanel } from './AdminBillingOpsPanels';
import { VERIFICATION_CHECKLIST, type VerificationCheckId } from '../../types/property';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { usePropertyListing } from '../../context/PropertyListingContext';
import { AdminRegistryPanels } from './AdminRegistryPanels';
import { OwnerPropertyListing } from '../../types/property';
import { PropertyDetailsView } from '../../components/property-details/PropertyDetailsView';

export const SuperAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { properties, adminApproveProperty, adminRejectProperty, adminRevokeVerification, calculateCompleteness } =
    usePropertyListing();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'verification'
    | 'properties'
    | 'owners'
    | 'users'
    | 'bookings'
    | 'inbound'
    | 'support'
    | 'outbox'
    | 'settings'
    | 'audit'
    | 'billing'
    | 'ops'
  >('verification');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [selectedPropertyForAudit, setSelectedPropertyForAudit] = useState<OwnerPropertyListing | null>(null);
  const [previewProperty, setPreviewProperty] = useState<OwnerPropertyListing | null>(null);

  // Audit Approval Form State
  const [grantVerifiedBadge, setGrantVerifiedBadge] = useState(true);
  const [grantFeaturedBadge, setGrantFeaturedBadge] = useState(false);
  const [grantZeroBrokerage, setGrantZeroBrokerage] = useState(true);
  const [rejectionReason, setRejectionReason] = useState(
    'Please re-upload a higher resolution copy of the Trade License and update caretaker emergency contact.'
  );
  const [isRejectMode, setIsRejectMode] = useState(false);
  // Verification evidence (required for the Verified badge)
  const [checklist, setChecklist] = useState<Partial<Record<VerificationCheckId, boolean>>>({});
  const [siteVisitDate, setSiteVisitDate] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const auditDialogRef = useFocusTrap<HTMLDivElement>(!!selectedPropertyForAudit, () =>
    setSelectedPropertyForAudit(null)
  );

  const openAudit = (prop: OwnerPropertyListing) => {
    setSelectedPropertyForAudit(prop);
    setGrantVerifiedBadge(true);
    setGrantFeaturedBadge(prop.isFeatured);
    setGrantZeroBrokerage(prop.isZeroBrokerage ?? true);
    setChecklist(prop.verification?.checklist || {});
    setSiteVisitDate(prop.verification?.siteVisitDate || '');
    setVerificationNotes(prop.verification?.notes || '');
    setIsRejectMode(false);
    setApproveError(null);
  };
  const checklistComplete = VERIFICATION_CHECKLIST.every((item) => checklist[item.id]);

  const handleRevokeVerification = async (prop: OwnerPropertyListing) => {
    const reason = window.prompt(`Why is the Verified badge being removed from ${prop.name}?`, '');
    if (!reason) return;
    try {
      await adminRevokeVerification(prop.id, reason);
      showToast('Verified badge revoked; owner notified.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not revoke verification');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Metrics
  const totalProperties = properties.length;
  const pendingReviewProperties = properties.filter((p) => p.status === 'pending_approval');
  const publishedProperties = properties.filter((p) => p.status === 'published');
  const rejectedProperties = properties.filter((p) => p.status === 'rejected');
  const draftProperties = properties.filter((p) => p.status === 'draft');

  // Unique owners
  const ownersMap = new Map<
    string,
    { email: string; name: string; propertiesCount: number; publishedCount: number; phone?: string }
  >();
  properties.forEach((p) => {
    const email = p.ownerEmail || 'unknown@owner.io';
    if (!ownersMap.has(email)) {
      ownersMap.set(email, {
        email,
        name: p.ownerName || 'PG Partner',
        propertiesCount: 1,
        publishedCount: p.status === 'published' ? 1 : 0,
        phone: p.contactNumber,
      });
    } else {
      const existing = ownersMap.get(email)!;
      existing.propertiesCount += 1;
      if (p.status === 'published') existing.publishedCount += 1;
    }
  });
  const ownersList = Array.from(ownersMap.values());

  const handleApproveProperty = async (id: string) => {
    if (grantVerifiedBadge && (!checklistComplete || !siteVisitDate)) {
      setApproveError(
        'Confirm every checklist item and record the site visit date, or publish without the Verified badge.'
      );
      return;
    }
    setApproving(true);
    setApproveError(null);
    try {
      await adminApproveProperty(id, {
        isNestinVerified: grantVerifiedBadge,
        isFeatured: grantFeaturedBadge,
        isZeroBrokerage: grantZeroBrokerage,
        checklist,
        siteVisitDate: siteVisitDate || undefined,
        notes: verificationNotes || undefined,
      });
      showToast(
        grantVerifiedBadge
          ? 'Listing verified and published live on Find PG.'
          : 'Listing published without the Verified badge.'
      );
      setSelectedPropertyForAudit(null);
      setIsRejectMode(false);
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectProperty = (id: string) => {
    adminRejectProperty(id, rejectionReason);
    showToast(`Property rejected. Actionable feedback dispatched to owner.`);
    setSelectedPropertyForAudit(null);
    setIsRejectMode(false);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 bg-slate-900 border border-[#a3e635] text-white text-xs font-bold rounded-2xl shadow-2xl animate-in slide-in-from-top-3 flex items-center gap-2 font-heading">
          <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP SUPER ADMIN HEADER */}
      <header className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black font-heading shadow-md shadow-rose-900/40">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-sm text-white">NestIn Admin Console</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                  ROOT PRIVILEGES
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Isolated Infrastructure · Zero Owner/Tenant Access</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse" />
              <span className="font-mono text-[11px]">System Status: All Services Operational</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Preview public site"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Public Site</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-xs font-bold text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Admin Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ADMIN SUB-NAVIGATION BAR */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'overview', label: 'Platform Overview', icon: TrendingUp },
            {
              id: 'verification',
              label: 'Verification Desk',
              icon: ShieldCheck,
              badge: pendingReviewProperties.length,
            },
            { id: 'properties', label: 'All Properties', icon: Building2, count: totalProperties },
            { id: 'owners', label: 'Owners Registry', icon: Users, count: ownersList.length },
            { id: 'users', label: 'Accounts Registry', icon: UserCheck },
            { id: 'bookings', label: 'Bookings & Escrow', icon: CalendarCheck },
            { id: 'inbound', label: 'Inbox & Requests', icon: FileCheck },
            { id: 'support', label: 'Support Desk', icon: UserCheck },
            { id: 'outbox', label: 'Messaging', icon: FileCheck },
            { id: 'billing', label: 'Billing', icon: TrendingUp },
            { id: 'ops', label: 'Operations', icon: Settings },
            { id: 'settings', label: 'System Policies', icon: Settings },
            { id: 'audit', label: 'Security Logs', icon: FileCheck },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      isActive ? 'bg-white text-rose-600' : 'bg-amber-500 text-slate-950 animate-pulse'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && !tab.badge && (
                  <span className="text-[10px] text-slate-400">({tab.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* -------------------------------------------------------------
            TAB 1: VERIFICATION DESK (HIGH PRIORITY)
        ------------------------------------------------------------- */}
        {activeTab === 'verification' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Queue Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold font-heading mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Audit Queue ({pendingReviewProperties.length} listings awaiting review)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                  Property Verification & Trust Desk
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl mt-1">
                  Inspect submitted listings, review municipal licenses, fire NOCs, and caretaker KYC credentials.
                  Assign verified badges and publish live.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Published</div>
                  <div className="text-sm font-black text-[#a3e635]">{publishedProperties.length}</div>
                </div>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Approval rate</div>
                  <div className="text-sm font-black text-white">
                    {publishedProperties.length + rejectedProperties.length
                      ? `${Math.round((publishedProperties.length / (publishedProperties.length + rejectedProperties.length)) * 100)}%`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Queue Table */}
            {pendingReviewProperties.length === 0 ? (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-[#a3e635] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-white font-heading">Verification Queue is Clear!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All submitted owner property listings have been reviewed and processed. New submissions will appear
                  here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Pending Review ({pendingReviewProperties.length})
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {pendingReviewProperties.map((prop) => {
                    const completeness = calculateCompleteness(prop);

                    return (
                      <div
                        key={prop.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={
                              prop.coverImage ||
                              prop.gallery[0]?.url ||
                              'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400'
                            }
                            alt={prop.name}
                            referrerPolicy="no-referrer"
                            className="w-24 h-24 rounded-2xl object-cover bg-slate-950 shrink-0 border border-slate-800"
                          />
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                                {prop.type} · {prop.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                Under Audit
                              </span>
                            </div>
                            <h4 className="text-base font-black text-white font-heading">{prop.name}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                {prop.location.area}, {prop.location.city}
                              </span>
                              <span>•</span>
                              <span>
                                Owner: <strong className="text-slate-200">{prop.ownerName}</strong> ({prop.ownerEmail})
                              </span>
                              <span>•</span>
                              <span>
                                Caretaker: <strong className="text-slate-200">{prop.caretaker.name}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <div className="text-right pr-3 hidden sm:block">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Completeness</div>
                            <div className="text-sm font-black text-[#a3e635] font-mono">{completeness.score}%</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPreviewProperty(prop)}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openAudit(prop)}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer font-heading shadow-md shadow-rose-950"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Audit & Decide</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: PLATFORM OVERVIEW & METRICS
        ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Listings</div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">{totalProperties}</div>
                <div className="text-[11px] text-[#a3e635]">
                  {publishedProperties.length} published · {pendingReviewProperties.length} pending
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Verified Stays</div>
                <div className="text-2xl sm:text-3xl font-black text-[#a3e635] font-heading">
                  {properties.filter((p) => p.isNestinVerified).length}
                </div>
                <div className="text-[11px] text-slate-400">KYC & Safety Cleared</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Active PG Owners</div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">{ownersList.length}</div>
                <div className="text-[11px] text-slate-400">Across Hyderabad & Bengaluru</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Platform GMV (Mo.)</div>
                <div className="text-2xl sm:text-3xl font-black text-white font-heading">₹24.8 Lakhs</div>
                <div className="text-[11px] text-[#a3e635] font-semibold">+18% MoM Growth</div>
              </div>
            </div>

            {/* Quick Actions & Recent Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Breakdown Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-base font-black text-white font-heading">Listing Inventory Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Live on Find PG</span>
                    <span className="font-mono font-bold text-[#a3e635]">{publishedProperties.length}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#a3e635] h-full"
                      style={{ width: `${(publishedProperties.length / (totalProperties || 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="text-slate-300">Pending Review Queue</span>
                    <span className="font-mono font-bold text-amber-400">{pendingReviewProperties.length}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(pendingReviewProperties.length / (totalProperties || 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="text-slate-300">Draft In-Progress by Owners</span>
                    <span className="font-mono font-bold text-slate-400">{draftProperties.length}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-600 h-full"
                      style={{ width: `${(draftProperties.length / (totalProperties || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Security & Access Isolation Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#a3e635]" />
                  <h3 className="text-base font-black text-white font-heading">Security & RBAC Enforcement</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The NestIn platform architecture strictly prevents role cross-contamination. Super Admin functions,
                  database audits, and verification tools are completely isolated behind root server-side validation.
                </p>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-slate-400">
                    ACTIVE ROLE: <span className="text-rose-400 font-bold">SUPER_ADMIN (Root)</span>
                  </div>
                  <div className="text-slate-400">
                    SESSION AUTH: <span className="text-[#a3e635] font-bold">Verified Encrypted Token</span>
                  </div>
                  <div className="text-slate-400">
                    ISOLATION CHECK: <span className="text-blue-400 font-bold">PASSED (Zero Owner Exposure)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 3: ALL PROPERTIES DIRECTORY
        ------------------------------------------------------------- */}
        {activeTab === 'properties' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search properties by name, area, or owner email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Cities</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Bengaluru">Bengaluru</option>
              </select>
            </div>

            {/* Properties Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3.5 px-5">Property</th>
                      <th className="py-3.5 px-4">Owner</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Badges</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {properties
                      .filter((p) => {
                        if (filterCity !== 'all' && p.location.city !== filterCity) return false;
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          return (
                            p.name.toLowerCase().includes(q) ||
                            p.location.area.toLowerCase().includes(q) ||
                            (p.ownerEmail || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((prop) => (
                        <tr key={prop.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  prop.coverImage ||
                                  prop.gallery[0]?.url ||
                                  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200'
                                }
                                alt={prop.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-xl object-cover bg-slate-950"
                              />
                              <div>
                                <div className="font-bold text-white font-heading">{prop.name}</div>
                                <div className="text-[11px] text-slate-400">
                                  {prop.type} · {prop.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div>{prop.ownerName || 'Partner'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{prop.ownerEmail}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {prop.location.area}, {prop.location.city}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-heading ${
                                prop.status === 'published'
                                  ? 'bg-[#ecfccb] text-[#3f6212]'
                                  : prop.status === 'pending_approval'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : prop.status === 'rejected'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {prop.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1">
                              {prop.isNestinVerified && (
                                <span
                                  className="px-2 py-0.5 rounded-md bg-[#a3e635]/20 text-[#a3e635] text-[10px] font-bold"
                                  title="Verified Stay"
                                >
                                  ✓ Verified
                                </span>
                              )}
                              {prop.isFeatured && (
                                <span
                                  className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold"
                                  title="Featured Property"
                                >
                                  ★ Featured
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setPreviewProperty(prop)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                              Preview
                            </button>
                            {prop.isNestinVerified && (
                              <button
                                type="button"
                                onClick={() => handleRevokeVerification(prop)}
                                className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs font-bold"
                                title={
                                  prop.verification?.expiresAt
                                    ? `Verified until ${new Date(prop.verification.expiresAt).toLocaleDateString('en-IN')}`
                                    : undefined
                                }
                              >
                                Revoke
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openAudit(prop)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-heading"
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 4: OWNERS REGISTRY
        ------------------------------------------------------------- */}
        {activeTab === 'owners' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white font-heading">PG Property Owners Registry</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage registered business partners, verified KYC credentials, and portfolio properties.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Registered</div>
                <div className="text-2xl font-black text-white font-heading">{ownersList.length} Partners</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ownersList.map((owner, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-[#a3e635] flex items-center justify-center font-heading font-black text-base">
                      {owner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white font-heading">{owner.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">{owner.email}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Listed Properties:</span>
                      <span className="font-bold text-white">{owner.propertiesCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Live on Find PG:</span>
                      <span className="font-bold text-[#a3e635]">{owner.publishedCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">KYC Status:</span>
                      <span className="text-[#a3e635] font-bold">✓ Verified Partner</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery(owner.email);
                      setActiveTab('properties');
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Owner Listings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 5: SYSTEM POLICIES & SETTINGS
        ------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div>
                <h2 className="text-xl font-black text-white font-heading">Platform Policy Configuration</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Super admin parameters governing verification requirements and badge rules.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Mandatory Fire Safety NOC</div>
                    <div className="text-[11px] text-slate-400">
                      Require Fire NOC certificate for all &gt;50 bed properties
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#a3e635]/20 text-[#a3e635] font-bold text-xs rounded-full">
                    Enforced
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Zero Brokerage Guarantee</div>
                    <div className="text-[11px] text-slate-400">
                      Auto-flag owner direct listings with Zero Brokerage badge
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#a3e635]/20 text-[#a3e635] font-bold text-xs rounded-full">
                    Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Caretaker Background Check Verification</div>
                    <div className="text-[11px] text-slate-400">
                      Verify government ID and phone OTP before publishing
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#a3e635]/20 text-[#a3e635] font-bold text-xs rounded-full">
                    Enforced
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 6: REGISTRIES (ACCOUNTS, BOOKINGS, INBOX, AUDIT TRAIL) — live from the admin API
        ------------------------------------------------------------- */}
        {activeTab === 'billing' && <AdminBillingPanel onNotice={showToast} />}
        {activeTab === 'ops' && <AdminOpsPanel onNotice={showToast} />}
        {(activeTab === 'audit' ||
          activeTab === 'users' ||
          activeTab === 'bookings' ||
          activeTab === 'inbound' ||
          activeTab === 'support' ||
          activeTab === 'outbox') && <AdminRegistryPanels tab={activeTab} onNotice={showToast} />}
      </main>

      {/* -------------------------------------------------------------
          AUDIT & APPROVAL MODAL
      ------------------------------------------------------------- */}
      {selectedPropertyForAudit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans"
          data-lenis-prevent="true"
        >
          <div
            ref={auditDialogRef}
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            data-lenis-prevent="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-heading font-black">
                  SA
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 font-heading">
                    SUPER ADMIN AUDIT DESK
                  </div>
                  <h3 id="audit-dialog-title" className="text-lg font-black text-white font-heading">
                    {selectedPropertyForAudit.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPropertyForAudit(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Summary */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Owner:</span>
                <span className="font-bold text-white">
                  {selectedPropertyForAudit.ownerName} ({selectedPropertyForAudit.ownerEmail})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Address:</span>
                <span className="text-slate-200">{selectedPropertyForAudit.location.formattedAddress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rooms & Capacity:</span>
                <span className="font-bold text-white">
                  {selectedPropertyForAudit.rooms.length} Room types · {selectedPropertyForAudit.details.totalBeds} Beds
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Caretaker KYC:</span>
                <span className="text-[#a3e635] font-bold">
                  ✓ {selectedPropertyForAudit.caretaker.name} ({selectedPropertyForAudit.caretaker.phone})
                </span>
              </div>
            </div>

            {/* Badges Selection for Approval */}
            {!isRejectMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider font-heading">
                      Verification checklist
                    </h4>
                    <span
                      className={`text-[10px] font-bold ${checklistComplete ? 'text-[#a3e635]' : 'text-amber-300'}`}
                    >
                      {VERIFICATION_CHECKLIST.filter((i) => checklist[i.id]).length}/{VERIFICATION_CHECKLIST.length}{' '}
                      confirmed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {VERIFICATION_CHECKLIST.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-[11px] text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={!!checklist[item.id]}
                          onChange={(e) => setChecklist((c) => ({ ...c, [item.id]: e.target.checked }))}
                          className="mt-0.5 w-3.5 h-3.5 accent-[#a3e635]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Site visit date</span>
                      <input
                        type="date"
                        value={siteVisitDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setSiteVisitDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-slate-600"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Visit notes / licence numbers
                      </span>
                      <input
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Met caretaker, PG licence L-1234 sighted…"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-slate-600"
                      />
                    </label>
                  </div>
                  {selectedPropertyForAudit.verification?.verifiedAt && (
                    <p className="text-[10px] text-slate-500">
                      Previously verified{' '}
                      {new Date(selectedPropertyForAudit.verification.verifiedAt).toLocaleDateString('en-IN')} by{' '}
                      {selectedPropertyForAudit.verification.verifiedByName || 'NestIn'}
                      {selectedPropertyForAudit.verification.expiresAt
                        ? `, valid until ${new Date(selectedPropertyForAudit.verification.expiresAt).toLocaleDateString('en-IN')}`
                        : ''}
                      .
                    </p>
                  )}
                </div>

                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider font-heading">
                  Assign Platform Trust Badges
                </h4>

                <div className="space-y-2.5">
                  <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#a3e635]" />
                      <div>
                        <div className="text-xs font-bold text-white">NestIn Verified Stay</div>
                        <div className="text-[11px] text-slate-400">
                          Documents, license, and physical standards verified
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={grantVerifiedBadge}
                      onChange={(e) => setGrantVerifiedBadge(e.target.checked)}
                      className="w-4 h-4 accent-[#a3e635]"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Featured Listing</div>
                        <div className="text-[11px] text-slate-400">Priority placement on Find PG search results</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={grantFeaturedBadge}
                      onChange={(e) => setGrantFeaturedBadge(e.target.checked)}
                      className="w-4 h-4 accent-amber-400"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Zero Brokerage Verified</div>
                        <div className="text-[11px] text-slate-400">Direct owner pricing with no agent fees</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={grantZeroBrokerage}
                      onChange={(e) => setGrantZeroBrokerage(e.target.checked)}
                      className="w-4 h-4 accent-blue-400"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRejectMode(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Request Changes / Reject
                  </button>

                  <button
                    type="button"
                    disabled={approving}
                    onClick={() => handleApproveProperty(selectedPropertyForAudit.id)}
                    className="px-6 py-2.5 rounded-xl bg-[#a3e635] hover:bg-[#92d428] disabled:opacity-60 text-slate-950 text-xs font-black cursor-pointer font-heading shadow-lg"
                  >
                    {approving
                      ? 'Publishing…'
                      : grantVerifiedBadge
                        ? '✓ Verify & Publish Live'
                        : 'Publish without badge'}
                  </button>
                </div>
                {approveError && (
                  <p
                    role="alert"
                    className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2"
                  >
                    {approveError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  Provide specific reasons for rejection so the owner can rectify missing documentation or details.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-400">
                    Rejection Feedback (Sent to Owner Dashboard)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRejectMode(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Back to Approval Options
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRejectProperty(selectedPropertyForAudit.id)}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer font-heading"
                  >
                    Confirm Rejection & Notify Owner
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TENANT PREVIEW MODAL
      ------------------------------------------------------------- */}
      {previewProperty && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col overflow-hidden"
          data-lenis-prevent="true"
        >
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 text-white text-xs">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-rose-400">ADMIN PREVIEW MODE:</span>
              <span>{previewProperty.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewProperty(null)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-bold cursor-pointer"
            >
              Close Preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#FAF9F5]" data-lenis-prevent="true">
            <PropertyDetailsView
              property={previewProperty}
              isPreviewMode={true}
              onClosePreview={() => setPreviewProperty(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
