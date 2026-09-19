import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { ApiClient, ApiError, type SubscriptionView as SubscriptionData } from '../../lib/apiClient';
import { paySubscription } from '../../lib/checkout';
import { formatInr, planRank, type PlanDefinition, type PlanId } from '../../lib/domain/plans';
import { useAuth } from '../../context/AuthContext';

interface Props {
  showToast: (message: string) => void;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const UsageBar: React.FC<{ label: string; icon: React.ReactNode; used: number; limit: number | null }> = ({
  label,
  icon,
  used,
  limit,
}) => {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const atLimit = limit !== null && used >= limit;
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className={atLimit ? 'text-rose-600' : 'text-slate-500'}>
          {used} / {limit === null ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-rose-500' : 'bg-[#a3e635]'}`}
          style={{ width: limit === null ? '8%' : `${pct}%` }}
        />
      </div>
      {atLimit && <p className="text-[11px] text-rose-600 font-semibold">Limit reached — upgrade to add more.</p>}
    </div>
  );
};

const FEATURE_LABELS: Array<{ key: keyof PlanDefinition['features']; label: string }> = [
  { key: 'rentReminders', label: 'Automated rent reminders' },
  { key: 'analytics', label: 'Occupancy & revenue analytics' },
  { key: 'pdfReports', label: 'PDF statements & exports' },
  { key: 'whatsappNotifications', label: 'WhatsApp notifications' },
  { key: 'featuredEligible', label: 'Eligible for Featured placement' },
  { key: 'prioritySupport', label: 'Priority support' },
];

export const SubscriptionView: React.FC<Props> = ({ showToast }) => {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval_] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await ApiClient.billing.view());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your subscription.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upgrade = async (plan: PlanId) => {
    if (!isOwner) return showToast('Only the workspace owner can change the plan.');
    setBusy(plan);
    try {
      const next = await paySubscription(plan, interval);
      setData(next);
      showToast(`${next.plan.name} plan is now active.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Payment did not complete.');
    } finally {
      setBusy(null);
    }
  };

  const toggleCancel = async (cancel: boolean) => {
    setBusy('cancel');
    try {
      setData(await ApiClient.billing.cancel(cancel));
      showToast(cancel ? 'Your plan will end at the close of the current period.' : 'Auto-renewal restored.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update the subscription.');
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { subscription, plan, usage, invoices, plans } = data;
  const status =
    subscription.status === 'trialing'
      ? `Professional trial · ends ${fmtDate(subscription.trialEndsAt)}`
      : subscription.status === 'past_due'
        ? `Payment overdue · renew by ${fmtDate(new Date(Date.parse(subscription.currentPeriodEnd) + 7 * 86400000).toISOString())}`
        : subscription.plan === 'starter'
          ? 'Free forever'
          : subscription.cancelAtPeriodEnd
            ? `Ends ${fmtDate(subscription.currentPeriodEnd)} (auto-renew off)`
            : `Renews ${fmtDate(subscription.currentPeriodEnd)} · billed ${subscription.interval}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
          Subscription & Billing
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
          Your plan, usage against limits, invoices and upgrades. Prices exclude {data.gstPercent}% GST.
        </p>
      </div>

      {/* Current plan */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#a3e635]/20 text-[#a3e635] flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#a3e635]/80 font-heading">
              Current plan
            </div>
            <h2 className="text-xl font-black font-heading">{plan.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{status}</p>
            {subscription.grantedBy && (
              <p className="text-[11px] text-emerald-300 mt-1">Complimentary plan granted by NestIn.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[420px]">
          <UsageBar label="Properties" icon={<Building2 className="w-3.5 h-3.5" />} {...usage.properties} />
          <UsageBar label="Staff accounts" icon={<Users className="w-3.5 h-3.5" />} {...usage.staff} />
        </div>
      </div>

      {data.platformFeePercent > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <CreditCard className="w-4 h-4 shrink-0" />A {data.platformFeePercent}% platform fee is retained on rent
          collected online through NestIn; cash and manual payments carry no fee.
        </div>
      )}

      {/* Plans */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 font-heading">Choose a plan</h3>
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-bold self-start">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const price = interval === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
            const isCurrent = p.id === subscription.plan;
            const isDowngrade = planRank(p.id) < planRank(subscription.plan);
            return (
              <div
                key={p.id}
                data-testid={`plan-card-${p.id}`}
                className={`rounded-3xl border p-5 flex flex-col gap-4 bg-white ${isCurrent ? 'border-[#a3e635] ring-2 ring-[#a3e635]/40' : p.recommended ? 'border-slate-900' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black font-heading text-slate-900">{p.name}</h4>
                  {isCurrent ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#a3e635] text-slate-900">
                      Current
                    </span>
                  ) : p.recommended ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 text-[#a3e635]">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 min-h-[2.5rem]">{p.tagline}</p>
                <div>
                  <span className="text-3xl font-black font-heading text-slate-900">
                    {price === 0 ? 'Free' : formatInr(price)}
                  </span>
                  {price > 0 && (
                    <span className="text-xs text-slate-500">
                      {' '}
                      /month{interval === 'yearly' ? ', billed yearly' : ''}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 flex-1">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#65a30d] mt-0.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
                {p.id === 'starter' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-black cursor-not-allowed"
                  >
                    {isCurrent ? 'Your plan' : 'Included'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!!busy || !isOwner}
                    onClick={() => upgrade(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${isCurrent || isDowngrade ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#a3e635] text-slate-950 hover:bg-[#92d428]'}`}
                  >
                    {busy === p.id
                      ? 'Processing…'
                      : isCurrent
                        ? subscription.status === 'trialing'
                          ? 'Activate now'
                          : 'Renew'
                        : isDowngrade
                          ? 'Switch'
                          : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!isOwner && (
          <p className="text-[11px] text-slate-500">Only the workspace owner can change the subscription.</p>
        )}
        {data.payments === 'simulated' && (
          <p className="text-[11px] text-slate-500">
            Payments run in simulation until Razorpay keys are configured — no money moves.
          </p>
        )}
      </div>

      {/* Features on this plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-900 font-heading flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#65a30d]" /> Included in {plan.name}
          </h3>
          <ul className="space-y-1.5">
            {FEATURE_LABELS.map((f) => (
              <li
                key={f.key}
                className={`text-xs flex items-center gap-2 ${plan.features[f.key] ? 'text-slate-800' : 'text-slate-400 line-through'}`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${plan.features[f.key] ? 'text-[#65a30d]' : 'text-slate-300'}`} />
                {f.label}
              </li>
            ))}
          </ul>
          {subscription.plan !== 'starter' && isOwner && !subscription.grantedBy && (
            <button
              type="button"
              disabled={busy === 'cancel'}
              onClick={() => toggleCancel(!subscription.cancelAtPeriodEnd)}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer"
            >
              {subscription.cancelAtPeriodEnd ? 'Turn auto-renewal back on' : 'Cancel at end of period'}
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-900 font-heading flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-600" /> Invoices
          </h3>
          {invoices.length === 0 ? (
            <p className="text-xs text-slate-500">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                    <div className="text-slate-500">
                      {inv.plan} · {inv.interval} · {fmtDate(inv.periodStart)} → {fmtDate(inv.periodEnd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{formatInr(inv.amount)}</div>
                    <div
                      className={`text-[10px] font-bold ${inv.status === 'Paid' ? 'text-emerald-600' : inv.status === 'Failed' ? 'text-rose-600' : 'text-amber-600'}`}
                    >
                      {inv.status} · incl. {formatInr(inv.gst)} GST
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" /> Card details never touch NestIn servers; payments are processed by
        Razorpay.
      </p>
    </div>
  );
};
