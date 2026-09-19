import React, { useState } from 'react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Growth: acquisition funnel, conversion, churn and LTV — per city and week over week. */
export const AdminGrowthPanel: React.FC = () => {
  const [days, setDays] = useState(30);
  const analytics = useApiResource(() => ApiClient.admin.analytics(days), null as any, {
    key: String(days),
    label: 'Could not load growth analytics',
  });
  const a = analytics.data;
  if (!a) return <div className="p-10 text-center text-sm text-slate-400">Loading growth analytics…</div>;
  const steps: Array<[string, number]> = [
    ['Listing views', a.funnel.views],
    ['Leads', a.funnel.leads],
    ['Visits', a.funnel.visits],
    ['Bookings', a.funnel.bookings],
    ['Confirmed', a.funnel.confirmed],
    ['Moved in', a.funnel.movedIn],
  ];
  const max = Math.max(1, ...steps.map((s) => s[1]));
  const weeklyMax = Math.max(1, ...a.weekly.map((x: any) => Math.max(x.bookings, x.signups)));
  const tile = (value: React.ReactNode, caption: string, tone = 'text-white') => (
    <div className="rounded-xl bg-slate-800 p-2">
      <div className={`font-black text-base ${tone}`}>{value}</div>
      {caption}
    </div>
  );
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black font-heading">Growth analytics</h2>
        <select
          aria-label="Window"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white"
        >
          {[7, 30, 90, 180].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Funnel</h3>
          <ul className="space-y-2">
            {steps.map(([label, value]) => (
              <li key={label} className="text-xs">
                <div className="flex justify-between font-bold">
                  <span>{label}</span>
                  <span>{value.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-2 rounded bg-slate-800 mt-1">
                  <div className="h-2 rounded bg-[#a3e635]" style={{ width: `${(value / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            {tile(`${a.conversion.leadToBooking}%`, 'lead → booking', 'text-[#a3e635]')}
            {tile(`${a.conversion.bookingToConfirmed}%`, 'booking → confirmed', 'text-[#a3e635]')}
            {tile(`${a.conversion.confirmedToMoveIn}%`, 'confirmed → moved in', 'text-[#a3e635]')}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Retention</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {tile(a.churn.activeResidents, 'active residents')}
              {tile(a.churn.movedOut, 'moved out')}
              {tile(`${a.churn.churnRate}%`, 'churn', 'text-rose-300')}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Lifetime value</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {tile(inr(a.ltv.avgRevenuePerResident), 'revenue / resident')}
              {tile(`${a.ltv.avgTenureMonths} mo`, 'avg tenure')}
              {tile(inr(a.ltv.estimatedLtv), 'estimated LTV', 'text-[#a3e635]')}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400">
          By city
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-500">
              <tr>
                <th className="text-left px-5 py-2">City</th>
                <th className="text-right px-3 py-2">Listings</th>
                <th className="text-right px-3 py-2">Views</th>
                <th className="text-right px-3 py-2">Bookings</th>
                <th className="text-right px-3 py-2">Confirmed</th>
                <th className="text-right px-3 py-2">Residents</th>
                <th className="text-right px-3 py-2">Revenue</th>
                <th className="text-right px-5 py-2">Rev / resident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {a.byCity.map((c: any) => (
                <tr key={c.city}>
                  <td className="px-5 py-2 font-bold">{c.city}</td>
                  <td className="px-3 py-2 text-right">{c.listings}</td>
                  <td className="px-3 py-2 text-right">{c.views}</td>
                  <td className="px-3 py-2 text-right">{c.bookings}</td>
                  <td className="px-3 py-2 text-right">{c.confirmed}</td>
                  <td className="px-3 py-2 text-right">{c.residents}</td>
                  <td className="px-3 py-2 text-right">{inr(c.revenue)}</td>
                  <td className="px-5 py-2 text-right">{inr(c.avgRevenuePerResident)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Week over week</h3>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${a.weekly.length}, minmax(0, 1fr))` }}
          role="img"
          aria-label="Weekly bookings and sign-ups"
        >
          {a.weekly.map((w: any) => (
            <div key={w.week} className="flex flex-col items-center gap-1">
              <div className="flex items-end gap-0.5 h-24 w-full">
                <div
                  title={`${w.bookings} bookings`}
                  className="flex-1 bg-[#a3e635] rounded-t"
                  style={{ height: `${(w.bookings / weeklyMax) * 100}%` }}
                />
                <div
                  title={`${w.signups} sign-ups`}
                  className="flex-1 bg-sky-400 rounded-t"
                  style={{ height: `${(w.signups / weeklyMax) * 100}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500">{w.week.slice(5)}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 mt-2">Green: bookings · Blue: sign-ups</div>
      </div>
    </div>
  );
};
