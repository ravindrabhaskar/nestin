import React, { useState } from 'react';
import { FileSignature, LogOut, Star, Wrench, ExternalLink, Plus } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { useCRM } from '../../context/CRMContext';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const input =
  'h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900';

/** Residents: agreements to sign, move-out & deposit workflow, satisfaction (NPS) and maintenance SLA. */
export const ResidentsView: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const { customers } = useCRM();
  const [tab, setTab] = useState<'agreements' | 'moveouts' | 'satisfaction'>('agreements');
  const agreements = useApiResource(() => ApiClient.crm.agreements(), [] as any[], {
    label: 'Could not load agreements',
  });
  const moveOuts = useApiResource(() => ApiClient.crm.moveOuts(), [] as any[], { label: 'Could not load move-outs' });
  const nps = useApiResource(() => ApiClient.crm.nps(), null as any, { label: 'Could not load satisfaction' });
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [deductions, setDeductions] = useState<Record<string, { label: string; amount: string }>>({});
  const [inspectionDate, setInspectionDate] = useState<Record<string, string>>({});

  const eligible = customers.filter((c) => c.tenantStatus === 'Active' || c.tenantStatus === 'Upcoming');
  const signedFor = new Set(agreements.data.filter((a) => a.status === 'signed').map((a) => a.customerId));

  const send = async () => {
    if (!customerId) return;
    setBusy(true);
    try {
      const a = await ApiClient.crm.createAgreement({ customerId });
      showToast(`Agreement ${a.agreementNumber} sent for signature`);
      setCustomerId('');
      await agreements.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send agreement');
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, body: Record<string, unknown>, success: string) => {
    try {
      await ApiClient.crm.updateMoveOut(id, body);
      showToast(success);
      await moveOuts.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">Residents</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
          Agreements, move-outs and deposit settlements, and how happy your residents are.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-1 w-fit max-w-full">
        {(
          [
            ['agreements', 'Agreements', FileSignature],
            ['moveouts', 'Move-outs', LogOut],
            ['satisfaction', 'Satisfaction', Star],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-xs font-black font-heading cursor-pointer flex items-center gap-1.5 ${tab === key ? 'bg-slate-900 text-[#a3e635]' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'agreements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-end gap-3 text-xs">
            <div className="flex-1 min-w-56">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Send an agreement to</label>
              <select
                aria-label="Resident"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={`${input} w-full`}
              >
                <option value="">Choose a resident…</option>
                {eligible.map((c) => (
                  <option key={c.id} value={c.id} disabled={signedFor.has(c.id)}>
                    {c.fullName} · {c.propertyName} / {c.roomName}
                    {signedFor.has(c.id) ? ' (signed)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !customerId}
              onClick={send}
              className="h-10 px-4 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Generate & send
            </button>
            <p className="w-full text-[11px] text-slate-500">
              The agreement is generated from the resident's room, rent and deposit with standard clauses. They sign it
              with a one-time password; the signed copy is stored in both your Documents.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {agreements.data.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">No agreements yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {agreements.data.map((a) => (
                  <li key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900">
                        {a.agreementNumber} · {a.residentName}
                      </div>
                      <div className="text-slate-500">
                        {a.propertyName} / {a.roomName} · {a.startDate} → {a.endDate} · {inr(a.monthlyRent)}/mo
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${a.status === 'signed' ? 'bg-[#a3e635]/25 text-[#3d6800]' : a.status === 'void' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {a.status === 'sent' ? 'Awaiting signature' : a.status}
                    </span>
                    <a
                      href={`/api/v1/crm/agreements/${a.id}/document`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                    {a.status === 'sent' && (
                      <button
                        type="button"
                        onClick={() => ApiClient.crm.voidAgreement(a.id).then(() => agreements.reload())}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 font-bold cursor-pointer"
                      >
                        Void
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'moveouts' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {moveOuts.data.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No move-out notices. Residents give notice from their Bookings page.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {moveOuts.data.map((m) => (
                <li key={m.id} className="p-5 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">
                        {m.residentName} · {m.propertyName} / {m.roomName} ({m.bedNumber})
                      </div>
                      <div className="text-slate-500">
                        Vacating {m.requestedMoveOutDate} · {m.noticeDays} days notice{m.reason ? ` · ${m.reason}` : ''}{' '}
                        · deposit {inr(m.depositAmount)}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] uppercase">
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                  {m.status === 'requested' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label="Inspection date"
                        type="date"
                        className={input}
                        value={inspectionDate[m.id] || ''}
                        onChange={(e) => setInspectionDate({ ...inspectionDate, [m.id]: e.target.value })}
                      />
                      <button
                        type="button"
                        disabled={!inspectionDate[m.id]}
                        onClick={() =>
                          act(
                            m.id,
                            { action: 'schedule_inspection', inspectionDate: inspectionDate[m.id] },
                            'Inspection scheduled'
                          )
                        }
                        className="h-10 px-4 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-50"
                      >
                        Schedule inspection
                      </button>
                    </div>
                  )}
                  {m.status === 'inspection_scheduled' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label="Deduction label"
                        placeholder="Deduction (e.g. broken chair)"
                        className={input}
                        value={deductions[m.id]?.label || ''}
                        onChange={(e) =>
                          setDeductions({
                            ...deductions,
                            [m.id]: { ...(deductions[m.id] || { amount: '' }), label: e.target.value },
                          })
                        }
                      />
                      <input
                        aria-label="Deduction amount"
                        type="number"
                        min={0}
                        placeholder="₹"
                        className={`${input} w-28`}
                        value={deductions[m.id]?.amount || ''}
                        onChange={(e) =>
                          setDeductions({
                            ...deductions,
                            [m.id]: { ...(deductions[m.id] || { label: '' }), amount: e.target.value },
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          act(
                            m.id,
                            {
                              action: 'record_inspection',
                              deductions:
                                deductions[m.id]?.label && Number(deductions[m.id]?.amount) > 0
                                  ? [{ label: deductions[m.id].label, amount: Number(deductions[m.id].amount) }]
                                  : [],
                            },
                            'Inspection recorded — resident notified of the statement'
                          )
                        }
                        className="h-10 px-4 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer"
                      >
                        Record inspection
                      </button>
                      <span className="text-[11px] text-slate-500">Unpaid dues are added automatically.</span>
                    </div>
                  )}
                  {(m.status === 'inspected' || m.status === 'settled') && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                      {m.deductions.map((d: any, i: number) => (
                        <div key={i} className="flex justify-between text-rose-700">
                          <span>− {d.label}</span>
                          <span>{inr(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black">
                        <span>Refund {m.status === 'settled' ? `paid via ${m.refundMethod}` : 'due'}</span>
                        <span>{inr(m.refundAmount)}</span>
                      </div>
                      {m.status === 'inspected' && (
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              m.id,
                              { action: 'settle', refundMethod: 'Bank Transfer' },
                              'Deposit settled and bed released'
                            )
                          }
                          className="mt-2 h-10 px-4 rounded-xl bg-[#a3e635] text-slate-950 font-black cursor-pointer"
                        >
                          Mark refund paid & release bed
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'satisfaction' && nps.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['NPS', nps.data.overall.nps ?? '—'],
              ['Average score', nps.data.overall.average ?? '—'],
              ['Responses', nps.data.overall.responses],
              ['Detractors', nps.data.overall.detractors],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-[10px] uppercase font-bold text-slate-500">{label}</div>
                <div className="text-xl font-black font-heading text-slate-900">{value as React.ReactNode}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-xs space-y-2">
            <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Maintenance response
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Open requests</div>
                <div className="text-lg font-black">{nps.data.maintenance.open}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Past SLA</div>
                <div className={`text-lg font-black ${nps.data.maintenance.breached ? 'text-rose-700' : ''}`}>
                  {nps.data.maintenance.breached}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Resolved within SLA</div>
                <div className="text-lg font-black">
                  {nps.data.maintenance.withinSlaPct ?? '—'}
                  {nps.data.maintenance.withinSlaPct !== null ? '%' : ''}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-black font-heading">Recent feedback</div>
            {nps.data.recent.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Residents are asked to rate their stay after three weeks; responses appear here.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {nps.data.recent.map((r: any) => (
                  <li key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${r.score >= 9 ? 'bg-[#a3e635]/30 text-[#3d6800]' : r.score >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}
                    >
                      {r.score}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {r.propertyName} <span className="text-slate-400 font-medium">· {r.at.slice(0, 10)}</span>
                      </div>
                      {r.comment && <div className="text-slate-600">{r.comment}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
