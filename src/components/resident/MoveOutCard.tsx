import React, { useState } from 'react';
import { LogOut, CalendarClock, Wallet } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';

const STATUS_LABEL: Record<string, string> = {
  requested: 'Notice received — awaiting inspection date',
  inspection_scheduled: 'Inspection scheduled',
  inspected: 'Inspection done — deposit statement ready',
  settled: 'Deposit settled',
  cancelled: 'Cancelled',
};

/** Resident side of the move-out & deposit workflow. Rendered on the Bookings page for active residents. */
export const MoveOutCard: React.FC<{ hasActiveStay: boolean; onNotice?: (m: string) => void }> = ({
  hasActiveStay,
  onNotice,
}) => {
  const moveOut = useApiResource(() => ApiClient.tenant.moveOut(), null as any, {
    label: 'Could not load move-out status',
  });
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const m = moveOut.data;
  const active = m && !['cancelled', 'settled'].includes(m.status);
  if (!hasActiveStay && !m) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ApiClient.tenant.requestMoveOut({ moveOutDate: date, reason });
      onNotice?.('Move-out notice sent to your owner');
      await moveOut.reload();
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
      <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
        <LogOut className="w-4 h-4" /> Moving out
      </h2>
      {active || m?.status === 'settled' ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" /> {STATUS_LABEL[m.status]}
            </div>
            <div className="text-slate-600 mt-1">
              Vacating {m.propertyName} on <b>{m.requestedMoveOutDate}</b> ({m.noticeDays} days notice)
              {m.inspectionDate ? ` · inspection ${m.inspectionDate}` : ''}
            </div>
          </div>
          {(m.status === 'inspected' || m.status === 'settled') && (
            <div className="rounded-xl border border-slate-200 p-3 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Deposit statement
              </div>
              <div className="flex justify-between">
                <span>Security deposit</span>
                <span>₹{m.depositAmount.toLocaleString('en-IN')}</span>
              </div>
              {m.deductions.map((d: any, i: number) => (
                <div key={i} className="flex justify-between text-rose-700">
                  <span>− {d.label}</span>
                  <span>₹{d.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between font-black border-t border-slate-100 pt-1">
                <span>
                  Refund{' '}
                  {m.status === 'settled'
                    ? `(${m.refundMethod}${m.refundReference ? ` · ${m.refundReference}` : ''})`
                    : 'due'}
                </span>
                <span>₹{m.refundAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
          <ol className="text-[11px] text-slate-500 space-y-0.5">
            {m.timeline.map((t: any, i: number) => (
              <li key={i}>
                {t.at.slice(0, 10)} · {t.event}
                {t.note ? ` — ${t.note}` : ''}
              </li>
            ))}
          </ol>
          {active && m.status === 'requested' && (
            <button
              type="button"
              onClick={() => ApiClient.tenant.cancelMoveOut(m.id).then(() => moveOut.reload())}
              className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold cursor-pointer hover:bg-slate-50"
            >
              Withdraw notice
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-2">
          <input
            aria-label="Move-out date"
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200"
          />
          <input
            aria-label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="h-10 px-3 rounded-xl border border-slate-200"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-60"
          >
            Give notice
          </button>
          <p className="sm:col-span-3 text-[11px] text-slate-500">
            Your owner will schedule a room inspection and settle your deposit after you vacate. Check your agreement
            for the notice period.
          </p>
        </form>
      )}
    </section>
  );
};
