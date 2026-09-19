import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES, useT, type Language } from '../../lib/i18n';
import { ApiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

/** Language switcher: applies immediately on this device and is remembered on the profile. */
export const LanguageCard: React.FC<{ onNotice?: (m: string) => void }> = ({ onNotice }) => {
  const { t, lang, setLanguage } = useT();
  const { isAuthenticated } = useAuth();
  const choose = async (next: Language) => {
    setLanguage(next);
    if (isAuthenticated) await ApiClient.auth.updateProfile({ language: next }).catch(() => undefined);
    onNotice?.(`${t('settings.language')}: ${LANGUAGES.find((l) => l.code === next)?.native}`);
  };
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
      <h2 className="text-sm font-black font-heading text-slate-900 flex items-center gap-2">
        <Languages className="w-4 h-4" /> {t('settings.language')}
      </h2>
      <p className="text-slate-600">{t('settings.languageHint')}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('settings.language')}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={lang === l.code}
            onClick={() => choose(l.code)}
            className={`px-4 py-2 rounded-xl font-black cursor-pointer ${lang === l.code ? 'bg-slate-900 text-[#a3e635]' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {l.native}
          </button>
        ))}
      </div>
    </section>
  );
};
