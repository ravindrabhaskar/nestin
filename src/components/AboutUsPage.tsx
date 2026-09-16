import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  Cpu,
  Sparkles,
  Users,
  Target,
  Compass,
  Building2,
  Award,
  ArrowRight,
  Heart,
} from 'lucide-react';

interface AboutUsPageProps {
  onNavigate: (page: 'home' | 'about' | 'contact', sectionId?: string) => void;
  onOpenAuth: () => void;
  onOpenListProperty?: () => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const navigate = useNavigate();

  const CORE_VALUES = [
    {
      title: '100% Physical Verification',
      desc: 'Our local field auditors inspect every single room, bathroom, fire safety system, and Wi-Fi speed before listing.',
      icon: <ShieldCheck className="w-6 h-6 text-[#5fa000]" />,
    },
    {
      title: 'Zero Hidden Charges',
      desc: 'Complete upfront transparency on security deposits, electricity tariffs, maintenance fees, and food plans.',
      icon: <Eye className="w-6 h-6 text-[#5fa000]" />,
    },
    {
      title: 'Tech-Driven Living',
      desc: 'Instant online rent payments, digital booking receipts, and centralized maintenance SLA tracking.',
      icon: <Cpu className="w-6 h-6 text-[#5fa000]" />,
    },
    {
      title: 'Seamless Discovery',
      desc: 'Smart location search by landmark, metro station proximity, AC preferences, and dietary food filters.',
      icon: <Sparkles className="w-6 h-6 text-[#5fa000]" />,
    },
    {
      title: 'Vibrant Community',
      desc: 'Fostering safe, welcoming accommodation spaces for students and working professionals across India.',
      icon: <Users className="w-6 h-6 text-[#5fa000]" />,
    },
  ];

  const STATS = [
    { value: '142+', label: 'Verified Hostels', sub: 'Across 12 Metro Hubs' },
    { value: '12,400+', label: 'Happy Residents', sub: 'Verified & Secure' },
    { value: '4.8 ★', label: 'Average Resident Rating', sub: 'From 8,200+ Reviews' },
    { value: '100%', label: 'Physical Audit Rate', sub: 'Zero Fake Listings' },
  ];

  const VERIFICATION_STEPS = [
    {
      step: '01',
      title: 'On-Site Property Audit',
      desc: 'Our certified audit team physically visits every property to inspect building integrity and room dimensions.',
    },
    {
      step: '02',
      title: 'Security & Safety Check',
      desc: 'We verify 24/7 CCTV surveillance, biometric access, security guard credentials, and fire extinguishers.',
    },
    {
      step: '03',
      title: 'Hygiene & Food Inspection',
      desc: 'Kitchen hygiene, water filtration systems (RO), daily housekeeping schedules, and pest control audits.',
    },
    {
      step: '04',
      title: 'Legal & Agreement Check',
      desc: 'Zero hidden clauses in tenant agreements, transparent electricity metering, and clearly defined refund terms.',
    },
  ];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24 font-sans">
      {/* Hero Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 text-[#063826] text-xs font-bold font-heading"
        >
          <Award className="w-3.5 h-3.5 text-[#5fa000]" />
          <span>India's Most Trusted Accommodation Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#121820] font-heading tracking-tight leading-[1.12]"
        >
          Transforming how students find verified homes across India.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-600 text-sm sm:text-base leading-relaxed"
        >
          We founded Nestin with a clear principle: Finding student housing in a new city should be safe, transparent, and completely free from fake listings or hidden charges.
        </motion.p>
      </div>

      {/* Platform Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-2"
          >
            <div className="text-2xl sm:text-4xl font-black text-[#063826] font-heading">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 font-heading">
              {stat.label}
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              {stat.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mission & Vision Split */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-[#063826] p-8 rounded-3xl text-white shadow-lg border border-emerald-800 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center text-[#a3e635]">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-widest text-[#a3e635] uppercase font-heading">
                OUR MISSION
              </span>
            </div>
            <h3 className="text-xl font-bold font-heading">
              To make finding a verified, comfortable stay effortless and 100% transparent for everyone in India.
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              We empower residents with trustworthy information, verified photos, transparent rent ledgers, and zero brokerage.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-[#0F5132] p-8 rounded-3xl text-white shadow-lg border border-emerald-700/50 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center text-[#a3e635]">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-widest text-[#a3e635] uppercase font-heading">
                OUR VISION
              </span>
            </div>
            <h3 className="text-xl font-bold font-heading">
              To build India's standard housing infrastructure for students and young professionals.
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed font-sans">
              Setting nationwide quality standards for hygiene, safety, digital payments, and community living across 50+ tier-1 and tier-2 cities.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Core Values Section */}
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Our Core Pillars
          </h2>
          <p className="text-slate-500 text-sm font-sans">
            The values that drive every audit, feature, and customer interaction at NestIn.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CORE_VALUES.map((val) => (
            <div
              key={val.title}
              className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#a3e635] transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/20 flex items-center justify-center">
                  {val.icon}
                </div>
                <h4 className="font-bold text-slate-900 font-heading text-base leading-snug">
                  {val.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {val.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How We Audit Properties (Nestin Verification Protocol) */}
      <div className="bg-white rounded-3xl sm:rounded-[36px] p-8 sm:p-12 border border-slate-200 shadow-sm space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 px-3 py-1 rounded-full">
            QUALITY ASSURANCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
            The Nestin 4-Point Physical Verification Standard
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-sans">
            Before any property receives the 'Nestin Verified' badge, it undergoes rigorous physical inspection by our ground audit teams.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VERIFICATION_STEPS.map((step) => (
            <div key={step.step} className="p-5 rounded-2xl bg-[#FAF9F5] border border-slate-200/80 space-y-3 relative">
              <span className="text-2xl font-black text-[#a3e635] font-heading">
                {step.step}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Banner */}
      <div className="bg-[#0F5132] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading">
            Ready to find your next home?
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm font-sans">
            Explore audited student hostels and verified PGs in top educational hubs with zero brokerage.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                navigate('/find-pg');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-[#a3e635] text-[#0F5132] font-bold text-sm px-7 py-3.5 rounded-full hover:bg-[#8ece28] transition-all cursor-pointer shadow-lg flex items-center gap-2 font-heading"
            >
              <span>Explore Verified Stays</span>
              <ArrowRight className="w-4 h-4 text-[#0F5132]" />
            </button>
            <button
              onClick={() => {
                navigate('/contact');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-emerald-950/80 border border-emerald-500/40 text-white font-bold text-sm px-7 py-3.5 rounded-full hover:bg-emerald-900 transition-all cursor-pointer font-heading"
            >
              Contact Support Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
