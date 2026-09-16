import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Users,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Layers,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ChevronDown,
  BedDouble,
  Clock,
  FileText,
  Mail,
  Phone,
  HelpCircle,
  Check,
  Lock,
  Eye,
  Sliders,
  ChevronRight,
  PlusCircle,
  UserCheck,
  BarChart3,
  CreditCard,
  Grid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NestInAuthModal } from '../components/NestInAuthModal';

export const ForOwnersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const isOwner = isAuthenticated && user?.role === 'owner';

  const handleListPG = () => {
    if (isOwner) {
      navigate('/owner/dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleRequestDemo = () => {
    navigate('/contact?subject=owner-demo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // 8 Value Proposition Cards
  const valueProps = [
    {
      icon: Building2,
      tag: 'Listings & Beds',
      title: 'List Your Property',
      description: 'Publish your PG and showcase available rooms and beds to verified tenants with high-resolution photos and amenities.',
      cta: 'Explore Listing Tools',
    },
    {
      icon: Sparkles,
      tag: 'Inquiry Management',
      title: 'Manage Leads',
      description: 'Track enquiries and move prospective tenants smoothly through your booking pipeline from contact to agreement.',
      cta: 'Manage Pipeline',
    },
    {
      icon: CalendarCheck,
      tag: 'Visit Scheduling',
      title: 'Manage Visits',
      description: 'Schedule and track physical property walkthroughs without relying on disorganized spreadsheets or lost messages.',
      cta: 'Schedule Visits',
    },
    {
      icon: CheckCircle2,
      tag: 'Reservations',
      title: 'Manage Bookings',
      description: 'Track booking requests, confirmations, cancellations, and move-ins with clear status tracking and digital records.',
      cta: 'Track Bookings',
    },
    {
      icon: UserCheck,
      tag: 'Tenant Directory',
      title: 'Manage Tenants',
      description: 'Keep resident records, KYC documents, room allotments, and emergency contacts securely organized in one place.',
      cta: 'View KYC Vault',
    },
    {
      icon: CreditCard,
      tag: 'Rent Collection',
      title: 'Track Payments',
      description: 'Monitor rent payments, pending dues, security deposits, and historic rent collection records with zero confusion.',
      cta: 'Track Collections',
    },
    {
      icon: BedDouble,
      tag: 'Inventory Sync',
      title: 'Monitor Vacancies',
      description: 'Know exactly which rooms and beds are occupied or available across sharing types in real time to avoid double-booking.',
      cta: 'View Bed Matrix',
    },
    {
      icon: BarChart3,
      tag: 'Performance Analytics',
      title: 'Business Insights',
      description: 'Understand occupancy percentages, monthly booking trends, revenue collection, and property performance at a glance.',
      cta: 'Analyze Metrics',
    },
  ];

  // 4 How It Works Steps
  const steps = [
    {
      number: '01',
      title: 'Create Your Owner Account',
      description: 'Sign in securely with Google and create your verified Nestin Owner profile in less than 60 seconds.',
    },
    {
      number: '02',
      title: 'Add Your Property',
      description: 'Enter your PG details, locality, room sharing types, bed capacities, pricing, included amenities, and photos.',
    },
    {
      number: '03',
      title: 'Publish & Get Leads',
      description: 'Publish available vacancies to start receiving direct enquiries and visit requests from verified tenants.',
    },
    {
      number: '04',
      title: 'Manage Everything',
      description: 'Handle incoming leads, scheduled visits, room allotments, tenant KYC, and rent tracking from your Owner Dashboard.',
    },
  ];

  // Why Owners Choose Nestin (8 Real Operational Benefits)
  const whyNestinBenefits = [
    {
      title: 'Less manual work',
      description: 'Replace fragmented paper registers and notebook records with a unified digital dashboard.',
    },
    {
      title: 'Faster lead response',
      description: 'Get notified immediately when prospective tenants submit inquiries for your available beds.',
    },
    {
      title: 'Better vacancy visibility',
      description: 'Real-time bed-level availability maps prevent double allotments and keep your rooms full.',
    },
    {
      title: 'Centralized tenant information',
      description: 'Store tenant identity proofs, room agreements, and emergency contacts in one secure vault.',
    },
    {
      title: 'Simpler booking management',
      description: 'Accept, confirm, or reschedule move-in dates and in-person property walkthroughs cleanly.',
    },
    {
      title: 'Clear payment tracking',
      description: 'Monitor monthly rent receipts, deposit status, and outstanding dues without manual math.',
    },
    {
      title: 'Better property visibility',
      description: 'Showcase your property to thousands of college students and working professionals actively seeking stays.',
    },
    {
      title: 'More professional tenant experience',
      description: 'Provide residents with transparent digital confirmations, verified safety badges, and prompt communication.',
    },
  ];

  // Owner FAQ Accordion Data
  const faqs = [
    {
      question: 'How do I list my PG?',
      answer:
        'Listing your PG is straightforward: Click "List Your PG" to create or log in to your Nestin Owner account with Google. Then, fill out your property details, room configurations (single, double, triple sharing), pricing, amenities, and photos. Once submitted, our local Nestin verification team reviews your listing to activate it.',
    },
    {
      question: 'Do I need a subscription to list my property?',
      answer:
        'No subscription is required to list your property and start receiving initial enquiries. You can publish your PG, manage vacancies, and view leads on the Starter tier. Advanced management features such as multi-property tracking, automated rent reminders, and team access are available in our upcoming Professional plans.',
    },
    {
      question: 'Can I manage multiple properties?',
      answer:
        'Yes. Nestin is built to support single-property owners as well as multi-branch coliving operators. You can switch between different properties from a single Owner Dashboard to monitor occupancy, revenue, and visits for each location separately.',
    },
    {
      question: 'Can I manage rooms and beds?',
      answer:
        'Yes. You have granular control down to individual rooms and bed allocations. You can mark specific beds as occupied, reserved, or vacant, set individual room prices, and track tenant allotments accurately.',
    },
    {
      question: 'Can I track tenant payments?',
      answer:
        'Yes. Nestin provides payment tracking tools allowing you to record monthly rent receipts, monitor pending dues, track security deposit balances, and view historic collection logs for each tenant.',
    },
    {
      question: 'Can I manage bookings?',
      answer:
        'Yes. When prospective tenants submit visit requests or booking inquiries through Nestin, you receive notifications in your dashboard. You can confirm visits, schedule walkthroughs, and transition confirmed leads into active resident records.',
    },
    {
      question: 'How do I request a demo?',
      answer:
        'Click the "Request a Demo" button on this page. It will open our direct contact channel where you can choose a convenient time. Our product specialist will walk you through the Owner Dashboard, bed management, and lead pipeline tailored to your property.',
    },
    {
      question: 'How do I contact Nestin?',
      answer:
        'You can reach our team via our Contact page, by phone at +91 1800-NESTIN-01, or by submitting an inquiry with the subject "Owner Demo / Partnership". Our owner relations team is available 7 days a week.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pt-24 sm:pt-28 pb-20 font-sans selection:bg-[#a3e635] selection:text-black">
      {/* Top Breadcrumb Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 font-heading">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">For Owners</span>
          </div>

          <button
            type="button"
            onClick={handleRequestDemo}
            className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Need assistance? Request a Demo</span>
            <ArrowRight className="w-3 h-3 text-[#5fa000]" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                           */}
        {/* ========================================================================= */}
        <section aria-label="Hero Section" className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-8">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/40 text-slate-950 text-xs font-extrabold tracking-wider uppercase font-heading">
                <Sparkles className="w-3.5 h-3.5 text-[#5fa000]" />
                <span>FOR PROPERTY OWNERS</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black font-heading text-slate-900 tracking-tight leading-[1.12]">
                Turn Your PG Into a <br className="hidden sm:inline" />
                <span className="text-[#5fa000]">Smarter Business.</span>
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
                List your property, reach verified tenants, manage bookings, track payments, and run your PG from one simple platform.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
                <button
                  type="button"
                  id="hero-list-pg-btn"
                  onClick={handleListPG}
                  className="bg-[#a3e635] hover:bg-[#92d428] text-[#0F5132] font-extrabold text-sm sm:text-base px-8 py-3.5 sm:py-4 rounded-full shadow-md transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap font-heading"
                >
                  <span>List Your PG</span>
                  <ArrowRight className="w-4 h-4 text-[#0F5132] stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  id="hero-request-demo-btn"
                  onClick={handleRequestDemo}
                  className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-extrabold text-sm sm:text-base px-7 py-3.5 sm:py-4 rounded-full shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center whitespace-nowrap"
                >
                  Request a Demo
                </button>
              </div>

              {/* Key Trust Signals Under Hero */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5fa000]" />
                  <span>Zero upfront listing cost</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5fa000]" />
                  <span>100% physically verified properties</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5fa000]" />
                  <span>Dedicated owner support</span>
                </div>
              </div>
            </div>

            {/* Right Visual: Genuine Nestin Owner Dashboard UI Preview with subtle floating animation */}
            <div className="lg:col-span-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: [0, -10, 0],
                }}
                transition={{
                  opacity: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                  y: {
                    duration: 4.5,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                  },
                }}
                className="relative group"
              >
                {/* Subtle Premium Ambient Glow Behind Card */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-[#a3e635]/20 via-emerald-500/15 to-transparent rounded-[36px] blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />

                <div className="relative bg-white rounded-3xl sm:rounded-[32px] border border-slate-200/90 shadow-xl group-hover:shadow-2xl overflow-hidden p-5 sm:p-6 space-y-5 transition-shadow duration-300">
                  {/* Header Row */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0F5132] text-[#a3e635] flex items-center justify-center font-black text-sm">
                        N
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm font-heading leading-tight">
                          Nestin Grand Luxury PG
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>Kukatpally, Hyderabad</span>
                          <span>•</span>
                          <span className="text-[#5fa000] font-bold">Verified Stay</span>
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                      Live & Active
                    </span>
                  </div>

                  {/* Key Metrics Mini Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Occupancy
                      </span>
                      <span className="text-lg font-black text-slate-900 font-heading block mt-0.5">
                        94%
                      </span>
                      <span className="text-[10px] text-slate-500">32 / 34 Beds</span>
                    </div>

                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Monthly Revenue
                      </span>
                      <span className="text-lg font-black text-slate-900 font-heading block mt-0.5">
                        ₹3,42,000
                      </span>
                      <span className="text-[10px] text-[#5fa000] font-semibold">+12% vs last mo</span>
                    </div>

                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Today's Visits
                      </span>
                      <span className="text-lg font-black text-slate-900 font-heading block mt-0.5">
                        5 Visits
                      </span>
                      <span className="text-[10px] text-amber-600 font-medium">Scheduled</span>
                    </div>
                  </div>

                  {/* Live Activity Feed Preview */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-heading">
                      <span>Recent Tenant Activity</span>
                      <span className="text-[#5fa000] cursor-pointer hover:underline">View All Leads</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">
                            RS
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate">Rahul Sharma • Double Sharing</p>
                            <p className="text-[11px] text-slate-500">Visit Scheduled for 4:00 PM</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-extrabold shrink-0">
                          Pending Visit
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">
                            AK
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate">Ananya K. • Room 204 (Single)</p>
                            <p className="text-[11px] text-slate-500">Rent Paid: ₹10,500 via UPI</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-extrabold shrink-0">
                          Paid & Confirmed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Status Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Nestin Owner OS • Version 2.4</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      All systems live
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. OWNER VALUE PROPOSITION: Clean 8-Card Feature Grid                     */}
        {/* ========================================================================= */}
        <section aria-label="Owner Value Proposition" className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
              COMPLETE PROPERTY MANAGEMENT
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Everything You Need to Run Your PG
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Purpose-built tools to streamline your daily property operations, from marketing vacancies to collecting monthly rent.
            </p>
          </div>

          <div className="feature-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch auto-rows-fr">
            {valueProps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={handleListPG}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleListPG();
                    }
                  }}
                  className="card group relative bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] active:border-slate-400 active:shadow-xs transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out h-full flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 overflow-hidden select-none"
                >
                  {/* Subtle top accent bar on hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#a3e635] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                  {/* Header: Icon & Category Tag */}
                  <div className="card-header">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100/90 border border-slate-200/80 group-hover:bg-[#a3e635] group-hover:border-[#a3e635] group-hover:shadow-xs group-hover:scale-105 transition-all duration-300 flex items-center justify-center text-slate-900 shrink-0">
                      <Icon className="w-6 h-6 text-slate-900 stroke-[2]" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider font-heading text-slate-400 group-hover:text-slate-700 transition-colors">
                      {item.tag}
                    </span>
                  </div>

                  {/* Body: Title & Description */}
                  <div className="card-body">
                    <h3 className="card-title text-base sm:text-lg font-black font-heading text-slate-900 group-hover:text-slate-950 transition-colors leading-snug">
                      {item.title}
                    </h3>

                    <p className="card-description text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>

                  {/* Footer: Bottom Interactive Tactile Affordance */}
                  <div className="card-footer flex items-center justify-between text-xs font-bold font-heading text-slate-500 group-hover:text-slate-900 transition-colors">
                    <span className="truncate">{item.cta}</span>
                    <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-[#a3e635] text-slate-600 flex items-center justify-center group-hover:translate-x-1 transition-all duration-200 shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. HOW IT WORKS: 4-Step Process                                           */}
        {/* ========================================================================= */}
        <section aria-label="How Nestin Works for Owners" className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
              SIMPLE ONBOARDING
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              How Nestin Works for Owners
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              A straightforward 4-step journey to list your accommodation and start receiving verified tenant bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs relative flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Step Number Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-3xl sm:text-4xl font-black font-heading text-[#5fa000]">
                      {step.number}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      Step {idx + 1}
                    </span>
                  </div>

                  <h3 className="text-lg font-black font-heading text-slate-900 leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold text-slate-400">
                  <span>Phase {idx + 1} of 4</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. PRODUCT PREVIEW: Detailed Owner Dashboard Interface                    */}
        {/* ========================================================================= */}
        <section aria-label="Owner Dashboard Preview" className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
              PRODUCT PREVIEW
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Your PG Business, At a Glance
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-sans">
              Everything important, in one place.
            </p>
          </div>

          {/* Large Owner Dashboard Preview Container */}
          <div className="bg-white rounded-3xl sm:rounded-[36px] border border-slate-200/90 shadow-xl p-6 sm:p-10 space-y-8">
            {/* Top Bar inside Dashboard Preview */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a3e635]/20 text-slate-950 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#5fa000]" />
                  <span>Owner Portal Interface</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-heading text-slate-900">
                  Welcome back, Property Partner
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Manage your listed PG properties, occupancy rates, and rent collections.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleListPG}
                  className="bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>Add New PG Listing</span>
                </button>
              </div>
            </div>

            {/* 7 Required Metric Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Module 1: Today's Leads */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Today's Leads</span>
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-black font-heading text-slate-900">8 Inquiries</div>
                <p className="text-[11px] text-emerald-600 font-semibold">5 Students, 3 IT Pros</p>
              </div>

              {/* Module 2: Booking Requests */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Booking Requests</span>
                  <CalendarCheck className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-black font-heading text-slate-900">3 Pending</div>
                <p className="text-[11px] text-amber-600 font-semibold">Action required today</p>
              </div>

              {/* Module 3: Occupancy */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Occupancy</span>
                  <BedDouble className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-black font-heading text-slate-900">94%</div>
                <p className="text-[11px] text-slate-500 font-medium">32 of 34 beds occupied</p>
              </div>

              {/* Module 4: Revenue This Month */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Revenue This Month</span>
                  <DollarSign className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-black font-heading text-slate-900">₹3,42,000</div>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +12% from last month
                </p>
              </div>
            </div>

            {/* Bottom 3 Metric Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {/* Module 5: Available Beds */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-heading">
                  <span>Available Beds</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    Ready to Allot
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 font-heading">2 Vacant Beds</div>
                <p className="text-xs text-slate-500">1 in Kukatpally, 1 in Hitec City</p>
              </div>

              {/* Module 6: Upcoming Visits */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-heading">
                  <span>Upcoming Visits</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold">
                    Today
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 font-heading">5 Visits Scheduled</div>
                <p className="text-xs text-slate-500">Next walkthrough at 4:30 PM</p>
              </div>

              {/* Module 7: Pending Payments */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-heading">
                  <span>Pending Payments</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                    Dues
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 font-heading">₹21,000 Pending</div>
                <p className="text-xs text-slate-500">2 rooms due in next 48 hours</p>
              </div>
            </div>

            {/* Active Property Inventory Table Preview */}
            <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-6 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-black font-heading text-slate-900">
                  Active Property Inventory Overview
                </h4>
                <span className="text-xs text-[#5fa000] font-bold cursor-pointer hover:underline">
                  Full Inventory &rarr;
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-2.5">Property Name</th>
                      <th className="pb-2.5">Location</th>
                      <th className="pb-2.5">Occupancy</th>
                      <th className="pb-2.5">Starting Rent</th>
                      <th className="pb-2.5 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr>
                      <td className="py-3 font-bold text-slate-900">Nestin Grand Luxury PG</td>
                      <td className="py-3 text-slate-500">Kukatpally, Hyderabad</td>
                      <td className="py-3">18/20 Beds</td>
                      <td className="py-3 font-bold text-slate-900">₹10,500/mo</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-bold text-slate-900">Nestin Urban Coliving</td>
                      <td className="py-3 text-slate-500">Hitec City, Hyderabad</td>
                      <td className="py-3">14/14 Beds</td>
                      <td className="py-3 font-bold text-slate-900">₹12,000/mo</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. WHY OWNERS CHOOSE NESTIN                                               */}
        {/* ========================================================================= */}
        <section aria-label="Why Owners Choose Nestin" className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
              BUILT FOR INDIAN PG OPERATORS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Built for the Way PG Owners Actually Work
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Designed around the practical day-to-day realities of managing student and coliving properties.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyNestinBenefits.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#5fa000]">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <h3 className="text-base font-black font-heading text-slate-900">
                    {benefit.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. TRUST SECTION: Genuine Reliability Pillars                             */}
        {/* ========================================================================= */}
        <section aria-label="Trust and Reliability" className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
              RELIABLE & SECURE
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Built to Make Property Management Simpler.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Engineered around high security, strict data privacy, and transparent operations for property owners.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {[
              {
                title: 'Secure Authentication',
                desc: 'Protected Google OAuth and verified owner identity checks.',
              },
              {
                title: 'Verified Listings',
                desc: 'Every stay receives on-site verification to build tenant trust.',
              },
              {
                title: 'Organized Tenant Records',
                desc: 'Encrypted storage for resident identity cards and contact data.',
              },
              {
                title: 'Transparent Management',
                desc: 'Zero concealed platform fees or forced middleman markups.',
              },
              {
                title: 'Centralized Property Data',
                desc: 'Real-time room allotment and vacancy synchronization across devices.',
              },
            ].map((pillar, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-xl bg-[#a3e635]/20 flex items-center justify-center text-slate-950">
                  <ShieldCheck className="w-4 h-4 text-[#5fa000]" />
                </div>
                <h3 className="text-sm font-black font-heading text-slate-900 mt-2">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ Accordion)                             */}
        {/* ========================================================================= */}
        <section id="faq" aria-label="Frequently Asked Questions" className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
              GOT QUESTIONS?
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Frequently Asked Questions for Owners
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Find clear answers to common questions about listing and managing your PG on Nestin.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="font-extrabold text-sm sm:text-base font-heading text-slate-900">
                      {faq.question}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen
                          ? 'bg-[#a3e635] text-slate-950 rotate-180'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. FINAL CTA: Ready to Manage Your PG Smarter?                           */}
        {/* ========================================================================= */}
        <section aria-label="Final Conversion CTA" className="pt-4">
          <div className="bg-white rounded-3xl sm:rounded-[36px] border border-slate-200/90 p-8 sm:p-14 text-center space-y-6 shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
              Ready to Manage Your PG Smarter?
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
              Join Nestin and bring your property management, bookings, vacancies, and payments into one place.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                id="final-list-pg-btn"
                onClick={handleListPG}
                className="w-full sm:w-auto bg-[#a3e635] hover:bg-[#92d428] text-[#0F5132] font-extrabold text-sm sm:text-base px-9 py-4 rounded-full shadow-md transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap font-heading"
              >
                <span>List Your PG</span>
                <ArrowRight className="w-4 h-4 text-[#0F5132] stroke-[2.5]" />
              </button>

              <button
                type="button"
                id="final-request-demo-btn"
                onClick={handleRequestDemo}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-extrabold text-sm sm:text-base px-8 py-4 rounded-full shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center whitespace-nowrap"
              >
                Request a Demo
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Owner Auth Modal */}
      <NestInAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole="owner"
        initialTab="signup"
      />
    </div>
  );
};
