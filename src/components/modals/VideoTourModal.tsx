import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

interface VideoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
}

export const VideoTourModal: React.FC<VideoTourModalProps> = ({
  isOpen,
  onClose,
  propertyName,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-extrabold text-base font-heading">
                HD Walkthrough Video Tour • {propertyName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Player Box */}
          <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center group">
            <img
              src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80"
              alt="Video Tour Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/20 transition-colors" />

            {/* Play/Pause Button Overlay */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 rounded-full bg-[#a3e635] text-slate-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-slate-950" />
              ) : (
                <Play className="w-7 h-7 fill-slate-950 ml-1" />
              )}
            </button>

            {/* Video Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 text-white hover:text-[#a3e635] transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-white hover:text-[#a3e635] transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span className="text-xs font-mono text-slate-300">01:24 / 02:45</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Property Video</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
