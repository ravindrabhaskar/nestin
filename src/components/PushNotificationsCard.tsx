import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { ApiClient } from '../lib/apiClient';
import { currentPushSubscription, disablePush, enablePush, pushSupported } from '../lib/pwa';

interface Props {
  onNotice: (message: string) => void;
  /** Visual variant: light (tenant settings) or dark (owner hub). */
  tone?: 'light' | 'dark';
}

/** Device-level Web Push toggle. Server-side preferences still gate which categories are sent. */
export const PushNotificationsCard: React.FC<Props> = ({ onNotice, tone = 'light' }) => {
  const [supported] = useState(pushSupported);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    ApiClient.push
      .config()
      .then((c) => alive && setServerEnabled(c.enabled))
      .catch(() => alive && setServerEnabled(false));
    currentPushSubscription().then((s) => alive && setSubscribed(!!s));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        onNotice('Push notifications turned off on this device.');
      } else {
        const result = await enablePush();
        if (result === 'enabled') {
          setSubscribed(true);
          onNotice('Push notifications enabled on this device.');
        } else if (result === 'denied') onNotice('Notifications are blocked in your browser settings.');
        else if (result === 'disabled') onNotice('Push is not configured on this NestIn server yet.');
        else onNotice('This browser does not support push notifications.');
      }
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Could not update push notifications.');
    } finally {
      setBusy(false);
    }
  };

  const dark = tone === 'dark';
  const disabled = busy || !supported || serverEnabled === false;
  return (
    <div
      className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${dark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80 shadow-2xs'}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-[#a3e635]/20 text-[#a3e635]' : 'bg-slate-900 text-[#a3e635]'}`}
        >
          <BellRing className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className={`text-xs font-bold font-heading ${dark ? 'text-white' : 'text-slate-900'}`}>
            Push notifications on this device
          </div>
          <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {!supported
              ? 'Not supported in this browser.'
              : serverEnabled === false
                ? 'Not enabled on this server yet — email and WhatsApp still work.'
                : subscribed
                  ? 'Booking, payment and visit alerts arrive even when NestIn is closed.'
                  : 'Get booking, payment and visit alerts even when NestIn is closed.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-pressed={subscribed}
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${subscribed ? (dark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700') : 'bg-[#a3e635] text-slate-950'}`}
      >
        {busy ? '…' : subscribed ? 'Turn off' : 'Enable'}
      </button>
    </div>
  );
};
