import React, { useState } from 'react';
import { FileSignature, ShieldCheck, ExternalLink, KeyRound } from 'lucide-react';
import { ApiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';

/** Rent agreements sent by the owner: review the terms, request an OTP, sign. */
export const AgreementCard: React.FC<{ onNotice?: (m: string) => void }> = ({ onNotice }) => {
  const agreements = useApiResource(() => ApiClient.tenant.agreements(), [] as any[], {
    label: 'Could not load agreements',
  });
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  if (agreements.data.length === 0) return null;

  const request = async (id: string) => {
    setBusy(true);
    try {
      const res = await ApiClient.tenant.requestAgreementOtp(id);
      setOtpFor(id);
      setHint(
        res.devOtp
          ? `Demo mode — your code is ${res.devOtp}`
          : `Code sent via ${res.sentTo.join(' and ')}. Valid for 10 minutes.`
      );
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setBusy(false);
    }
  };

  const sign = async (id: string) => {
    setBusy(true);
    try {
      await ApiClient.tenant.signAgreement(id, { otp, accepted });
      onNotice?.('Agreement signed');
      setOtpFor(null);
      setOtp('');
      await agreements.reload();
    } catch (err) {
      onNotice?.(err instanceof Error ? err.message : 'Could not sign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 text-sm font-black font-heading flex items-center gap-2">
        <FileSignature className="w-4 h-4" /> Rent agreements
      </div>
      <ul className="divide-y divide-slate-100">
        {agreements.data.map((a) => (
          <li key={a.id} className="p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900">
                  {a.agreementNumber} · {a.propertyName}
                </div>
                <div className="text-slate-500">
                  {a.roomName} / {a.bedNumber} · {a.startDate} → {a.endDate} · ₹{a.monthlyRent.toLocaleString('en-IN')}
                  /mo
                </div>
              </div>
              {a.status === 'signed' ? (
                <span className="px-2.5 py-1 rounded-full bg-[#a3e635]/25 text-[#3d6800] font-black text-[10px] uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Signed {a.signedAt?.slice(0, 10)}
                </span>
              ) : a.status === 'void' ? (
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-black text-[10px] uppercase">
                  Void
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-black text-[10px] uppercase">
                  Awaiting your signature
                </span>
              )}
            </div>
            <details className="rounded-xl bg-slate-50 border border-slate-200">
              <summary className="px-3 py-2 cursor-pointer font-bold text-slate-700">Read the terms</summary>
              <pre className="px-3 pb-3 whitespace-pre-wrap font-sans text-[11px] text-slate-600 max-h-72 overflow-auto">
                {a.text}
              </pre>
            </details>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/v1/tenant/agreements/${a.id}/document`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold flex items-center gap-1 hover:bg-slate-50"
              >
                <ExternalLink className="w-3 h-3" /> Open document
              </a>
              {a.status === 'sent' && otpFor !== a.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => request(a.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-[#a3e635] font-black flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  <KeyRound className="w-3 h-3" /> Sign with OTP
                </button>
              )}
            </div>
            {otpFor === a.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sign(a.id);
                }}
                className="rounded-xl border border-slate-200 p-3 space-y-2"
              >
                {hint && <div className="text-slate-600">{hint}</div>}
                <input
                  aria-label="One-time password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono tracking-widest"
                />
                <label className="flex items-start gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read the agreement and accept its terms. Entering the code is my electronic signature.
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy || !accepted || otp.length !== 6}
                    className="px-4 py-2 rounded-xl bg-[#a3e635] text-slate-950 font-black cursor-pointer disabled:opacity-50"
                  >
                    Sign agreement
                  </button>
                  <button
                    type="button"
                    onClick={() => request(a.id)}
                    disabled={busy}
                    className="px-3 py-2 rounded-xl border border-slate-200 font-bold cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
