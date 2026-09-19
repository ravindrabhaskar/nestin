import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface DualCardsSectionProps {
  onFindPG?: () => void;
  onListPG?: () => void;
}

export const DualCardsSection: React.FC<DualCardsSectionProps> = ({ onFindPG, onListPG }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const handleTenantClick = () => {
    if (onFindPG) {
      onFindPG();
    } else {
      navigate('/find-pg');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOwnerClick = () => {
    if (onListPG) {
      onListPG();
    } else if (isAuthenticated && (user?.role as string) === 'owner') {
      navigate('/owner/dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/for-owners');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section
      id="experience-audience-split"
      aria-label="Nestin for Tenants and Owners"
      className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        {/* ========================================================================= */}
        {/* LEFT CARD — FOR TENANTS (Deep Green Nestin Theme)                         */}
        {/* ========================================================================= */}
        <motion.div
          id="for-tenants-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="group relative bg-[#0F5132] text-white p-7 sm:p-9 lg:p-12 rounded-[28px] sm:rounded-[32px] md:rounded-[36px] overflow-hidden flex flex-col justify-between min-h-[460px] sm:min-h-[500px] shadow-xl border border-emerald-700/50 transition-all duration-200 hover:border-emerald-600"
        >
          {/* CONTENT COLUMN */}
          <div className="relative z-10 space-y-5 sm:space-y-6 max-w-full sm:max-w-md">
            {/* AUDIENCE LABEL */}
            <span className="inline-block text-[11px] sm:text-xs font-bold tracking-[0.2em] text-[#a3e635] uppercase font-heading">
              FOR TENANTS
            </span>

            {/* HEADLINE */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight font-heading leading-[1.12] text-white">
              Find. Compare.
              <br />
              Book. All in one
              <br />
              place.
            </h2>

            {/* SUPPORTING BENEFITS */}
            <ul className="space-y-3 pt-1">
              {[
                'Search verified homes near you',
                'Compare prices, photos and amenities',
                'Schedule visits and book online',
                'Safety and support you can rely on',
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <span className="shrink-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#a3e635] stroke-[2.8]" />
                  </span>
                  <span className="text-xs sm:text-sm text-emerald-100 font-normal leading-snug">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* PRIMARY CTA BUTTON */}
            <div className="pt-3 sm:pt-4">
              <button
                type="button"
                id="tenant-cta-button"
                onClick={handleTenantClick}
                className="bg-[#a3e635] hover:bg-[#92d428] text-[#0F5132] font-extrabold text-sm sm:text-base px-8 py-3.5 sm:py-4 rounded-full shadow-md transition-all duration-200 cursor-pointer active:scale-95 inline-flex items-center justify-center whitespace-nowrap font-heading"
              >
                Find your PG
              </button>
            </div>
          </div>

          {/* BOTTOM-RIGHT ORGANIC CIRCULAR CUTOUT IMAGE */}
          <div className="absolute bottom-0 right-0 w-[190px] sm:w-[240px] md:w-[280px] h-[190px] sm:h-[240px] md:h-[270px] overflow-hidden rounded-tl-[160px] sm:rounded-tl-[200px] md:rounded-tl-[220px] pointer-events-none z-0 select-none">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80"
              alt="Tenant relaxing in a cozy room while searching for accommodation on smartphone"
              className="w-full h-full object-cover object-top filter brightness-95 contrast-105 group-hover:scale-105 transition-transform duration-300 ease-out"
            />
            {/* Subtle dark bottom gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F5132]/80 via-transparent to-transparent" />
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* RIGHT CARD — FOR OWNERS (Clean White Theme)                                */}
        {/* ========================================================================= */}
        <motion.div
          id="for-owners-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="group relative bg-white text-slate-900 p-7 sm:p-9 lg:p-12 rounded-[28px] sm:rounded-[32px] md:rounded-[36px] overflow-hidden flex flex-col justify-between min-h-[460px] sm:min-h-[500px] shadow-sm border border-slate-200/90 transition-all duration-200 hover:shadow-md hover:border-slate-300"
        >
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6 sm:space-y-8">
            {/* TOP/MAIN CONTENT */}
            <div className="space-y-5 sm:space-y-6 max-w-full sm:max-w-[280px] md:max-w-[320px] lg:max-w-[290px] xl:max-w-[340px]">
              {/* AUDIENCE LABEL */}
              <span className="inline-block text-[11px] sm:text-xs font-bold tracking-[0.2em] text-slate-500 uppercase font-heading">
                FOR OWNERS
              </span>

              {/* HEADLINE WITH LIME HIGHLIGHT */}
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight font-heading leading-[1.12] text-slate-900">
                Grow your PG business <br />
                <span className="text-[#84cc16]">with smarter tools.</span>
              </h2>

              {/* SUPPORTING BENEFITS */}
              <ul className="space-y-3 pt-1">
                {[
                  'List your property fast and free',
                  'Manage bookings and payments',
                  'Reach verified, ready-to-move tenants',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span className="shrink-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#84cc16] stroke-[2.8]" />
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 font-normal leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PRIMARY CTA BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                id="owner-cta-button"
                onClick={handleOwnerClick}
                className="bg-[#0F5132] hover:bg-[#146c43] text-white font-extrabold text-sm sm:text-base px-8 py-3.5 sm:py-4 rounded-full shadow-md transition-all duration-200 cursor-pointer active:scale-95 inline-flex items-center justify-center whitespace-nowrap font-heading"
              >
                List your PG
              </button>
            </div>
          </div>

          {/* RIGHT SIDE TALL ROUNDED-RECTANGLE IMAGE FRAME */}
          <div className="hidden sm:block absolute right-6 sm:right-8 lg:right-9 top-8 sm:top-9 lg:top-10 bottom-8 sm:bottom-9 lg:bottom-10 w-[145px] sm:w-[170px] md:w-[195px] lg:w-[185px] xl:w-[210px] rounded-[24px] sm:rounded-[28px] md:rounded-[32px] overflow-hidden shadow-sm border border-slate-100/80 pointer-events-none select-none z-0">
            <img
              src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=700&q=80"
              alt="PG owner holding a digital tablet while standing in the doorway of a clean modern property"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
