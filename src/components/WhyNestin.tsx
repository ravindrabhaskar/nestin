import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Building2,
  FileText,
  Tag,
  Truck,
  Home,
  ChevronDown,
  Search,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { WHY_NESTIN_FEATURES } from '../data/landingData';

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-6 h-6" strokeWidth={2} />,
  Building2: <Building2 className="w-6 h-6" strokeWidth={2} />,
  FileText: <FileText className="w-6 h-6" strokeWidth={2} />,
  Tag: <Tag className="w-6 h-6" strokeWidth={2} />,
  Truck: <Truck className="w-6 h-6" strokeWidth={2} />,
  Home: <Home className="w-6 h-6" strokeWidth={2} />,
};

interface FAQItemData {
  id: string;
  question: string;
  answer: string;
  category: 'General' | 'Booking' | 'Verification' | 'Owners';
}

const FAQ_LIST_COMPREHENSIVE: FAQItemData[] = [
  {
    id: 'faq-1',
    category: 'General',
    question: 'What is Nestin?',
    answer:
      'Nestin is India\'s technology platform that helps students and working professionals discover verified PGs, hostels, co-living spaces, and rental accommodations across major tech cities.',
  },
  {
    id: 'faq-2',
    category: 'General',
    question: 'How does Nestin work?',
    answer:
      'Search by city, landmark, or budget, compare verified photos and transparent prices, schedule a virtual or physical visit, and complete your digital agreement online in minutes.',
  },
  {
    id: 'faq-3',
    category: 'General',
    question: 'Is Nestin free for tenants?',
    answer:
      'Yes! Browsing, comparing properties, scheduling visits, and directly contacting verified property owners on Nestin is 100% free for tenants with zero brokerage.',
  },
  {
    id: 'faq-4',
    category: 'Booking',
    question: 'How do I book or schedule a visit?',
    answer:
      'Select your preferred room, pick your move-in date, click "Book Visit" or "Reserve Now", and complete the quick digital verification to secure your stay.',
  },
  {
    id: 'faq-5',
    category: 'Verification',
    question: 'How are properties on Nestin verified?',
    answer:
      'Every property undergoes a 25-point on-site audit covering fire safety, CCTV coverage, food hygiene, Wi-Fi bandwidth, room dimensions, and owner identity checks.',
  },
  {
    id: 'faq-6',
    category: 'General',
    question: 'Are there any hidden charges or brokerage fees?',
    answer:
      'Never. We enforce 100% pricing transparency. You see exact monthly rent, security deposit terms, maintenance charges, and utility inclusions upfront before booking.',
  },
  {
    id: 'faq-7',
    category: 'Booking',
    question: 'What is the cancellation and refund policy?',
    answer:
      'We offer flexible cancellation policies. If you cancel at least 48 hours before your scheduled move-in date, you receive a 100% full refund on your deposit.',
  },
  {
    id: 'faq-8',
    category: 'Owners',
    question: 'How do property owners list on Nestin?',
    answer:
      'Property owners and multi-city PG operators can register on our Owner Partner Portal to list, manage, and track vacancies across multiple properties from a single dashboard.',
  },
];

interface WhyNestinProps {
  onSelectFeature?: (id: string) => void;
}

export const WhyNestin: React.FC<WhyNestinProps> = ({ onSelectFeature }) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; cardId: string }>>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'General' | 'Booking' | 'Verification' | 'Owners'>('All');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now(), x, y, cardId };

    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    if (onSelectFeature) onSelectFeature(cardId);
  };

  const filteredFaqs = FAQ_LIST_COMPREHENSIVE.filter((faq) => {
    const matchesTab = activeTab === 'All' || faq.category === activeTab;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <section id="why-nestin" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 sm:space-y-24">
      {/* SECTION 1: 6 Core Feature Cards */}
      <div>
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <span className="text-caption font-bold tracking-widest text-slate-500 uppercase font-heading">
            WHY CHOOSE NESTIN
          </span>
          <h2 className="text-h1 sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#121820] leading-tight">
            Everything you need in{' '}
            <span className="text-[#88d900] underline decoration-[#a3e635]/40 underline-offset-8">
              one place.
            </span>
          </h2>
          <p className="text-slate-600 text-body-lg">
            From verified homes to hassle-free agreements, every part of your move is handled.
          </p>
        </div>

        {/* Grid of 6 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {WHY_NESTIN_FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -8 }}
              onClick={(e) => handleCardClick(e, feature.id)}
              className="relative overflow-hidden bg-white/90 backdrop-blur-sm p-7 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs transition-all duration-300 hover:scale-[1.025] hover:shadow-2xl hover:shadow-[#a3e635]/15 hover:border-[#a3e635] cursor-pointer group flex flex-col justify-between"
            >
              {ripples
                .filter((r) => r.cardId === feature.id)
                .map((r) => (
                  <span
                    key={r.id}
                    className="absolute bg-[#a3e635]/40 rounded-full animate-ping pointer-events-none"
                    style={{
                      left: r.x - 20,
                      top: r.y - 20,
                      width: 40,
                      height: 40,
                    }}
                  />
                ))}

              <div className="space-y-4 relative z-10">
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="w-12 h-12 rounded-2xl bg-[#a3e635]/25 text-[#1a202c] flex items-center justify-center transition-colors group-hover:bg-[#a3e635]"
                >
                  {ICON_MAP[feature.icon] || <ShieldCheck className="w-6 h-6" />}
                </motion.div>

                <h3 className="text-xl font-bold text-[#121820] font-heading group-hover:text-black transition-colors">
                  {feature.title}
                </h3>

                <p className="text-slate-600 text-sm leading-relaxed font-sans">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SECTION 2: 2-Column FAQ Accordion (Matching Reference Video) */}
      <div id="faq" className="pt-8 border-t border-slate-200/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Side Header Sticky */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-28">
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase font-heading">
              WHY NESTIN
            </span>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#121820] font-heading leading-tight">
              Answers before{' '}
              <span className="text-[#a3e635] bg-clip-text">
                you <span className="text-[#84cc00]">move in.</span>
              </span>
            </h3>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Everything people ask us most, in one place. Still unsure? Our team replies within a few hours.
            </p>

            {/* Quick Search in Left Column */}
            <div className="relative pt-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. verified, deposit)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#a3e635]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5" />
            </div>
          </div>

          {/* Right Side Accordion List */}
          <div className="lg:col-span-7 space-y-2">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-bold text-slate-700">No matching questions found.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-[#84cc00] underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border-b border-stone-200/90 py-1 transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full py-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none group"
                    >
                      <span className="font-bold text-[#121820] text-base sm:text-lg font-heading group-hover:text-[#5fa000] transition-colors">
                        {faq.question}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-[#a3e635]/30 text-slate-600 group-hover:text-slate-900 flex items-center justify-center transition-all flex-shrink-0">
                        {isOpen ? (
                          <span className="text-lg font-bold leading-none text-slate-900">-</span>
                        ) : (
                          <span className="text-lg font-bold leading-none text-slate-600">+</span>
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                        >
                          <div className="pb-5 pr-8 text-slate-600 text-sm leading-relaxed font-sans">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
