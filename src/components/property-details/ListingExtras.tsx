import React from 'react';
import { Users, PlayCircle, ThumbsUp } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../context/AuthContext';

/** Walkthrough video: an uploaded mp4/webm or a privacy-safe YouTube embed. */
export const TourVideo: React.FC<{ url?: string; name: string }> = ({ url, name }) => {
  if (!url) return null;
  const isEmbed = url.startsWith('https://www.youtube-nocookie.com/embed/');
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-3">
      <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950 flex items-center gap-2">
        <PlayCircle className="w-5 h-5" /> Video walkthrough
      </h3>
      <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900">
        {isEmbed ? (
          <iframe
            title={`${name} video tour`}
            src={url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <video controls preload="metadata" className="w-full h-full" src={url} aria-label={`${name} video tour`} />
        )}
      </div>
    </section>
  );
};

/** "Would recommend" figure from resident NPS surveys, shown once there are enough responses. */
export const SatisfactionBadge: React.FC<{ satisfaction?: { responses: number; wouldRecommend: number } }> = ({
  satisfaction,
}) => {
  if (!satisfaction) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ecfccb] text-[#3f6212] text-[11px] font-black"
      title={`${satisfaction.responses} resident survey responses`}
    >
      <ThumbsUp className="w-3 h-3" /> {satisfaction.wouldRecommend}% of residents would recommend
    </span>
  );
};

const TRAIT: Record<string, string> = {
  early: 'early bird',
  late: 'night owl',
  flexible: 'flexible hours',
  veg: 'vegetarian',
  eggetarian: 'eggetarian',
  nonveg: 'non-veg',
  day: 'day shift',
  night: 'night shift',
  remote: 'works from home',
  student: 'student',
  quiet: 'keeps to themselves',
  balanced: 'balanced',
  social: 'social',
  no: 'non-smoker',
  occasionally: 'smokes occasionally',
  yes: 'smoker',
};

/** Compatibility with current residents who opted in to roommate matching. Signed-in residents only. */
export const RoommatesPanel: React.FC<{ propertyId: string }> = ({ propertyId }) => {
  const { user, isAuthenticated } = useAuth();
  const enabled = isAuthenticated && user?.role === 'tenant';
  const data = useApiResource(() => ApiClient.tenant.roommates(propertyId), null as any, {
    enabled,
    key: propertyId,
    label: 'Could not load roommates',
  });
  if (!enabled) return null;
  const d = data.data;
  return (
    <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg sm:text-xl font-black font-heading text-slate-950 flex items-center gap-2">
          <Users className="w-5 h-5" /> Who lives here
        </h3>
        <a href="/settings/preferences" className="text-xs font-bold text-slate-600 hover:underline">
          {d?.optedIn ? 'Edit my lifestyle' : 'Set up my lifestyle'}
        </a>
      </div>
      {!d ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : d.roommates.length === 0 ? (
        <p className="text-xs text-slate-500">
          No residents here have opted in to roommate matching yet
          {!d.optedIn ? ' — opt in from Settings → Search Preferences to be matched when you move in.' : '.'}
        </p>
      ) : (
        <>
          {!d.complete && (
            <p className="text-xs text-amber-700">Complete your lifestyle preferences for more accurate scores.</p>
          )}
          <ul className="grid sm:grid-cols-2 gap-3">
            {d.roommates.map((r: any, i: number) => (
              <li key={i} className="rounded-2xl border border-slate-200 p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">
                    {r.firstName} · {r.roomName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-black ${r.score >= 75 ? 'bg-[#ecfccb] text-[#3f6212]' : r.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {r.score}% match
                  </span>
                </div>
                <div className="text-slate-600">
                  {[
                    r.lifestyle.sleepSchedule,
                    r.lifestyle.foodHabit,
                    r.lifestyle.workHours,
                    r.lifestyle.socialLevel,
                    r.lifestyle.smoking,
                  ]
                    .filter(Boolean)
                    .map((t: string) => TRAIT[t] || t)
                    .join(' · ')}
                </div>
                {r.shared.length > 0 && (
                  <div className="text-[11px] text-emerald-700">In common: {r.shared.join(', ')}</div>
                )}
                {r.differences.length > 0 && (
                  <div className="text-[11px] text-slate-500">Different: {r.differences.join(', ')}</div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
