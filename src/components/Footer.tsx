import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { NestInLogo } from './NestInLogo';
import { Globe, Twitter, Linkedin, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onSelectCity: (city: string) => void;
  onOpenListProperty?: () => void;
  onOpenFAQ: () => void;
  onNavigate?: (page: 'home' | 'about' | 'contact', sectionId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCity,
  onOpenFAQ,
  onNavigate,
}) => {
  const navigate = useNavigate();

  return (
    <footer id="footer-section" className="w-full bg-[#0F5132] text-white py-12 sm:py-16 lg:py-20 relative overflow-hidden mt-12">
      {/* Subtle Ambient Light Effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#a3e635]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Brand Info & Socials (Col 1-2) */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className="cursor-pointer inline-block"
              onClick={() => {
                if (onNavigate) onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <NestInLogo variant="dark" showTagline={true} />
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xs font-sans">
              India's verified student accommodation network. Audited properties, instant bookings, and zero brokerage.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {[
                { icon: <Globe className="w-4 h-4" />, href: '#', label: 'Website' },
                { icon: <Twitter className="w-4 h-4" />, href: '#', label: 'Twitter' },
                { icon: <Linkedin className="w-4 h-4" />, href: '#', label: 'LinkedIn' },
              ].map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.15, rotate: 6 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 rounded-full bg-emerald-950/40 border border-emerald-400/30 flex items-center justify-center text-slate-200 hover:text-[#a3e635] hover:border-[#a3e635] hover:shadow-[0_0_15px_rgba(163,230,53,0.4)] transition-all duration-300"
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Col 3: FIND A PG */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#a3e635] tracking-widest uppercase font-heading">
              FIND A PG
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300 font-sans">
              {['Bengaluru', 'Hyderabad', 'Pune', 'Delhi NCR', 'Chennai'].map((city) => (
                <li key={city}>
                  <button
                    onClick={() => onSelectCity(city)}
                    className="hover:text-white transition-colors relative group py-0.5 text-left cursor-pointer"
                  >
                    <span>{city}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#a3e635] transition-all duration-300 group-hover:w-full" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: PLATFORM & TRUST */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#a3e635] tracking-widest uppercase font-heading">
              PLATFORM TRUST
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300 font-sans">
              {['100% Physical Audits', 'Verified Hostels', 'Zero Brokerage Guarantee', '24/7 Security Hotline'].map((item) => (
                <li key={item} className="text-slate-300 py-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#a3e635] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: COMPANY */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#a3e635] tracking-widest uppercase font-heading">
              COMPANY
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300 font-sans">
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors relative group py-0.5 text-left cursor-pointer"
                >
                  <span>About us</span>
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#a3e635] transition-all duration-300 group-hover:w-full" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors relative group py-0.5 text-left cursor-pointer"
                >
                  <span>Contact</span>
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#a3e635] transition-all duration-300 group-hover:w-full" />
                </button>
              </li>
              {['Campus Partnerships', 'Press Releases'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('about');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors relative group py-0.5 text-left cursor-pointer"
                  >
                    <span>{item}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#a3e635] transition-all duration-300 group-hover:w-full" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 6: RESOURCES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#a3e635] tracking-widest uppercase font-heading">
              RESOURCES
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-300 font-sans">
              <li>
                <button
                  onClick={onOpenFAQ}
                  className="hover:text-white transition-colors relative group py-0.5 text-left cursor-pointer"
                >
                  <span>FAQs</span>
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#a3e635] transition-all duration-300 group-hover:w-full" />
                </button>
              </li>
              {['Student Guide', 'Safety Standards', 'Resident Policies'].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={onOpenFAQ}
                    className="hover:text-white transition-colors relative group py-0.5 inline-block cursor-pointer text-left"
                  >
                    <span>{item}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#a3e635] transition-all duration-300 group-hover:w-full" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Giant Watermark Brand Text */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 whitespace-nowrap text-[#a3e635] leading-none text-center font-heading uppercase"
          style={{
            fontSize: 'clamp(100px, 18vw, 240px)',
            fontWeight: 900,
            opacity: 0.03,
          }}
        >
          NESTIN
        </div>

        {/* Bottom Border & Copyright */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-sans relative z-10">
          <p>© 2026 NestIn Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={onOpenFAQ}
              className="hover:text-[#a3e635] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-emerald-800">•</span>
            <button
              onClick={onOpenFAQ}
              className="hover:text-[#a3e635] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-emerald-800">•</span>
            <button
              onClick={onOpenFAQ}
              className="hover:text-[#a3e635] transition-colors cursor-pointer"
            >
              Resident Code of Conduct
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
