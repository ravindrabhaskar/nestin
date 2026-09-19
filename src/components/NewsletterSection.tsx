import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ApiClient } from '../lib/apiClient';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    ApiClient.public
      .newsletter(email)
      .then(() => {
        setStatus('success');
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#063826', '#a3e635', '#ffffff'],
        });
      })
      .catch(() => setStatus('idle'));
  };

  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Vibrant Lime Green Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#a3e635] text-[#121820] rounded-3xl sm:rounded-[36px] p-8 sm:p-12 lg:p-16 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 border border-[#91db1d]"
      >
        {/* Left Text */}
        <div className="space-y-3 max-w-xl text-center lg:text-left z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-heading text-[#121820]">
            Don't miss out.
          </h2>
          <p className="text-slate-900 text-sm sm:text-base font-medium max-w-md">
            Get verified PG listings, offers and moving tips straight to your inbox.
          </p>
        </div>

        {/* Right Email Form */}
        <div className="w-full lg:w-auto z-10">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <div className="relative w-full sm:w-80">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                disabled={status === 'success'}
                className="w-full bg-white px-5 py-3.5 rounded-full text-slate-900 placeholder:text-slate-400 font-medium text-sm border-2 border-transparent focus:border-[#063826] focus:outline-none focus:ring-4 focus:ring-[#063826]/20 transition-all duration-300 shadow-sm"
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={status === 'loading' || status === 'success'}
              className="w-full sm:w-auto bg-[#121820] text-white hover:bg-slate-900 font-bold text-sm px-7 py-3.5 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-90"
            >
              <AnimatePresence mode="wait">
                {status === 'idle' && (
                  <motion.span
                    key="subscribe"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span>Subscribe</span>
                    <Send className="w-4 h-4" />
                  </motion.span>
                )}

                {status === 'loading' && (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-[#a3e635]" />
                    <span>Subscribing...</span>
                  </motion.span>
                )}

                {status === 'success' && (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-[#a3e635]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Subscribed!</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>
        </div>
      </motion.div>
    </section>
  );
};
