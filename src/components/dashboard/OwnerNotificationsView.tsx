import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CreditCard, Sparkles, CalendarCheck, UserCheck, Users, Info } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { PushNotificationsCard } from '../PushNotificationsCard';

const ICONS = {
  lead: Sparkles,
  booking: CalendarCheck,
  visit: UserCheck,
  customer: Users,
  payment: CreditCard,
  system: Info,
} as const;

export const OwnerNotificationsView: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useCRM();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            {unread ? `${unread} unread` : 'You are all caught up.'} Bookings, payments, visits and platform updates.
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[#a3e635] font-black text-xs rounded-full flex items-center gap-1.5 cursor-pointer font-heading self-start"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      <PushNotificationsCard onNotice={showToast} />

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
            <Bell className="w-6 h-6 text-slate-300" /> Nothing here yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Info;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.isRead) markNotificationRead(n.id);
                      if (n.linkTo) navigate(n.linkTo);
                    }}
                    className={`w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50 cursor-pointer ${n.isRead ? '' : 'bg-[#a3e635]/5'}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-[#a3e635]'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-heading ${n.isRead ? 'font-semibold text-slate-700' : 'font-black text-slate-900'}`}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#65a30d]" />}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{n.timestamp}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
