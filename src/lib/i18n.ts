import { useCallback, useEffect, useState } from 'react';

/**
 * Lightweight internationalisation. Strings live in `MESSAGES` keyed by a stable id; `t()` returns
 * the active language's text and falls back to English. The active language is stored per device
 * and (for signed-in users) mirrored to the profile's `language` field by the Settings page.
 *
 * Adding a language: add a column to `MESSAGES` and a `LANGUAGES` entry. Adding a string: add a key
 * with the English text and translate what you can — untranslated keys fall back gracefully.
 */

export type Language = 'en' | 'hi' | 'te';

export const LANGUAGES: Array<{ code: Language; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const MESSAGES = {
  'nav.profile': { en: 'Profile', hi: 'प्रोफ़ाइल', te: 'ప్రొఫైల్' },
  'nav.bookings': { en: 'Bookings', hi: 'बुकिंग', te: 'బుకింగ్‌లు' },
  'nav.saved': { en: 'Saved PGs', hi: 'सहेजे गए PG', te: 'సేవ్ చేసిన PGలు' },
  'nav.payments': { en: 'Payments', hi: 'भुगतान', te: 'చెల్లింపులు' },
  'nav.documents': { en: 'Documents', hi: 'दस्तावेज़', te: 'పత్రాలు' },
  'nav.notifications': { en: 'Notifications', hi: 'सूचनाएँ', te: 'నోటిఫికేషన్‌లు' },
  'nav.preferences': { en: 'Search Preferences', hi: 'खोज प्राथमिकताएँ', te: 'శోధన ప్రాధాన్యతలు' },
  'nav.security': { en: 'Security', hi: 'सुरक्षा', te: 'భద్రత' },
  'nav.privacy': { en: 'Privacy', hi: 'गोपनीयता', te: 'గోప్యత' },
  'nav.support': { en: 'Help & Support', hi: 'सहायता', te: 'సహాయం' },
  'nav.findPg': { en: 'Find PG', hi: 'PG खोजें', te: 'PG కనుగొనండి' },
  'nav.favorites': { en: 'Favorites', hi: 'पसंदीदा', te: 'ఇష్టమైనవి' },
  'nav.wishlist': { en: 'Wishlist', hi: 'विशलिस्ट', te: 'విష్‌లిస్ట్' },
  'auth.login': { en: 'Log in', hi: 'लॉग इन', te: 'లాగిన్' },
  'auth.logout': { en: 'Log out', hi: 'लॉग आउट', te: 'లాగ్ అవుట్' },
  'payments.payRent': {
    en: 'Pay rent or dues online',
    hi: 'किराया या बकाया ऑनलाइन भुगतान करें',
    te: 'అద్దె లేదా బకాయిలు ఆన్‌లైన్‌లో చెల్లించండి',
  },
  'payments.payViaUpi': { en: 'Pay via UPI', hi: 'UPI से भुगतान करें', te: 'UPI ద్వారా చెల్లించండి' },
  'bookings.title': { en: 'My Bookings', hi: 'मेरी बुकिंग', te: 'నా బుకింగ్‌లు' },
  'bookings.subtitle': {
    en: 'View and manage your PG bookings.',
    hi: 'अपनी PG बुकिंग देखें और प्रबंधित करें।',
    te: 'మీ PG బుకింగ్‌లను చూడండి మరియు నిర్వహించండి.',
  },
  'settings.language': { en: 'Language', hi: 'भाषा', te: 'భాష' },
  'settings.languageHint': {
    en: 'Choose the language for menus and messages.',
    hi: 'मेनू और संदेशों की भाषा चुनें।',
    te: 'మెనూలు మరియు సందేశాల భాషను ఎంచుకోండి.',
  },
  'common.save': { en: 'Save', hi: 'सहेजें', te: 'సేవ్ చేయండి' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें', te: 'రద్దు చేయండి' },
} as const satisfies Record<string, Record<Language, string>>;

export type MessageKey = keyof typeof MESSAGES;

const STORAGE_KEY = 'nestin_language';
const listeners = new Set<(lang: Language) => void>();

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {
    // storage unavailable
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  if (nav.startsWith('hi')) return 'hi';
  if (nav.startsWith('te')) return 'te';
  return 'en';
}

let current: Language = detectLanguage();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  if (!LANGUAGES.some((l) => l.code === lang)) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((l) => l(lang));
}

export function translate(key: MessageKey, lang: Language = current): string {
  const entry = MESSAGES[key] as Record<Language, string> | undefined;
  return entry?.[lang] || entry?.en || key;
}

/** React hook: re-renders when the language changes. */
export function useT() {
  const [lang, setLang] = useState<Language>(current);
  useEffect(() => {
    listeners.add(setLang);
    return () => {
      listeners.delete(setLang);
    };
  }, []);
  const t = useCallback((key: MessageKey) => translate(key, lang), [lang]);
  return { t, lang, setLanguage };
}
