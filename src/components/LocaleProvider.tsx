"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  dictionaries,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";

export const LOCALE_KEY = "gecele_locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Yaddaşdakı seçim → brauzer dili → AZ (default). */
function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) {
      return saved as Locale;
    }
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    if (nav === "ru") return "ru";
    if (nav === "en") return "en";
  } catch {
    // yaddaş əlçatan deyil — default qalır
  }
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Server və ilk klient render-i eyni olsun deyə DEFAULT ilə başlayırıq
  // (hidratasiya uyğunsuzluğu olmasın), sonra effektdə həqiqi dilə keçirik.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const l = detectLocale();
    setLocaleState(l);
    document.documentElement.lang = l;
  }, []);

  const setLocale = useCallback((l: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_KEY, l);
    } catch {
      // səssiz keç
    }
    setLocaleState(l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.az[key],
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n LocaleProvider daxilində istifadə edilməlidir");
  }
  return ctx;
}
