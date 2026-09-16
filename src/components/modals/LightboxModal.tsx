import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: { url: string; title: string; category?: string }[];
  initialIndex?: number;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  useScrollLock(isOpen);

  if (!isOpen || !images.length) return null;

  const currentImg = images[currentIndex] || images[0];

  const handlePrev = () => {
    setZoom(1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setZoom(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 text-white">
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
          <div className="text-sm font-semibold">
            <span>{currentImg.title}</span>
            <span className="text-xs text-slate-400 ml-3">
              Photo {currentIndex + 1} of {images.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => (z > 1 ? z - 0.5 : 1))}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoom((z) => (z < 2.5 ? z + 0.5 : 2.5))}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Center Main Image */}
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden">
          <motion.img
            key={currentImg.url}
            src={currentImg.url}
            alt={currentImg.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: zoom }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl transition-transform duration-300"
          />

          {/* Prev/Next Navigation */}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom Thumbnails */}
        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-4 py-2 bg-gradient-to-t from-black/80 to-transparent">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setZoom(1);
                setCurrentIndex(idx);
              }}
              className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                currentIndex === idx ? 'border-[#a3e635] scale-105' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </AnimatePresence>
  );
};
