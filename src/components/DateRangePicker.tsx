"use client";

import { useEffect, useRef, useState } from "react";
import { formatDayShort } from "@/lib/dates";
import CalendarPanel from "./CalendarPanel";

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setMonths(window.innerWidth >= 640 ? 2 : 1);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full grid grid-cols-2 text-left"
      >
        <span className="px-3 py-2.5 min-w-0">
          <span className="block text-[10px] font-bold uppercase text-gece">
            Giriş
          </span>
          <span className="block text-sm text-gece/70 truncate">
            {checkIn ? formatDayShort(checkIn) : "Tarix seç"}
          </span>
        </span>
        <span className="px-3 py-2.5 min-w-0 border-l border-gece/15">
          <span className="block text-[10px] font-bold uppercase text-gece">
            Çıxış
          </span>
          <span className="block text-sm text-gece/70 truncate">
            {checkOut ? formatDayShort(checkOut) : "Tarix seç"}
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 right-0 bg-white rounded-3xl shadow-lift border border-gece/10 p-5">
          <CalendarPanel
            compact
            months={months}
            checkIn={checkIn}
            checkOut={checkOut}
            flex={0}
            onFlexChange={() => {}}
            onChange={(ci, co) => {
              onChange(ci, co);
              if (ci && co) setOpen(false);
            }}
          />
          <div className="mt-4 pt-3 border-t border-gece/10 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="text-sm font-semibold text-gece underline"
            >
              Tarixləri sil
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-gece underline"
            >
              Bağla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
