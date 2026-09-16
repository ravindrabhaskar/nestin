import React, { useState } from 'react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { SupportDesk } from '../../components/support/SupportDesk';

type Tab = 'users' | 'bookings' | 'audit' | 'inbound' | 'support' | 'outbox';

const cell = 'px-3 py-2.5 text-xs text-slate-200 whitespace-nowrap';
const head = 'px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 text-left';

const Spinner = () => (
  <div className="py-12 flex justify-center">
    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const Panel: React.FC<{ title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
  action,
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 animate-in fade-in duration-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-white font-heading">{title}</h2>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </div>
);

/** Users registry with suspend / reactivate controls. */
const UsersPanel: React.FC<{ onNotice: (m: string) => void }> = ({ onNotice }) => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'tenant' | 'owner' | 'employee'>('all');
  const {
    data: users,
    setData,
    isLoading,
  } = useApiResource<any[]>(() => ApiClient.admin.users(), [], { label: 'Could not load users' });
  const visible = users.filter((u) => roleFilter === 'all' || u.role === roleFilter);

  const toggle = async (u: any) => {
    const next = u.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} ${u.name} (${u.email})?`)) return;
    try {
      const updated = await ApiClient.admin.setUserStatus(u.id, next);
      setData((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      onNotice(`${u.name} is now ${next}.`);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  return (
    <Panel
      title="Accounts Registry"
      subtitle="Every tenant, owner and staff account on the platform. Suspending an owner also signs out their staff."
      action={
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2"
        >
          <option value="all">All roles</option>
          <option value="tenant">Tenants</option>
          <option value="owner">Owners</option>
          <option value="employee">Staff</option>
        </select>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-950">
              <tr>
                <th className={head}>User</th>
                <th className={head}>Role</th>
                <th className={head}>City</th>
                <th className={head}>Activity</th>
                <th className={head}>Joined</th>
                <th className={head}>Status</th>
                <th className={head} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className={cell}>
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-slate-400">{u.email}</div>
                  </td>
                  <td className={cell}>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className={cell}>{u.city || '—'}</td>
                  <td className={cell}>
                    {u.role === 'owner'
                      ? `${u.propertiesCount ?? 0} listings`
                      : u.role === 'tenant'
                        ? `${u.bookingsCount ?? 0} bookings`
                        : '—'}
                  </td>
                  <td className={cell}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className={cell}>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${u.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className={cell}>
                    {u.role !== 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => toggle(u)}
                        className="text-[11px] font-bold text-rose-300 hover:text-rose-200 cursor-pointer"
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                    No accounts match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

const BookingsPanel: React.FC = () => {
  const { data: bookings, isLoading } = useApiResource<any[]>(() => ApiClient.admin.bookings(), [], {
    label: 'Could not load bookings',
  });
  return (
    <Panel title="Bookings & Escrow" subtitle="Platform-wide booking pipeline across every owner.">
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-950">
              <tr>
                <th className={head}>Booking</th>
                <th className={head}>Tenant</th>
                <th className={head}>Property</th>
                <th className={head}>Move-in</th>
                <th className={head}>Amount</th>
                <th className={head}>Payment</th>
                <th className={head}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40">
                  <td className={cell}>
                    <span className="font-mono text-[11px] text-white">{b.bookingNumber}</span>
                  </td>
                  <td className={cell}>
                    <div className="font-bold text-white">{b.tenantName}</div>
                    <div className="text-slate-400">{b.tenantEmail}</div>
                  </td>
                  <td className={cell}>
                    <div className="text-white">{b.propertyName}</div>
                    <div className="text-slate-400">
                      {b.roomName} · {b.bedNumber}
                    </div>
                  </td>
                  <td className={cell}>{b.moveInDate}</td>
                  <td className={cell}>₹{Number(b.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td className={cell}>{b.paymentStatus}</td>
                  <td className={cell}>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed' ? 'bg-emerald-500/15 text-emerald-300' : b.bookingStatus === 'Pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}
                    >
                      {b.bookingStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

const InboundPanel: React.FC<{ onNotice: (m: string) => void }> = ({ onNotice }) => {
  const {
    data: items,
    setData,
    isLoading,
  } = useApiResource<any[]>(() => ApiClient.admin.inbound(), [], { label: 'Could not load inbound requests' });
  const setStatus = async (id: string, status: string) => {
    try {
      const updated = await ApiClient.admin.updateInbound(id, status);
      setData((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Update failed.');
    }
  };
  return (
    <Panel
      title="Inbox: Contact, Demo Requests & Newsletter"
      subtitle="Everything submitted through the public website forms."
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">
                    {r.kind.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-white">{r.name || r.email}</span>
                  {r.ticketNumber && <span className="text-slate-500 font-mono">{r.ticketNumber}</span>}
                </div>
                <div className="text-slate-400 mt-1 truncate">
                  {r.email && <span>{r.email} · </span>}
                  {r.phone && <span>{r.phone} · </span>}
                  {r.subject && <span>{r.subject} · </span>}
                  {r.message && <span>{r.message}</span>}
                  {r.meta?.businessName && (
                    <span>
                      {r.meta.businessName} ({r.meta.propertyCount || '?'} properties)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 font-mono text-[11px]">
                  {new Date(r.createdAt).toLocaleString('en-IN')}
                </span>
                <select
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded-lg px-2 py-1"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No inbound requests yet.</p>}
        </div>
      )}
    </Panel>
  );
};

const AuditPanel: React.FC = () => {
  const [filter, setFilter] = useState('');
  const {
    data: events,
    isLoading,
    reload,
  } = useApiResource<any[]>(() => ApiClient.admin.audit({ type: filter || undefined, limit: 200 }), [], {
    key: filter,
    label: 'Could not load the audit trail',
  });
  return (
    <Panel
      title="Platform Audit Trail"
      subtitle="Immutable record of every security-relevant and domain event across the platform."
      action={
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by event type…"
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 w-48"
          />
          <button
            type="button"
            onClick={() => void reload()}
            className="text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            Refresh
          </button>
        </div>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold shrink-0">
                  {e.type}
                </span>
                <span className="text-slate-200 truncate">
                  {e.aggregateType} <span className="text-slate-500">{e.aggregateId}</span>
                  {e.actorRole && (
                    <span className="text-slate-500">
                      {' '}
                      · by {e.actorRole}
                      {e.actorId ? ` (${e.actorId})` : ''}
                    </span>
                  )}
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[11px] shrink-0">
                {new Date(e.createdAt).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No events recorded.</p>}
        </div>
      )}
    </Panel>
  );
};

const OutboxPanel: React.FC = () => {
  const {
    data: items,
    isLoading,
    reload,
  } = useApiResource<any[]>(() => ApiClient.admin.outbox(), [], { label: 'Could not load the outbox' });
  const { data: integrations } = useApiResource<any>(() => ApiClient.admin.integrations(), null, {
    label: 'Could not load integrations',
  });
  return (
    <Panel
      title="Messaging Outbox"
      subtitle={
        integrations
          ? `Email via ${integrations.messaging.email} · WhatsApp via ${integrations.messaging.whatsapp} · Storage: ${integrations.storage} · Payments: ${integrations.payments}. Messages marked "logged" were not delivered because no provider is configured.`
          : 'Every email and WhatsApp message the platform tried to send.'
      }
      action={
        <button
          type="button"
          onClick={() => void reload()}
          className="text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
        >
          Refresh
        </button>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">
                    {m.channel}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${m.status === 'sent' ? 'bg-emerald-500/15 text-emerald-300' : m.status === 'failed' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}
                  >
                    {m.status}
                  </span>
                  <span className="font-bold text-white truncate">{m.recipient}</span>
                  {m.subject && <span className="text-slate-400 truncate">· {m.subject}</span>}
                </div>
                <span className="text-slate-500 font-mono text-[11px] shrink-0">
                  {new Date(m.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-slate-400 mt-1 line-clamp-2">{m.body}</div>
              {m.error && <div className="text-rose-300 mt-1">{m.error}</div>}
            </div>
          ))}
          {items.length === 0 && <p className="py-8 text-center text-xs text-slate-500">Nothing has been sent yet.</p>}
        </div>
      )}
    </Panel>
  );
};

export const AdminRegistryPanels: React.FC<{ tab: Tab; onNotice: (m: string) => void }> = ({ tab, onNotice }) => {
  if (tab === 'support')
    return (
      <SupportDesk
        theme="dark"
        fetchTickets={ApiClient.admin.support}
        reply={ApiClient.admin.replySupport}
        resolve={ApiClient.admin.resolveSupport}
        onNotice={onNotice}
      />
    );
  if (tab === 'outbox') return <OutboxPanel />;
  if (tab === 'users') return <UsersPanel onNotice={onNotice} />;
  if (tab === 'bookings') return <BookingsPanel />;
  if (tab === 'inbound') return <InboundPanel onNotice={onNotice} />;
  return <AuditPanel />;
};
