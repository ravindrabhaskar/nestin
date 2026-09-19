import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Zap, Receipt, TrendingDown, TrendingUp, Wallet, Send } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { usePropertyListing } from '../../context/PropertyListingContext';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Finance: profit & loss per month and per property, the expense ledger behind it, and utility
 * meter readings that are split and billed to residents.
 */
export const FinanceView: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const { ownerProperties } = usePropertyListing();
  const [month, setMonth] = useState(thisMonth());
  const [tab, setTab] = useState<'pnl' | 'expenses' | 'utilities'>('pnl');
  const pnl = useApiResource(() => ApiClient.operations.pnl(month), null as any, {
    key: month,
    label: 'Could not load P&L',
  });
  const ledger = useApiResource(
    () => ApiClient.operations.expenses({ month }),
    { categories: [] as string[], expenses: [] as any[] },
    { key: month, label: 'Could not load expenses' }
  );
  const utilities = useApiResource(() => ApiClient.operations.utilities(), [] as any[], {
    label: 'Could not load utilities',
  });

  const [expense, setExpense] = useState({
    category: 'Electricity',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    propertyId: '',
    description: '',
    vendor: '',
  });
  const [reading, setReading] = useState({
    propertyId: '',
    roomId: '',
    meter: 'electricity',
    currentReading: '',
    ratePerUnit: '8',
    fixedCharges: '0',
  });
  const [busy, setBusy] = useState(false);

  const rooms = useMemo(
    () => ownerProperties.find((p) => p.id === reading.propertyId)?.rooms || [],
    [ownerProperties, reading.propertyId]
  );

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ApiClient.operations.addExpense({
        ...expense,
        amount: Number(expense.amount),
        propertyId: expense.propertyId || undefined,
      });
      setExpense((x) => ({ ...x, amount: '', description: '' }));
      showToast('Expense recorded');
      await Promise.all([ledger.reload(), pnl.reload()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save expense');
    } finally {
      setBusy(false);
    }
  };

  const removeExpense = async (id: string) => {
    await ApiClient.operations.deleteExpense(id).catch((err) => showToast(err.message));
    await Promise.all([ledger.reload(), pnl.reload()]);
  };

  const submitReading = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ApiClient.operations.addUtilityReading({
        ...reading,
        currentReading: Number(reading.currentReading),
        ratePerUnit: Number(reading.ratePerUnit),
        fixedCharges: Number(reading.fixedCharges || 0),
      });
      setReading((r) => ({ ...r, currentReading: '' }));
      showToast('Reading saved as draft');
      await utilities.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save reading');
    } finally {
      setBusy(false);
    }
  };

  const bill = async (id: string) => {
    try {
      const res = await ApiClient.operations.billUtility(id);
      showToast(`Billed ${res.splitAmong} resident${res.splitAmong === 1 ? '' : 's'} · ${inr(res.perResident)} each`);
      await Promise.all([utilities.reload(), pnl.reload()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not bill');
    }
  };

  const input =
    'w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900';
  const label = 'block text-[11px] font-bold text-slate-600 mb-1';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">Finance</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Profit & loss, expense ledger and utility billing across your properties.
          </p>
        </div>
        <input
          aria-label="Month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white"
        />
      </div>

      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1 w-fit">
        {(['pnl', 'expenses', 'utilities'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-black font-heading cursor-pointer ${tab === t ? 'bg-slate-900 text-[#a3e635]' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t === 'pnl' ? 'Profit & Loss' : t === 'expenses' ? 'Expenses' : 'Utilities'}
          </button>
        ))}
      </div>

      {tab === 'pnl' && pnl.data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Income', value: pnl.data.income, icon: TrendingUp, tone: 'text-emerald-700' },
              { label: 'Expenses', value: pnl.data.expenses, icon: TrendingDown, tone: 'text-rose-700' },
              {
                label: 'Net operating income',
                value: pnl.data.netOperatingIncome,
                icon: Wallet,
                tone: pnl.data.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700',
              },
              { label: 'Margin', value: null, text: `${pnl.data.margin}%`, icon: Receipt, tone: 'text-slate-900' },
            ].map((tile) => (
              <div key={tile.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <tile.icon className="w-3.5 h-3.5" /> {tile.label}
                </div>
                <div className={`mt-2 text-xl font-black font-heading ${tile.tone}`}>
                  {tile.text ?? inr(tile.value as number)}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-black font-heading text-slate-900 mb-3">Six-month trend</h2>
            <div
              className="grid grid-cols-6 gap-2 items-end h-40"
              role="img"
              aria-label="Income versus expenses for the last six months"
            >
              {pnl.data.trend.map((t: any) => {
                const max = Math.max(1, ...pnl.data.trend.map((x: any) => Math.max(x.income, x.expenses)));
                return (
                  <div key={t.month} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="flex items-end gap-0.5 w-full h-full">
                      <div
                        title={`Income ${inr(t.income)}`}
                        className="flex-1 bg-[#a3e635] rounded-t"
                        style={{ height: `${(t.income / max) * 100}%` }}
                      />
                      <div
                        title={`Expenses ${inr(t.expenses)}`}
                        className="flex-1 bg-rose-300 rounded-t"
                        style={{ height: `${(t.expenses / max) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {t.month.slice(5)}/{t.month.slice(2, 4)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-black font-heading">By property</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-5 py-2.5">Property</th>
                    <th className="text-right px-3 py-2.5">Income</th>
                    <th className="text-right px-3 py-2.5">Expenses</th>
                    <th className="text-right px-3 py-2.5">NOI</th>
                    <th className="text-right px-5 py-2.5">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pnl.data.properties.map((p: any) => (
                    <tr key={p.propertyId}>
                      <td className="px-5 py-2.5 font-bold text-slate-900">{p.propertyName}</td>
                      <td className="px-3 py-2.5 text-right">{inr(p.income)}</td>
                      <td className="px-3 py-2.5 text-right">{inr(p.expenses)}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold ${p.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                      >
                        {inr(p.netOperatingIncome)}
                      </td>
                      <td className="px-5 py-2.5 text-right">{p.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <form
            onSubmit={submitExpense}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 lg:col-span-1"
          >
            <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record expense
            </h2>
            <div>
              <label className={label}>Category</label>
              <select
                aria-label="Category"
                className={input}
                value={expense.category}
                onChange={(e) => setExpense({ ...expense, category: e.target.value })}
              >
                {ledger.data.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Amount (₹)</label>
              <input
                aria-label="Amount"
                required
                type="number"
                min={1}
                step="0.01"
                className={input}
                value={expense.amount}
                onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Date</label>
              <input
                aria-label="Date"
                type="date"
                className={input}
                value={expense.date}
                onChange={(e) => setExpense({ ...expense, date: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Property (optional)</label>
              <select
                aria-label="Property"
                className={input}
                value={expense.propertyId}
                onChange={(e) => setExpense({ ...expense, propertyId: e.target.value })}
              >
                <option value="">Whole business</option>
                {ownerProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Vendor</label>
              <input
                aria-label="Vendor"
                className={input}
                value={expense.vendor}
                onChange={(e) => setExpense({ ...expense, vendor: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Description</label>
              <input
                aria-label="Description"
                className={input}
                value={expense.description}
                onChange={(e) => setExpense({ ...expense, description: e.target.value })}
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-black font-heading cursor-pointer disabled:opacity-60"
            >
              Save expense
            </button>
          </form>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden lg:col-span-2">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-black font-heading flex justify-between">
              <span>Ledger — {month}</span>
              <span className="text-slate-500">{inr(ledger.data.expenses.reduce((n, e) => n + e.amount, 0))}</span>
            </div>
            {ledger.data.expenses.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">No expenses recorded for this month.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ledger.data.expenses.map((e) => (
                  <li key={e.id} className="px-5 py-3 flex items-center gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900">
                        {e.category} <span className="text-slate-400 font-medium">· {e.date}</span>
                      </div>
                      <div className="text-slate-500 truncate">
                        {[e.propertyName || 'Whole business', e.vendor, e.description].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="font-black text-slate-900">{inr(e.amount)}</div>
                    <button
                      type="button"
                      aria-label={`Delete expense ${e.category} ${e.date}`}
                      onClick={() => removeExpense(e.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'utilities' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <form onSubmit={submitReading} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Meter reading
            </h2>
            <div>
              <label className={label}>Property</label>
              <select
                aria-label="Property"
                required
                className={input}
                value={reading.propertyId}
                onChange={(e) => setReading({ ...reading, propertyId: e.target.value, roomId: '' })}
              >
                <option value="">Select…</option>
                {ownerProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Room</label>
              <select
                aria-label="Room"
                required
                className={input}
                value={reading.roomId}
                onChange={(e) => setReading({ ...reading, roomId: e.target.value })}
              >
                <option value="">Select…</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.occupiedBedsCount} resident{r.occupiedBedsCount === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Meter</label>
              <select
                aria-label="Meter"
                className={input}
                value={reading.meter}
                onChange={(e) => setReading({ ...reading, meter: e.target.value })}
              >
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="gas">Gas</option>
              </select>
            </div>
            <div>
              <label className={label}>Current reading</label>
              <input
                aria-label="Current reading"
                required
                type="number"
                min={0}
                step="0.01"
                className={input}
                value={reading.currentReading}
                onChange={(e) => setReading({ ...reading, currentReading: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>₹ per unit</label>
                <input
                  aria-label="Rate per unit"
                  type="number"
                  min={0}
                  step="0.01"
                  className={input}
                  value={reading.ratePerUnit}
                  onChange={(e) => setReading({ ...reading, ratePerUnit: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Fixed charges</label>
                <input
                  aria-label="Fixed charges"
                  type="number"
                  min={0}
                  step="0.01"
                  className={input}
                  value={reading.fixedCharges}
                  onChange={(e) => setReading({ ...reading, fixedCharges: e.target.value })}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              The previous reading is taken from the last entry for this room automatically.
            </p>
            <button
              disabled={busy}
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-black font-heading cursor-pointer disabled:opacity-60"
            >
              Save reading
            </button>
          </form>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden lg:col-span-2">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-black font-heading">Readings</div>
            {utilities.data.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No readings yet. Record one to split the bill across the room.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {utilities.data.map((u) => (
                  <li key={u.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900">
                        {u.propertyName} · {u.roomName}{' '}
                        <span className="text-slate-400 font-medium">
                          · {u.meter} · {u.readingDate}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        {u.previousReading} → {u.currentReading} = {u.unitsConsumed} units × ₹{u.ratePerUnit}
                        {u.fixedCharges ? ` + ₹${u.fixedCharges}` : ''} = <b>{inr(u.amount)}</b> · {inr(u.perResident)}{' '}
                        × {u.splitAmong}
                      </div>
                    </div>
                    {u.status === 'billed' ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#a3e635]/25 text-[#3d6800] font-black text-[10px] uppercase">
                        Billed
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => bill(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-[#a3e635] font-black text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Bill residents
                        </button>
                        <button
                          type="button"
                          aria-label="Delete reading"
                          onClick={() => ApiClient.operations.deleteUtility(u.id).then(() => utilities.reload())}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
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
