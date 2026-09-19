import React, { useState } from 'react';
import { Gift, Copy, Users, Star } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../context/AuthContext';

/** Referral programme card: code, share link, credits and who joined. */
export const ReferralCard: React.FC<{ onNotice?: (m: string) => void }> = ({ onNotice }) => {
  const referrals = useApiResource(() => ApiClient.tenant.referrals(), null as any, {
    label: 'Could not load referrals',
  });
  const r = referrals.data;
  if (!r) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.link);
      onNotice?.('Referral link copied');
    } catch {
      onNotice?.(r.link);
    }
  };
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
      <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
        <Gift className="w-4 h-4" /> Refer a friend, both get ₹{r.creditPerReferral}
      </h2>
      <p className="text-slate-600">
        Share your code. When your friend's first booking is confirmed, you both receive ₹{r.creditPerReferral} off your
        next online payment.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="px-3 py-2 rounded-xl bg-slate-900 text-[#a3e635] font-black tracking-widest text-sm">
          {r.code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-2 rounded-xl border border-slate-200 font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-50"
        >
          <Copy className="w-3.5 h-3.5" /> Copy link
        </button>
        <span className="ml-auto font-bold text-slate-900">
          Available credit: ₹{r.available.toLocaleString('en-IN')}
        </span>
      </div>
      {r.referred.length > 0 && (
        <ul className="text-slate-600 space-y-0.5">
          {r.referred.map((f: any, i: number) => (
            <li key={i}>
              {f.name} joined {f.joinedAt.slice(0, 10)} · {f.rewarded ? 'credited' : 'waiting for their first booking'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const OPTIONS = {
  sleepSchedule: [
    ['early', 'Early bird'],
    ['late', 'Night owl'],
    ['flexible', 'Flexible'],
  ],
  foodHabit: [
    ['veg', 'Vegetarian'],
    ['eggetarian', 'Eggetarian'],
    ['nonveg', 'Non-vegetarian'],
  ],
  workHours: [
    ['day', 'Day shift'],
    ['night', 'Night shift'],
    ['remote', 'Work from home'],
    ['student', 'Student'],
  ],
  smoking: [
    ['no', 'Non-smoker'],
    ['occasionally', 'Occasionally'],
    ['yes', 'Smoker'],
  ],
  socialLevel: [
    ['quiet', 'Keep to myself'],
    ['balanced', 'Balanced'],
    ['social', 'Social'],
  ],
} as const;

/** Lifestyle preferences used for roommate compatibility (opt-in, only first names are ever shown). */
export const LifestyleForm: React.FC<{ onNotice?: (m: string) => void }> = ({ onNotice }) => {
  const { user, refreshUser } = useAuth();
  const initial = (user as any)?.lifestyle || {};
  const [form, setForm] = useState<Record<string, any>>({
    optIn: !!initial.optIn,
    sleepSchedule: initial.sleepSchedule || '',
    foodHabit: initial.foodHabit || '',
    workHours: initial.workHours || '',
    cleanliness: initial.cleanliness || 3,
    smoking: initial.smoking || '',
    socialLevel: initial.socialLevel || '',
    languages: (initial.languages || []).join(', '),
  });
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ApiClient.auth.updateProfile({
        lifestyle: {
          ...form,
          cleanliness: Number(form.cleanliness),
          languages: String(form.languages)
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean),
        },
      });
      await refreshUser?.();
      onNotice?.('Roommate preferences saved');
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };
  const select = (key: keyof typeof OPTIONS, label: string) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
      <select
        aria-label={label}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white"
      >
        <option value="">Prefer not to say</option>
        {OPTIONS[key].map(([val, text]) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs">
      <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
        <Users className="w-4 h-4" /> Roommate compatibility
      </h2>
      <label className="flex items-start gap-2 text-slate-700">
        <input
          type="checkbox"
          checked={form.optIn}
          onChange={(e) => setForm({ ...form, optIn: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          Show my first name and lifestyle to residents of PGs I book, and show me how compatible I am with them. You
          can switch this off any time.
        </span>
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        {select('sleepSchedule', 'Sleep schedule')}
        {select('foodHabit', 'Food habits')}
        {select('workHours', 'Work / study hours')}
        {select('smoking', 'Smoking')}
        {select('socialLevel', 'Social style')}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Cleanliness (1 relaxed – 5 spotless)
          </label>
          <input
            aria-label="Cleanliness"
            type="range"
            min={1}
            max={5}
            value={form.cleanliness}
            onChange={(e) => setForm({ ...form, cleanliness: e.target.value })}
            className="w-full"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Languages (comma separated)</label>
          <input
            aria-label="Languages"
            value={form.languages}
            onChange={(e) => setForm({ ...form, languages: e.target.value })}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            placeholder="Telugu, Hindi, English"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="px-5 py-2 rounded-xl bg-slate-900 text-[#a3e635] font-black cursor-pointer disabled:opacity-60"
      >
        Save preferences
      </button>
    </form>
  );
};

/** One-question NPS prompt shown to residents a few weeks into their stay. */
export const SurveyPrompt: React.FC<{ onNotice?: (m: string) => void }> = ({ onNotice }) => {
  const due = useApiResource(() => ApiClient.tenant.surveyDue(), { due: false } as any, {
    label: 'Could not check survey',
  });
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  if (!due.data?.due || done) return null;
  const submit = async () => {
    if (score === null) return;
    try {
      await ApiClient.tenant.submitSurvey({ score, comment });
      setDone(true);
      onNotice?.('Thanks for the feedback');
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not submit');
    }
  };
  return (
    <section className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 text-xs">
      <h2 className="text-sm font-black font-heading flex items-center gap-2">
        <Star className="w-4 h-4 text-[#a3e635]" /> How likely are you to recommend {due.data.propertyName} to a friend?
      </h2>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Score from 0 to 10">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={score === i}
            onClick={() => setScore(i)}
            className={`w-8 h-8 rounded-lg font-black cursor-pointer ${score === i ? 'bg-[#a3e635] text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {i}
          </button>
        ))}
      </div>
      <input
        aria-label="Comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything we should know? (optional)"
        className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
      />
      <button
        type="button"
        onClick={submit}
        disabled={score === null}
        className="px-4 py-2 rounded-xl bg-[#a3e635] text-slate-950 font-black cursor-pointer disabled:opacity-50"
      >
        Send
      </button>
    </section>
  );
};
