"use client";

import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { az } from "date-fns/locale";
import {
  addDays,
  formatMonthLong,
  parseDay,
  startOfToday,
  toDayStr,
} from "@/lib/dates";

export const FLEX_STEPS = [0, 1, 2, 3, 7, 14] as const;

const STAY_LENGTHS = [
  { key: "weekend", label: "Həftə sonu", nights: 2 },
  { key: "week", label: "Bir həftə", nights: 7 },
  { key: "month", label: "Bir ay", nights: 30 },
] as const;

type StayKey = (typeof STAY_LENGTHS)[number]["key"];

/** Növbəti 6 ayın 1-i — "Çevik" rejimdə ay seçimi üçün. */
function upcomingMonths(count: number): Date[] {
  const base = startOfToday();
  return Array.from(
    { length: count },
    (_, i) => new Date(base.getFullYear(), base.getMonth() + i, 1)
  );
}

/** Ayın içində qalış üçün ilk uyğun giriş tarixi. Həftə sonu → ilk cümə. */
function stayStartIn(month: Date, stay: StayKey): Date {
  const today = startOfToday();
  const first = month > today ? new Date(month) : today;
  if (stay !== "weekend") return first;
  const shift = (5 - first.getDay() + 7) % 7; // 5 = cümə
  return addDays(first, shift);
}

export default function CalendarPanel({
  checkIn,
  checkOut,
  flex,
  onChange,
  onFlexChange,
  months = 2,
  compact = false,
}: {
  checkIn: string;
  checkOut: string;
  flex: number;
  onChange: (checkIn: string, checkOut: string) => void;
  onFlexChange: (flex: number) => void;
  months?: number;
  /** Rezervasiya kartı üçün: yalnız təqvim — "Çevik" tabı və ± çipləri olmadan. */
  compact?: boolean;
}) {
  const [tab, setTab] = useState<"dates" | "flexible">("dates");
  const [stay, setStay] = useState<StayKey>("weekend");

  const from = parseDay(checkIn);
  const to = parseDay(checkOut);
  const selected: DateRange | undefined = from ? { from, to } : undefined;
  const today = startOfToday();

  const applyFlexible = (month: Date) => {
    const nights = STAY_LENGTHS.find((s) => s.key === stay)!.nights;
    const start = stayStartIn(month, stay);
    onChange(toDayStr(start), toDayStr(addDays(start, nights)));
  };

  return (
    <div className="gc-cal">
      {/* Tarixlər / Çevik keçidi — Airbnb-dəki kimi mərkəzdə seqment */}
      {!compact && (
        <div className="flex justify-center">
          <div className="inline-flex bg-kraft rounded-full p-1">
            {(
              [
                ["dates", "Tarixlər"],
                ["flexible", "Çevik"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  tab === key
                    ? "bg-white text-gece shadow-yurd"
                    : "text-gece/60 hover:text-gece"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {compact || tab === "dates" ? (
        <>
          <div className={compact ? "" : "mt-4"}>
            <DayPicker
              mode="range"
              locale={az}
              selected={selected}
              onSelect={(range) => {
                console.log("RDP_ONSELECT", JSON.stringify({ from: range?.from ? toDayStr(range.from) : null, to: range?.to ? toDayStr(range.to) : null }));
                onChange(
                  range?.from ? toDayStr(range.from) : "",
                  range?.to ? toDayStr(range.to) : ""
                );
              }}
              disabled={{ before: today }}
              startMonth={today}
              numberOfMonths={months}
            />
          </div>

          {/* Elastik pəncərə — API-də ±N gün sürüşən axtarışa çevrilir */}
          <div
            className={`mt-4 flex-wrap gap-2 ${compact ? "hidden" : "flex"}`}
          >
            {FLEX_STEPS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onFlexChange(n)}
                aria-pressed={flex === n}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  flex === n
                    ? "border-gece bg-white text-gece shadow-[inset_0_0_0_1px_#222]"
                    : "border-gece/20 text-gece/70 hover:border-gece/50"
                }`}
              >
                {n === 0 ? "Dəqiq tarixlər" : `± ${n} gün`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-5">
          <p className="text-center font-semibold text-gece">
            Nə qədər qalmaq istəyirsiniz?
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {STAY_LENGTHS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStay(s.key)}
                aria-pressed={stay === s.key}
                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-colors ${
                  stay === s.key
                    ? "border-gece bg-white text-gece shadow-[inset_0_0_0_1px_#222]"
                    : "border-gece/20 text-gece/70 hover:border-gece/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center font-semibold text-gece">
            Nə vaxt yola çıxırsınız?
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {upcomingMonths(6).map((m) => {
              const start = stayStartIn(m, stay);
              const active = checkIn === toDayStr(start);
              return (
                <button
                  key={m.toISOString()}
                  type="button"
                  onClick={() => applyFlexible(m)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 px-3 py-5 rounded-2xl border transition-colors ${
                    active
                      ? "border-gece shadow-[inset_0_0_0_1px_#222]"
                      : "border-gece/20 hover:border-gece/50"
                  }`}
                >
                  <span className="text-sm font-semibold text-gece">
                    {formatMonthLong(m)}
                  </span>
                  <span className="text-xs text-gece/50">
                    {m.getFullYear()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
