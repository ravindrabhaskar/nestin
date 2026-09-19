import React, { useState } from 'react';
import { RefreshCw, PauseCircle, PlayCircle, XCircle, ExternalLink } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';

/** UPI autopay for rent: set up once, rent is collected automatically on the chosen day. */
export const AutopayCard: React.FC<{ onNotice?: (m: string) => void }> = ({ onNotice }) => {
  const mandate = useApiResource(() => ApiClient.tenant.autopay(), null as any, { label: 'Could not load autopay' });
  const [day, setDay] = useState(5);
  const [busy, setBusy] = useState(false);
  const m = mandate.data;
  const live = m && m.status !== 'cancelled';

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      onNotice?.(ok);
      await mandate.reload();
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3 text-xs">
      <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Rent autopay
      </h2>
      {live ? (
        <div className="space-y-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="font-bold text-slate-900">
              ₹{m.amount.toLocaleString('en-IN')} on day {m.dayOfMonth} of every month · {m.propertyName}
            </div>
            <div className="text-slate-600 mt-0.5">
              Status: <b className="capitalize">{m.status.replace('_', ' ')}</b>
              {m.status === 'active' ? ` · next charge ${m.nextChargeAt.slice(0, 10)}` : ''}
              {m.lastChargedAt ? ` · last charged ${m.lastChargedAt.slice(0, 10)}` : ''}
            </div>
            {m.status === 'pending_auth' && m.authorizationUrl && (
              <a
                href={m.authorizationUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#a3e635] text-slate-950 font-black"
              >
                <ExternalLink className="w-3 h-3" /> Authorise with your bank / UPI app
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {m.status === 'active' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => ApiClient.tenant.updateAutopay(m.id, 'pause'), 'Autopay paused')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" /> Pause
              </button>
            )}
            {m.status === 'paused' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => ApiClient.tenant.updateAutopay(m.id, 'resume'), 'Autopay resumed')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-[#a3e635] font-black flex items-center gap-1 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Resume
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => ApiClient.tenant.updateAutopay(m.id, 'cancel'), 'Autopay cancelled')}
              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <p className="text-slate-600 mb-2">
              Never miss rent day: set up a UPI autopay mandate once and your monthly rent is collected automatically.
              You can pause or cancel any time.
            </p>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Collect on day of month</label>
            <select
              aria-label="Day of month"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => ApiClient.tenant.createAutopay({ dayOfMonth: day }), 'Autopay set up')}
            className="h-10 px-4 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-60"
          >
            Set up autopay
          </button>
        </div>
      )}
    </section>
  );
};
