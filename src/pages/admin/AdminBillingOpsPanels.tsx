import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CreditCard, Database, Download, HardDrive, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  ApiClient,
  ApiError,
  type AdminSubscriptionRow,
  type BackupStatus,
  type BillingStats,
  type OpsMetrics,
} from '../../lib/apiClient';
import { PLANS, PLAN_ORDER, formatInr, type PlanId } from '../../lib/domain/plans';

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
const fmtBytes = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

const Tile: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
    <div className="text-[10px] uppercase font-bold text-slate-400">{label}</div>
    <div className="text-xl font-black text-white font-heading mt-1">{value}</div>
    {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

// ---------------------------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------------------------

export const AdminBillingPanel: React.FC<{ onNotice: (msg: string) => void }> = ({ onNotice }) => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await ApiClient.admin.billing();
      setStats(res.stats);
      setRows(res.subscriptions);
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : 'Could not load billing');
    }
  }, [onNotice]);

  useEffect(() => {
    load();
  }, [load]);

  const setPlan = async (row: AdminSubscriptionRow, plan: PlanId) => {
    const months =
      plan === 'starter' ? 1 : Number(window.prompt(`Grant ${PLANS[plan].name} for how many months?`, '12'));
    if (!months || Number.isNaN(months)) return;
    setBusy(row.ownerId);
    try {
      const updated = await ApiClient.admin.setPlan(row.ownerId, plan, months);
      setRows((prev) => prev.map((r) => (r.ownerId === row.ownerId ? updated : r)));
      onNotice(`${row.ownerName} moved to ${PLANS[plan].name}.`);
      load();
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : 'Could not update the plan');
    } finally {
      setBusy(null);
    }
  };

  const visible = rows.filter(
    (r) =>
      !filter || `${r.ownerName} ${r.ownerEmail} ${r.plan} ${r.status}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a3e635]/10 text-[#a3e635] text-xs font-bold font-heading mb-2">
          <CreditCard className="w-3.5 h-3.5" /> Revenue & Subscriptions
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white font-heading">Billing</h2>
        <p className="text-xs text-slate-400 mt-1">
          Owner plans, MRR and platform fees on online rent. Complimentary plans can be granted here for pilots and
          enterprise deals.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="MRR" value={formatInr(stats.mrr)} sub="Paid, non-trial subscriptions" />
          <Tile
            label="Paid workspaces"
            value={stats.activePaid}
            sub={`${stats.trialing} trialing · ${stats.pastDue} past due`}
          />
          <Tile
            label="Subscription revenue"
            value={formatInr(stats.subscriptionRevenue.total)}
            sub={`${formatInr(stats.subscriptionRevenue.last30Days)} last 30 days`}
          />
          <Tile
            label="Platform fees"
            value={formatInr(stats.platformFees.total)}
            sub={`${formatInr(stats.platformFees.last30Days)} last 30 days`}
          />
        </div>
      )}

      {stats && (
        <div className="flex flex-wrap gap-2 text-xs">
          {PLAN_ORDER.map((id) => (
            <span key={id} className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              {PLANS[id].name}: <strong className="text-white">{stats.byPlan[id]}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search owner, email, plan…"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-slate-600"
          />
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period ends</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">LTV</th>
                <th className="px-4 py-3">Set plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((r) => (
                <tr key={r.ownerId} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{r.ownerName}</div>
                    <div className="text-slate-500">{r.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-bold">
                    {PLANS[r.plan].name}
                    {r.grantedBy && <span className="ml-1 text-[10px] text-emerald-400">(granted)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${r.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : r.status === 'trialing' ? 'bg-sky-500/20 text-sky-300' : r.status === 'past_due' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{fmtDate(r.currentPeriodEnd)}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.usage.properties.used}/{r.usage.properties.limit ?? '∞'} props · {r.usage.staff.used}/
                    {r.usage.staff.limit ?? '∞'} staff
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-mono">{formatInr(r.lifetimeValue)}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Change plan"
                      disabled={busy === r.ownerId}
                      value=""
                      onChange={(e) => e.target.value && setPlan(r, e.target.value as PlanId)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="">Change…</option>
                      {PLAN_ORDER.filter((id) => id !== r.plan).map((id) => (
                        <option key={id} value={id}>
                          {PLANS[id].name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No owners match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Operations: backups + metrics
// ---------------------------------------------------------------------------------------------

export const AdminOpsPanel: React.FC<{ onNotice: (msg: string) => void }> = ({ onNotice }) => {
  const [backups, setBackups] = useState<BackupStatus | null>(null);
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([ApiClient.admin.backups(), ApiClient.admin.metrics()]);
      setBackups(b);
      setMetrics(m);
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : 'Could not load operations data');
    }
  }, [onNotice]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const runBackup = async () => {
    setBusy(true);
    try {
      const b = await ApiClient.admin.runBackup();
      onNotice(`Backup ${b.fileName} written (${fmtBytes(b.sizeBytes)}).`);
      load();
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : 'Backup failed');
    } finally {
      setBusy(false);
    }
  };

  const sweep = async () => {
    try {
      const r = await ApiClient.admin.verificationSweep();
      onNotice(`Verification sweep: ${r.expired} expired, ${r.dueSoon} due within 30 days.`);
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : 'Sweep failed');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 text-xs font-bold font-heading mb-2">
            <Activity className="w-3.5 h-3.5" /> Operations
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-heading">Backups, health & metrics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Nightly SQLite snapshots (mirrored to S3 when configured), request latency by route, and the verification
            expiry sweep. Prometheus can scrape <code className="text-slate-300">/metrics</code> with METRICS_TOKEN.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={sweep}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Run verification sweep
          </button>
          <button
            type="button"
            disabled={busy || !backups?.enabled}
            onClick={runBackup}
            className="px-3.5 py-2 rounded-xl bg-[#a3e635] hover:bg-[#92d428] disabled:opacity-50 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> {busy ? 'Backing up…' : 'Back up now'}
          </button>
        </div>
      </div>

      {metrics && backups && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile
            label="Requests (since start)"
            value={metrics.requestsTotal.toLocaleString('en-IN')}
            sub={`${metrics.errorsTotal} server errors · ${metrics.inFlight} in flight`}
          />
          <Tile label="Database size" value={fmtBytes(backups.databaseSizeBytes)} sub={backups.directory} />
          <Tile
            label="Last backup"
            value={backups.lastBackupAt ? fmtDate(backups.lastBackupAt) : 'Never'}
            sub={
              backups.enabled
                ? `Keeping ${backups.keep}${backups.mirroredToS3 ? ' · mirrored to S3' : ''}`
                : 'Backups disabled'
            }
          />
          <Tile
            label="Snapshots on disk"
            value={backups.backups.length}
            sub={backups.backups[0] ? fmtBytes(backups.backups[0].sizeBytes) + ' latest' : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Backup history
          </div>
          <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
            {backups?.backups.length ? (
              backups.backups.map((b) => (
                <div key={b.fileName} className="px-4 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200 truncate">{b.fileName}</span>
                  <span className="text-slate-500 shrink-0 ml-3">
                    {fmtBytes(b.sizeBytes)} · {b.location}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-500">No backups yet.</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4" /> Slowest & busiest routes
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2 text-right">Calls</th>
                  <th className="px-3 py-2 text-right">Avg ms</th>
                  <th className="px-3 py-2 text-right">p95 ms</th>
                  <th className="px-3 py-2 text-right">5xx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(metrics?.routes || []).slice(0, 40).map((r) => {
                  const errors = Object.entries(r.statuses)
                    .filter(([s]) => s.startsWith('5'))
                    .reduce((a, [, n]) => a + Number(n), 0);
                  return (
                    <tr key={r.route}>
                      <td className="px-3 py-1.5 font-mono text-slate-200 truncate max-w-[220px]">{r.route}</td>
                      <td className="px-3 py-1.5 text-right text-slate-300">{r.count}</td>
                      <td className="px-3 py-1.5 text-right text-slate-300">{r.avgMs}</td>
                      <td className={`px-3 py-1.5 text-right ${r.p95Ms > 500 ? 'text-amber-300' : 'text-slate-300'}`}>
                        {r.p95Ms}
                      </td>
                      <td className={`px-3 py-1.5 text-right ${errors ? 'text-rose-300' : 'text-slate-500'}`}>
                        {errors}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
