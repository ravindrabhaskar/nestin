import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MoveHorizontal, RotateCcw, Compass, CheckCircle } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

interface Virtual360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
}

export const Virtual360Modal: React.FC<Virtual360ModalProps> = ({
  isOpen,
  onClose,
  propertyName,
}) => {
  const [rotation, setRotation] = useState(0);
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[80vh]"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#a3e635]" />
              <h3 className="font-extrabold text-base font-heading">
                360° Virtual Tour • {propertyName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center group cursor-grab active:cursor-grabbing">
            <motion.div
              style={{ transform: `rotateY(${rotation}deg)` }}
              className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
            >
              <img
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80"
                alt="360 View"
                className="w-full h-full object-cover scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

              {/* Hotspots */}
              <div className="absolute top-1/3 left-1/3 bg-[#a3e635] text-slate-950 px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1 animate-bounce">
                <Compass className="w-3.5 h-3.5" />
                <span>Private Study Desk</span>
              </div>

              <div className="absolute bottom-1/3 right-1/3 bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Attached Bathroom & Geyser</span>
              </div>
            </motion.div>

            {/* Instruction Banner */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-3 pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-[#a3e635]" />
                <span>Drag horizontally or use buttons to rotate room view</span>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRotation((r) => r - 45)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Rotate Left (-45°)
              </button>
              <button
                onClick={() => setRotation(0)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={() => setRotation((r) => r + 45)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Rotate Right (+45°)
              </button>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Nestin HD 360° Room Viewer
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
