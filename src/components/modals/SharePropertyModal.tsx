import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { DetailedProperty } from '../../data/propertyDetailsHelper';
import {
  WhatsAppLogoIcon,
  TelegramLogoIcon,
  FacebookLogoIcon,
  GmailLogoIcon,
} from '../ui/SocialIcons';
import { useScrollLock } from '../../hooks/useScrollLock';

interface SharePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: DetailedProperty;
}

export const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const [copied, setCopied] = useState(false);
  useScrollLock(isOpen);
  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/properties/${property.slug || property.id}`
    : `https://nestin.co/properties/${property.slug || property.id}`;

  const shareText = `Check out ${property.name || property.title} on Nestin! Verified PG in ${property.area || property.city}, rent starting at ₹${(property.rent || 10000).toLocaleString('en-IN')}/mo. ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#FAF9F5] text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 z-10 overflow-hidden space-y-5"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-[#a3e635] flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold font-heading text-slate-900">
                Share Property Listing
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1">
                {property.name || property.title}
              </p>
            </div>
          </div>

          {/* Copy Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Copy Share Link</label>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-2xl p-1.5 pl-3.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 text-xs text-slate-700 font-mono focus:outline-none bg-transparent truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#a3e635]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Channels */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Share Directly via</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-[#E7FCE9] hover:bg-[#D3F9D7] text-[#075E54] border border-[#25D366]/40 text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs group"
              >
                <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <WhatsAppLogoIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-extrabold text-[#075E54]">WhatsApp</span>
              </a>

              <a
                href={`https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-[#E8F6FD] hover:bg-[#D5EEFC] text-[#0088CC] border border-[#229ED9]/40 text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs group"
              >
                <div className="w-8 h-8 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <TelegramLogoIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-extrabold text-[#0088CC]">Telegram</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-[#EBF3FF] hover:bg-[#D6E6FF] text-[#1877F2] border border-[#1877F2]/30 text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs group"
              >
                <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <FacebookLogoIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-extrabold text-[#1877F2]">Facebook</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent(`PG Stay Option: ${property.name}`)}&body=${encodeURIComponent(shareText)}`}
                className="p-3 rounded-2xl bg-[#FFF5F5] hover:bg-[#FFEAEB] text-[#EA4335] border border-[#EA4335]/30 text-center flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs group"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform border border-slate-200/80 p-1.5">
                  <GmailLogoIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-extrabold text-[#EA4335]">Gmail / Email</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
