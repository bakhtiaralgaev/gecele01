"use client";

import { useEffect, useState } from "react";
import {
  PROPERTY_TYPES,
  FILTER_AMENITIES,
  PRICE_MIN,
  PRICE_MAX,
} from "@/lib/data";

export interface Filters {
  minPrice: number; // 0 = hüdud yoxdur
  maxPrice: number; // 0 = hüdud yoxdur
  types: string[];
  bedrooms: number; // 0 = hamısı
  amenities: string[];
}

export const EMPTY_FILTERS: Filters = {
  minPrice: 0,
  maxPrice: 0,
  types: [],
  bedrooms: 0,
  amenities: [],
};

// Aktiv filtr sayı — düymə üzərindəki nişan üçün
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.minPrice > 0 || f.maxPrice > 0) n++;
  n += f.types.length;
  if (f.bedrooms > 0) n++;
  n += f.amenities.length;
  return n;
}

// Filtrləri URL query parametrlərinə əlavə et (API ilə eyni açarlar)
export function applyFiltersToParams(f: Filters, params: URLSearchParams) {
  if (f.minPrice > 0) params.set("minPrice", String(f.minPrice));
  if (f.maxPrice > 0) params.set("maxPrice", String(f.maxPrice));
  if (f.types.length) params.set("type", f.types.join(","));
  if (f.bedrooms > 0) params.set("bedrooms", String(f.bedrooms));
  if (f.amenities.length) params.set("amenities", f.amenities.join(","));
}

function clampField(v: string): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(PRICE_MAX, n);
}

const chip = (on: boolean) =>
  `px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
    on
      ? "border-gece bg-gece text-qum"
      : "border-gece/25 text-gece hover:border-gece"
  }`;

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

interface Props {
  open: boolean;
  initial: Filters;
  buildParams: (draft: Filters) => URLSearchParams;
  onClose: () => void;
  onApply: (f: Filters) => void;
}

export default function FiltersModal({
  open,
  initial,
  buildParams,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<Filters>(initial);
  const [count, setCount] = useState<number | null>(null);

  // Açılanda draft-ı cari filtrlərlə sıfırla
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  // Escape ilə bağla
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Canlı nəticə sayı (debounce) — Airbnb kimi "N ev göstər"
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCount(null);
    const t = setTimeout(() => {
      fetch(`/api/listings?${buildParams(draft).toString()}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          if (!cancelled) setCount(Array.isArray(d) ? d.length : 0);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, draft, buildParams]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Filtrlər"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-qum w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[88vh] flex flex-col shadow-lift">
        {/* Başlıq */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-gece/10 shrink-0">
          <button
            onClick={onClose}
            aria-label="Bağla"
            className="text-gece/60 text-2xl leading-none hover:text-gece"
          >
            ×
          </button>
          <h2 className="font-semibold text-gece">Filtrlər</h2>
          <span className="w-6" />
        </div>

        {/* Gövdə */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* Qiymət */}
          <section>
            <h3 className="font-semibold text-gece mb-3">
              Qiymət aralığı{" "}
              <span className="font-normal text-gece/50 text-sm">
                (gecəlik, ₼)
              </span>
            </h3>
            <div className="flex items-end gap-3">
              <label className="flex-1">
                <span className="block text-xs text-gece/50 mb-1">Minimum</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={draft.minPrice || ""}
                  placeholder={`${PRICE_MIN}`}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, minPrice: clampField(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-gece/20 px-3 py-2.5 text-sm outline-none focus:border-gece"
                />
              </label>
              <span className="text-gece/30 pb-2.5">—</span>
              <label className="flex-1">
                <span className="block text-xs text-gece/50 mb-1">Maksimum</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={draft.maxPrice || ""}
                  placeholder={`${PRICE_MAX}+`}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, maxPrice: clampField(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-gece/20 px-3 py-2.5 text-sm outline-none focus:border-gece"
                />
              </label>
            </div>
          </section>

          {/* Ev tipi */}
          <section>
            <h3 className="font-semibold text-gece mb-3">Ev tipi</h3>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setDraft((d) => ({ ...d, types: toggle(d.types, t) }))
                  }
                  className={chip(draft.types.includes(t))}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Yataq otağı */}
          <section>
            <h3 className="font-semibold text-gece mb-3">Yataq otağı</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((b) => (
                <button
                  key={b}
                  onClick={() => setDraft((d) => ({ ...d, bedrooms: b }))}
                  className={chip(draft.bedrooms === b)}
                >
                  {b === 0 ? "Hamısı" : b === 4 ? "4+" : b}
                </button>
              ))}
            </div>
          </section>

          {/* İmkanlar */}
          <section>
            <h3 className="font-semibold text-gece mb-3">İmkanlar</h3>
            <div className="flex flex-wrap gap-2">
              {FILTER_AMENITIES.map((a) => (
                <button
                  key={a}
                  onClick={() =>
                    setDraft((d) => ({ ...d, amenities: toggle(d.amenities, a) }))
                  }
                  className={chip(draft.amenities.includes(a))}
                >
                  {a}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Alt panel */}
        <div className="flex items-center justify-between px-5 h-16 border-t border-gece/10 shrink-0">
          <button
            onClick={() => setDraft(EMPTY_FILTERS)}
            className="font-semibold text-gece underline underline-offset-4 hover:text-gece/70"
          >
            Təmizlə
          </button>
          <button
            onClick={() => onApply(draft)}
            className="bg-nar hover:bg-nar-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {count === null
              ? "Göstər"
              : count === 0
              ? "Nəticə yoxdur"
              : `${count} ev göstər`}
          </button>
        </div>
      </div>
    </div>
  );
}
