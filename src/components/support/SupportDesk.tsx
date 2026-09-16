import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, Send, Clock } from 'lucide-react';
import { TenantSupportTicket } from '../../types';
import { useApiResource } from '../../hooks/useApiResource';

interface SupportDeskProps {
  /** Data source: owner CRM or platform admin. */
  fetchTickets: () => Promise<any[]>;
  reply: (id: string, message: string) => Promise<any>;
  resolve: (id: string) => Promise<any>;
  /** Visual theme: the owner dashboard is light, the admin console is dark. */
  theme?: 'light' | 'dark';
  onNotice?: (message: string) => void;
}

type Ticket = TenantSupportTicket & { tenantName?: string; tenantEmail?: string };

/** Ticket inbox with threaded replies. Used by owners (their residents) and admins (everything). */
export const SupportDesk: React.FC<SupportDeskProps> = ({
  fetchTickets,
  reply,
  resolve,
  theme = 'light',
  onNotice,
}) => {
  const {
    data: tickets,
    setData,
    isLoading,
    reload,
  } = useApiResource<Ticket[]>(fetchTickets, [], { label: 'Could not load support tickets' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const dark = theme === 'dark';
  const card = dark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200/80 text-slate-900';
  const sub = dark ? 'text-slate-400' : 'text-slate-500';
  const row = (active: boolean) =>
    dark ? (active ? 'bg-slate-800' : 'hover:bg-slate-800/60') : active ? 'bg-slate-100' : 'hover:bg-slate-50';

  const isOpen = (t: Ticket) => !/resolved/i.test(String(t.status));
  const visible = tickets.filter((t) => filter === 'all' || isOpen(t));
  const selected = tickets.find((t) => t.id === selectedId) || null;

  const send = async () => {
    if (!selected || !draft.trim()) return;
    setBusy(true);
    try {
      const updated = await reply(selected.id, draft.trim());
      setData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setDraft('');
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not send the reply.');
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await resolve(selected.id);
      setData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      onNotice?.('Ticket marked as resolved.');
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not resolve the ticket.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-3xl border ${card} overflow-hidden font-sans`}>
      <div
        className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}
      >
        <div>
          <h2 className="text-lg font-black font-heading flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Resident Support
          </h2>
          <p className={`text-xs ${sub}`}>
            {tickets.filter(isOpen).length} open · {tickets.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilter('open')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${filter === 'open' ? 'bg-slate-900 text-[#a3e635]' : sub}`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${filter === 'all' ? 'bg-slate-900 text-[#a3e635]' : sub}`}
          >
            All
          </button>
          <button type="button" onClick={() => void reload()} className={`${sub} cursor-pointer`}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[420px]">
        <div
          className={`border-r ${dark ? 'border-slate-800' : 'border-slate-100'} divide-y ${dark ? 'divide-slate-800' : 'divide-slate-100'} max-h-[560px] overflow-y-auto`}
        >
          {isLoading && <div className={`p-6 text-xs ${sub}`}>Loading tickets…</div>}
          {!isLoading && visible.length === 0 && (
            <div className={`p-6 text-xs ${sub}`}>No {filter === 'open' ? 'open ' : ''}tickets.</div>
          )}
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${row(t.id === selectedId)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold truncate">{t.subject}</span>
                <span
                  className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${isOpen(t) ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}
                >
                  {String(t.status)}
                </span>
              </div>
              <div className={`text-[11px] ${sub} truncate mt-0.5`}>
                {t.tenantName || 'Resident'} · {t.category} · {t.ticketNumber || t.id}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {!selected ? (
            <div className={`flex-1 flex items-center justify-center text-xs ${sub}`}>
              Select a ticket to view the conversation.
            </div>
          ) : (
            <>
              <div
                className={`px-5 py-3 border-b ${dark ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between gap-3`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-black font-heading truncate">{selected.subject}</div>
                  <div className={`text-[11px] ${sub} truncate`}>
                    {selected.tenantName} {selected.tenantEmail ? `· ${selected.tenantEmail}` : ''}{' '}
                    {selected.pgName ? `· ${selected.pgName}` : ''} · {selected.priority || 'Medium'} priority
                  </div>
                </div>
                {isOpen(selected) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={close}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[380px]">
                {(selected.messages || []).map((m, i) => (
                  <div key={m.id || i} className={`max-w-[85%] ${m.sender === 'support' ? 'ml-auto' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${m.sender === 'support' ? 'bg-slate-900 text-[#e2e8f0]' : dark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
                    >
                      {m.text || m.message}
                    </div>
                    <div
                      className={`text-[10px] ${sub} mt-1 flex items-center gap-1 ${m.sender === 'support' ? 'justify-end' : ''}`}
                    >
                      <Clock className="w-3 h-3" /> {m.senderName || (m.sender === 'support' ? 'Support' : 'Resident')}{' '}
                      · {new Date(m.timestamp).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`p-4 border-t ${dark ? 'border-slate-800' : 'border-slate-100'} flex items-end gap-2`}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Write a reply to the resident…"
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#a3e635]/60 ${dark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-200'}`}
                />
                <button
                  type="button"
                  disabled={busy || !draft.trim()}
                  onClick={send}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-black disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
