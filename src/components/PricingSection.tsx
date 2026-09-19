import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { PLANS, PLAN_ORDER, formatInr } from '../lib/domain/plans';

interface Props {
  onChoosePlan: () => void;
  onRequestDemo: () => void;
}

/** Public pricing — rendered from the same catalogue the server enforces, so it can never drift. */
export const PricingSection: React.FC<Props> = ({ onChoosePlan, onRequestDemo }) => {
  const [interval, setInterval_] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <section id="pricing" aria-label="Pricing" className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-[11px] font-extrabold tracking-widest text-[#5fa000] uppercase font-heading bg-[#a3e635]/20 border border-[#a3e635]/40 px-3.5 py-1 rounded-full inline-block">
          SIMPLE PRICING
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 tracking-tight">
          Start free. Pay only when NestIn runs your business.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Every new owner gets a 14-day Professional trial. Prices are per workspace, exclusive of 18% GST, and you can
          cancel any time.
        </p>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-bold">
          {(['monthly', 'yearly'] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval_(i)}
              className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer ${interval === i ? 'bg-slate-900 text-[#a3e635]' : 'text-slate-600'}`}
            >
              {i === 'monthly' ? 'Monthly' : 'Yearly · save 20%'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLAN_ORDER.map((id, idx) => {
          const plan = PLANS[id];
          const price = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-3xl p-6 flex flex-col gap-5 border ${plan.recommended ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black font-heading">{plan.name}</h3>
                {plan.recommended && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#a3e635] text-slate-900">
                    Most popular
                  </span>
                )}
              </div>
              <p className={`text-xs ${plan.recommended ? 'text-slate-300' : 'text-slate-500'} min-h-[2.5rem]`}>
                {plan.tagline}
              </p>
              <div>
                <span className="text-4xl font-black font-heading">{price === 0 ? 'Free' : formatInr(price)}</span>
                {price > 0 && (
                  <span className={`text-xs ${plan.recommended ? 'text-slate-300' : 'text-slate-500'}`}>
                    {' '}
                    /month{interval === 'yearly' ? ', billed yearly' : ''}
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-xs flex-1">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${plan.recommended ? 'text-[#a3e635]' : 'text-[#65a30d]'}`}
                    />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={plan.id === 'business' ? onRequestDemo : onChoosePlan}
                className={`w-full py-3 rounded-xl text-xs font-black cursor-pointer transition-colors ${plan.recommended ? 'bg-[#a3e635] text-slate-950 hover:bg-[#92d428]' : 'bg-slate-900 text-[#a3e635] hover:bg-slate-800'}`}
              >
                {plan.id === 'starter'
                  ? 'List your PG free'
                  : plan.id === 'business'
                    ? 'Talk to sales'
                    : 'Start 14-day trial'}
              </button>
            </motion.div>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-slate-500 max-w-2xl mx-auto">
        Online rent collection is available on every plan. Where a platform fee applies to online payments it is shown
        to you before you enable it — cash and manual entries are always free.
      </p>
    </section>
  );
};
