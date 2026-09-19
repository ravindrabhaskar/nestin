import React, { useState } from 'react';
import { BadgeCheck, Star, Sparkles } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { usePropertyListing } from '../../context/PropertyListingContext';
import { payAddon } from '../../lib/checkout';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Per-listing purchases: a NestIn Verified site visit and featured placement in search. */
export const AddonsPanel: React.FC<{ onNotice: (m: string) => void }> = ({ onNotice }) => {
  const { ownerProperties, refresh } = usePropertyListing();
  const addons = useApiResource(() => ApiClient.billing.addons(), null as any, { label: 'Could not load add-ons' });
  const [propertyId, setPropertyId] = useState('');
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const published = ownerProperties.filter((p) => p.status === 'published');
  const selected = ownerProperties.find((p) => p.id === propertyId);
  const prices = addons.data?.prices;
  const orders: any[] = addons.data?.orders || [];
  const pendingVerification = (id: string) =>
    orders.some((o) => o.propertyId === id && o.type === 'verification' && o.status === 'Paid' && !o.fulfilledAt);
  const featuredUntil = (id: string) =>
    orders
      .filter(
        (o) =>
          o.propertyId === id &&
          o.type === 'featured' &&
          o.status === 'Paid' &&
          o.periodEnd &&
          Date.parse(o.periodEnd) > Date.now()
      )
      .map((o) => o.periodEnd as string)
      .sort()
      .pop();

  const buy = async (type: 'verification' | 'featured') => {
    if (!propertyId) return onNotice('Choose a listing first');
    setBusy(type);
    try {
      await payAddon({ type, propertyId, months: type === 'featured' ? months : undefined });
      onNotice(
        type === 'featured' ? 'Listing is now featured' : 'Verification visit booked — our team will contact you'
      );
      await Promise.all([addons.reload(), refresh()]);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBusy(null);
    }
  };

  if (!prices) return null;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-sm font-black text-slate-900 font-heading flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-slate-600" /> Add-ons per listing
      </h3>
      <select
        aria-label="Listing"
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white"
      >
        <option value="">Choose a listing…</option>
        {ownerProperties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.status}
          </option>
        ))}
      </select>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="font-black text-slate-900 flex items-center gap-1">
            <BadgeCheck className="w-4 h-4 text-emerald-600" /> NestIn Verified visit
          </div>
          <p className="text-slate-600">
            A NestIn agent visits, completes the 8-point checklist, and your listing earns the Verified badge (valid 12
            months). Verified listings rank higher and convert better.
          </p>
          <div className="font-black text-lg">
            {inr(prices.verificationVisit)}{' '}
            <span className="text-[11px] font-medium text-slate-500">+ GST, one-off</span>
          </div>
          {selected?.isNestinVerified ? (
            <div className="text-emerald-700 font-bold">Already verified</div>
          ) : selected && pendingVerification(selected.id) ? (
            <div className="text-amber-700 font-bold">Visit requested — our team will be in touch</div>
          ) : (
            <button
              type="button"
              disabled={!selected || busy !== null}
              onClick={() => buy('verification')}
              className="px-4 py-2 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-50"
            >
              {busy === 'verification' ? 'Processing…' : 'Book a verification visit'}
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="font-black text-slate-900 flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" /> Featured placement
          </div>
          <p className="text-slate-600">
            Pin the listing to the top of search results in its city. Published listings only.
          </p>
          <div className="font-black text-lg">
            {inr(prices.featuredPerMonth)}{' '}
            <span className="text-[11px] font-medium text-slate-500">+ GST per month</span>
          </div>
          {selected && featuredUntil(selected.id) && (
            <div className="text-emerald-700 font-bold">Featured until {featuredUntil(selected.id)!.slice(0, 10)}</div>
          )}
          <div className="flex items-center gap-2">
            <select
              aria-label="Months"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white"
            >
              {[1, 2, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m} month{m === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selected || selected.status !== 'published' || busy !== null}
              onClick={() => buy('featured')}
              className="px-4 py-2 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-50"
            >
              {busy === 'featured' ? 'Processing…' : featuredUntil(selected?.id || '') ? 'Extend' : 'Feature it'}
            </button>
          </div>
          {published.length === 0 && <div className="text-[11px] text-slate-500">Publish a listing to feature it.</div>}
        </div>
      </div>
      {orders.length > 0 && (
        <ul className="text-[11px] text-slate-600 divide-y divide-slate-100">
          {orders.slice(0, 8).map((o) => (
            <li key={o.id} className="py-1.5 flex justify-between gap-2">
              <span>
                {o.invoiceNumber} · {o.type === 'featured' ? `Featured × ${o.months}` : 'Verification visit'} ·{' '}
                {o.propertyName}
              </span>
              <span className="font-bold">
                {inr(o.amount)} · {o.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
