import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Building2,
  BedDouble,
  Sparkles,
  CalendarCheck,
  UserCheck,
  Users,
  CreditCard,
  Receipt,
  FolderLock,
  Bell,
  LifeBuoy,
  Settings,
  MapPin,
  Globe,
  ChevronDown,
  Plus,
  IndianRupee,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  CheckCircle2,
  Briefcase,
  FileDown,
  Eye,
  ShieldCheck,
  Wallet,
  ClipboardList,
  LineChart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePropertyListing } from '../context/PropertyListingContext';
import { OwnerPropertyListing } from '../types/property';
import { ExportReportModal } from '../components/modals/ExportReportModal';
import { SupportDesk } from '../components/support/SupportDesk';
import { ApiClient } from '../lib/apiClient';
import { ReportsView } from '../components/dashboard/ReportsView';
import { AnalyticsView } from '../components/dashboard/AnalyticsView';
import { OwnerPropertiesInventoryView } from '../components/dashboard/OwnerPropertiesInventoryView';
import { PropertyListingWizard } from '../components/dashboard/property-wizard/PropertyListingWizard';
import { PropertyDetailsView } from '../components/property-details/PropertyDetailsView';
import { LeadsView } from '../components/dashboard/crm/LeadsView';
import { BookingsView } from '../components/dashboard/crm/BookingsView';
import { VisitorsView } from '../components/dashboard/crm/VisitorsView';
import { CustomersView } from '../components/dashboard/crm/CustomersView';
import { EmployeesView } from '../components/dashboard/rbac/EmployeesView';
import { RolesManagementView } from '../components/dashboard/rbac/RolesManagementView';
import { SubscriptionView } from '../components/dashboard/SubscriptionView';
import { OwnerNotificationsView } from '../components/dashboard/OwnerNotificationsView';
import { FinanceView } from '../components/dashboard/FinanceView';
import { TasksView } from '../components/dashboard/TasksView';
import { InsightsView } from '../components/dashboard/InsightsView';
import { exportMonthlyReportPDF } from '../utils/pdfExport';

interface OwnerDashboardProps {
  initialNav?: string;
}

