"use client";

import "react-day-picker/style.css";
import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { az } from "date-fns/locale";

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function fromStr(s: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmt(s: string): string {
  const d = fromStr(s);
  return d ? d.toLocaleDateString("az", { day: "numeric", month: "short" }) : "";
}

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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const from = fromStr(checkIn);
  const to = fromStr(checkOut);
  const selected: DateRange | undefined = from ? { from, to } : undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-2 text-left"
      >
        <span className="px-3 py-2.5 min-w-0">
          <span className="block text-[10px] font-bold uppercase text-gece">
            Giriş
          </span>
          <span className="block text-sm text-gece/70 truncate">
            {checkIn ? fmt(checkIn) : "Tarix seç"}
          </span>
        </span>
        <span className="px-3 py-2.5 min-w-0 border-l border-gece/15">
          <span className="block text-[10px] font-bold uppercase text-gece">
            Çıxış
          </span>
          <span className="block text-sm text-gece/70 truncate">
            {checkOut ? fmt(checkOut) : "Tarix seç"}
          </span>
        </span>
      </button>

      {open && (
        <div className="gc-rdp absolute z-30 mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lift border border-gece/10 p-3">
          <DayPicker
            mode="range"
            locale={az}
            selected={selected}
            onSelect={(range) => {
              const ci = range?.from ? toStr(range.from) : "";
              const co = range?.to ? toStr(range.to) : "";
              onChange(ci, co);
              if (range?.from && range?.to) setOpen(false);
            }}
            disabled={{ before: today }}
            numberOfMonths={
              typeof window !== "undefined" && window.innerWidth >= 640 ? 2 : 1
            }
          />
        </div>
      )}
    </div>
  );
}
