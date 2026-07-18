"use client";

// İstifadəçi seçimləri — başlıqdakı iki kiçik idarəedici: tema və dil.
// Eyni faylda saxlanılır, çünki hər ikisi eyni məqsədə (şəxsi seçim) xidmət edir.

import { useEffect, useRef, useState } from "react";
import { readTheme, resolveTheme, setTheme, type Theme } from "@/lib/theme";
import { useI18n } from "./LocaleProvider";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n/dictionaries";

export function ThemeToggle() {
  const { t } = useI18n();
  // Server render-i ilə uyğun olsun deyə null-la başlayır (FOUC skripti sinfi
  // onsuz da qoyub), sonra effektdə həqiqi vəziyyət oxunur.
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setMode(resolveTheme(readTheme()));
  }, []);

  const toggle = () => {
    const next: Theme = mode === "dark" ? "light" : "dark";
    setTheme(next);
    setMode(next);
  };

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("nav.theme.toLight") : t("nav.theme.toDark")}
      className="flex items-center justify-center w-10 h-10 text-gece hover:bg-kraft rounded-full transition-colors"
    >
      {isDark ? (
        // Günəş — gündüzə keçid
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Ay — gecəyə keçid
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
          <path
            d="M20 13.5A8.2 8.2 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("nav.language")}
        aria-expanded={open}
        className="flex items-center gap-1 h-10 px-2.5 text-gece hover:bg-kraft rounded-full transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <span className="text-xs font-bold">{LOCALE_SHORT[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-qum border border-gece/10 rounded-xl shadow-lift py-1.5 z-50">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-kraft transition-colors ${
                l === locale ? "font-semibold text-gece" : "text-gece/70"
              }`}
            >
              {LOCALE_LABELS[l]}
              {l === locale && <span className="float-right text-nar">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