export const OwnerDashboardPage: React.FC<OwnerDashboardProps> = ({ initialNav = 'Dashboard' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { ownerProperties, createProperty, updateProperty, submitForVerification } = usePropertyListing();

  const [activeNav, setActiveNav] = useState(initialNav);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialNav) {
      setActiveNav(initialNav);
    }
  }, [initialNav]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Modals state for owner actions
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<OwnerPropertyListing | null>(null);
  const [previewProperty, setPreviewProperty] = useState<OwnerPropertyListing | null>(null);

  const [showExportReportModal, setShowExportReportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Dynamic calculations from real PropertyListingContext
  const totalProperties = ownerProperties.length;
  const publishedPropertiesCount = ownerProperties.filter((p) => p.status === 'published').length;
  const pendingPropertiesCount = ownerProperties.filter((p) => p.status === 'pending_approval').length;

  let totalOccupiedBeds = 0;
  let totalAvailableBeds = 0;

  ownerProperties.forEach((p) => {
    p.rooms.forEach((r) => {
      totalOccupiedBeds += r.occupiedBedsCount;
      totalAvailableBeds += r.availableBedsCount;
    });
  });
  let totalBeds = totalOccupiedBeds + totalAvailableBeds;
  if (totalBeds === 0) {
    totalBeds = ownerProperties.reduce((acc, p) => acc + (p.details.totalBeds || 0), 0);
  }

  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupiedBeds / totalBeds) * 100) : 0;

  // Monthly revenue estimate (sum of rent from occupied beds)
  const monthlyRevenue = ownerProperties.reduce((acc, p) => {
    const propRev = p.rooms.reduce((rAcc, r) => rAcc + r.occupiedBedsCount * r.monthlyRent, 0);
    return acc + propRev;
  }, 0);

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Analytics', icon: TrendingUp },
        { name: 'Reports', icon: FileText },
      ],
    },
    {
      title: 'INVENTORY',
      items: [
        { name: 'Properties', icon: Building2 },
        { name: 'Vacancies', icon: BedDouble },
      ],
    },
    {
      title: 'PIPELINE',
      items: [
        { name: 'Leads', icon: Sparkles },
        { name: 'Bookings', icon: CalendarCheck },
        { name: 'Visitors', icon: UserCheck },
        { name: 'Customers', icon: Users },
        { name: 'Tasks', icon: ClipboardList },
        { name: 'Support', icon: LifeBuoy },
      ],
    },
    {
      title: 'BUSINESS',
      items: [
        { name: 'Employees', icon: Briefcase },
        { name: 'Roles & Permissions', icon: ShieldCheck },
        { name: 'Payments', icon: CreditCard },
        { name: 'Finance', icon: Wallet },
        { name: 'Insights', icon: LineChart },
        { name: 'Subscription', icon: Receipt },
        { name: 'Documents', icon: FolderLock },
      ],
    },
    {
      title: 'WORKSPACE',
      items: [
        { name: 'Notifications', icon: Bell },
        { name: 'Help & Support', icon: LifeBuoy },
        { name: 'Settings', icon: Settings },
      ],
    },
  ];

  // 12 Metrics matching exact dashboard layout
  const metrics = [
    {
      label: 'TOTAL PROPERTIES',
      value: totalProperties.toString(),
      subtext: `${publishedPropertiesCount} live on Find PG · ${pendingPropertiesCount} in audit`,
      icon: Building2,
    },
    {
      label: 'ACTIVE PROPERTIES',
      value: publishedPropertiesCount.toString(),
      subtext: `${totalProperties - publishedPropertiesCount} pending / draft`,
      icon: CheckCircle2,
    },
    {
      label: 'TOTAL BEDS',
      value: totalBeds.toString(),
      subtext: 'across all listings',
      icon: BedDouble,
    },
    {
      label: 'OCCUPIED BEDS',
      value: totalOccupiedBeds.toString(),
      subtext: `${occupancyRate}% occupancy rate`,
      icon: Users,
    },
    {
      label: 'OCCUPANCY RATE',
      value: `${occupancyRate}%`,
      subtext: `${totalOccupiedBeds} of ${totalBeds} total beds`,
      icon: TrendingUp,
    },
    {
      label: 'NEW LEADS TODAY',
      value: '2',
      subtext: '14 active inquiries',
      icon: Sparkles,
    },
    {
      label: 'TOTAL RESIDENTS',
      value: totalOccupiedBeds.toString(),
      subtext: 'active tenant accounts',
      icon: UserCheck,
    },
    {
      label: 'AVAILABLE BEDS',
      value: totalAvailableBeds.toString(),
      subtext: 'published vacancies',
      icon: BedDouble,
    },
    {
      label: "TODAY'S BOOKINGS",
      value: '1',
      subtext: '6 all time this month',
      icon: CalendarCheck,
    },
    {
      label: 'SCHEDULED VISITS',
      value: '3',
      subtext: 'from tenant pipeline',
      icon: UserCheck,
    },
    {
      label: 'EST. MONTHLY REVENUE',
      value: `₹${monthlyRevenue.toLocaleString('en-IN')}`,
      subtext: 'from occupied rooms',
      icon: IndianRupee,
    },
    {
      label: 'PENDING PAYMENTS',
      value: '₹14,500',
      subtext: '1 invoice pending',
      icon: FileText,
    },
  ];

  const displayName = user?.name || 'Owner';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'P';

  const handleOpenAddProperty = () => {
    setEditingProperty(null);
    setWizardOpen(true);
  };

  const handleOpenEditProperty = (prop: OwnerPropertyListing) => {
    setEditingProperty(prop);
    setWizardOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-[#FBFBFA] font-sans antialiased text-[#121820]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MOBILE SIDEBAR BACKDROP */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen flex flex-col justify-between bg-[#0F5132] text-slate-200 border-r border-emerald-800/60 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Logo & Tagline */}
        <div className="p-5 pb-3 border-b border-emerald-800/60 flex items-center justify-between">
          <div
            className="cursor-pointer"
            onClick={() => {
              setActiveNav('Dashboard');
            }}
          >
            {!sidebarCollapsed ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-white font-heading">
                    Nest<span className="text-[#a3e635]">in</span>
                  </span>
                </div>
                <div className="text-[9px] font-extrabold tracking-widest text-[#a3e635]/80 uppercase mt-0.5 font-sans">
                  FIND YOUR SPACE
                </div>
              </div>
            ) : (
              <div className="text-lg font-black text-white">
                N<span className="text-[#a3e635]">i</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/60 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-1.5 text-emerald-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Item Groups */}
        <div
          data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5 owner-sidebar-scrollbar overscroll-contain"
        >
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 text-[10px] font-black tracking-wider uppercase text-emerald-300/80 font-heading">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setActiveNav(item.name);
                        setMobileSidebarOpen(false);
                        const routeMap: Record<string, string> = {
                          Dashboard: '/owner/dashboard',
                          Leads: '/owner/leads',
                          Bookings: '/owner/bookings',
                          Visitors: '/owner/visitors',
                          Customers: '/owner/customers',
                          Properties: '/owner/properties',
                          Reports: '/owner/reports',
                          Analytics: '/owner/analytics',
                          Employees: '/owner/employees',
                          'Roles & Permissions': '/owner/roles-permissions',
                          Support: '/owner/support',
                          Subscription: '/owner/subscription',
                          Finance: '/owner/finance',
                          Insights: '/owner/insights',
                          Tasks: '/owner/tasks',
                          Notifications: '/owner/notifications',
                        };
                        if (routeMap[item.name]) {
                          navigate(routeMap[item.name]);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#a3e635] text-[#0F5132] font-black shadow-xs font-heading'
                          : 'text-emerald-100 hover:bg-emerald-800/60 hover:text-white'
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0F5132]' : 'text-emerald-300'}`} />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Switcher */}
        <div className="p-3 border-t border-emerald-800/60">
          <button
            type="button"
            onClick={() => navigate('/find-pg')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-100 hover:bg-emerald-800/60 hover:text-white transition-colors cursor-pointer font-heading"
          >
            <Globe className="w-4 h-4 text-[#a3e635] shrink-0" />
            {!sidebarCollapsed && <span>Tenant View (Find PG)</span>}
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVBAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-950 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Micro Market Location Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/60 text-xs font-bold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gachibowli & Madhapur Cluster</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Add Property Button */}
            <button
              type="button"
              onClick={handleOpenAddProperty}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#a3e635] hover:bg-[#92d428] text-[#0F5132] font-black text-xs rounded-full shadow-2xs transition-colors cursor-pointer font-heading"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3] text-[#0F5132]" />
              <span>Add Property</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1 pl-2 pr-3 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                <div className="w-7 h-7 rounded-full bg-[#0F5132] text-[#a3e635] font-black text-xs flex items-center justify-center font-heading">
                  {initialLetter}
                </div>
                <span className="text-xs font-bold text-slate-900 hidden sm:inline max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || 'owner.partner@nestin.io'}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveNav('Properties');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl"
                    >
                      Manage Properties ({totalProperties})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveNav('Settings');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl"
                    >
                      Account Settings
                    </button>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Top Page Header & Primary Actions for standard dashboard overview & properties */}
          {['Dashboard', 'Properties', 'Reports', 'Analytics'].includes(activeNav) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                  {activeNav === 'Properties'
                    ? 'Property Portfolio'
                    : activeNav === 'Reports'
                      ? 'Financial Reports'
                      : activeNav === 'Analytics'
                        ? 'Occupancy & Revenue Analytics'
                        : 'Nestin Owner Hub'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                  {activeNav === 'Properties'
                    ? 'Manage your full property profile, room pricing, and verification status.'
                    : 'Everything happening across your verified PG and Coliving spaces.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowExportReportModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[#a3e635] font-black text-xs rounded-full shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer font-heading"
                >
                  <FileDown className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddProperty}
                  className="px-4 py-2 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs rounded-full shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer font-heading"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Property</span>
                </button>
              </div>
            </div>
          )}

          {/* CONDITIONAL MAIN TAB CONTENT */}
          {activeNav === 'Leads' ? (
            <LeadsView />
          ) : activeNav === 'Bookings' ? (
            <BookingsView
              onNavigateToCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setActiveNav('Customers');
                navigate('/owner/customers');
              }}
            />
          ) : activeNav === 'Visitors' ? (
            <VisitorsView
              onNavigateToLead={() => {
                setActiveNav('Leads');
                navigate('/owner/leads');
              }}
            />
          ) : activeNav === 'Customers' ? (
            <CustomersView initialCustomerId={selectedCustomerId} />
          ) : activeNav === 'Properties' ? (
            <OwnerPropertiesInventoryView
              onAddProperty={handleOpenAddProperty}
              onEditProperty={handleOpenEditProperty}
              onPreviewProperty={(prop) => setPreviewProperty(prop)}
              showToast={showToast}
            />
          ) : activeNav === 'Reports' ? (
            <ReportsView
              ownerName={displayName}
              ownerEmail={user?.email || 'owner.partner@nestin.io'}
              onOpenExportModal={() => setShowExportReportModal(true)}
              showToast={showToast}
            />
          ) : activeNav === 'Analytics' ? (
            <AnalyticsView
              ownerName={displayName}
              ownerEmail={user?.email || 'owner.partner@nestin.io'}
              onOpenExportModal={() => setShowExportReportModal(true)}
              showToast={showToast}
            />
          ) : activeNav === 'Employees' ? (
            <EmployeesView
              onNavigateToRoles={() => {
                setActiveNav('Roles & Permissions');
                navigate('/owner/roles-permissions');
              }}
            />
          ) : activeNav === 'Roles & Permissions' ? (
            <RolesManagementView />
          ) : activeNav === 'Finance' ? (
            <FinanceView showToast={showToast} />
          ) : activeNav === 'Insights' ? (
            <InsightsView showToast={showToast} />
          ) : activeNav === 'Tasks' ? (
            <TasksView showToast={showToast} />
          ) : activeNav === 'Subscription' ? (
            <SubscriptionView showToast={showToast} />
          ) : activeNav === 'Notifications' ? (
            <OwnerNotificationsView showToast={showToast} />
          ) : activeNav === 'Support' ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                  Support Desk
                </h1>
                <p className="text-sm text-slate-500 mt-1">Tickets raised by residents of your properties.</p>
              </div>
              <SupportDesk
                fetchTickets={ApiClient.crm.supportTickets}
                reply={ApiClient.crm.replySupport}
                resolve={ApiClient.crm.resolveSupport}
                onNotice={showToast}
              />
            </div>
          ) : (
            <>
              {/* MONTHLY ACCOUNTING PDF DOWNLOAD BANNER */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#a3e635]/20 text-[#a3e635] flex items-center justify-center shrink-0">
                    <FileDown className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase bg-[#a3e635] text-slate-950 px-2 py-0.5 rounded-full font-heading">
                        Monthly Statement Ready
                      </span>
                      <span className="text-xs text-slate-400">August 2026</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black font-heading mt-1">
                      Download Monthly Revenue & Occupancy PDF
                    </h3>
                    <p className="text-xs text-slate-400">
                      Audit-ready PDF statement for CA tax filing, TDS Sec 194-I audit, and bank accounting.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      exportMonthlyReportPDF({
                        month: 'August',
                        year: 2026,
                        propertyName: 'All Properties (Consolidated)',
                        ownerName: displayName,
                        ownerEmail: user?.email || 'owner.partner@nestin.io',
                        reportType: 'full',
                        includeLedger: true,
                        includeExpenses: true,
                      });
                      showToast('Downloaded August 2026 Accounting PDF Report!');
                    }}
                    className="px-4 py-2.5 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-xs rounded-full shadow-xs transition-colors flex items-center gap-2 cursor-pointer font-heading"
                  >
                    <FileDown className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Quick PDF Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowExportReportModal(true)}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Custom Filter</span>
                  </button>
                </div>
              </div>

              {/* 12 METRICS GRID (4 cols x 3 rows) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, idx) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">
                          {m.label}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-950 font-heading">{m.value}</div>
                      <p className="text-[11px] text-slate-500 font-medium">{m.subtext}</p>
                    </div>
                  );
                })}
              </div>

              {/* RECENT PROPERTIES QUICK TABLE */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-700" />
                    <h2 className="text-base font-black text-slate-950 font-heading">
                      Managed Properties ({totalProperties})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('Properties')}
                    className="text-xs font-black text-slate-900 hover:text-[#4d7c0f] flex items-center gap-1 cursor-pointer font-heading"
                  >
                    <span>View all inventory</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider font-heading">
                        <th className="pb-3">Property</th>
                        <th className="pb-3">Location</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Rooms / Beds</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {ownerProperties.slice(0, 5).map((p) => {
                        const totalBedsForProp =
                          p.rooms.reduce((acc, r) => acc + r.availableBedsCount + r.occupiedBedsCount, 0) ||
                          p.details.totalBeds;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    p.coverImage ||
                                    p.gallery[0]?.url ||
                                    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200'
                                  }
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-xl object-cover"
                                />
                                <div>
                                  <div className="font-black text-slate-950">{p.name}</div>
                                  <div className="text-[10px] text-slate-400">{p.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-slate-600">
                              {p.location.area}, {p.location.city}
                            </td>
                            <td className="py-3.5 text-slate-600">
                              {p.type} ({p.category})
                            </td>
                            <td className="py-3.5 text-slate-900 font-bold">
                              {p.rooms.length} room types · {totalBedsForProp} beds
                            </td>
                            <td className="py-3.5">
                              {p.status === 'published' ? (
                                <span className="px-2.5 py-1 bg-[#ecfccb] text-[#3f6212] rounded-full text-[10px] font-black uppercase font-heading">
                                  Live on Find PG
                                </span>
                              ) : p.status === 'pending_approval' ? (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-[10px] font-black uppercase font-heading">
                                  Under Audit
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase font-heading">
                                  {p.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProperty(p)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Preview Tenant View"
                                >
                                  <Eye className="w-3 h-3 text-slate-600" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProperty(p)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer font-heading"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* 12-STEP PROPERTY LISTING WIZARD */}
      {wizardOpen && (
        <PropertyListingWizard
          initialData={editingProperty || undefined}
          onClose={() => {
            setWizardOpen(false);
            setEditingProperty(null);
          }}
          onSaveDraft={(saved) => {
            if (editingProperty) {
              updateProperty(saved.id, saved);
              showToast(`Draft updated for "${saved.name}".`);
            } else {
              createProperty(saved);
              showToast(`New property draft created.`);
            }
          }}
          onSubmitVerification={(submitted) => {
            let id = submitted.id;
            if (editingProperty) {
              updateProperty(submitted.id, submitted);
            } else {
              id = createProperty(submitted);
            }
            submitForVerification(id);
            showToast(`Submitted "${submitted.name}" for Verification & Approval.`);
            setWizardOpen(false);
            setEditingProperty(null);
          }}
        />
      )}

      {/* TENANT PREVIEW MODAL */}
      {previewProperty && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col overflow-hidden"
          data-lenis-prevent="true"
        >
          <div className="flex-1 overflow-y-auto bg-[#FAF9F5]" data-lenis-prevent="true">
            <PropertyDetailsView
              property={previewProperty}
              isPreviewMode={true}
              onClosePreview={() => setPreviewProperty(null)}
            />
          </div>
        </div>
      )}

      {/* EXPORT REPORT MODAL */}
      {showExportReportModal && (
        <ExportReportModal
          ownerName={displayName}
          ownerEmail={user?.email || 'owner.partner@nestin.io'}
          onClose={() => setShowExportReportModal(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}
    </div>
  );
};
