import React, { useState } from 'react';
import { Upload, Download, TrendingUp, Building2, AlertTriangle } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { usePropertyListing } from '../../context/PropertyListingContext';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Insights: occupancy forecast, property-vs-property comparison, and CSV import of existing residents. */
export const InsightsView: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const forecast = useApiResource(() => ApiClient.operations.forecast(), null as any, {
    label: 'Could not load forecast',
  });
  const comparison = useApiResource(() => ApiClient.operations.comparison(), [] as any[], {
    label: 'Could not load comparison',
  });
  const { refresh: refreshProperties } = usePropertyListing();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await ApiClient.operations.importResidents(csv);
      setResult(res);
      showToast(
        `Imported ${res.imported} resident${res.imported === 1 ? '' : 's'}${res.errors.length ? `, ${res.errors.length} row${res.errors.length === 1 ? '' : 's'} need attention` : ''}`
      );
      await Promise.all([refreshProperties?.(), forecast.reload(), comparison.reload()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then(setCsv);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">Insights</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
          Where occupancy is heading, which property needs attention, and bulk onboarding.
        </p>
      </div>

      {forecast.data && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Occupancy forecast
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] uppercase font-bold text-slate-500">Today</div>
              <div className="text-xl font-black font-heading">{forecast.data.occupancyNow}%</div>
              <div className="text-[11px] text-slate-500">
                {forecast.data.occupiedNow} / {forecast.data.totalBeds} beds
              </div>
            </div>
            {forecast.data.horizons.map((h: any) => (
              <div key={h.days} className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500">In {h.days} days</div>
                <div
                  className={`text-xl font-black font-heading ${h.projectedOccupancy < forecast.data.occupancyNow ? 'text-rose-700' : 'text-emerald-700'}`}
                >
                  {h.projectedOccupancy}%
                </div>
                <div className="text-[11px] text-slate-500">
                  −{h.expectedMoveOuts} move-outs · +{h.expectedMoveIns} move-ins
                </div>
              </div>
            ))}
          </div>
          {forecast.data.horizons[2].vacatingResidents.length > 0 && (
            <div className="text-xs">
              <div className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Vacating in the next 90 days — start marketing
                these beds
              </div>
              <ul className="grid sm:grid-cols-2 gap-1 text-slate-600">
                {forecast.data.horizons[2].vacatingResidents.map((r: any) => (
                  <li key={r.customerId}>
                    {r.name} · {r.propertyName} / {r.roomName} · {r.date}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-black font-heading flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Property comparison
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-2.5">Property</th>
                <th className="text-right px-3 py-2.5">Occupancy</th>
                <th className="text-right px-3 py-2.5">Collection</th>
                <th className="text-right px-3 py-2.5">Overdue</th>
                <th className="text-right px-3 py-2.5">Revenue 30d</th>
                <th className="text-right px-3 py-2.5">Expenses 30d</th>
                <th className="text-right px-3 py-2.5">Open tickets</th>
                <th className="text-right px-3 py-2.5">Rating</th>
                <th className="text-right px-5 py-2.5">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparison.data.map((r) => (
                <tr key={r.propertyId} className={r.collectionRate < 70 || r.occupancy < 50 ? 'bg-rose-50/40' : ''}>
                  <td className="px-5 py-2.5 font-bold text-slate-900">
                    {r.propertyName} <span className="text-slate-400 font-medium">· {r.city}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{r.occupancy}%</td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold ${r.collectionRate < 70 ? 'text-rose-700' : 'text-emerald-700'}`}
                  >
                    {r.collectionRate}%
                  </td>
                  <td className="px-3 py-2.5 text-right">{r.overdueResidents}</td>
                  <td className="px-3 py-2.5 text-right">{inr(r.revenue30d)}</td>
                  <td className="px-3 py-2.5 text-right">{inr(r.expenses30d)}</td>
                  <td className="px-3 py-2.5 text-right">{r.openTickets}</td>
                  <td className="px-3 py-2.5 text-right">{r.rating ? r.rating.toFixed(1) : '—'}</td>
                  <td className="px-5 py-2.5 text-right">{r.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import existing residents (CSV)
          </h2>
          <a
            href={ApiClient.operations.importTemplateUrl}
            className="text-xs font-bold text-slate-700 flex items-center gap-1 hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download template
          </a>
        </div>
        <p className="text-xs text-slate-500">
          Columns: fullName, phone, email, property, room, bed, monthlyRent, securityDeposit, moveInDate,
          expectedMoveOutDate. Property and room accept names or ids; leave bed empty to take the first free one.
          Residents already in the workspace (same phone) are skipped.
        </p>
        <input
          aria-label="CSV file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="text-xs"
        />
        <textarea
          aria-label="CSV content"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          placeholder="…or paste CSV here"
          className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono"
        />
        <button
          type="button"
          disabled={busy || !csv.trim()}
          onClick={runImport}
          className="px-4 py-2 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-black font-heading cursor-pointer disabled:opacity-50"
        >
          {busy ? 'Importing…' : 'Import residents'}
        </button>
        {result && (
          <div className="text-xs space-y-1">
            <div className="font-bold text-slate-900">
              Imported {result.imported} · skipped {result.skipped} · {result.errors.length} error
              {result.errors.length === 1 ? '' : 's'}
            </div>
            {result.errors.map((e: any) => (
              <div key={e.row} className="text-rose-700">
                Row {e.row}: {e.message}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
